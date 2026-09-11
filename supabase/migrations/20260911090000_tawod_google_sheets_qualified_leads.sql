-- Reliable, non-PII export state for qualified Tawod WhatsApp referrals.

alter table public.tawod_sales_outcomes
  add column if not exists source_event_id uuid references public.tawod_analytics_events(id) on delete set null,
  add column if not exists click_id text,
  add column if not exists first_contact_at timestamptz,
  add column if not exists qualified_at timestamptz,
  add column if not exists sheets_synced_at timestamptz;

update public.tawod_sales_outcomes as outcome
set source_event_id = event.id,
    click_id = coalesce(outcome.click_id, event.click_id),
    first_contact_at = coalesce(outcome.first_contact_at, event.occurred_at),
    campaign_name = coalesce(outcome.campaign_name, event.utm_campaign)
from public.tawod_analytics_events as event
where outcome.source_event_id is null
  and outcome.source_ref = event.id::text
  and event.event_name in ('call_click', 'whatsapp_click');

update public.tawod_sales_outcomes
set qualified_at = updated_at
where qualified_at is null
  and stage in ('qualified', 'quote_sent', 'site_visit', 'contract_signed');

create unique index if not exists tawod_sales_outcomes_source_event_id_uidx
  on public.tawod_sales_outcomes (source_event_id)
  where source_event_id is not null;

create index if not exists tawod_sales_outcomes_sheets_pending_idx
  on public.tawod_sales_outcomes (updated_at, id)
  where source_type = 'whatsapp'
    and qualified_at is not null
    and sheets_synced_at is null;

insert into public.tawod_sync_keys (name, key_hash, enabled)
values ('google_sheets', repeat('0', 64), false)
on conflict (name) do nothing;

comment on column public.tawod_sales_outcomes.source_event_id is
  'Exact Tawod analytics referral event used to deduplicate CRM outcomes.';
comment on column public.tawod_sales_outcomes.qualified_at is
  'First time the sales outcome reached a qualified-or-later stage.';
comment on column public.tawod_sales_outcomes.sheets_synced_at is
  'Latest successful acknowledgement from the qualified-leads Google Sheet.';
