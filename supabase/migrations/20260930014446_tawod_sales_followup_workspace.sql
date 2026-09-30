-- Additive, private follow-up workspace. No customer identity or message content.
alter table public.tawod_sales_outcomes
  add column assignee text check (char_length(assignee) <= 80),
  add column next_follow_up_at timestamptz,
  add column next_action text check (char_length(next_action) <= 160),
  add column last_contact_at timestamptz,
  add column project_location text check (char_length(project_location) <= 120),
  add column execution_timing text not null default 'unknown'
    check (execution_timing in ('unknown','immediate','1_3_months','3_6_months','later')),
  add column service_fit text not null default 'unknown'
    check (service_fit in ('unknown','suitable','unsuitable')),
  add column contact_result text not null default 'not_contacted'
    check (contact_result in ('not_contacted','no_response','contacted','invalid')),
  add column lost_reason text
    check (lost_reason in ('price','timing','outside_scope','no_response','competitor','other')),
  add column acquisition_source text check (char_length(acquisition_source) <= 255),
  add column source_medium text check (char_length(source_medium) <= 120),
  add column landing_path text check (char_length(landing_path) <= 500),
  add column source_path text check (char_length(source_path) <= 500),
  add column stage_entered_at timestamptz,
  add column quote_sent_at timestamptz,
  add column site_visit_at timestamptz,
  add column contract_signed_at timestamptz;

-- Only backfill verifiable source fields. Historical stage/contact times remain unknown.
update public.tawod_sales_outcomes o set
  acquisition_source = case when e.click_id is not null then 'google-ads'
    when e.utm_source is not null then e.utm_source
    when e.referrer_host is null then 'direct'
    when e.referrer_host ~* '(^|\.)google\.' then 'google-organic' else e.referrer_host end,
  source_medium = e.utm_medium, landing_path = e.landing_path, source_path = e.page_path
from public.tawod_analytics_events e where e.id = o.source_event_id;

