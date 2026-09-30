-- Customer identity stays outside the analytics schema and its exports.
create schema if not exists tawod_crm;
revoke all on schema tawod_crm from public,anon,authenticated;
grant usage on schema tawod_crm to service_role;
create table tawod_crm.contacts (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(trim(name)) between 2 and 100),
 phone text not null unique check(phone ~ '^\+?[0-9]{8,15}$'),
 company text not null default '' check(char_length(company)<=120),
 note text not null default '' check(char_length(note)<=1000),
 active boolean not null default true,
 version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table tawod_crm.opportunity_contacts (
 outcome_id uuid primary key references public.tawod_sales_outcomes(id) on delete cascade,
 contact_id uuid not null references tawod_crm.contacts(id),
 linked_at timestamptz not null default now()
);
create index tawod_contact_opportunities on tawod_crm.opportunity_contacts(contact_id);
create table tawod_crm.activity (
 id bigint generated always as identity primary key,
 contact_id uuid not null references tawod_crm.contacts(id),
 outcome_id uuid references public.tawod_sales_outcomes(id) on delete set null,
 action text not null check(action in ('created','updated','linked','unlinked')),
 occurred_at timestamptz not null default now()
);
create index tawod_contact_activity on tawod_crm.activity(contact_id,id desc);
alter table tawod_crm.contacts enable row level security;
alter table tawod_crm.opportunity_contacts enable row level security;
alter table tawod_crm.activity enable row level security;
revoke all on all tables in schema tawod_crm from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema tawod_crm to service_role;
grant usage,select on all sequences in schema tawod_crm to service_role;

