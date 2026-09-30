-- One attribution vocabulary across website, social cohorts and reviewed opportunities.
create function public.tawod_attribution_source(p_source text,p_medium text,p_referrer text,p_click_id text,p_landing text)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare
  raw_source text:=replace(lower(btrim(coalesce(p_source,''))),'_','-');
  medium text:=replace(lower(btrim(coalesce(p_medium,''))),'_','-');
  host text:=lower(btrim(coalesce(p_referrer,'')));
  base text; paid boolean;
  google_click boolean:=nullif(btrim(p_click_id),'') is not null or coalesce(p_landing,'') ~* '[?&](gclid|gbraid|wbraid|gad_campaignid)=' or coalesce(p_landing,'') ~* '[?&]gad_source=1([&#]|$)';
begin
  paid:=medium in ('cpc','ppc','paid','paid-social','paid-social-media','paidsocial','paidsearch','ads','ad','display','retargeting') or raw_source ~ '-(ads|paid)$';
  base:=regexp_replace(raw_source,'-(ads|paid)$','');
  if base in ('ig','instagram','insta') then base:='instagram';
  elsif base in ('fb','facebook','meta') then base:='facebook';
  elsif base in ('tt','tiktok','tik-tok') then base:='tiktok';
  elsif base in ('x','twitter','x.com','twitter.com','t.co') then base:='x';
  elsif base in ('google','google-ads','adwords') then base:='google'; end if;
  if google_click and base in ('instagram','facebook','tiktok','x') then return 'attribution-conflict'; end if;
  if google_click then return 'google-ads'; end if;
  if base<>'' then
    if base='google' and not paid then return 'google-organic'; end if;
    return base || case when paid then '-ads' else '' end;
  end if;
  if coalesce(p_landing,'') ~* '[?&]ttclid=' then return 'tiktok-ads'; end if;
  if host ~ '(^|\.)instagram\.com$' then return 'instagram'; end if;
  if host ~ '(^|\.)facebook\.com$' or host in ('fb.com','fb.me') then return 'facebook'; end if;
  if host ~ '(^|\.)tiktok\.com$' then return 'tiktok'; end if;
  if host ~ '(^|\.)(twitter|x)\.com$' or host='t.co' then return 'x'; end if;
  if host ~ '(^|\.)google\.' then return 'google-organic'; end if;
  if host='' or host in ('tawodco.com','www.tawodco.com') then return 'direct'; end if;
  return host;
