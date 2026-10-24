# Reproducible Supabase schema

This repository now includes previously missing schema migrations recovered from
Supabase's recorded migration history. Only SQL schema and authorization code was
restored. Production rows, account mappings, activation values and sync-key seeds
are not copied into new environments.

Run `npm run test:database` to rebuild an empty, isolated PostgreSQL database and
exercise actual `anon`, `authenticated` and `service_role` permissions. The test
uses pinned PGlite, real GRANT/REVOKE and RLS, and no default Data API table or
sequence grants. Managed Auth/Storage scaffolding and scheduler/network entrypoints
are local test fixtures; no network calls or production credentials are used.

Historical versions are preserved where recovered from the server. These files
are for reproducible fresh environments, not a request to reapply old migrations
to production. This change does not run `db push`, repair remote migration history,
change production default privileges or deploy Edge Functions. Existing repository
and remote history already contain some differently named historical versions;
do not use a blanket history-repair or `--include-all` deployment to reconcile them.

The fast local test runs PostgreSQL 18.3 through PGlite 0.5.8. Managed production
uses PostgreSQL 17.6. The isolated HTTP acceptance workflow below tests that
PostgreSQL version with real Auth and PostgREST. Hosted Supabase acceptance remains
separate; a disposable Docker stack does not exercise the hosted gateway.

## Tawod coverage

All 22 public Tawod tables are rebuilt, including analytics and the six-table
maintenance workspace. The missing reporting and maintenance RPC migrations are
restored with their service-only grants. The analytics table was created outside
recorded migrations; a schema-only baseline is included before the earliest
recorded analytics function migration. Its server role has SELECT and INSERT
only, with RLS enabled and forced; browser roles have no direct access.

Maintenance customers, staff, services, requests and activity retain their
service-only SELECT/INSERT/UPDATE grants. Rate-limit cleanup retains DELETE only
where needed. Tests exercise the actual maintenance save RPC as well as CRUD,
analytics ingestion and rejection of anonymous/authenticated direct table/RPC
access. No live customer records, service catalog rows or sync-key material is
copied. Configure the new environment's service catalog and server credentials
through the existing trusted setup path.

`npm run test:database` is included in `npm run check` and both existing GitHub
quality workflows. Existing sales and Business Profile synchronization regression
tests remain available through their existing commands.

## PostgreSQL 17 and HTTP acceptance

Run `python3 tests/integration/supabase17/run.py` on a Docker host. The dedicated
`database-http.yml` workflow runs this on a standard runner for this public
repository, without repository secrets, a paid Supabase branch, or production
credentials. It pins PostgreSQL 17.6, GoTrue v2.197.0 and PostgREST v14.18, following
the acceptance approach already used in al-osairat-directory PR #144.

The stack rebuilds the application schema from empty with implicit table and
sequence grants disabled. GoTrue supplies real Auth tables, logins and refreshed
JWTs for two synthetic users, including editable metadata that claims to be
admin. Browser identities must remain denied on all 22 private tables and the
tested RPCs. Server tests exercise analytics ingestion/reporting and limited DML;
maintenance customer/staff and request saves, optimistic concurrency, transaction
rollback, audit history, archive/restore and rate-limit cleanup; and GBP atomic
ingestion, location isolation, 7/30/90-day totals, cache age, timestamp precision,
keyword bounds and rollback on reconciliation failure.

The dispatcher target `tawod_maintenance_submit(text,jsonb,text)` is absent from
both the recovered history and the managed public schema, confirmed by a
definition-only catalog lookup on 24 October 2026. There is no implementation to
restore. The public maintenance form currently prepares a WhatsApp message and
does not submit to this database route.

A separate corrective migration preserves the recovered historical SQL and
replaces the unsupported `submit` branch with an explicit
`website_submission_not_enabled` error (SQLSTATE `0A000`). It does not create a
placeholder submit function or implement new submission semantics. The isolated
rebuild now runs 30 migrations: the 29 recovered/application migrations plus this
correction. All seven supported maintenance RPC targets must resolve. Acceptance
exercises both service actors and all three browser identities, and verifies
that a rejected submit creates no customer, request, audit or rate-limit rows.
Administrative `save_request` remains covered by actual create/update tests.

This corrective migration is included for new/rebuilt environments. It was not
applied to the managed database. Deploying it separately to an existing managed
database, or introducing a future website-to-database submit feature, requires
its own scoped rollout; do not replay the historical migrations to do so.

All data and JWT secrets in this stack are disposable fixtures. The workflow
always removes containers, volumes and its network. For a local run, clean up
with `docker compose -f tests/integration/supabase17/compose.yml down --volumes
--remove-orphans`. Auth email is auto-confirmed in this stack only. Storage is
schema scaffolding; cron and network calls are no-op fixtures. Hosted mail,
Storage HTTP, deployed Edge Functions and external Google/Make synchronization
need independent checks. Nothing in this workflow applies migrations to a
managed project or changes customer data, access keys, or remote history.
