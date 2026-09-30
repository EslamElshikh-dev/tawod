-- Private, persistent decision execution. Evidence is a frozen creation snapshot.
create table public.tawod_decisions (
  id uuid primary key default gen_random_uuid(),
  insight_key text unique check (char_length(insight_key) <= 100),
  title text not null check (char_length(title) between 1 and 180),
  area text check (char_length(area) <= 80),
  source text check (char_length(source) <= 160),
  evidence text check (char_length(evidence) <= 1000),
  period_days integer check (period_days in (7,30,90)),
  observed_at timestamptz not null default now(),
  action text not null check (char_length(action) between 1 and 500),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'planned' check (status in ('planned','in_progress','done','dismissed')),
  assignee text check (char_length(assignee) <= 80),
  due_at timestamptz,
  result text check (char_length(result) <= 500),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tawod_decisions_progress_review check (status <> 'in_progress' or (assignee is not null and due_at is not null)),
  constraint tawod_decisions_close_review check (status not in ('done','dismissed') or result is not null),
  constraint tawod_decisions_done_owner check (status <> 'done' or assignee is not null)
);
create index tawod_decisions_active_due_idx on public.tawod_decisions(due_at,id)
  where status in ('planned','in_progress');
create table public.tawod_decision_history (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.tawod_decisions(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null check (event_type in ('created','status_changed','updated')),
  from_status text,
  to_status text not null,
  actor text not null default 'admin',
  changes jsonb not null default '{}'::jsonb
);
create index tawod_decision_history_time_idx on public.tawod_decision_history(decision_id,occurred_at desc,id);
alter table public.tawod_decisions enable row level security;
alter table public.tawod_decision_history enable row level security;
revoke all on public.tawod_decisions, public.tawod_decision_history from public,anon,authenticated;
grant select,insert,update on public.tawod_decisions to service_role;
grant select,insert on public.tawod_decision_history to service_role;

create function public.tawod_decision_prepare()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' then
    new.insight_key:=old.insight_key; new.area:=old.area; new.source:=old.source;
    new.evidence:=old.evidence; new.period_days:=old.period_days;
    new.observed_at:=old.observed_at; new.created_at:=old.created_at;
    new.updated_at:=greatest(date_trunc('milliseconds',clock_timestamp()),old.updated_at+interval '1 millisecond');
  end if;
  if new.status in ('done','dismissed') then
    if tg_op='INSERT' or old.status is distinct from new.status then new.completed_at:=now(); end if;
  else new.completed_at:=null;
  end if;
  return new;
end $$;
create function public.tawod_decision_audit()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  field text; delta jsonb:='{}'::jsonb;
  before_row jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb:=to_jsonb(new);
begin
  foreach field in array array['title','action','priority','status','assignee','due_at','result'] loop
    if before_row->field is distinct from after_row->field then
      delta:=delta || jsonb_build_object(field,jsonb_build_object('from',before_row->field,'to',after_row->field));
    end if;
  end loop;
  if tg_op='INSERT' or delta<>'{}'::jsonb then
    insert into public.tawod_decision_history(decision_id,event_type,from_status,to_status,changes)
    values(new.id,case when tg_op='INSERT' then 'created' when new.status is distinct from old.status then 'status_changed' else 'updated' end,
      case when tg_op='UPDATE' then old.status else null end,new.status,delta);
  end if;
  return new;
end $$;
create trigger tawod_decision_prepare_trigger before insert or update on public.tawod_decisions
  for each row execute function public.tawod_decision_prepare();
create trigger tawod_decision_audit_trigger after insert or update on public.tawod_decisions
  for each row execute function public.tawod_decision_audit();
revoke all on function public.tawod_decision_prepare(),public.tawod_decision_audit() from public,anon,authenticated;
grant execute on function public.tawod_decision_prepare(),public.tawod_decision_audit() to service_role;

create function public.tawod_decision_workspace()
returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
  'connected',true,
  'summary',(select jsonb_build_object(
    'total',count(*),'active',count(*) filter(where status in ('planned','in_progress')),
    'overdue',count(*) filter(where status in ('planned','in_progress') and due_at<now()),
    'unassigned',count(*) filter(where status in ('planned','in_progress') and assignee is null),
    'done',count(*) filter(where status='done'),'dismissed',count(*) filter(where status='dismissed')
  ) from public.tawod_decisions),
  'entries',coalesce((select jsonb_agg(to_jsonb(x) order by x.closed,x.due_at nulls last,x.updated_at desc,x.id) from
    (select d.*,status in ('done','dismissed') as closed from public.tawod_decisions d
      order by closed,due_at nulls last,updated_at desc,id limit 500) x),'[]'::jsonb),
  'entriesTruncated',(select count(*)>500 from public.tawod_decisions)
);
$$;
revoke all on function public.tawod_decision_workspace() from public,anon,authenticated;
grant execute on function public.tawod_decision_workspace() to service_role;

