-- Private runtime configuration for the Tawod command center.
-- Values are provisioned directly in the protected database and are never committed.

create table if not exists public.tawod_admin_config (
  config_key text primary key check (config_key ~ '^[a-z0-9_]{1,60}$'),
  value_hash text not null check (value_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

alter table public.tawod_admin_config enable row level security;
revoke all on public.tawod_admin_config from public, anon, authenticated;
grant all on public.tawod_admin_config to service_role;

comment on table public.tawod_admin_config is
  'Service-role-only hashed runtime configuration; never expose through client APIs.';
