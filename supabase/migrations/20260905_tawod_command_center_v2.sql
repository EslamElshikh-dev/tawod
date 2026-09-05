-- Tawod Command Center v2: reconciled first-party referrals, Ads budgets/calls,
-- and Google Business Profile performance. No customer PII is stored.

alter table public.tawod_analytics_events
  add column if not exists click_id text;

alter table public.tawod_google_ads_daily
  add column if not exists daily_budget_micros bigint not null default 0,
  add column if not exists total_budget_micros bigint not null default 0;

create table if not exists public.tawod_google_ads_calls (
  resource_name text primary key,
  customer_id text not null,
  campaign_id bigint,
  campaign_name text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  call_status text,
  tracking_location text,
  call_type text,
  repeat_contacts integer not null default 1 check (repeat_contacts between 1 and 20),
  visit_requested boolean not null default false,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tawod_google_ads_calls_started_at_idx
  on public.tawod_google_ads_calls (started_at desc);

create table if not exists public.tawod_business_profile_daily (
  report_date date not null,
  location_id text not null,
  profile_name text,
  search_desktop_impressions bigint not null default 0,
  search_mobile_impressions bigint not null default 0,
  maps_desktop_impressions bigint not null default 0,
  maps_mobile_impressions bigint not null default 0,
  conversations bigint not null default 0,
  direction_requests bigint not null default 0,
  call_clicks bigint not null default 0,
  website_clicks bigint not null default 0,
  bookings bigint not null default 0,
  synced_at timestamptz not null default now(),
  primary key (report_date, location_id)
);

create index if not exists tawod_business_profile_daily_date_idx
  on public.tawod_business_profile_daily (report_date desc);

create table if not exists public.tawod_business_profile_keywords_monthly (
  report_month date not null,
  location_id text not null,
  search_keyword text not null,
  impressions bigint not null default 0,
  threshold bigint,
  synced_at timestamptz not null default now(),
  primary key (report_month, location_id, search_keyword)
);

create index if not exists tawod_business_profile_keywords_month_idx
  on public.tawod_business_profile_keywords_monthly (report_month desc, impressions desc);

insert into public.tawod_sync_keys (name, key_hash, enabled)
values ('business_profile', repeat('0', 64), false)
on conflict (name) do nothing;

alter table public.tawod_google_ads_calls enable row level security;
alter table public.tawod_business_profile_daily enable row level security;
alter table public.tawod_business_profile_keywords_monthly enable row level security;

revoke all on public.tawod_google_ads_calls from anon, authenticated;
revoke all on public.tawod_business_profile_daily from anon, authenticated;
revoke all on public.tawod_business_profile_keywords_monthly from anon, authenticated;
grant all on public.tawod_google_ads_calls to service_role;
grant all on public.tawod_business_profile_daily to service_role;
grant all on public.tawod_business_profile_keywords_monthly to service_role;

create or replace function public.tawod_admin_analytics(p_days integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $function$
with
params as (
  select greatest(7, least(coalesce(p_days, 30), 90))::int as days,
         now() - make_interval(days => greatest(7, least(coalesce(p_days, 30), 90))) as since_at
),
window_events as (
  select e.* from public.tawod_analytics_events e, params p where e.occurred_at >= p.since_at
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
    case
      when nullif(f.click_id, '') is not null
        or coalesce(f.landing_path, '') ~* '[?&](gclid|gbraid|wbraid|gad_campaignid)='
        or coalesce(f.landing_path, '') ~* '[?&]gad_source=1([&#]|$)'
        then 'google-ads'
      when nullif(f.utm_source, '') is not null and
        lower(coalesce(f.utm_medium, '')) ~ '(cpc|ppc|paid|ads?)'
        then lower(f.utm_source) || '-ads'
      when nullif(f.utm_source, '') is not null then lower(f.utm_source)
      when coalesce(f.referrer_host, '') = '' then 'direct'
      when lower(f.referrer_host) in ('tawodco.com','www.tawodco.com') then 'direct'
      when f.referrer_host ilike '%google.%' then 'google-organic'
      else lower(f.referrer_host)
    end as source
  from first_page f
  join session_counts c using (session_id)
  left join session_contacts sc using (session_id)
  left join session_forms sf using (session_id)
),
visitor_first_seen as (
  select visitor_id, min(occurred_at) as first_seen_at
  from public.tawod_analytics_events
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
  from public.tawod_analytics_events
  where occurred_at >= now() - interval '24 hours'
),
current7 as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
    count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals
  from public.tawod_analytics_events where occurred_at >= now() - interval '7 days'
),
previous7 as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
    count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals
  from public.tawod_analytics_events
  where occurred_at >= now() - interval '14 days' and occurred_at < now() - interval '7 days'
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
    from sessions group by source order by sessions desc limit 15
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
    'referrals', q.referrals, 'calls', q.calls, 'whatsapp', q.whatsapp
  ) order by q.day_value), '[]'::jsonb) as data
  from (
    select timezone('Asia/Riyadh', occurred_at)::date as day_value,
      count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
      count(*) filter (where event_name = 'page_view')::int as views,
      count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals,
      count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
      count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp
    from window_events group by 1 order by 1
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
    'sourceTotal', (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(so.data) x),
    'deviceTotal', (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(dv.data) x),
    'rawContactClicks', s.call_clicks + s.whatsapp_clicks,
    'uniqueReferralSessions', s.referral_sessions,
    'duplicateOrCrossChannelClicks', greatest(0, s.call_clicks + s.whatsapp_clicks - s.referral_sessions),
    'reconciled', (select count(*) from sessions) = (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(so.data) x)
      and (select count(*) from sessions) = (select coalesce(sum((x->>'sessions')::int), 0) from jsonb_array_elements(dv.data) x),
    'firstEventAt', (select min(occurred_at) from public.tawod_analytics_events),
    'lastEventAt', (select max(occurred_at) from public.tawod_analytics_events)
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
    'articleViews', s.article_views,
    'formSessions', s.form_sessions, 'formConfirmedSessions', s.form_confirmed_sessions,
    'referralRate', coalesce(round(s.referral_sessions::numeric / nullif(s.sessions, 0) * 100, 2), 0)
  ),
  'today', to_jsonb(t),
  'comparison7d', jsonb_build_object('current', to_jsonb(c), 'previous', to_jsonb(p)),
  'sources', so.data, 'devices', dv.data, 'campaigns', ca.data,
  'topPages', tp.data, 'services', sv.data, 'daily', dy.data,
  'recentReferrals', rr.data, 'dataQuality', qu.data
)
from summary s cross join today t cross join current7 c cross join previous7 p
cross join sources so cross join devices dv cross join campaigns ca cross join top_pages tp
cross join services sv cross join daily dy cross join recent_referrals rr cross join quality qu;
$function$;

