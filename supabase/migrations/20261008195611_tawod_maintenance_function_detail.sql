-- Restored from Supabase schema history: 20261008195611 / tawod_maintenance_function_detail.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create function public.tawod_maintenance_detail(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if p_action='detail' then
  v_id:=(p_payload->>'id')::uuid;
  select to_jsonb(r)||jsonb_build_object('customer_phone',c.phone,'customer_name',c.name,'assignee_name',coalesce(s.name,'')) into v_result from public.tawod_maintenance_requests r join public.tawod_maintenance_customers c on c.id=r.customer_id left join public.tawod_maintenance_staff s on s.id=r.assignee_id where r.id=v_id;
  if v_result is null then raise exception 'not_found'; end if;
  return jsonb_build_object('record',v_result,'history',(select coalesce(jsonb_agg(x),'[]') from (select actor,action,changes,occurred_at from public.tawod_maintenance_activity where request_id=v_id order by occurred_at desc limit 30) x));
 end if;

 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_detail(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_detail(text,jsonb,text) to service_role;
