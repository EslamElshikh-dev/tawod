-- Restored from Supabase schema history: 20261008173318 / tawod_maintenance_schema.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

-- Separate operational workspace. No public table/RPC access and no contracting data writes.
create table public.tawod_maintenance_customers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 phone text not null unique check(phone ~ '^\+9665[0-9]{8}$'), company text not null default '' check(length(company)<=120),
 district text not null default '' check(length(district)<=80), notes text not null default '' check(length(notes)<=2000),
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);

create table public.tawod_maintenance_staff (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 specialty text not null default '' check(length(specialty)<=120), phone text check(phone is null or phone ~ '^\+9665[0-9]{8}$'),
 active boolean not null default true, notes text not null default '' check(length(notes)<=2000),
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);

create table public.tawod_maintenance_services (
 id text primary key check(id ~ '^[a-z][a-z0-9-]{2,80}$'), name text not null, group_name text not null, description text not null,
 image_path text not null check(image_path like '/maintenance/assets/images/%'), enabled boolean not null default true,
 internal_note text not null default '' check(length(internal_note)<=1000), updated_at timestamptz not null default now(), version integer not null default 1
);

create table public.tawod_maintenance_requests (
 id uuid primary key default gen_random_uuid(),
 reference text generated always as ('TM-'||upper(substr(replace(id::text,'-',''),1,10))) stored unique,
 customer_id uuid not null references public.tawod_maintenance_customers(id) on delete restrict,
 contact_name text not null check(length(contact_name) between 2 and 100),
 services text[] not null check(cardinality(services) between 1 and 22), service_snapshot jsonb not null default '[]',
 property_type text not null check(length(property_type) between 2 and 100), district text not null check(length(district) between 2 and 80),
 request_type text not null default 'one_off' check(request_type in ('one_off','contract','installation','advice')),
 status text not null default 'new' check(status in ('new','contacted','inspection','quoted','in_progress','completed','cancelled')),
 priority text not null default 'normal' check(priority in ('normal','urgent')),
 assignee_id uuid references public.tawod_maintenance_staff(id) on delete restrict,
 inspection_at timestamptz, next_followup_at timestamptz, next_action text not null default '' check(length(next_action)<=500),
 quote_amount numeric(12,2) check(quote_amount>=0), contract_value numeric(12,2) check(contract_value>=0),
 contract_start date, contract_end date, visit_frequency text not null default 'monthly' check(visit_frequency in ('weekly','monthly','quarterly','custom')),
 next_visit_at timestamptz, notes text not null default '' check(length(notes)<=2000),
 source text not null default 'manual' check(source in ('website','call','whatsapp','manual')),
 source_path text not null default '/maintenance/' check(source_path like '/maintenance/%' and length(source_path)<=240),
 attribution jsonb not null default '{}', submission_key uuid unique,
 completed_at timestamptz, archived_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 check(contract_start is null or contract_end is null or contract_end>=contract_start)
);

create table public.tawod_maintenance_activity (
 id uuid primary key default gen_random_uuid(), entity text not null, entity_id uuid not null,
 request_id uuid references public.tawod_maintenance_requests(id) on delete restrict,
 actor text not null check(actor in ('admin','website')), action text not null,
 changes jsonb not null default '{}', occurred_at timestamptz not null default now()
);

create table public.tawod_maintenance_rate_limits (
 key_hash text not null, bucket timestamptz not null, count integer not null default 1, primary key(key_hash,bucket)
);

create index tawod_maintenance_requests_customer_idx on public.tawod_maintenance_requests(customer_id,created_at desc);

create index tawod_maintenance_requests_assignee_idx on public.tawod_maintenance_requests(assignee_id) where archived_at is null;

create index tawod_maintenance_requests_followup_idx on public.tawod_maintenance_requests(next_followup_at) where archived_at is null and status not in ('completed','cancelled');

create index tawod_maintenance_requests_inspection_idx on public.tawod_maintenance_requests(inspection_at) where archived_at is null;

create index tawod_maintenance_requests_status_idx on public.tawod_maintenance_requests(status,created_at desc) where archived_at is null;

create index tawod_maintenance_activity_request_idx on public.tawod_maintenance_activity(request_id,occurred_at desc);

create index tawod_maintenance_activity_entity_idx on public.tawod_maintenance_activity(entity_id,occurred_at desc);

create index tawod_maintenance_rate_bucket_idx on public.tawod_maintenance_rate_limits(bucket);

alter table public.tawod_maintenance_customers enable row level security;

alter table public.tawod_maintenance_staff enable row level security;

alter table public.tawod_maintenance_services enable row level security;

alter table public.tawod_maintenance_requests enable row level security;

alter table public.tawod_maintenance_activity enable row level security;

alter table public.tawod_maintenance_rate_limits enable row level security;

revoke all on public.tawod_maintenance_customers,public.tawod_maintenance_staff,public.tawod_maintenance_services,public.tawod_maintenance_requests,public.tawod_maintenance_activity,public.tawod_maintenance_rate_limits from public,anon,authenticated;

grant select,insert,update on public.tawod_maintenance_customers,public.tawod_maintenance_staff,public.tawod_maintenance_services,public.tawod_maintenance_requests,public.tawod_maintenance_activity to service_role;

grant select,insert,update,delete on public.tawod_maintenance_rate_limits to service_role;
