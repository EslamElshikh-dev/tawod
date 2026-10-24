-- Restored from Supabase schema history: 20261008195604 / tawod_maintenance_function_listing.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create function public.tawod_maintenance_listing(p_action text,p_payload jsonb,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if p_action='list' then
  if v_entity in ('requests','visits','followups','contracts') then
   with filtered as (select r.*,c.phone customer_phone,coalesce(s.name,'') assignee_name from public.tawod_maintenance_requests r join public.tawod_maintenance_customers c on c.id=r.customer_id left join public.tawod_maintenance_staff s on s.id=r.assignee_id
    where (case when v_filter='archived' then r.archived_at is not null else r.archived_at is null end)
    and (v_entity<>'visits' or r.inspection_at is not null) and (v_entity<>'followups' or (r.next_followup_at is not null and r.status not in ('completed','cancelled'))) and (v_entity<>'contracts' or r.request_type='contract')
    and (v_filter not in ('new','contacted','inspection','quoted','in_progress','completed','cancelled') or r.status=v_filter)
    and (v_filter<>'overdue' or r.next_followup_at<now())
    and (v_filter<>'today' or (case when v_entity='visits' then r.inspection_at else r.next_followup_at end at time zone 'Asia/Riyadh')::date=v_today)
    and (v_filter<>'unassigned' or r.assignee_id is null)
    and (nullif(p_payload->>'customer_id','') is null or r.customer_id=(p_payload->>'customer_id')::uuid)
    and (v_search='' or concat_ws(' ',r.reference,r.contact_name,c.phone,r.district,r.service_snapshot::text) ilike '%'||v_search||'%'))
   select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(x) from (select * from filtered order by case when v_entity='visits' then inspection_at when v_entity='followups' then next_followup_at end asc nulls last, created_at desc,id limit 50 offset v_offset) x),'[]')) into v_result;
  elsif v_entity='customers' then
   with filtered as (select c.*,(select count(*) from public.tawod_maintenance_requests r where r.customer_id=c.id and r.archived_at is null) requests_count from public.tawod_maintenance_customers c where (case when v_filter='archived' then c.archived_at is not null else c.archived_at is null end) and (v_search='' or concat_ws(' ',c.name,c.phone,c.company,c.district) ilike '%'||v_search||'%'))
   select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(x) from (select * from filtered order by updated_at desc limit 50 offset v_offset) x),'[]')) into v_result;
  elsif v_entity='staff' then
   with filtered as (select s.*,(select count(*) from public.tawod_maintenance_requests r where r.assignee_id=s.id and r.archived_at is null and r.status not in ('completed','cancelled')) open_requests from public.tawod_maintenance_staff s where (case when v_filter='archived' then s.archived_at is not null else s.archived_at is null end) and (v_search='' or concat_ws(' ',s.name,s.specialty,s.phone) ilike '%'||v_search||'%'))
   select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(x) from (select * from filtered order by name limit 50 offset v_offset) x),'[]')) into v_result;
  else raise exception 'invalid_entity'; end if;
  return v_result;
 end if;

 raise exception 'invalid_action';
end $$;

revoke all on function public.tawod_maintenance_listing(text,jsonb,text) from public,anon,authenticated;

grant execute on function public.tawod_maintenance_listing(text,jsonb,text) to service_role;
