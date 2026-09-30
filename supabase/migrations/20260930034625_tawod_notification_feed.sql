-- Actual, immutable event IDs. A read-only feed; no simulated events or public access.
create function public.tawod_notification_feed()
returns jsonb language sql stable security invoker set search_path='' as $$
with real_sales as (
  select * from public.tawod_sales_outcomes
  where not (coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)' or coalesce(notes,'') ~* '\mTEST_ONLY\M')
), events as (
  select 'referral:'||e.id::text as id,e.occurred_at as at,'referral'::text as kind,
    jsonb_build_object('method',case when event_name='call_click' then 'call' else 'whatsapp' end,
      'path',page_path,'source',case when click_id is not null then 'google-ads' when utm_source is not null then utm_source
        when referrer_host is null then 'direct' when referrer_host ~* '(^|\.)google\.' then 'google-organic' else referrer_host end) as detail,
    null::uuid as outcome_id,null::uuid as decision_id
  from public.tawod_analytics_events e where event_name in ('call_click','whatsapp_click')
    and occurred_at between now()-interval '7 days' and now()
    and not coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
  union all
  select 'sale:'||h.id::text,h.occurred_at,'sales',
    jsonb_build_object('eventType',h.event_type,'fromStage',h.from_stage,'toStage',h.to_stage),o.id,null::uuid
  from public.tawod_sales_history h join real_sales o on o.id=h.outcome_id
  where h.event_type in ('created','stage_changed') and h.occurred_at between now()-interval '7 days' and now()
  union all
  select 'decision:'||h.id::text,h.occurred_at,'decision',
    jsonb_build_object('eventType',h.event_type,'fromStatus',h.from_status,'toStatus',h.to_status,'title',d.title),null::uuid,d.id
  from public.tawod_decision_history h join public.tawod_decisions d on d.id=h.decision_id
  where h.event_type in ('created','status_changed') and h.occurred_at between now()-interval '7 days' and now()
)
select jsonb_build_object(
  'connected',true,'generatedAt',now(),'windowDays',7,'totalAvailable',(select count(*) from events),
  'truncated',(select count(*)>100 from events),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'at',x.at,'kind',x.kind,'detail',x.detail,
    'outcomeId',x.outcome_id,'decisionId',x.decision_id) order by x.at desc,x.id) from
    (select * from events order by at desc,id limit 100) x),'[]'::jsonb),
  'alerts',jsonb_build_object(
    'overdueFollowups',(select count(*) from real_sales where stage not in ('lost','contract_signed') and next_follow_up_at<now()),
    'unassignedOpportunities',(select count(*) from real_sales where stage not in ('lost','contract_signed') and assignee is null),
    'overdueDecisions',(select count(*) from public.tawod_decisions where status in ('planned','in_progress') and due_at<now())
  )
);
$$;
revoke all on function public.tawod_notification_feed() from public,anon,authenticated;
grant execute on function public.tawod_notification_feed() to service_role;
comment on function public.tawod_notification_feed() is
  'Private real referral clicks and audited sales/decision transitions. Latest 100 events across 7 days, independent of dashboard period. Current follow-up alerts are distinct from historical events.';