create or replace function public.tawod_google_ads_analytics(p_days integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $function$
with
params as (select greatest(7, least(coalesce(p_days, 30), 90))::int as days),
window_rows as (
  select d.* from public.tawod_google_ads_daily d, params p
  where d.report_date >= current_date - (p.days - 1)
),
window_conv as (
  select c.* from public.tawod_google_ads_conversion_daily c, params p
  where c.report_date >= current_date - (p.days - 1)
),
window_calls as (
  select c.* from public.tawod_google_ads_calls c, params p
  where c.started_at >= now() - make_interval(days => p.days)
),
latest_campaign_budget as (
  select distinct on (customer_id, campaign_id)
    customer_id, campaign_id, campaign_name, campaign_status,
    daily_budget_micros, total_budget_micros
  from window_rows order by customer_id, campaign_id, report_date desc, synced_at desc
),
summary as (
  select coalesce(sum(impressions),0)::bigint as impressions,
    coalesce(sum(clicks),0)::bigint as clicks,
    coalesce(sum(cost_micros),0)::bigint as cost_micros,
    coalesce(sum(conversions),0)::numeric as conversions,
    coalesce(sum(all_conversions),0)::numeric as all_conversions,
    coalesce(sum(phone_calls),0)::bigint as phone_calls,
    max(currency_code) as currency_code
  from window_rows
),
budget as (
  select coalesce(sum(daily_budget_micros) filter (where lower(coalesce(campaign_status,'')) like '%enable%'),0)::bigint as daily_budget_micros,
    coalesce(sum(total_budget_micros),0)::bigint as total_budget_micros
  from latest_campaign_budget
),
call_summary as (
  select count(*)::int as tracked_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED')::int as received_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'MISSED')::int as missed_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60)::int as potential_customers,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60 and (repeat_contacts > 1 or visit_requested))::int as confirmed_customers,
    coalesce(round(avg(duration_seconds) filter (where upper(coalesce(call_status,'')) = 'RECEIVED'),1),0) as avg_duration_seconds
  from window_calls
),
classified_conv as (
  select
    coalesce(sum(conversions) filter (where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric as whatsapp_conversions,
    coalesce(sum(conversions) filter (where lower(conversion_action_name) ~ '(call|phone|مكال|اتصال)'),0)::numeric as call_conversions
  from window_conv
),
campaign_conv as (
  select customer_id, campaign_id,
    coalesce(sum(conversions) filter (where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric as whatsapp_conversions
  from window_conv group by customer_id, campaign_id
),
campaign_call as (
  select customer_id, campaign_id,
    count(*)::int as tracked_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60)::int as potential_customers,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60 and (repeat_contacts > 1 or visit_requested))::int as confirmed_customers
  from window_calls group by customer_id, campaign_id
),
campaigns as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaignId', q.campaign_id, 'name', q.name, 'status', q.status,
    'impressions', q.impressions, 'clicks', q.clicks, 'cost', q.cost,
    'dailyBudget', q.daily_budget, 'totalBudget', q.total_budget,
    'conversions', q.conversions, 'phoneCalls', q.phone_calls,
    'whatsappConversions', q.whatsapp_conversions,
    'trackedCalls', q.tracked_calls, 'potentialCustomers', q.potential_customers,
    'confirmedCustomers', q.confirmed_customers,
    'ctr', q.ctr, 'avgCpc', q.avg_cpc, 'cpa', q.cpa
  ) order by q.cost desc), '[]'::jsonb) as data
  from (
    select d.customer_id, d.campaign_id, max(d.campaign_name) as name,
      max(d.campaign_status) as status, sum(d.impressions)::bigint as impressions,
      sum(d.clicks)::bigint as clicks, round(sum(d.cost_micros)::numeric / 1000000,2) as cost,
      round(max(d.daily_budget_micros)::numeric / 1000000,2) as daily_budget,
      round(max(d.total_budget_micros)::numeric / 1000000,2) as total_budget,
      sum(d.conversions)::numeric as conversions, sum(d.phone_calls)::bigint as phone_calls,
      coalesce(cv.whatsapp_conversions,0) as whatsapp_conversions,
      coalesce(cc.tracked_calls,0) as tracked_calls,
      coalesce(cc.potential_customers,0) as potential_customers,
      coalesce(cc.confirmed_customers,0) as confirmed_customers,
      coalesce(round(sum(d.clicks)::numeric / nullif(sum(d.impressions),0) * 100,2),0) as ctr,
      coalesce(round(sum(d.cost_micros)::numeric / 1000000 / nullif(sum(d.clicks),0),2),0) as avg_cpc,
      coalesce(round(sum(d.cost_micros)::numeric / 1000000 / nullif(sum(d.conversions),0),2),0) as cpa
    from window_rows d
    left join campaign_conv cv using (customer_id, campaign_id)
    left join campaign_call cc using (customer_id, campaign_id)
    group by d.customer_id, d.campaign_id, cv.whatsapp_conversions, cc.tracked_calls, cc.potential_customers, cc.confirmed_customers
    order by sum(d.cost_micros) desc limit 30
  ) q
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', q.report_date, 'impressions', q.impressions, 'clicks', q.clicks,
    'cost', q.cost, 'conversions', q.conversions, 'phoneCalls', q.phone_calls
  ) order by q.report_date), '[]'::jsonb) as data
  from (
    select report_date, sum(impressions)::bigint as impressions, sum(clicks)::bigint as clicks,
      round(sum(cost_micros)::numeric / 1000000,2) as cost,
      sum(conversions)::numeric as conversions, sum(phone_calls)::bigint as phone_calls
    from window_rows group by report_date order by report_date
  ) q
),
actions as (
  select coalesce(jsonb_agg(jsonb_build_object('name',q.name,'conversions',q.conversions,'value',q.value)
    order by q.conversions desc), '[]'::jsonb) as data
  from (
    select conversion_action_name as name, sum(conversions)::numeric as conversions,
      sum(conversions_value)::numeric as value
    from window_conv group by conversion_action_name order by conversions desc limit 20
  ) q
),
calls as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'resourceName', q.resource_name, 'startedAt', q.started_at, 'durationSeconds', q.duration_seconds,
    'status', q.call_status, 'campaignId', q.campaign_id, 'campaignName', q.campaign_name,
    'trackingLocation', q.tracking_location, 'callType', q.call_type,
    'repeatContacts', q.repeat_contacts, 'visitRequested', q.visit_requested,
    'potential', upper(coalesce(q.call_status,'')) = 'RECEIVED' and q.duration_seconds > 60,
    'confirmed', upper(coalesce(q.call_status,'')) = 'RECEIVED' and q.duration_seconds > 60 and (q.repeat_contacts > 1 or q.visit_requested)
  ) order by q.started_at desc), '[]'::jsonb) as data
  from (select * from window_calls order by started_at desc limit 100) q
),
connection as (
  select exists(select 1 from public.tawod_google_ads_daily) as connected,
    (select max(synced_at) from public.tawod_google_ads_daily) as last_sync_at,
    (select max(customer_id) from public.tawod_google_ads_daily) as customer_id
),
current7 as (
  select coalesce(sum(impressions),0)::bigint as impressions, coalesce(sum(clicks),0)::bigint as clicks,
    round(coalesce(sum(cost_micros),0)::numeric / 1000000,2) as cost,
    coalesce(sum(conversions),0)::numeric as conversions, coalesce(sum(phone_calls),0)::bigint as phone_calls
  from public.tawod_google_ads_daily where report_date >= current_date - 6
),
previous7 as (
  select coalesce(sum(impressions),0)::bigint as impressions, coalesce(sum(clicks),0)::bigint as clicks,
    round(coalesce(sum(cost_micros),0)::numeric / 1000000,2) as cost,
    coalesce(sum(conversions),0)::numeric as conversions, coalesce(sum(phone_calls),0)::bigint as phone_calls
  from public.tawod_google_ads_daily where report_date between current_date - 13 and current_date - 7
)
select jsonb_build_object(
  'connected', cn.connected, 'lastSyncAt', cn.last_sync_at, 'customerId', cn.customer_id,
  'currency', coalesce(s.currency_code, 'SAR'), 'periodDays', (select days from params),
  'callReportingConnected', cs.tracked_calls > 0,
  'summary', jsonb_build_object(
    'impressions', s.impressions, 'clicks', s.clicks, 'cost', round(s.cost_micros::numeric / 1000000,2),
    'conversions', s.conversions, 'allConversions', s.all_conversions,
    'phoneCalls', s.phone_calls, 'whatsappConversions', cv.whatsapp_conversions,
    'callConversions', cv.call_conversions,
    'dailyBudget', round(b.daily_budget_micros::numeric / 1000000,2),
    'totalBudget', round(b.total_budget_micros::numeric / 1000000,2),
    'plannedPeriodBudget', round(b.daily_budget_micros::numeric / 1000000 * (select days from params),2),
    'budgetUseRate', coalesce(round(s.cost_micros::numeric / nullif(b.daily_budget_micros * (select days from params),0) * 100,2),0),
    'ctr', coalesce(round(s.clicks::numeric / nullif(s.impressions,0) * 100,2),0),
    'avgCpc', coalesce(round(s.cost_micros::numeric / 1000000 / nullif(s.clicks,0),2),0),
    'cpa', coalesce(round(s.cost_micros::numeric / 1000000 / nullif(s.conversions,0),2),0),
    'trackedCalls', cs.tracked_calls, 'receivedCalls', cs.received_calls, 'missedCalls', cs.missed_calls,
    'potentialCustomers', cs.potential_customers, 'confirmedCustomers', cs.confirmed_customers,
    'avgCallDurationSeconds', cs.avg_duration_seconds
  ),
  'comparison7d', jsonb_build_object('current',to_jsonb(c),'previous',to_jsonb(p)),
  'campaigns', ca.data, 'daily', dy.data, 'conversionActions', ac.data, 'calls', cl.data
)
from summary s cross join budget b cross join call_summary cs cross join classified_conv cv
cross join campaigns ca cross join daily dy cross join actions ac cross join calls cl
cross join connection cn cross join current7 c cross join previous7 p;
$function$;

