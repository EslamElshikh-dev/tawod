-- Restored from Supabase schema history: 20261008222327 / tawod_maintenance_function_archive_workspace.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create or replace function public.tawod_maintenance_archive(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if p_action in ('archive','restore') then
  v_id:=(p_payload->>'id')::uuid;
  if v_entity='requests' then update public.tawod_maintenance_requests set archived_at=case when p_action='archive' then now() else null end,updated_at=now(),version=version+1 where id=v_id and version=v_version returning to_jsonb(tawod_maintenance_requests) into v_result;
  elsif v_entity='customers' then
   if p_action='archive' and exists(select 1 from public.tawod_maintenance_requests where customer_id=v_id and archived_at is null and status not in ('completed','cancelled')) then raise exception 'active_requests'; end if;
   update public.tawod_maintenance_customers set archived_at=case when p_action='archive' then now() else null end,updated_at=now(),version=version+1 where id=v_id and version=v_version returning to_jsonb(tawod_maintenance_customers) into v_result;
  elsif v_entity='staff' then update public.tawod_maintenance_staff set archived_at=case when p_action='archive' then now() else null end,active=p_action='restore',updated_at=now(),version=version+1 where id=v_id and version=v_version returning to_jsonb(tawod_maintenance_staff) into v_result;
  else raise exception 'invalid_entity'; end if;
  if v_result is null then raise exception 'stale_record'; end if;
  insert into public.tawod_maintenance_activity(entity,entity_id,request_id,actor,action,changes) values(v_entity,v_id,case when v_entity='requests' then v_id else null end,p_actor,p_action,'{}');
  return jsonb_build_object('record',v_result);
 end if;
 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_archive(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_archive(text,jsonb,text) to service_role;

create or replace function public.tawod_maintenance_workspace(p_action text,p_payload jsonb default '{}',p_actor text default 'admin') returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_actor not in ('admin','website') or (p_actor='website' and p_action<>'submit') then raise exception 'unauthorized'; end if;
 case p_action
 when 'overview' then return public.tawod_maintenance_overview(p_action,p_payload,p_actor);
 when 'list' then return public.tawod_maintenance_listing(p_action,p_payload,p_actor);
 when 'detail' then return public.tawod_maintenance_detail(p_action,p_payload,p_actor);
 when 'save_customer' then return public.tawod_maintenance_contacts(p_action,p_payload,p_actor);
 when 'save_staff' then return public.tawod_maintenance_contacts(p_action,p_payload,p_actor);
 when 'save_service' then return public.tawod_maintenance_catalog(p_action,p_payload,p_actor);
 when 'save_request' then return public.tawod_maintenance_save(p_action,p_payload,p_actor);
 when 'submit' then return public.tawod_maintenance_submit(p_action,p_payload,p_actor);
 when 'archive' then return public.tawod_maintenance_archive(p_action,p_payload,p_actor);
 when 'restore' then return public.tawod_maintenance_archive(p_action,p_payload,p_actor);
 else raise exception 'invalid_action';
 end case;
end $$;

revoke all on function public.tawod_maintenance_workspace(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_workspace(text,jsonb,text) to service_role;
