-- Private sales pipeline for linking anonymous referrals to commercial outcomes.
-- Intentionally excludes customer names, phone numbers, email addresses, and message content.

create table if not exists public.tawod_sales_outcomes (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  source_type text not null check (source_type in ('call', 'whatsapp', 'form', 'other')),
  source_ref text check (source_ref is null or char_length(source_ref) <= 300),
  stage text not null default 'new' check (stage in ('new', 'qualified', 'quote_sent', 'site_visit', 'contract_signed', 'lost')),
  service_type text check (service_type is null or char_length(service_type) <= 160),
  campaign_name text check (campaign_name is null or char_length(campaign_name) <= 180),
  estimated_value numeric(14,2) not null default 0 check (estimated_value >= 0),
  contract_value numeric(14,2) not null default 0 check (contract_value >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tawod_sales_outcomes_occurred_at_idx
  on public.tawod_sales_outcomes (occurred_at desc);

create index if not exists tawod_sales_outcomes_stage_idx
  on public.tawod_sales_outcomes (stage, occurred_at desc);

create index if not exists tawod_sales_outcomes_source_ref_idx
  on public.tawod_sales_outcomes (source_ref)
  where source_ref is not null;

alter table public.tawod_sales_outcomes enable row level security;
revoke all on public.tawod_sales_outcomes from public, anon, authenticated;
grant all on public.tawod_sales_outcomes to service_role;

comment on table public.tawod_sales_outcomes is
  'Private, non-PII opportunity pipeline used by the Tawod admin command center.';
