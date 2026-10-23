-- Restored from Supabase schema history: 20261008195557 / tawod_maintenance_function_overview.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create function public.tawod_maintenance_overview(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_id uuid; v_customer uuid; v_services text[]; v_snapshot jsonb; v_result jsonb; v_before jsonb;
 v_row public.tawod_maintenance_requests; v_entity text:=coalesce(p_payload->>'entity','requests');
 v_version integer:=coalesce((p_payload->>'version')::integer,0); v_total integer;
 v_search text:=left(coalesce(p_payload->>'search',''),100); v_filter text:=coalesce(p_payload->>'filter','active');
 v_offset integer:=greatest(0,least(coalesce((p_payload->>'page')::integer,1),100000)-1)*50;
 v_today date:=(now() at time zone 'Asia/Riyadh')::date;
 v_days integer:=greatest(7,least(coalesce((p_payload->>'days')::integer,30),90));
 v_rate text; v_count integer; v_key uuid;
begin
 if p_actor not in ('admin','website') or (p_actor='website' and p_action<>'submit') then raise exception 'unauthorized'; end if;
 if p_action='overview' then
  select jsonb_build_object(
   'open',count(*) filter(where status not in ('completed','cancelled')),
   'new',count(*) filter(where status='new'),
   'inspectionsToday',count(*) filter(where status not in ('completed','cancelled') and (inspection_at at time zone 'Asia/Riyadh')::date=v_today),
   'overdue',count(*) filter(where status not in ('completed','cancelled') and next_followup_at<now()),
   'contracts',count(*) filter(where request_type='contract' and status not in ('completed','cancelled') and (contract_end is null or contract_end>=v_today)),
   'unassigned',count(*) filter(where assignee_id is null and status not in ('completed','cancelled')),
   'completed',count(*) filter(where status='completed'),
   'total',count(*),
   'quotedValue',coalesce(sum(quote_amount) filter(where status in ('quoted','in_progress')),0)
  ) into v_result from public.tawod_maintenance_requests where archived_at is null;
  return jsonb_build_object('summary',v_result,
   'customers',(select count(*) from public.tawod_maintenance_customers where archived_at is null),
   'staff',(select count(*) from public.tawod_maintenance_staff where active and archived_at is null),
   'services',(select coalesce(jsonb_agg(to_jsonb(s) order by s.group_name,s.name),'[]') from public.tawod_maintenance_services s),
   'team',(select coalesce(jsonb_agg(to_jsonb(s) order by s.name),'[]') from public.tawod_maintenance_staff s where s.archived_at is null),
   'pipeline',(select coalesce(jsonb_agg(x),'[]') from (select status,count(*) as count from public.tawod_maintenance_requests where archived_at is null group by status) x),
   'latest',(select coalesce(jsonb_agg(x),'[]') from (select r.*,c.phone customer_phone,coalesce(s.name,'') assignee_name from public.tawod_maintenance_requests r join public.tawod_maintenance_customers c on c.id=r.customer_id left join public.tawod_maintenance_staff s on s.id=r.assignee_id where r.archived_at is null order by r.created_at desc limit 8) x),
   'due',(select coalesce(jsonb_agg(x),'[]') from (select r.*,c.phone customer_phone,coalesce(s.name,'') assignee_name from public.tawod_maintenance_requests r join public.tawod_maintenance_customers c on c.id=r.customer_id left join public.tawod_maintenance_staff s on s.id=r.assignee_id where r.archived_at is null and r.status not in ('completed','cancelled') and r.next_followup_at is not null order by r.next_followup_at limit 8) x),
   'visits',(select coalesce(jsonb_agg(x),'[]') from (select r.*,c.phone customer_phone,coalesce(s.name,'') assignee_name from public.tawod_maintenance_requests r join public.tawod_maintenance_customers c on c.id=r.customer_id left join public.tawod_maintenance_staff s on s.id=r.assignee_id where r.archived_at is null and r.status not in ('completed','cancelled') and r.inspection_at is not null and (r.inspection_at at time zone 'Asia/Riyadh')::date>=v_today order by r.inspection_at limit 6) x),
   'period',jsonb_build_object('days',v_days,'newRequests',(select count(*) from public.tawod_maintenance_requests where archived_at is null and created_at>=now()-v_days*interval '1 day'),'completedRequests',(select count(*) from public.tawod_maintenance_requests where archived_at is null and completed_at>=now()-v_days*interval '1 day')),
   'trend',(select coalesce(jsonb_agg(x order by x.date),'[]') from (select d::date date,(select count(*) from public.tawod_maintenance_requests r where r.archived_at is null and (r.created_at at time zone 'Asia/Riyadh')::date=d::date) requests from generate_series(v_today-13,v_today,interval '1 day') d) x));
 end if;

 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_overview(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_overview(text,jsonb,text) to service_role;