-- Separate the referral cohort from current contracts whose status was recorded in the period.
-- Monetary amounts are current recorded contract values, not payments, profit or ad ROAS.
create function public.tawod_sales_commercial(p_days integer default 30)
returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (
  select now()-make_interval(days=>greatest(7,least(coalesce(p_days,30),90))) as start_at,now() as end_at
), real_rows as (
  select o.*,
    case when source_event_id is null then 'unlinked' else coalesce(nullif(acquisition_source,''),'unknown') end as source_key
  from public.tawod_sales_outcomes o
  where not (coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)' or coalesce(notes,'') ~* '\mTEST_ONLY\M')
), cohort as (
  select r.* from real_rows r,bounds b where occurred_at between b.start_at and b.end_at
), scope_rows as (
  select 'period' as scope,c.* from cohort c
  union all select 'open' as scope,r.* from real_rows r where stage not in ('contract_signed','lost')
), ranked as (
  select s.*,row_number() over(partition by scope,stage order by next_follow_up_at nulls last,occurred_at,id) as position
  from scope_rows s
), stages as (
  select scope,stage,count(*) as total,
    count(*) filter(where stage not in ('contract_signed','lost') and stage_entered_at<=now()-interval '14 days') as aging,
    count(*) filter(where stage_entered_at is null) as unknown_age,
    coalesce(sum(case when stage='contract_signed' then contract_value else estimated_value end),0) as value
  from scope_rows group by scope,stage
), source_groups as (
  select source_key,count(*) as opportunities,count(*) filter(where qualified_at is not null) as qualified,
    count(*) filter(where stage='contract_signed') as contracts,count(*) filter(where stage='lost') as lost,
    count(*) filter(where stage not in ('contract_signed','lost')) as open,
    coalesce(sum(contract_value) filter(where stage='contract_signed'),0) as contract_value,
    coalesce(sum(estimated_value) filter(where stage not in ('contract_signed','lost')),0) as open_value
  from cohort group by source_key
), campaign_groups as (
  select source_key,coalesce(nullif(campaign_name,''),'غير محددة') as campaign,count(*) as opportunities,
    count(*) filter(where qualified_at is not null) as qualified,
    count(*) filter(where stage='contract_signed') as contracts,count(*) filter(where stage='lost') as lost,
    count(*) filter(where stage not in ('contract_signed','lost')) as open,
    coalesce(sum(contract_value) filter(where stage='contract_signed'),0) as contract_value,
    coalesce(sum(estimated_value) filter(where stage not in ('contract_signed','lost')),0) as open_value
  from cohort group by source_key,coalesce(nullif(campaign_name,''),'غير محددة')
), closed_period as (
  select r.* from real_rows r,bounds b where stage in ('contract_signed','lost')
    and stage_entered_at between b.start_at and b.end_at
)
select jsonb_build_object(
  'connected',true,'startAt',(select start_at from bounds),'endAt',(select end_at from bounds),
  'activity',(select jsonb_build_object(
    'contracts',count(*) filter(where stage='contract_signed'),
    'contractValue',coalesce(sum(contract_value) filter(where stage='contract_signed'),0),
    'lost',count(*) filter(where stage='lost'),
    'closedWinRate',case when count(*)>0 then 100.0*count(*) filter(where stage='contract_signed')/count(*) else null end,
    'avgCycleDays',round(avg(extract(epoch from(stage_entered_at-occurred_at))/86400.0)
      filter(where stage='contract_signed' and stage_entered_at>=occurred_at),1)
  ) from closed_period),
  'unknownClosedDates',(select count(*) from real_rows where stage in ('contract_signed','lost') and stage_entered_at is null),
  'sources',coalesce((select jsonb_agg(to_jsonb(x) order by x.contract_value desc,x.opportunities desc,x.source_key) from source_groups x),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(x) order by x.contract_value desc,x.opportunities desc,x.source_key,x.campaign) from
    (select * from campaign_groups order by contract_value desc,opportunities desc,source_key,campaign limit 100) x),'[]'::jsonb),
  'campaignsTruncated',(select count(*)>100 from campaign_groups),
  'board',jsonb_build_object(
    'stages',coalesce((select jsonb_agg(to_jsonb(x) order by x.scope,x.stage) from stages x),'[]'::jsonb),
    'entries',coalesce((select jsonb_agg(jsonb_build_object(
      'scope',x.scope,'id',x.id,'stage',x.stage,'serviceType',x.service_type,'projectLocation',x.project_location,
      'assignee',x.assignee,'nextAction',x.next_action,'nextFollowUpAt',x.next_follow_up_at,
      'stageEnteredAt',x.stage_entered_at,'occurredAt',x.occurred_at,'source',x.source_key,
      'value',case when x.stage='contract_signed' then x.contract_value else x.estimated_value end
    ) order by x.scope,x.stage,x.position) from ranked x where x.position<=40),'[]'::jsonb)
  ),
  'lossReasons',coalesce((select jsonb_agg(to_jsonb(x) order by x.total desc,x.reason) from
    (select coalesce(lost_reason,'unknown') as reason,count(*) as total from cohort where stage='lost' group by coalesce(lost_reason,'unknown')) x),'[]'::jsonb)
);
$$;
revoke all on function public.tawod_sales_commercial(integer) from public,anon,authenticated;
grant execute on function public.tawod_sales_commercial(integer) to service_role;
comment on function public.tawod_sales_commercial(integer) is
  'Private uncapped cohort/source/stage aggregates. Board displays 40 per stage; closure activity uses latest recorded current-stage entry, with unknown historical dates excluded.';
