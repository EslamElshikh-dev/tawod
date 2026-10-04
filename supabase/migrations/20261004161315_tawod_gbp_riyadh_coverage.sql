-- The location binding is private configuration, never seeded in public source.
create table if not exists public.tawod_business_profile_connection (
  slot text primary key check (slot = 'primary'),
  location_id text not null,
  updated_at timestamptz not null default now()
);
alter table public.tawod_business_profile_connection enable row level security;
revoke all on public.tawod_business_profile_connection from public, anon, authenticated;
grant select,insert,update on public.tawod_business_profile_connection to service_role;

create or replace function public.tawod_business_profile_analytics(p_days integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $function$
with
params as (select greatest(7, least(coalesce(p_days,30),90))::int as days, (now() at time zone 'Asia/Riyadh')::date as today),
window_rows as (
  select d.* from public.tawod_business_profile_daily d, params p
  where d.location_id = (select location_id from public.tawod_business_profile_connection where slot = 'primary') and d.report_date between p.today - (p.days - 1) and p.today
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
    'calls',q.calls,'websiteClicks',q.website_clicks,'directions',q.directions,'bookings',q.bookings
  ) order by q.report_date),'[]'::jsonb) as data
  from (
    select report_date,
      sum(search_desktop_impressions + search_mobile_impressions)::bigint as search_impressions,
      sum(maps_desktop_impressions + maps_mobile_impressions)::bigint as maps_impressions,
      sum(call_clicks)::bigint as calls, sum(conversations)::bigint as conversations,
      sum(website_clicks)::bigint as website_clicks, sum(direction_requests)::bigint as directions, sum(bookings)::bigint as bookings
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
    where location_id = (select location_id from public.tawod_business_profile_connection where slot = 'primary') and report_month between date_trunc('month', p.today - (p.days - 1))::date and date_trunc('month', p.today)::date
    group by report_month, search_keyword order by impressions desc limit 30
  ) q
),
connection as (
  select exists(select 1 from window_rows) as connected,
    (select max(synced_at) from window_rows) as last_sync_at,
    (select max(profile_name) from window_rows) as profile_name,
    (select count(distinct location_id) from window_rows)::int as locations
)
select jsonb_build_object(
  'connected',c.connected,'lastSyncAt',c.last_sync_at,'profileName',c.profile_name,'locations',c.locations,
  'periodDays',(select days from params),
  'rangeStart',(select today - (days - 1) from params),'rangeEnd',(select today from params),
  'lastReportDate',(select max(report_date) from window_rows),
  'reportingDays',(select count(distinct report_date) from window_rows),
  'locationId',(select location_id from public.tawod_business_profile_connection where slot = 'primary'),'timeZone','Asia/Riyadh',
  'source','Google Business Profile via Windsor','syncCadence','daily',
  'conversationsAvailable',false,
  'summary',jsonb_build_object(
    'searchDesktopImpressions',s.search_desktop,'searchMobileImpressions',s.search_mobile,
    'searchImpressions',s.search_desktop+s.search_mobile,
    'mapsDesktopImpressions',s.maps_desktop,'mapsMobileImpressions',s.maps_mobile,
    'mapsImpressions',s.maps_desktop+s.maps_mobile,
    'totalImpressions',s.search_desktop+s.search_mobile+s.maps_desktop+s.maps_mobile,
    'calls',s.calls,'conversations',null,'websiteClicks',s.website_clicks,
    'directions',s.directions,'bookings',s.bookings,
    'actionRate',coalesce(round((s.calls+s.website_clicks+s.directions+s.bookings)::numeric /
      nullif(s.search_desktop+s.search_mobile+s.maps_desktop+s.maps_mobile,0)*100,2),0)
  ),
  'daily',d.data,'keywords',k.data
)
from summary s cross join daily d cross join keywords k cross join connection c;
$function$;
revoke all on function public.tawod_business_profile_analytics(integer) from public,anon,authenticated;
grant execute on function public.tawod_business_profile_analytics(integer) to service_role;
