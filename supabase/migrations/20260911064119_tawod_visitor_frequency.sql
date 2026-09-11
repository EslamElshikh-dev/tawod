-- Accurate visitor-frequency metrics for the Tawod command center.
-- A repeat visitor has more than one distinct session in the selected period.

create or replace function public.tawod_visitor_frequency(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select now() - make_interval(
      days => greatest(7, least(coalesce(p_days, 30), 90))
    ) as since_at
  ),
  visitor_sessions as (
    select
      e.visitor_id,
      count(distinct e.session_id)::int as session_count
    from public.tawod_analytics_events as e
    cross join params as p
    where e.event_name = 'page_view'
      and e.occurred_at >= p.since_at
      and nullif(e.visitor_id, '') is not null
      and nullif(e.session_id, '') is not null
    group by e.visitor_id
  )
  select jsonb_build_object(
    'visitors', count(*)::int,
    'singleSessionVisitors', count(*) filter (where session_count = 1)::int,
    'returningVisitors', count(*) filter (where session_count > 1)::int
  )
  from visitor_sessions;
$$;

revoke all on function public.tawod_visitor_frequency(integer) from public, anon, authenticated;
grant execute on function public.tawod_visitor_frequency(integer) to service_role;

comment on function public.tawod_visitor_frequency(integer) is
  'Returns single-session and repeat-visitor counts for the private Tawod command center.';