create or replace function public.tawod_business_profile_analytics(p_days integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $function$
with
params as (select greatest(7, least(coalesce(p_days,30),90))::int as days),
window_rows as (
  select d.* from public.tawod_business_profile_daily d, params p
  where d.report_date >= current_date - (p.days - 1)
),
summary as (
  select
    coalesce(sum(search_desktop_impressions),0)::bigint as search_desktop,
    coalesce(sum(search_mobile_impressions),0)::bigint as search_mobile,
    coalesce(sum(maps_desktop_impressions),0)::bigint as maps_desktop,
    coalesce(sum(maps_mobile_impressions),0)::bigint as maps_mobile,
    coalesce(sum(conversations),0)::bigint as conversations,
    coalesce(sum(direction_requests),0)::bigint as directions,
    coalesce(sum(call_clicks),0)::bigint as calls,
    coalesce(sum(website_clicks),0)::bigint as website_clicks,
    coalesce(sum(bookings),0)::bigint as bookings
  from window_rows
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'date',q.report_date,'searchImpressions',q.search_impressions,'mapsImpressions',q.maps_impressions,
    'calls',q.calls,'conversations',q.conversations,'websiteClicks',q.website_clicks,'directions',q.directions
  ) order by q.report_date),'[]'::jsonb) as data
  from (
    select report_date,
      sum(search_desktop_impressions + search_mobile_impressions)::bigint as search_impressions,
      sum(maps_desktop_impressions + maps_mobile_impressions)::bigint as maps_impressions,
      sum(call_clicks)::bigint as calls, sum(conversations)::bigint as conversations,
      sum(website_clicks)::bigint as website_clicks, sum(direction_requests)::bigint as directions
    from window_rows group by report_date order by report_date
  ) q
),
keywords as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'month',q.report_month,'keyword',q.search_keyword,'impressions',q.impressions,'threshold',q.threshold
  ) order by q.impressions desc),'[]'::jsonb) as data
  from (
    select report_month, search_keyword, sum(impressions)::bigint as impressions, max(threshold) as threshold
    from public.tawod_business_profile_keywords_monthly, params p
    where report_month >= date_trunc('month', current_date - make_interval(days => p.days))::date
    group by report_month, search_keyword order by impressions desc limit 30
  ) q
),
connection as (
  select exists(select 1 from public.tawod_business_profile_daily) as connected,
    (select max(synced_at) from public.tawod_business_profile_daily) as last_sync_at,
    (select max(profile_name) from public.tawod_business_profile_daily) as profile_name,
    (select count(distinct location_id) from public.tawod_business_profile_daily)::int as locations
)
select jsonb_build_object(
  'connected',c.connected,'lastSyncAt',c.last_sync_at,'profileName',c.profile_name,'locations',c.locations,
  'periodDays',(select days from params),
  'summary',jsonb_build_object(
    'searchDesktopImpressions',s.search_desktop,'searchMobileImpressions',s.search_mobile,
    'searchImpressions',s.search_desktop+s.search_mobile,
    'mapsDesktopImpressions',s.maps_desktop,'mapsMobileImpressions',s.maps_mobile,
    'mapsImpressions',s.maps_desktop+s.maps_mobile,
    'totalImpressions',s.search_desktop+s.search_mobile+s.maps_desktop+s.maps_mobile,
    'calls',s.calls,'conversations',s.conversations,'websiteClicks',s.website_clicks,
    'directions',s.directions,'bookings',s.bookings,
    'actionRate',coalesce(round((s.calls+s.conversations+s.website_clicks+s.directions+s.bookings)::numeric /
      nullif(s.search_desktop+s.search_mobile+s.maps_desktop+s.maps_mobile,0)*100,2),0)
  ),
  'daily',d.data,'keywords',k.data
)
from summary s cross join daily d cross join keywords k cross join connection c;
$function$;

revoke all on function public.tawod_admin_analytics(integer) from public, anon, authenticated;
revoke all on function public.tawod_google_ads_analytics(integer) from public, anon, authenticated;
revoke all on function public.tawod_business_profile_analytics(integer) from public, anon, authenticated;
grant execute on function public.tawod_admin_analytics(integer) to service_role;
grant execute on function public.tawod_google_ads_analytics(integer) to service_role;
grant execute on function public.tawod_business_profile_analytics(integer) to service_role;
