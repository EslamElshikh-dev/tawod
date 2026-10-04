-- One explicit test vocabulary across production analytics readers.
create or replace function public.tawod_is_test_event(p_click_id text,p_source text)
returns boolean language sql immutable security invoker set search_path='' as $$
select coalesce(p_click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
  or replace(lower(btrim(coalesce(p_source,''))),'_','-') in ('internal-qa','internal-test');
$$;
revoke all on function public.tawod_is_test_event(text,text) from public,anon,authenticated;
grant execute on function public.tawod_is_test_event(text,text) to service_role;

create table if not exists public.tawod_measurement_verification(
  source text primary key check(source in ('google_ads','business_profile')),
  checked_at timestamptz not null default now(),
  period_start date not null,period_end date not null,
  source_fetched_at timestamptz,results jsonb not null
);
alter table public.tawod_measurement_verification enable row level security;
revoke all on public.tawod_measurement_verification from public,anon,authenticated;
grant select,insert,update on public.tawod_measurement_verification to service_role;

CREATE OR REPLACE FUNCTION public.tawod_admin_analytics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with
params as (
  select greatest(7, least(coalesce(p_days, 30), 90))::int as days,
         now() - make_interval(days => greatest(7, least(coalesce(p_days, 30), 90))) as since_at
),
eligible_events as (
  select * from public.tawod_analytics_events where occurred_at<=now()
    and not public.tawod_is_test_event(click_id,utm_source)
),
window_events as (
  select e.* from eligible_events e, params p where e.occurred_at >= p.since_at
),
first_page as (
  select distinct on (e.session_id)
    e.session_id, e.visitor_id, e.occurred_at, e.device_type, e.landing_path,
    e.referrer_host, e.utm_source, e.utm_medium, e.utm_campaign, e.click_id
  from window_events e
  where e.event_name = 'page_view' and nullif(e.session_id, '') is not null
  order by e.session_id, e.occurred_at, e.id
),
session_counts as (
  select session_id, count(*)::int as views
  from window_events
  where event_name = 'page_view' and nullif(session_id, '') is not null
  group by session_id
),
session_contacts as (
  select session_id,
    bool_or(event_name = 'call_click') as called,
    bool_or(event_name = 'whatsapp_click') as whatsapp,
    count(*) filter (where event_name = 'call_click')::int as call_clicks,
    count(*) filter (where event_name = 'whatsapp_click')::int as whatsapp_clicks,
    min(occurred_at) filter (where event_name in ('call_click','whatsapp_click')) as first_referral_at
  from window_events
  where event_name in ('call_click','whatsapp_click') and nullif(session_id, '') is not null
  group by session_id
),
session_forms as (
  select session_id,
    bool_or(event_name = 'form_submit_attempt') as form_started,
    bool_or(event_name = 'generate_lead') as form_confirmed
  from window_events
  where event_name in ('form_submit_attempt','generate_lead') and nullif(session_id, '') is not null
  group by session_id
),
sessions as (
  select f.*,
    c.views,
    coalesce(sc.called, false) as called,
    coalesce(sc.whatsapp, false) as whatsapp,
    coalesce(sc.call_clicks, 0) as call_clicks,
    coalesce(sc.whatsapp_clicks, 0) as whatsapp_clicks,
    sc.first_referral_at,
    coalesce(sf.form_started, false) as form_started,
    coalesce(sf.form_confirmed, false) as form_confirmed,
    public.tawod_attribution_source(f.utm_source,f.utm_medium,f.referrer_host,f.click_id,f.landing_path) as source
  from first_page f
  join session_counts c using (session_id)
  left join session_contacts sc using (session_id)
  left join session_forms sf using (session_id)
),
visitor_first_seen as (
  select visitor_id, min(occurred_at) as first_seen_at
  from eligible_events
  where event_name = 'page_view' and nullif(visitor_id, '') is not null
  group by visitor_id
),
summary as (
  select
    count(distinct s.visitor_id)::int as visitors,
    count(*)::int as sessions,
    coalesce(sum(s.views), 0)::int as views,
    count(*) filter (where s.called or s.whatsapp)::int as referral_sessions,
    count(*) filter (where s.called)::int as call_referral_sessions,
    count(*) filter (where s.whatsapp)::int as whatsapp_referral_sessions,
    count(*) filter (where s.called and s.whatsapp)::int as both_referral_sessions,
    coalesce(sum(s.call_clicks), 0)::int as call_clicks,
    coalesce(sum(s.whatsapp_clicks), 0)::int as whatsapp_clicks,
    count(*) filter (where s.form_started)::int as form_sessions,
    count(*) filter (where s.form_confirmed)::int as form_confirmed_sessions,
    (select count(*)::int from window_events where event_name = 'article_view') as article_views,
    count(distinct s.visitor_id) filter (where v.first_seen_at >= p.since_at)::int as new_visitors,
    count(distinct s.visitor_id) filter (where v.first_seen_at < p.since_at)::int as returning_visitors
  from sessions s
  cross join params p
  left join visitor_first_seen v using (visitor_id)
),
today as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
    count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals
  from eligible_events
  where occurred_at >= now() - interval '24 hours'
),
comparison_bounds as (select (now() at time zone 'Asia/Riyadh')::date as today),
comparison_events as (
 select e.* from eligible_events e cross join comparison_bounds b
 where e.occurred_at >= ((b.today-14)::timestamp at time zone 'Asia/Riyadh')
   and e.occurred_at < (b.today::timestamp at time zone 'Asia/Riyadh')
),
comparison_pages as (
 select session_id,min(occurred_at) first_at,count(*)::int views from comparison_events
 where event_name='page_view' and nullif(session_id,'') is not null group by session_id
),
comparison_contacts as (
 select session_id,bool_or(event_name='call_click') called,bool_or(event_name='whatsapp_click') whatsapp
 from comparison_events where event_name in ('call_click','whatsapp_click') group by session_id
),
comparison_sessions as (
 select p.*,coalesce(c.called,false) called,coalesce(c.whatsapp,false) whatsapp,
   (p.first_at >= ((b.today-7)::timestamp at time zone 'Asia/Riyadh')) is_current
 from comparison_pages p left join comparison_contacts c using(session_id) cross join comparison_bounds b
),
current7 as (
 select count(*)::int sessions,coalesce(sum(views),0)::int views,
 count(*) filter(where called)::int calls,count(*) filter(where whatsapp)::int whatsapp,
 count(*) filter(where called or whatsapp)::int referrals from comparison_sessions where is_current
),
previous7 as (
 select count(*)::int sessions,coalesce(sum(views),0)::int views,
 count(*) filter(where called)::int calls,count(*) filter(where whatsapp)::int whatsapp,
 count(*) filter(where called or whatsapp)::int referrals from comparison_sessions where not is_current
),
sources as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'source', q.source, 'sessions', q.sessions, 'views', q.views,
    'referrals', q.referrals, 'calls', q.calls, 'whatsapp', q.whatsapp,
    'referralRate', q.referral_rate
  ) order by q.sessions desc), '[]'::jsonb) as data
  from (
    select source, count(*)::int as sessions, sum(views)::int as views,
      count(*) filter (where called or whatsapp)::int as referrals,
      count(*) filter (where called)::int as calls,
      count(*) filter (where whatsapp)::int as whatsapp,
      coalesce(round(count(*) filter (where called or whatsapp)::numeric / nullif(count(*), 0) * 100, 2), 0) as referral_rate
    from sessions group by source order by sessions desc
  ) q
),
devices as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'device', q.device, 'sessions', q.sessions, 'views', q.views,
    'referrals', q.referrals, 'referralRate', q.referral_rate
  ) order by q.sessions desc), '[]'::jsonb) as data
  from (
    select coalesce(nullif(device_type, ''), 'unknown') as device,
      count(*)::int as sessions, sum(views)::int as views,
      count(*) filter (where called or whatsapp)::int as referrals,
      coalesce(round(count(*) filter (where called or whatsapp)::numeric / nullif(count(*), 0) * 100, 2), 0) as referral_rate
    from sessions group by 1 order by sessions desc
  ) q
),
campaigns as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaign', q.campaign, 'source', q.source, 'medium', q.medium,
    'sessions', q.sessions, 'views', q.views, 'referrals', q.referrals,
    'calls', q.calls, 'whatsapp', q.whatsapp, 'referralRate', q.referral_rate
  ) order by q.sessions desc), '[]'::jsonb) as data
  from (
    select coalesce(
        nullif(utm_campaign, ''),
        substring(coalesce(landing_path, '') from '[?&]gad_campaignid=([^&]+)'),
        'غير مسماة'
      ) as campaign,
      source, coalesce(nullif(utm_medium, ''), '—') as medium,
      count(*)::int as sessions, sum(views)::int as views,
      count(*) filter (where called or whatsapp)::int as referrals,
      count(*) filter (where called)::int as calls,
      count(*) filter (where whatsapp)::int as whatsapp,
      coalesce(round(count(*) filter (where called or whatsapp)::numeric / nullif(count(*), 0) * 100, 2), 0) as referral_rate
    from sessions
    where nullif(utm_campaign, '') is not null
       or coalesce(landing_path, '') ~* '[?&]gad_campaignid='
    group by 1, 2, 3 order by sessions desc limit 20
  ) q
),
page_stats as (
  select page_path,
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
    count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals
  from window_events
  where event_name in ('page_view','call_click','whatsapp_click')
  group by page_path having count(*) filter (where event_name = 'page_view') > 0
),
top_pages as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'path', q.page_path, 'sessions', q.sessions, 'views', q.views, 'referrals', q.referrals,
    'calls', q.calls, 'whatsapp', q.whatsapp, 'referralRate', q.referral_rate
  ) order by q.views desc), '[]'::jsonb) as data
  from (
    select *, coalesce(round(referrals::numeric / nullif(sessions, 0) * 100, 2), 0) as referral_rate
    from page_stats order by views desc limit 15
  ) q
),
services as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'service', q.service, 'attempts', q.attempts, 'confirmedForms', q.confirmed_forms,
    'completionRate', q.completion_rate
  ) order by q.attempts desc), '[]'::jsonb) as data
  from (
    select coalesce(nullif(service_type, ''), 'غير محدد') as service,
      count(*) filter (where event_name = 'form_submit_attempt')::int as attempts,
      count(*) filter (where event_name = 'generate_lead')::int as confirmed_forms,
      coalesce(round(count(*) filter (where event_name = 'generate_lead')::numeric /
        nullif(count(*) filter (where event_name = 'form_submit_attempt'), 0) * 100, 2), 0) as completion_rate
    from window_events where event_name in ('form_submit_attempt','generate_lead')
    group by 1 order by attempts desc limit 12
  ) q
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', q.day_value, 'sessions', q.sessions, 'views', q.views,
    'referrals', q.referrals, 'calls', q.calls, 'whatsapp', q.whatsapp,'newVisitors',q.new_visitors
  ) order by q.day_value), '[]'::jsonb) as data
  from (
    select timezone('Asia/Riyadh',s.occurred_at)::date as day_value,
      count(*)::int as sessions,sum(s.views)::int as views,
      count(*) filter(where s.called or s.whatsapp)::int as referrals,
      count(*) filter(where s.called)::int as calls,count(*) filter(where s.whatsapp)::int as whatsapp,
      count(distinct s.visitor_id) filter(where v.first_seen_at >= (select since_at from params) and timezone('Asia/Riyadh',v.first_seen_at)::date=timezone('Asia/Riyadh',s.occurred_at)::date)::int as new_visitors
    from sessions s left join visitor_first_seen v using(visitor_id) group by 1 order by 1
  ) q
),
recent_referrals as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'at', q.occurred_at, 'method', case when q.event_name = 'call_click' then 'call' else 'whatsapp' end,
    'sourcePath', q.page_path, 'landingPath', q.landing_path,
    'source', q.source,
    'campaign', coalesce(nullif(q.utm_campaign, ''), substring(coalesce(q.landing_path,'') from '[?&]gad_campaignid=([^&]+)'), '—'),
    'device', coalesce(nullif(q.device_type, ''), 'unknown'),
    'session', right(coalesce(q.session_id, ''), 8)
  ) order by q.occurred_at desc), '[]'::jsonb) as data
  from (
    select e.*, s.source
    from window_events e left join sessions s using (session_id)
    where e.event_name in ('call_click','whatsapp_click')
    order by e.occurred_at desc limit 40
  ) q
),
quality as (
  select jsonb_build_object(
    'sessionTotal', (select count(*) from sessions),
    'verifiedAt',now(),'startAt',(select since_at from params),'endAt',now(),'timezone','Asia/Riyadh',
    'dailySessionTotal',(select coalesce(sum((x->>'sessions')::integer),0) from jsonb_array_elements((select data from daily)) x),
    'dailyReferralTotal',(select coalesce(sum((x->>'referrals')::integer),0) from jsonb_array_elements((select data from daily)) x),
    'attributionConflicts',(select count(*) from sessions where source='attribution-conflict'),
    'excludedTestEvents',(select count(*) from public.tawod_analytics_events,params where occurred_at between since_at and now() and public.tawod_is_test_event(click_id,utm_source)),
    'contactEventsWithoutSession',(select count(*) from window_events where event_name in ('call_click','whatsapp_click') and nullif(session_id,'') is null),
    'contactSessionsWithoutPage',(select count(*) from session_contacts c where not exists(select 1 from first_page f where f.session_id=c.session_id)),
    'sourceTotal', (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(so.data) x),
    'deviceTotal', (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(dv.data) x),
    'rawContactClicks', s.call_clicks + s.whatsapp_clicks,
    'uniqueReferralSessions', s.referral_sessions,
    'duplicateOrCrossChannelClicks', greatest(0, s.call_clicks + s.whatsapp_clicks - s.referral_sessions),
    'reconciled', (select count(*) from sessions) = (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(so.data) x)
      and (select count(*) from sessions) = (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(dv.data) x),
    'firstEventAt', (select min(occurred_at) from eligible_events),
    'lastEventAt', (select max(occurred_at) from eligible_events)
  ) as data
  from summary s cross join sources so cross join devices dv
)
select jsonb_build_object(
  'generatedAt', now(), 'periodDays', (select days from params),
  'definitions', jsonb_build_object(
    'visit', 'جلسة فريدة بدأت بمشاهدة صفحة',
    'successfulReferral', 'جلسة فريدة ضغطت اتصال أو واتساب',
    'potentialCustomer', 'مكالمة مستلمة ومدتها الفعلية أكثر من 60 ثانية',
    'confirmedCustomer', 'مكالمة مستلمة أكثر من 60 ثانية ومعها تواصل أكثر من مرة أو طلب زيارة'
  ),
  'summary', jsonb_build_object(
    'visitors', s.visitors, 'sessions', s.sessions, 'views', s.views,
    'referralSessions', s.referral_sessions,
    'callReferralSessions', s.call_referral_sessions,
    'whatsappReferralSessions', s.whatsapp_referral_sessions,
    'bothReferralSessions', s.both_referral_sessions,
    'callClicks', s.call_clicks, 'whatsappClicks', s.whatsapp_clicks,
    'newVisitors', s.new_visitors, 'returningVisitors', s.returning_visitors,
    'singleSessionVisitors',(select count(*) from (select visitor_id from sessions where nullif(visitor_id,'') is not null group by visitor_id having count(*)=1) v),
    'repeatSessionVisitors',(select count(*) from (select visitor_id from sessions where nullif(visitor_id,'') is not null group by visitor_id having count(*)>1) v),
    'articleViews', s.article_views,
    'formSessions', s.form_sessions, 'formConfirmedSessions', s.form_confirmed_sessions,
    'referralRate', coalesce(round(s.referral_sessions::numeric / nullif(s.sessions, 0) * 100, 2), 0)
  ),
  'today', to_jsonb(t),
  'comparison7d', jsonb_build_object('current', to_jsonb(c), 'previous', to_jsonb(p), 'completedDaysOnly',true,
    'currentStart',(select today-7 from comparison_bounds),'currentEnd',(select today-1 from comparison_bounds),
    'previousStart',(select today-14 from comparison_bounds),'previousEnd',(select today-8 from comparison_bounds)),
  'sources', so.data, 'devices', dv.data, 'campaigns', ca.data,
  'topPages', tp.data, 'services', sv.data, 'daily', dy.data,
  'recentReferrals', rr.data, 'dataQuality', qu.data
)
from summary s cross join today t cross join current7 c cross join previous7 p
cross join sources so cross join devices dv cross join campaigns ca cross join top_pages tp
cross join services sv cross join daily dy cross join recent_referrals rr cross join quality qu;
$function$;

