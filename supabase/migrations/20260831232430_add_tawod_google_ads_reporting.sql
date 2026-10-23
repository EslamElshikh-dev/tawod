-- Restored from Supabase schema history: 20260831232430 / add_tawod_google_ads_reporting.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create extension if not exists pgcrypto;

create table if not exists public.tawod_google_ads_daily (
  report_date date not null,
  customer_id text not null,
  currency_code text not null default 'SAR',
  campaign_id bigint not null,
  campaign_name text not null,
  campaign_status text,
  channel_type text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  cost_micros bigint not null default 0,
  conversions numeric not null default 0,
  all_conversions numeric not null default 0,
  conversions_value numeric not null default 0,
  phone_calls bigint not null default 0,
  phone_impressions bigint not null default 0,
  phone_through_rate numeric not null default 0,
  synced_at timestamptz not null default now(),
  primary key (report_date, customer_id, campaign_id)
);

create table if not exists public.tawod_google_ads_conversion_daily (
  report_date date not null,
  customer_id text not null,
  campaign_id bigint not null,
  campaign_name text not null,
  conversion_action_name text not null,
  conversions numeric not null default 0,
  all_conversions numeric not null default 0,
  conversions_value numeric not null default 0,
  synced_at timestamptz not null default now(),
  primary key (report_date, customer_id, campaign_id, conversion_action_name)
);

