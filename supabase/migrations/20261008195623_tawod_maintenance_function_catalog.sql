-- Restored from Supabase schema history: 20261008195623 / tawod_maintenance_function_catalog.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create function public.tawod_maintenance_catalog(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if p_action='save_service' then
  update public.tawod_maintenance_services set enabled=(p_payload->>'enabled')::boolean,internal_note=coalesce(p_payload->>'internal_note',''),version=version+1,updated_at=now() where id=p_payload->>'id' and version=v_version returning to_jsonb(tawod_maintenance_services) into v_result;
  if v_result is null then raise exception 'stale_record'; end if; return jsonb_build_object('record',v_result);
 end if;

 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_catalog(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_catalog(text,jsonb,text) to service_role;