CREATE OR REPLACE FUNCTION public.tawod_visitor_frequency(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with visitor_sessions as (
  select visitor_id,count(distinct session_id) as n from public.tawod_analytics_events
  where event_name='page_view' and occurred_at between now()-make_interval(days=>greatest(7,least(coalesce(p_days,30),90))) and now()
    and nullif(visitor_id,'') is not null and nullif(session_id,'') is not null
    and not public.tawod_is_test_event(click_id,utm_source)
  group by visitor_id
)
select jsonb_build_object('visitors',count(*),'singleSessionVisitors',count(*) filter(where n=1),'returningVisitors',count(*) filter(where n>1)) from visitor_sessions;
$function$;

CREATE OR REPLACE FUNCTION public.tawod_notification_feed()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with real_sales as (
  select * from public.tawod_sales_outcomes
  where not (coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)' or coalesce(notes,'') ~* '\mTEST_ONLY\M')
), events as (
  select 'referral:'||e.id::text as id,e.occurred_at as at,'referral'::text as kind,
    jsonb_build_object('method',case when event_name='call_click' then 'call' else 'whatsapp' end,
      'path',page_path,'source',public.tawod_attribution_source(utm_source,utm_medium,referrer_host,click_id,landing_path)) as detail,
    null::uuid as outcome_id,null::uuid as decision_id
  from public.tawod_analytics_events e where event_name in ('call_click','whatsapp_click')
    and occurred_at between now()-interval '7 days' and now()
    and not public.tawod_is_test_event(click_id,utm_source)
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
$function$;

-- Pair completed Riyadh calendar days and count each contact session once.
create or replace function public.tawod_paid_referral_costs(p_days integer default 30)
returns jsonb language sql stable security invoker set search_path = '' as $$
with
settings as (
  select greatest(7,least(coalesce(p_days,30),90))::int days,
    (now() at time zone 'Asia/Riyadh')::date today
),
tracking as (
  select min(occurred_at) first_seen from public.tawod_analytics_events
  where event_name='page_view' and nullif(session_id,'') is not null and occurred_at<=now()
    and not public.tawod_is_test_event(click_id,utm_source)
),
period as (
  select greatest(s.today-(s.days-1),(t.first_seen at time zone 'Asia/Riyadh')::date+1) start_date,
    least(s.today-1,(select max(report_date) from public.tawod_google_ads_daily where report_date<s.today)) end_date,
    s.today-(s.days-1) requested_start, t.first_seen tracking_since
  from settings s cross join tracking t
),
ads as (
  select d.* from public.tawod_google_ads_daily d cross join period p
  where p.tracking_since is not null and d.report_date between p.start_date and p.end_date
),
events as (
  select e.* from public.tawod_analytics_events e cross join period p
  where p.tracking_since is not null
    and e.occurred_at >= (p.start_date::timestamp at time zone 'Asia/Riyadh')
    and e.occurred_at < ((p.end_date+1)::timestamp at time zone 'Asia/Riyadh')
    and not public.tawod_is_test_event(e.click_id,e.utm_source)
),
first_page as (
  select distinct on (session_id) session_id, utm_source, utm_medium, referrer_host, click_id, landing_path, utm_campaign
  from events where event_name='page_view' and nullif(session_id,'') is not null
  order by session_id, occurred_at, id
),
contacts as (
  select session_id, bool_or(event_name='call_click') called, bool_or(event_name='whatsapp_click') whatsapp
  from events where event_name in ('call_click','whatsapp_click') group by session_id
),
paid as (
  select f.session_id, coalesce(c.called,false) called, coalesce(c.whatsapp,false) whatsapp,
    coalesce(nullif(substring(coalesce(f.landing_path,'') from '[?&]gad_campaignid=([^&]+)'),''),nullif(btrim(f.utm_campaign),'')) campaign
  from first_page f left join contacts c using(session_id)
  where public.tawod_attribution_source(f.utm_source,f.utm_medium,f.referrer_host,f.click_id,f.landing_path)='google-ads'
),
campaign_keys as (select distinct campaign_id,campaign_name from ads),
mapped as (
  select p.*,case when m.candidates=1 then m.campaign_id end campaign_id
  from paid p cross join lateral (
    select count(distinct k.campaign_id) candidates,min(k.campaign_id) campaign_id
    from campaign_keys k where p.campaign=k.campaign_id::text or p.campaign=k.campaign_name
  ) m
),
campaign_contacts as (
  select campaign_id,count(*)::int sessions,count(*) filter(where called or whatsapp)::int referrals,
    count(*) filter(where called)::int calls,count(*) filter(where whatsapp)::int whatsapp
  from mapped where campaign_id is not null group by campaign_id
),
campaign_costs as (
  select campaign_id,round(sum(cost_micros)::numeric/1000000,2) cost from ads group by campaign_id
),
paired as (
  select a.*,coalesce(c.sessions,0) sessions,coalesce(c.referrals,0) referrals,
    coalesce(c.calls,0) calls,coalesce(c.whatsapp,0) whatsapp,
    round(a.cost/nullif(c.referrals,0),2) cost_per_referral
  from campaign_costs a left join campaign_contacts c using(campaign_id)
),
totals as (
  select coalesce(sum(cost),0) period_cost,coalesce(sum(cost) filter(where sessions>0),0) matched_cost,
    coalesce(sum(sessions),0) sessions,coalesce(sum(referrals),0) referrals,
    coalesce(sum(calls),0) calls,coalesce(sum(whatsapp),0) whatsapp,
    count(*) filter(where sessions>0) matched_campaigns,count(*) campaigns
  from paired
),
quality as (
  select count(distinct report_date)::int covered_days,count(distinct currency_code)::int currencies from ads
)
select jsonb_build_object(
  'available',p.tracking_since is not null and p.start_date<=p.end_date and q.covered_days=p.end_date-p.start_date+1 and q.currencies=1,
  'startDate',p.start_date,'endDate',p.end_date,'timeZone','Asia/Riyadh','completedDaysOnly',true,
  'trackingSince',p.tracking_since,'trackingWindowShortened',p.start_date>p.requested_start,
  'coveredDays',q.covered_days,'expectedDays',greatest(0,p.end_date-p.start_date+1),
  'missingDays',greatest(0,p.end_date-p.start_date+1-q.covered_days),
  'summary',jsonb_build_object(
    'periodCost',t.period_cost,'matchedCost',t.matched_cost,'sessions',t.sessions,'referrals',t.referrals,
    'calls',t.calls,'whatsapp',t.whatsapp,'matchedCampaigns',t.matched_campaigns,'campaigns',t.campaigns,
    'costPerReferral',case when q.currencies=1 then round(t.matched_cost/nullif(t.referrals,0),2) end,
    'spendCoverage',round(t.matched_cost/nullif(t.period_cost,0)*100,2),
    'unmatchedSessions',(select count(*) from mapped where campaign_id is null),
    'unmatchedReferrals',(select count(*) from mapped where campaign_id is null and (called or whatsapp))
  ),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object(
    'campaignId',campaign_id,'siteSessions',sessions,'siteReferrals',referrals,'siteCalls',calls,
    'siteWhatsapp',whatsapp,'pairedCost',cost,'siteCostPerReferral',case when q.currencies=1 then cost_per_referral end,
    'attributionMatched',sessions>0) order by cost desc) from paired),'[]'::jsonb)
)
from period p cross join totals t cross join quality q;
$$;
revoke all on function public.tawod_paid_referral_costs(integer) from public,anon,authenticated;
grant execute on function public.tawod_paid_referral_costs(integer) to service_role;

revoke all on function public.tawod_admin_analytics(integer) from public,anon,authenticated;
grant execute on function public.tawod_admin_analytics(integer) to service_role;
revoke all on function public.tawod_visitor_frequency(integer) from public,anon,authenticated;
grant execute on function public.tawod_visitor_frequency(integer) to service_role;
revoke all on function public.tawod_notification_feed() from public,anon,authenticated;
grant execute on function public.tawod_notification_feed() to service_role;