end $$;
revoke all on function public.tawod_attribution_source(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.tawod_attribution_source(text,text,text,text,text) to service_role;

-- Account-period snapshots. Never sum daily reach, followers, or lifetime post counters.
create table public.tawod_social_reports (
  id uuid primary key default gen_random_uuid(),
  platform text not null check(platform in ('tiktok','instagram','facebook','x')),
  account_id text not null check(char_length(account_id) between 1 and 120),
  account_name text check(char_length(account_name)<=180),
  period_start date not null,period_end date not null,
  time_zone text not null default 'Asia/Riyadh' check(char_length(time_zone)<=80),
  scope text not null check(scope in ('organic','paid','combined')),
  source_name text not null check(char_length(source_name) between 1 and 180),
  input_kind text not null check(input_kind in ('platform_export','connector')),
  metric_definitions jsonb not null default '{}'::jsonb check(jsonb_typeof(metric_definitions)='object'),
  reach bigint check(reach>=0),views bigint check(views>=0),impressions bigint check(impressions>=0),
  interactions bigint check(interactions>=0),profile_visits bigint check(profile_visits>=0),link_clicks bigint check(link_clicks>=0),
  followers_start bigint check(followers_start>=0),followers_end bigint check(followers_end>=0),
  spend numeric(16,2) check(spend>=0),currency text check(currency ~ '^[A-Z]{3}$'),
  observed_at timestamptz not null,updated_at timestamptz not null default now(),
  constraint tawod_social_reports_dates check(period_end>=period_start and period_end-period_start<=366),
  constraint tawod_social_reports_money check(spend is null or currency is not null),
  unique(platform,account_id,scope,period_start,period_end)
);
alter table public.tawod_social_reports enable row level security;
revoke all on public.tawod_social_reports from public,anon,authenticated;
grant select,insert,update on public.tawod_social_reports to service_role;
create index tawod_social_reports_latest_idx on public.tawod_social_reports(platform,period_end desc,observed_at desc);

create function public.tawod_social_import(p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception 'invalid_social_rows'; end if;
  insert into public.tawod_social_reports(platform,account_id,account_name,period_start,period_end,time_zone,scope,source_name,input_kind,metric_definitions,
    reach,views,impressions,interactions,profile_visits,link_clicks,followers_start,followers_end,spend,currency,observed_at)
  select platform,account_id,account_name,period_start,period_end,time_zone,scope,source_name,input_kind,metric_definitions,
    reach,views,impressions,interactions,profile_visits,link_clicks,followers_start,followers_end,spend,currency,observed_at
  from jsonb_populate_recordset(null::public.tawod_social_reports,p_rows)
  on conflict(platform,account_id,scope,period_start,period_end) do update set
    account_name=excluded.account_name,time_zone=excluded.time_zone,source_name=excluded.source_name,input_kind=excluded.input_kind,metric_definitions=excluded.metric_definitions,
    reach=excluded.reach,views=excluded.views,impressions=excluded.impressions,interactions=excluded.interactions,profile_visits=excluded.profile_visits,
    link_clicks=excluded.link_clicks,followers_start=excluded.followers_start,followers_end=excluded.followers_end,spend=excluded.spend,currency=excluded.currency,
    observed_at=excluded.observed_at,updated_at=now()
  where excluded.observed_at>=tawod_social_reports.observed_at;
  get diagnostics changed=row_count;
  return jsonb_build_object('ok',true,'saved',changed,'submitted',jsonb_array_length(p_rows));
end $$;
revoke all on function public.tawod_social_import(jsonb) from public,anon,authenticated;
grant execute on function public.tawod_social_import(jsonb) to service_role;

-- Reconciled session cohorts, unlimited source totals and day buckets by session start.
create or replace function public.tawod_admin_analytics(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with
params as (
  select greatest(7, least(coalesce(p_days, 30), 90))::int as days,
         now() - make_interval(days => greatest(7, least(coalesce(p_days, 30), 90))) as since_at
),
eligible_events as (
  select * from public.tawod_analytics_events where occurred_at<=now()
    and not coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
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
current7 as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
    count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals
  from eligible_events where occurred_at >= now() - interval '7 days'
),
previous7 as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(distinct session_id) filter (where event_name = 'call_click')::int as calls,
    count(distinct session_id) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(distinct session_id) filter (where event_name in ('call_click','whatsapp_click'))::int as referrals
  from eligible_events
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
    'excludedTestEvents',(select count(*) from public.tawod_analytics_events,params where occurred_at between since_at and now() and coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'),
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
  'comparison7d', jsonb_build_object('current', to_jsonb(c), 'previous', to_jsonb(p)),
  'sources', so.data, 'devices', dv.data, 'campaigns', ca.data,
  'topPages', tp.data, 'services', sv.data, 'daily', dy.data,
  'recentReferrals', rr.data, 'dataQuality', qu.data
)
from summary s cross join today t cross join current7 c cross join previous7 p
cross join sources so cross join devices dv cross join campaigns ca cross join top_pages tp
cross join services sv cross join daily dy cross join recent_referrals rr cross join quality qu;
$function$;

revoke all on function public.tawod_admin_analytics(integer) from public,anon,authenticated;
grant execute on function public.tawod_admin_analytics(integer) to service_role;

create or replace function public.tawod_visitor_frequency(p_days integer default 30)
returns jsonb language sql stable security invoker set search_path='' as $$
with visitor_sessions as (
  select visitor_id,count(distinct session_id) as n from public.tawod_analytics_events
  where event_name='page_view' and occurred_at between now()-make_interval(days=>greatest(7,least(coalesce(p_days,30),90))) and now()
    and nullif(visitor_id,'') is not null and nullif(session_id,'') is not null
    and not coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
  group by visitor_id
)
select jsonb_build_object('visitors',count(*),'singleSessionVisitors',count(*) filter(where n=1),'returningVisitors',count(*) filter(where n>1)) from visitor_sessions;
$$;
revoke all on function public.tawod_visitor_frequency(integer) from public,anon,authenticated;
grant execute on function public.tawod_visitor_frequency(integer) to service_role;

create function public.tawod_social_workspace(p_days integer default 30,p_start_at timestamptz default null,p_end_at timestamptz default null)
returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (
  select coalesce(p_start_at,now()-make_interval(days=>greatest(7,least(coalesce(p_days,30),90)))) as start_at,coalesce(p_end_at,now()) as end_at
), events as (
  select e.* from public.tawod_analytics_events e,bounds b where e.occurred_at between b.start_at and b.end_at
    and not coalesce(e.click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
), first_page as (
  select distinct on(session_id) e.*,
    public.tawod_attribution_source(utm_source,utm_medium,referrer_host,click_id,landing_path) as source
  from events e where event_name='page_view' and nullif(session_id,'') is not null order by session_id,occurred_at,id
), contacts as (
  select session_id,bool_or(event_name='call_click') as called,bool_or(event_name='whatsapp_click') as whatsapp
  from events where event_name in ('call_click','whatsapp_click') group by session_id
), sessions as (
  select f.*,regexp_replace(f.source,'-ads$','') as platform,coalesce(c.called,false) as called,coalesce(c.whatsapp,false) as whatsapp
  from first_page f left join contacts c using(session_id)
  where f.source in ('tiktok','tiktok-ads','instagram','instagram-ads','facebook','facebook-ads','x','x-ads')
), opportunities as (
  select o.*,s.platform,s.session_id from public.tawod_sales_outcomes o
  join events e on e.id=o.source_event_id join sessions s on s.session_id=e.session_id
  where not(coalesce(o.click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)' or coalesce(o.notes,'') ~* '\mTEST_ONLY\M')
), platform_stats as (
  select platform,count(*) as sessions,count(distinct visitor_id) as visitors,
    count(*) filter(where called or whatsapp) as referrals,count(*) filter(where called) as calls,count(*) filter(where whatsapp) as whatsapp,
    count(*) filter(where source like '%-ads') as paid_sessions,
    count(*) filter(where nullif(utm_campaign,'') is not null and nullif(utm_source,'') is not null) as tagged_sessions
  from sessions group by platform
), opportunity_stats as (
  select platform,count(*) as opportunities,count(*) filter(where qualified_at is not null) as qualified,
    count(*) filter(where stage='contract_signed') as contracts,coalesce(sum(contract_value) filter(where stage='contract_signed'),0) as contract_value
  from opportunities group by platform
), all_platforms as (
  select unnest(array['tiktok','instagram','facebook','x']) as platform
), reports as (
  select distinct on(platform,account_id,scope) r.* from public.tawod_social_reports r
  order by platform,account_id,scope,period_end desc,observed_at desc,id
), campaigns as (
  select platform,coalesce(nullif(utm_campaign,''),'غير موسومة') as campaign,coalesce(nullif(utm_content,''),'—') as content,
    count(*) as sessions,count(*) filter(where called or whatsapp) as referrals,
    count(*) filter(where source like '%-ads') as paid_sessions
  from sessions group by 1,2,3
), daily as (
  select timezone('Asia/Riyadh',occurred_at)::date as date,platform,count(*) as sessions,count(*) filter(where called or whatsapp) as referrals
  from sessions group by 1,2
)
select jsonb_build_object(
  'available',true,'generatedAt',now(),'window',jsonb_build_object('startAt',b.start_at,'endAt',b.end_at,'timeZone','Asia/Riyadh'),
  'platforms',coalesce((select jsonb_agg(jsonb_build_object(
    'platform',a.platform,'sessions',coalesce(s.sessions,0),'visitors',coalesce(s.visitors,0),'referrals',coalesce(s.referrals,0),
    'calls',coalesce(s.calls,0),'whatsapp',coalesce(s.whatsapp,0),'paidSessions',coalesce(s.paid_sessions,0),'taggedSessions',coalesce(s.tagged_sessions,0),
    'opportunities',coalesce(o.opportunities,0),'qualified',coalesce(o.qualified,0),'contracts',coalesce(o.contracts,0),'contractValue',coalesce(o.contract_value,0)
  ) order by array_position(array['tiktok','instagram','facebook','x'],a.platform))
  from all_platforms a left join platform_stats s using(platform) left join opportunity_stats o using(platform)),'[]'::jsonb),
  'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.platform,r.account_id,r.scope) from (select * from reports limit 200) r),'[]'::jsonb),
  'reportsTruncated',(select count(*)>200 from reports),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by c.sessions desc,c.platform,c.campaign,c.content)
    from (select * from campaigns order by sessions desc,platform,campaign,content limit 100) c),'[]'::jsonb),
  'campaignsTruncated',(select count(*)>100 from campaigns),
  'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.date,d.platform) from daily d),'[]'::jsonb)
) from bounds b;
$$;
revoke all on function public.tawod_social_workspace(integer,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.tawod_social_workspace(integer,timestamptz,timestamptz) to service_role;

-- Reclassify linked evidence at read time; preserve the recorded sales audit trail.
create or replace function public.tawod_sales_commercial(p_days integer default 30)
returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (
  select now()-make_interval(days=>greatest(7,least(coalesce(p_days,30),90))) as start_at,now() as end_at
), real_rows as (
  select o.*,
    case when source_event_id is null then 'unlinked' else public.tawod_attribution_source(e.utm_source,e.utm_medium,e.referrer_host,e.click_id,e.landing_path) end as source_key
  from public.tawod_sales_outcomes o left join public.tawod_analytics_events e on e.id=o.source_event_id
  where not (coalesce(o.click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)' or coalesce(notes,'') ~* '\mTEST_ONLY\M')
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