create table public.tawod_sales_history (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null references public.tawod_sales_outcomes(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null check (event_type in ('created','stage_changed','updated')),
  from_stage text,
  to_stage text not null,
  actor text not null default 'admin',
  changes jsonb not null default '{}'::jsonb
);
create index tawod_sales_history_outcome_time_idx
  on public.tawod_sales_history(outcome_id, occurred_at desc, id);
create index tawod_sales_outcomes_followup_idx
  on public.tawod_sales_outcomes(next_follow_up_at, id)
  where stage not in ('lost','contract_signed');
alter table public.tawod_sales_history enable row level security;
revoke all on public.tawod_sales_history from public, anon, authenticated;
grant select, insert, delete on public.tawod_sales_history to service_role;

create or replace function public.tawod_sales_prepare()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    new.stage_entered_at := now();
    if new.stage = 'qualified' or new.stage = 'quote_sent' or new.stage = 'site_visit' or new.stage = 'contract_signed' then
      new.qualified_at := coalesce(new.qualified_at, now());
    end if;
    if new.stage = 'quote_sent' then new.quote_sent_at := coalesce(new.quote_sent_at, now()); end if;
    if new.stage = 'site_visit' then new.site_visit_at := coalesce(new.site_visit_at, now()); end if;
    if new.stage = 'contract_signed' then new.contract_signed_at := coalesce(new.contract_signed_at, now()); end if;
  end if;
  if new.stage in ('lost','contract_signed') then
    new.next_follow_up_at := null;
    new.next_action := null;
  end if;
  if new.stage <> 'lost' then new.lost_reason := null; end if;
  return new;
end $$;

create or replace function public.tawod_sales_audit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  field text;
  delta jsonb := '{}'::jsonb;
  before_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  after_row jsonb := to_jsonb(new);
begin
  -- No event for Sheets acknowledgement or sync-only metadata changes.
  foreach field in array array['stage','assignee','next_follow_up_at','next_action','last_contact_at',
    'service_type','project_location','execution_timing','service_fit','contact_result','lost_reason',
    'estimated_value','contract_value','notes','campaign_name'] loop
    if before_row->field is distinct from after_row->field then
      delta := delta || jsonb_build_object(field, jsonb_build_object('from',before_row->field,'to',after_row->field));
    end if;
  end loop;
  if tg_op = 'INSERT' or delta <> '{}'::jsonb then
    insert into public.tawod_sales_history(outcome_id,event_type,from_stage,to_stage,changes)
    values(new.id, case when tg_op='INSERT' then 'created' when new.stage is distinct from old.stage then 'stage_changed' else 'updated' end,
      case when tg_op='UPDATE' then old.stage else null end, new.stage, delta);
  end if;
  return new;
end $$;

create trigger tawod_sales_prepare_trigger before insert or update on public.tawod_sales_outcomes
  for each row execute function public.tawod_sales_prepare();
create trigger tawod_sales_audit_trigger after insert or update on public.tawod_sales_outcomes
  for each row execute function public.tawod_sales_audit();
revoke all on function public.tawod_sales_prepare() from public, anon, authenticated;
revoke all on function public.tawod_sales_audit() from public, anon, authenticated;
grant execute on function public.tawod_sales_prepare(), public.tawod_sales_audit() to service_role;

-- Full aggregates are calculated before display limits. Active work spans all dates.
create or replace function public.tawod_sales_workspace(p_days integer default 30)
returns jsonb language sql stable security invoker set search_path = '' as $$
with rows as (
  select o.*, (
    coalesce(o.click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)' or
    coalesce(o.notes,'') ~* '\mTEST_ONLY\M'
  ) as is_test
  from public.tawod_sales_outcomes o
), period as (
  select * from rows where occurred_at >= now() - make_interval(days => greatest(7,least(coalesce(p_days,30),90)))
    and occurred_at <= now()
), real_period as (select * from period where not is_test), active as (
  select * from rows where stage not in ('lost','contract_signed') and not is_test
), today as (
  select (date_trunc('day',now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh') as start_at
)
select jsonb_build_object(
  'connected',true,
  'lastUpdatedAt',(select max(updated_at) from rows),
  'entries',coalesce((select jsonb_agg(to_jsonb(x) - 'is_test' order by x.occurred_at desc,x.id) from
    (select * from period order by occurred_at desc,id limit 500) x),'[]'::jsonb),
  'open_entries',coalesce((select jsonb_agg(to_jsonb(x) - 'is_test' order by x.next_follow_up_at nulls last,x.occurred_at,x.id) from
    (select * from active order by next_follow_up_at nulls last,occurred_at,id limit 500) x),'[]'::jsonb),
  'entriesTruncated',(select count(*) > 500 from period),
  'openEntriesTruncated',(select count(*) > 500 from active),
  'summary',(select jsonb_build_object(
    'opportunities',count(*),'qualified',count(*) filter (where qualified_at is not null),
    'quotes',count(*) filter (where stage in ('quote_sent','site_visit','contract_signed')),
    'visits',count(*) filter (where stage in ('site_visit','contract_signed')),
    'contracts',count(*) filter (where stage='contract_signed'),'lost',count(*) filter (where stage='lost'),
    'openPipelineValue',coalesce(sum(estimated_value) filter (where stage not in ('lost','contract_signed')),0),
    'contractValue',coalesce(sum(contract_value) filter (where stage='contract_signed'),0),
    'contractRate',case when count(*)>0 then 100.0 * count(*) filter (where stage='contract_signed') / count(*) else 0 end,
    'linked',count(*) filter (where source_event_id is not null),
    'qualificationComplete',count(*) filter (where service_type is not null and project_location is not null
      and execution_timing <> 'unknown' and service_fit <> 'unknown' and contact_result not in ('not_contacted','no_response'))
  ) from real_period),
  'followups',(select jsonb_build_object(
    'total',count(*), 'overdue',count(*) filter (where next_follow_up_at < now()),
    'today',count(*) filter (where next_follow_up_at >= now() and next_follow_up_at < (select start_at + interval '1 day' from today)),
    'unassigned',count(*) filter (where assignee is null),
    'unscheduled',count(*) filter (where next_follow_up_at is null),
    'stale',count(*) filter (where coalesce(last_contact_at,first_contact_at,occurred_at) < now()-interval '7 days'),
    'unqualified',count(*) filter (where qualified_at is null),
    'openValue',coalesce(sum(estimated_value),0)
  ) from active)
);
$$;
revoke all on function public.tawod_sales_workspace(integer) from public, anon, authenticated;
grant execute on function public.tawod_sales_workspace(integer) to service_role;
comment on function public.tawod_sales_workspace(integer) is
  'Private admin aggregates; opportunities by first referral date, active follow-ups across all dates. Display capped at 500; totals uncapped.';