-- The Edge handler verifies the existing signed admin session before every call.
create or replace function public.tawod_customer_api(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 cid uuid; oid uuid; old_cid uuid; expected integer; c tawod_crm.contacts%rowtype;
 rows jsonb; total integer; page_no integer:=greatest(1,least(100000,coalesce((p_payload->>'page')::integer,1)));
 q text:='%'||replace(replace(coalesce(p_payload->>'search',''),'%', '\%'),'_', '\_')||'%';
begin
 if coalesce(p_payload->>'search','') ~ '^[+0-9٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹ ()-]+$' then
  q:=regexp_replace(translate(p_payload->>'search','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g');
  if q like '05%' then q:='+966'||substr(q,2); elsif q like '966%' then q:='+'||q; elsif q like '00%' then q:='+'||substr(q,3); end if;
  q:='%'||q||'%';
 end if;
 if p_action='list' then
  select count(*) into total from tawod_crm.contacts where (name ilike q or phone ilike q or company ilike q) and (p_payload->>'status' is null or p_payload->>'status'='' or active=(p_payload->>'status'='active'));
  select coalesce(jsonb_agg(x),'[]'::jsonb) into rows from (
   select ct.*,(select count(*) from tawod_crm.opportunity_contacts l where l.contact_id=ct.id) as opportunities,
    (select min(o.next_follow_up_at) from tawod_crm.opportunity_contacts l join public.tawod_sales_outcomes o on o.id=l.outcome_id where l.contact_id=ct.id and o.stage not in ('contract_signed','lost')) as next_follow_up_at
   from tawod_crm.contacts ct where (name ilike q or phone ilike q or company ilike q) and (p_payload->>'status' is null or p_payload->>'status'='' or active=(p_payload->>'status'='active')) order by ct.updated_at desc,ct.id limit 30 offset (page_no-1)*30
  )x;
  return jsonb_build_object('ok',true,'rows',rows,'total',total,'page',page_no);
 elsif p_action='for_outcome' then
  oid:=(p_payload->>'outcome_id')::uuid;
  return jsonb_build_object('ok',true,'contact',(select to_jsonb(ct) from tawod_crm.contacts ct join tawod_crm.opportunity_contacts l on l.contact_id=ct.id where l.outcome_id=oid));
 elsif p_action='link' then
  oid:=(p_payload->>'outcome_id')::uuid; cid:=nullif(p_payload->>'contact_id','')::uuid;
  perform pg_advisory_xact_lock(hashtext('tawod-contact-link:'||oid::text));
  if oid is null or not exists(select 1 from public.tawod_sales_outcomes where id=oid) or (cid is not null and not exists(select 1 from tawod_crm.contacts where id=cid and active)) then return jsonb_build_object('ok',false,'code','invalid'); end if;
  select contact_id into old_cid from tawod_crm.opportunity_contacts where outcome_id=oid;
  if coalesce(old_cid::text,'') is distinct from coalesce(p_payload->>'expected_contact_id','') then return jsonb_build_object('ok',false,'code','conflict'); end if;
  if old_cid is distinct from cid then
   if old_cid is not null then insert into tawod_crm.activity(contact_id,outcome_id,action) values(old_cid,oid,'unlinked'); end if;
   delete from tawod_crm.opportunity_contacts where outcome_id=oid;
   if cid is not null then
    insert into tawod_crm.opportunity_contacts(outcome_id,contact_id) values(oid,cid);
    insert into tawod_crm.activity(contact_id,outcome_id,action) values(cid,oid,'linked');
   end if;
  end if;
  return jsonb_build_object('ok',true);
 end if;
 cid:=(p_payload->>'id')::uuid;
 if cid is null then return jsonb_build_object('ok',false,'code','invalid'); end if;
 select * into c from tawod_crm.contacts where id=cid;
 if p_action='detail' then
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'contact',to_jsonb(c),
   'outcomes',coalesce((select jsonb_agg(x) from (select o.* from public.tawod_sales_outcomes o join tawod_crm.opportunity_contacts l on l.outcome_id=o.id where l.contact_id=cid order by o.updated_at desc,o.id limit 100)x),'[]'::jsonb),
   'stats',(select jsonb_build_object('opportunities',count(*),'open',count(*) filter(where o.stage not in ('contract_signed','lost')),'contracts',count(*) filter(where o.stage='contract_signed'),'contractValue',coalesce(sum(o.contract_value) filter(where o.stage='contract_signed'),0)) from public.tawod_sales_outcomes o join tawod_crm.opportunity_contacts l on l.outcome_id=o.id where l.contact_id=cid),
   'timeline',coalesce((select jsonb_agg(x order by x.occurred_at desc,x.id desc) from (
    select 'contact-'||a.id as id,a.action as event_type,a.occurred_at,a.outcome_id,null::text as from_stage,null::text as to_stage,'{}'::jsonb as changes from tawod_crm.activity a where a.contact_id=cid
    union all select 'sales-'||h.id,h.event_type,h.occurred_at,h.outcome_id,h.from_stage,h.to_stage,h.changes from public.tawod_sales_history h join tawod_crm.opportunity_contacts l on l.outcome_id=h.outcome_id where l.contact_id=cid
    order by occurred_at desc,id desc limit 100)x),'[]'::jsonb));
 elsif p_action='save' then
  expected:=(p_payload->>'version')::integer;
  if expected is null or expected<0 then return jsonb_build_object('ok',false,'code','invalid'); end if;
  perform pg_advisory_xact_lock(hashtext(cid::text));
  select * into c from tawod_crm.contacts where id=cid;
  if (found and c.version<>expected) or (not found and expected<>0) then return jsonb_build_object('ok',false,'code','conflict'); end if;
  c.name:=trim(p_payload->>'name');c.phone:=regexp_replace(translate(p_payload->>'phone','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[\s()-]','','g');
  if c.phone like '05%' and length(c.phone)=10 then c.phone:='+966'||substr(c.phone,2); elsif c.phone like '966%' then c.phone:='+'||c.phone; elsif c.phone like '00%' then c.phone:='+'||substr(c.phone,3); end if;
  c.company:=coalesce(trim(p_payload->>'company'),'');c.note:=coalesce(p_payload->>'note','');c.active:=coalesce((p_payload->>'active')::boolean,true);
  if expected=0 then insert into tawod_crm.contacts(id,name,phone,company,note,active) values(cid,c.name,c.phone,c.company,c.note,c.active) returning to_jsonb(contacts) into rows;
  else update tawod_crm.contacts set name=c.name,phone=c.phone,company=c.company,note=c.note,active=c.active,version=version+1,updated_at=now() where id=cid returning to_jsonb(contacts) into rows; end if;
  insert into tawod_crm.activity(contact_id,action) values(cid,case when expected=0 then 'created' else 'updated' end);
  return jsonb_build_object('ok',true,'contact',rows);
 end if;
 return jsonb_build_object('ok',false,'code','invalid');
exception
 when unique_violation then return jsonb_build_object('ok',false,'code','duplicate');
 when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('ok',false,'code','invalid');
end; $$;
revoke all on function public.tawod_customer_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.tawod_customer_api(text,jsonb) to service_role;
