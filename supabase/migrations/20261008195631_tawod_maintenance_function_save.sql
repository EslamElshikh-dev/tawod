-- Restored from Supabase schema history: 20261008195631 / tawod_maintenance_function_save.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create function public.tawod_maintenance_save(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if p_action='save_request' then
  v_id:=nullif(p_payload->>'id','')::uuid;
  v_customer:=(p_payload->>'customer_id')::uuid;
  if v_customer is null or not exists(select 1 from public.tawod_maintenance_customers where id=v_customer and (archived_at is null or p_action='submit')) then raise exception 'invalid_customer'; end if;
  if p_action='save_request' and nullif(p_payload->>'assignee_id','') is not null and not exists(select 1 from public.tawod_maintenance_staff where id=(p_payload->>'assignee_id')::uuid and active and archived_at is null) then raise exception 'invalid_assignee'; end if;
  select array_agg(distinct x) into v_services from jsonb_array_elements_text(p_payload->'services') x;
  if coalesce(cardinality(v_services),0)=0 or exists(select 1 from unnest(v_services) s where not exists(select 1 from public.tawod_maintenance_services where id=s and (enabled or v_id is not null))) then raise exception 'invalid_service'; end if;
  select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name) into v_snapshot from public.tawod_maintenance_services s where s.id=any(v_services);
  if v_id is null then
   insert into public.tawod_maintenance_requests(customer_id,contact_name,services,service_snapshot,property_type,district,request_type,notes,source,submission_key,source_path,attribution)
   values(v_customer,coalesce(nullif(p_payload->>'name',''),(select name from public.tawod_maintenance_customers where id=v_customer)),v_services,v_snapshot,p_payload->>'property_type',p_payload->>'district',coalesce(p_payload->>'request_type','one_off'),coalesce(p_payload->>'notes',''),case when p_action='submit' then 'website' else coalesce(p_payload->>'source','manual') end,v_key,coalesce(p_payload->>'source_path','/maintenance/'),coalesce(p_payload->'attribution','{}')) returning * into v_row; v_id:=v_row.id;
  else
   select * into v_row from public.tawod_maintenance_requests where id=v_id for update;
   if not found then raise exception 'not_found'; end if;
   if v_row.version<>v_version then raise exception 'stale_record'; end if;
   v_before:=to_jsonb(v_row);
  end if;
  if p_action='save_request' then
   update public.tawod_maintenance_requests set customer_id=v_customer,services=v_services,
    service_snapshot=case when services=v_services then service_snapshot else v_snapshot end,
    contact_name=coalesce(nullif(p_payload->>'contact_name',''),contact_name),property_type=p_payload->>'property_type',district=p_payload->>'district',request_type=coalesce(p_payload->>'request_type','one_off'),
    status=coalesce(p_payload->>'status','new'),priority=coalesce(p_payload->>'priority','normal'),assignee_id=nullif(p_payload->>'assignee_id','')::uuid,
    inspection_at=nullif(p_payload->>'inspection_at','')::timestamptz,next_followup_at=nullif(p_payload->>'next_followup_at','')::timestamptz,next_action=coalesce(p_payload->>'next_action',''),
    quote_amount=nullif(p_payload->>'quote_amount','')::numeric,contract_value=nullif(p_payload->>'contract_value','')::numeric,
    contract_start=nullif(p_payload->>'contract_start','')::date,contract_end=nullif(p_payload->>'contract_end','')::date,
    visit_frequency=coalesce(p_payload->>'visit_frequency','monthly'),next_visit_at=nullif(p_payload->>'next_visit_at','')::timestamptz,
    notes=coalesce(p_payload->>'notes',''),completed_at=case when p_payload->>'status'='completed' then coalesce(completed_at,now()) else null end,
    updated_at=now(),version=case when v_before is null then version else version+1 end where id=v_id returning * into v_row;
  end if;
  insert into public.tawod_maintenance_activity(entity,entity_id,request_id,actor,action,changes) values('requests',v_id,v_id,p_actor,case when v_before is null then 'create' else 'update' end,jsonb_build_object('before',v_before,'after',to_jsonb(v_row)));
  if p_action='submit' then return jsonb_build_object('reference',v_row.reference); end if;
  return jsonb_build_object('record',to_jsonb(v_row));
 end if;

 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_save(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_save(text,jsonb,text) to service_role;
