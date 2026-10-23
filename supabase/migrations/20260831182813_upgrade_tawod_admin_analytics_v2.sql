-- Restored from Supabase schema history: 20260831182813 / upgrade_tawod_admin_analytics_v2.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

-- Schema-only baseline for analytics, originally created outside recorded migrations.
create table if not exists public.tawod_analytics_events (
  id uuid default gen_random_uuid() not null,
  occurred_at timestamp with time zone default now() not null,
  event_name text not null,
  visitor_id text,
  session_id text,
  page_path text default '/'::text not null,
  page_title text,
  landing_path text,
  referrer_host text,
  device_type text,
  contact_method text,
  form_name text,
  form_source_path text,
  service_type text,
  article_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  metadata jsonb default '{}'::jsonb not null,
  click_id text,
  constraint tawod_analytics_events_pkey PRIMARY KEY (id),
  constraint tawod_device_allowed CHECK (((device_type IS NULL) OR (device_type = ANY (ARRAY['mobile'::text, 'tablet'::text, 'desktop'::text])))),
  constraint tawod_event_name_allowed CHECK ((event_name = ANY (ARRAY['page_view'::text, 'call_click'::text, 'whatsapp_click'::text, 'form_submit_attempt'::text, 'generate_lead'::text, 'article_view'::text, 'article_50_scroll'::text, 'article_90_scroll'::text, 'article_service_click'::text, 'article_project_click'::text, 'related_article_click'::text, 'article_quote_click'::text, 'article_hub_click'::text]))),
  constraint tawod_metadata_size CHECK ((octet_length((metadata)::text) <= 8192)),
  constraint tawod_page_path_len CHECK ((char_length(page_path) <= 500)),
  constraint tawod_page_title_len CHECK (((page_title IS NULL) OR (char_length(page_title) <= 300))),
  constraint tawod_session_len CHECK (((session_id IS NULL) OR (char_length(session_id) <= 80))),
  constraint tawod_visitor_len CHECK (((visitor_id IS NULL) OR (char_length(visitor_id) <= 80)))
);
CREATE INDEX IF NOT EXISTS tawod_events_occurred_at_idx ON public.tawod_analytics_events USING btree (occurred_at DESC);
CREATE INDEX IF NOT EXISTS tawod_events_name_time_idx ON public.tawod_analytics_events USING btree (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS tawod_events_page_time_idx ON public.tawod_analytics_events USING btree (page_path, occurred_at DESC);
CREATE INDEX IF NOT EXISTS tawod_events_session_time_idx ON public.tawod_analytics_events USING btree (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS tawod_events_source_time_idx ON public.tawod_analytics_events USING btree (utm_source, occurred_at DESC);
alter table public.tawod_analytics_events enable row level security;
alter table public.tawod_analytics_events force row level security;
revoke all on public.tawod_analytics_events from public, anon, authenticated, service_role;
grant select, insert on public.tawod_analytics_events to service_role;

create or replace function public.tawod_admin_analytics(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with params as (
  select greatest(7, least(coalesce(p_days, 30), 90))::int as days
),
window_events as (
  select e.*
  from public.tawod_analytics_events e, params p
  where e.occurred_at >= now() - make_interval(days => p.days)
),
summary as (
  select
    count(distinct visitor_id) filter (where event_name = 'page_view')::int as visitors,
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(*) filter (where event_name = 'call_click')::int as calls,
    count(*) filter (where event_name = 'whatsapp_click')::int as whatsapp,
    count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts,
    count(*) filter (where event_name = 'form_submit_attempt')::int as form_attempts,
    count(*) filter (where event_name = 'generate_lead')::int as leads,
    count(*) filter (where event_name = 'article_view')::int as article_views
  from window_events
),
today as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts,
    count(*) filter (where event_name = 'generate_lead')::int as leads
  from public.tawod_analytics_events
  where occurred_at >= now() - interval '24 hours'
),
current7 as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts,
    count(*) filter (where event_name = 'generate_lead')::int as leads
  from public.tawod_analytics_events
  where occurred_at >= now() - interval '7 days'
),
previous7 as (
  select
    count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts,
    count(*) filter (where event_name = 'generate_lead')::int as leads
  from public.tawod_analytics_events
  where occurred_at >= now() - interval '14 days'
    and occurred_at < now() - interval '7 days'
),
page_stats as (
  select page_path,
    count(*) filter (where event_name = 'page_view')::int as views,
    count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts
  from window_events
  where event_name in ('page_view','call_click','whatsapp_click')
  group by page_path
  having count(*) filter (where event_name = 'page_view') > 0
),
lead_by_page as (
  select coalesce(nullif(form_source_path,''), nullif(landing_path,''), page_path) as page_path,
    count(*)::int as leads
  from window_events
  where event_name = 'generate_lead'
  group by 1
),
top_pages as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'path', q.page_path, 'views', q.views, 'contacts', q.contacts, 'leads', q.leads,
    'contactRate', q.contact_rate, 'leadRate', q.lead_rate
  ) order by q.views desc), '[]'::jsonb) as data
  from (
    select p.page_path, p.views, p.contacts, coalesce(l.leads,0)::int as leads,
      round((p.contacts::numeric / nullif(p.views,0)) * 100, 2) as contact_rate,
      round((coalesce(l.leads,0)::numeric / nullif(p.views,0)) * 100, 2) as lead_rate
    from page_stats p
    left join lead_by_page l using (page_path)
    order by p.views desc
    limit 12
  ) q
),
service_stats as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'service', q.service, 'attempts', q.attempts, 'leads', q.leads, 'completionRate', q.completion_rate
  ) order by q.attempts desc, q.leads desc), '[]'::jsonb) as data
  from (
    select coalesce(nullif(service_type,''), 'غير محدد') as service,
      count(*) filter (where event_name = 'form_submit_attempt')::int as attempts,
      count(*) filter (where event_name = 'generate_lead')::int as leads,
      round((count(*) filter (where event_name = 'generate_lead')::numeric /
        nullif(count(*) filter (where event_name = 'form_submit_attempt'),0)) * 100, 2) as completion_rate
    from window_events
    where event_name in ('form_submit_attempt','generate_lead')
    group by 1
    order by attempts desc, leads desc
    limit 12
  ) q
),
source_sessions as (
  select case
      when nullif(utm_source,'') is not null then lower(utm_source)
      when coalesce(referrer_host,'') = '' then 'direct'
      when referrer_host ilike '%google.%' then 'google-organic'
      else lower(referrer_host)
    end as source,
    count(distinct session_id)::int as sessions,
    count(*)::int as views
  from window_events
  where event_name = 'page_view'
  group by 1
),
source_leads as (
  select case
      when nullif(utm_source,'') is not null then lower(utm_source)
      when coalesce(referrer_host,'') = '' then 'direct'
      when referrer_host ilike '%google.%' then 'google-organic'
      else lower(referrer_host)
    end as source,
    count(*)::int as leads
  from window_events
  where event_name = 'generate_lead'
  group by 1
),
sources as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'source', q.source, 'sessions', q.sessions, 'views', q.views, 'leads', q.leads, 'leadRate', q.lead_rate
  ) order by q.sessions desc), '[]'::jsonb) as data
  from (
    select s.source, s.sessions, s.views, coalesce(l.leads,0)::int as leads,
      round((coalesce(l.leads,0)::numeric / nullif(s.sessions,0)) * 100, 2) as lead_rate
    from source_sessions s
    left join source_leads l using (source)
    order by s.sessions desc
    limit 12
  ) q
),
campaigns as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaign', q.campaign, 'source', q.source, 'medium', q.medium,
    'sessions', q.sessions, 'views', q.views, 'contacts', q.contacts, 'leads', q.leads,
    'leadRate', q.lead_rate
  ) order by q.sessions desc, q.leads desc), '[]'::jsonb) as data
  from (
    select
      utm_campaign as campaign,
      coalesce(nullif(utm_source,''),'—') as source,
      coalesce(nullif(utm_medium,''),'—') as medium,
      count(distinct session_id) filter (where event_name = 'page_view')::int as sessions,
      count(*) filter (where event_name = 'page_view')::int as views,
      count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts,
      count(*) filter (where event_name = 'generate_lead')::int as leads,
      coalesce(round((count(*) filter (where event_name = 'generate_lead')::numeric /
        nullif(count(distinct session_id) filter (where event_name = 'page_view'),0)) * 100, 2),0) as lead_rate
    from window_events
    where nullif(utm_campaign,'') is not null
    group by utm_campaign, coalesce(nullif(utm_source,''),'—'), coalesce(nullif(utm_medium,''),'—')
    order by sessions desc, leads desc
    limit 15
  ) q
),
devices as (
  select coalesce(jsonb_agg(jsonb_build_object('device', q.device, 'sessions', q.sessions, 'views', q.views)
    order by q.sessions desc), '[]'::jsonb) as data
  from (
    select coalesce(nullif(device_type,''),'unknown') as device,
      count(distinct session_id)::int as sessions,
      count(*)::int as views
    from window_events
    where event_name = 'page_view'
    group by 1
    order by sessions desc
  ) q
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object('date', q.day, 'views', q.views, 'contacts', q.contacts, 'leads', q.leads)
    order by q.day), '[]'::jsonb) as data
  from (
    select timezone('Asia/Riyadh', occurred_at)::date as day,
      count(*) filter (where event_name = 'page_view')::int as views,
      count(*) filter (where event_name in ('call_click','whatsapp_click'))::int as contacts,
      count(*) filter (where event_name = 'generate_lead')::int as leads
    from window_events
    group by 1
    order by 1
  ) q
),
recent_leads as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'at', q.occurred_at,
    'service', coalesce(nullif(q.service_type,''),'غير محدد'),
    'sourcePath', coalesce(nullif(q.form_source_path,''), nullif(q.landing_path,''), q.page_path),
    'source', coalesce(nullif(q.utm_source,''), case when coalesce(q.referrer_host,'') = '' then 'direct' when q.referrer_host ilike '%google.%' then 'google-organic' else q.referrer_host end),
    'medium', coalesce(nullif(q.utm_medium,''),'—'),
    'campaign', coalesce(nullif(q.utm_campaign,''),'—'),
    'device', coalesce(nullif(q.device_type,''),'unknown'),
    'session', right(coalesce(q.session_id,''), 8)
  ) order by q.occurred_at desc), '[]'::jsonb) as data
  from (
    select * from window_events
    where event_name = 'generate_lead'
    order by occurred_at desc
    limit 30
  ) q
)
select jsonb_build_object(
  'generatedAt', now(),
  'periodDays', (select days from params),
  'summary', jsonb_build_object(
    'visitors', s.visitors, 'sessions', s.sessions, 'views', s.views,
    'calls', s.calls, 'whatsapp', s.whatsapp, 'contacts', s.contacts,
    'formAttempts', s.form_attempts, 'leads', s.leads, 'articleViews', s.article_views,
    'contactRate', coalesce(round((s.contacts::numeric / nullif(s.sessions,0)) * 100, 2), 0),
    'leadRate', coalesce(round((s.leads::numeric / nullif(s.sessions,0)) * 100, 2), 0),
    'formCompletionRate', coalesce(round((s.leads::numeric / nullif(s.form_attempts,0)) * 100, 2), 0)
  ),
  'today', to_jsonb(t),
  'comparison7d', jsonb_build_object('current', to_jsonb(c), 'previous', to_jsonb(p)),
  'topPages', tp.data,
  'services', sv.data,
  'sources', so.data,
  'campaigns', ca.data,
  'devices', d.data,
  'daily', dy.data,
  'recentLeads', rl.data
)
from summary s
cross join today t
cross join current7 c
cross join previous7 p
cross join top_pages tp
cross join service_stats sv
cross join sources so
cross join campaigns ca
cross join devices d
cross join daily dy
cross join recent_leads rl;
$$;

revoke all on function public.tawod_admin_analytics(integer) from public, anon, authenticated;

grant execute on function public.tawod_admin_analytics(integer) to service_role;