create table if not exists public.tawod_sync_keys (
  name text primary key,
  key_hash text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.tawod_google_ads_daily enable row level security;

alter table public.tawod_google_ads_daily force row level security;

alter table public.tawod_google_ads_conversion_daily enable row level security;

alter table public.tawod_google_ads_conversion_daily force row level security;

alter table public.tawod_sync_keys enable row level security;

alter table public.tawod_sync_keys force row level security;

revoke all on public.tawod_google_ads_daily from public, anon, authenticated;

revoke all on public.tawod_google_ads_conversion_daily from public, anon, authenticated;

revoke all on public.tawod_sync_keys from public, anon, authenticated;

grant select, insert, update on public.tawod_google_ads_daily to service_role;

grant select, insert, update on public.tawod_google_ads_conversion_daily to service_role;

grant select, update on public.tawod_sync_keys to service_role;

create index if not exists tawod_google_ads_daily_date_idx on public.tawod_google_ads_daily(report_date desc);

create index if not exists tawod_google_ads_daily_campaign_idx on public.tawod_google_ads_daily(campaign_id, report_date desc);

create index if not exists tawod_google_ads_conv_date_idx on public.tawod_google_ads_conversion_daily(report_date desc);

create or replace function public.tawod_google_ads_analytics(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $function$
with params as (
  select greatest(7, least(coalesce(p_days,30),90))::int as days
),
window_rows as (
  select d.* from public.tawod_google_ads_daily d, params p
  where d.report_date >= (current_date - (p.days - 1))
),
window_conv as (
  select c.* from public.tawod_google_ads_conversion_daily c, params p
  where c.report_date >= (current_date - (p.days - 1))
),
conv_classified as (
  select report_date, customer_id, campaign_id,
    sum(conversions) filter (where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)') as whatsapp_conversions,
    sum(conversions) filter (where lower(conversion_action_name) ~ '(call|phone|مكال|اتصال)') as call_conversions
  from window_conv
  group by report_date, customer_id, campaign_id
),
summary_base as (
  select
    coalesce(sum(impressions),0)::bigint impressions,
    coalesce(sum(clicks),0)::bigint clicks,
    coalesce(sum(cost_micros),0)::bigint cost_micros,
    coalesce(sum(conversions),0)::numeric conversions,
    coalesce(sum(all_conversions),0)::numeric all_conversions,
    coalesce(sum(conversions_value),0)::numeric conversions_value,
    coalesce(sum(phone_calls),0)::bigint phone_calls,
    coalesce(sum(phone_impressions),0)::bigint phone_impressions,
    max(currency_code) currency_code
  from window_rows
),
summary_conv as (
  select
    coalesce(sum(whatsapp_conversions),0)::numeric whatsapp_conversions,
    coalesce(sum(call_conversions),0)::numeric call_conversions
  from conv_classified
),
current7_base as (
  select coalesce(sum(impressions),0)::bigint impressions, coalesce(sum(clicks),0)::bigint clicks,
    coalesce(sum(cost_micros),0)::bigint cost_micros, coalesce(sum(conversions),0)::numeric conversions,
    coalesce(sum(phone_calls),0)::bigint phone_calls
  from public.tawod_google_ads_daily where report_date >= current_date - 6
),
previous7_base as (
  select coalesce(sum(impressions),0)::bigint impressions, coalesce(sum(clicks),0)::bigint clicks,
    coalesce(sum(cost_micros),0)::bigint cost_micros, coalesce(sum(conversions),0)::numeric conversions,
    coalesce(sum(phone_calls),0)::bigint phone_calls
  from public.tawod_google_ads_daily where report_date between current_date - 13 and current_date - 7
),
current7_conv as (
  select coalesce(sum(conversions) filter(where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric whatsapp_conversions
  from public.tawod_google_ads_conversion_daily where report_date >= current_date - 6
),
previous7_conv as (
  select coalesce(sum(conversions) filter(where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric whatsapp_conversions
  from public.tawod_google_ads_conversion_daily where report_date between current_date - 13 and current_date - 7
),
campaign_conv as (
  select customer_id,campaign_id,
    coalesce(sum(conversions) filter(where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric whatsapp_conversions,
    coalesce(sum(conversions) filter(where lower(conversion_action_name) ~ '(call|phone|مكال|اتصال)'),0)::numeric call_conversions
  from window_conv group by customer_id,campaign_id
),
campaigns as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaignId',q.campaign_id,'name',q.campaign_name,'status',q.campaign_status,'channelType',q.channel_type,
    'impressions',q.impressions,'clicks',q.clicks,'cost',q.cost,'conversions',q.conversions,
    'phoneCalls',q.phone_calls,'whatsappConversions',q.whatsapp_conversions,'callConversions',q.call_conversions,
    'ctr',q.ctr,'avgCpc',q.avg_cpc,'cpa',q.cpa
  ) order by q.cost desc, q.conversions desc),'[]'::jsonb) data
  from (
    select d.campaign_id,max(d.campaign_name) campaign_name,max(d.campaign_status) campaign_status,max(d.channel_type) channel_type,
      sum(d.impressions)::bigint impressions,sum(d.clicks)::bigint clicks,(sum(d.cost_micros)::numeric/1000000) cost,
      sum(d.conversions)::numeric conversions,sum(d.phone_calls)::bigint phone_calls,
      coalesce(c.whatsapp_conversions,0)::numeric whatsapp_conversions,coalesce(c.call_conversions,0)::numeric call_conversions,
      coalesce(round((sum(d.clicks)::numeric/nullif(sum(d.impressions),0))*100,2),0) ctr,
      coalesce(round((sum(d.cost_micros)::numeric/1000000/nullif(sum(d.clicks),0)),2),0) avg_cpc,
      coalesce(round((sum(d.cost_micros)::numeric/1000000/nullif(sum(d.conversions),0)),2),0) cpa
    from window_rows d left join campaign_conv c on c.customer_id=d.customer_id and c.campaign_id=d.campaign_id
    group by d.campaign_id,c.whatsapp_conversions,c.call_conversions
    order by sum(d.cost_micros) desc limit 25
  ) q
),
daily_conv as (
  select report_date,
    coalesce(sum(conversions) filter(where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric whatsapp_conversions
  from window_conv group by report_date
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'date',q.report_date,'impressions',q.impressions,'clicks',q.clicks,'cost',q.cost,'conversions',q.conversions,
    'phoneCalls',q.phone_calls,'whatsappConversions',q.whatsapp_conversions
  ) order by q.report_date),'[]'::jsonb) data
  from (
    select d.report_date,sum(d.impressions)::bigint impressions,sum(d.clicks)::bigint clicks,
      (sum(d.cost_micros)::numeric/1000000) cost,sum(d.conversions)::numeric conversions,sum(d.phone_calls)::bigint phone_calls,
      coalesce(c.whatsapp_conversions,0)::numeric whatsapp_conversions
    from window_rows d left join daily_conv c using(report_date)
    group by d.report_date,c.whatsapp_conversions order by d.report_date
  ) q
),
actions as (
  select coalesce(jsonb_agg(jsonb_build_object('name',q.conversion_action_name,'conversions',q.conversions,'value',q.value) order by q.conversions desc),'[]'::jsonb) data
  from (
    select conversion_action_name,sum(conversions)::numeric conversions,sum(conversions_value)::numeric value
    from window_conv group by conversion_action_name order by conversions desc limit 20
  ) q
),
connection as (
  select exists(select 1 from public.tawod_google_ads_daily) connected,
    (select max(synced_at) from public.tawod_google_ads_daily) last_sync_at,
    (select max(customer_id) from public.tawod_google_ads_daily) customer_id,
    (select max(currency_code) from public.tawod_google_ads_daily) currency_code
)
select jsonb_build_object(
  'connected',cn.connected,'lastSyncAt',cn.last_sync_at,'customerId',cn.customer_id,'currency',coalesce(cn.currency_code,s.currency_code,'SAR'),
  'periodDays',(select days from params),
  'summary',jsonb_build_object(
    'impressions',s.impressions,'clicks',s.clicks,'cost',round((s.cost_micros::numeric/1000000),2),
    'conversions',s.conversions,'allConversions',s.all_conversions,'conversionValue',s.conversions_value,
    'phoneCalls',s.phone_calls,'phoneImpressions',s.phone_impressions,
    'whatsappConversions',sc.whatsapp_conversions,'callConversions',sc.call_conversions,
    'ctr',coalesce(round((s.clicks::numeric/nullif(s.impressions,0))*100,2),0),
    'avgCpc',coalesce(round((s.cost_micros::numeric/1000000/nullif(s.clicks,0)),2),0),
    'cpa',coalesce(round((s.cost_micros::numeric/1000000/nullif(s.conversions,0)),2),0),
    'phoneThroughRate',coalesce(round((s.phone_calls::numeric/nullif(s.phone_impressions,0))*100,2),0)
  ),
  'comparison7d',jsonb_build_object(
    'current',jsonb_build_object('impressions',c.impressions,'clicks',c.clicks,'cost',round((c.cost_micros::numeric/1000000),2),'conversions',c.conversions,'phoneCalls',c.phone_calls,'whatsappConversions',cc.whatsapp_conversions),
    'previous',jsonb_build_object('impressions',p.impressions,'clicks',p.clicks,'cost',round((p.cost_micros::numeric/1000000),2),'conversions',p.conversions,'phoneCalls',p.phone_calls,'whatsappConversions',pc.whatsapp_conversions)
  ),
  'campaigns',ca.data,'daily',dy.data,'conversionActions',ac.data
)
from summary_base s cross join summary_conv sc cross join current7_base c cross join previous7_base p
cross join current7_conv cc cross join previous7_conv pc cross join campaigns ca cross join daily dy cross join actions ac cross join connection cn;
$function$;

revoke all on function public.tawod_google_ads_analytics(integer) from public, anon, authenticated;

grant execute on function public.tawod_google_ads_analytics(integer) to service_role;
