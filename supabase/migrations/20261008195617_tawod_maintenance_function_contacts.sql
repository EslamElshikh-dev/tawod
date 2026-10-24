-- Restored from Supabase schema history: 20261008195617 / tawod_maintenance_function_contacts.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create function public.tawod_maintenance_contacts(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if p_action in ('save_customer','save_staff') then
  v_id:=nullif(p_payload->>'id','')::uuid;
  if p_action='save_customer' then
   if v_id is null then insert into public.tawod_maintenance_customers(name,phone,company,district,notes) values(p_payload->>'name',p_payload->>'phone',coalesce(p_payload->>'company',''),coalesce(p_payload->>'district',''),coalesce(p_payload->>'notes','')) returning to_jsonb(tawod_maintenance_customers) into v_result;
   else select to_jsonb(c) into v_before from public.tawod_maintenance_customers c where id=v_id for update; if v_before is null then raise exception 'not_found'; end if;
    update public.tawod_maintenance_customers set name=p_payload->>'name',phone=p_payload->>'phone',company=coalesce(p_payload->>'company',''),district=coalesce(p_payload->>'district',''),notes=coalesce(p_payload->>'notes',''),version=version+1,updated_at=now() where id=v_id and version=v_version returning to_jsonb(tawod_maintenance_customers) into v_result; end if;
  else
   if v_id is null then insert into public.tawod_maintenance_staff(name,specialty,phone,active,notes) values(p_payload->>'name',coalesce(p_payload->>'specialty',''),nullif(p_payload->>'phone',''),coalesce((p_payload->>'active')::boolean,true),coalesce(p_payload->>'notes','')) returning to_jsonb(tawod_maintenance_staff) into v_result;
   else select to_jsonb(s) into v_before from public.tawod_maintenance_staff s where id=v_id for update; if v_before is null then raise exception 'not_found'; end if;
    update public.tawod_maintenance_staff set name=p_payload->>'name',specialty=coalesce(p_payload->>'specialty',''),phone=nullif(p_payload->>'phone',''),active=coalesce((p_payload->>'active')::boolean,true),notes=coalesce(p_payload->>'notes',''),version=version+1,updated_at=now() where id=v_id and version=v_version returning to_jsonb(tawod_maintenance_staff) into v_result; end if;
  end if;
  if v_result is null then raise exception 'stale_record'; end if;
  insert into public.tawod_maintenance_activity(entity,entity_id,actor,action,changes) values(case when p_action='save_customer' then 'customers' else 'staff' end,(v_result->>'id')::uuid,p_actor,case when v_before is null then 'create' else 'update' end,jsonb_build_object('before',v_before,'after',v_result));
  return jsonb_build_object('record',v_result);
 end if;

 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_contacts(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_contacts(text,jsonb,text) to service_role;
