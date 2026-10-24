-- Fresh/rebuilt environments only; this migration was not applied to production.
-- The recovered dispatcher referenced tawod_maintenance_submit, but an authorized
-- definition-only read confirmed that function is absent from the managed DB too.
-- The current website prepares a WhatsApp message. Do not invent a database
-- submission implementation or allow a missing dependency to write partial rows.
create or replace function public.tawod_maintenance_workspace(
  p_action text,
  p_payload jsonb default '{}',
  p_actor text default 'admin'
) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
  if p_actor not in ('admin','website') or (p_actor='website' and p_action<>'submit') then
    raise exception 'unauthorized';
  end if;
  if p_action='submit' then
    raise exception using errcode='0A000', message='website_submission_not_enabled';
  end if;
  case p_action
    when 'overview' then return public.tawod_maintenance_overview(p_action,p_payload,p_actor);
    when 'list' then return public.tawod_maintenance_listing(p_action,p_payload,p_actor);
    when 'detail' then return public.tawod_maintenance_detail(p_action,p_payload,p_actor);
    when 'save_customer' then return public.tawod_maintenance_contacts(p_action,p_payload,p_actor);
    when 'save_staff' then return public.tawod_maintenance_contacts(p_action,p_payload,p_actor);
    when 'save_service' then return public.tawod_maintenance_catalog(p_action,p_payload,p_actor);
    when 'save_request' then return public.tawod_maintenance_save(p_action,p_payload,p_actor);
    when 'archive' then return public.tawod_maintenance_archive(p_action,p_payload,p_actor);
    when 'restore' then return public.tawod_maintenance_archive(p_action,p_payload,p_actor);
    else raise exception 'invalid_action';
  end case;
end;
$$;

revoke all on function public.tawod_maintenance_workspace(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.tawod_maintenance_workspace(text,jsonb,text) to service_role;
