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

The local test runs PostgreSQL 18.3 through PGlite 0.5.8. Managed production uses
PostgreSQL 17.6. A full Docker Supabase / managed PostgREST acceptance run is a
separate deployment check; the tests here verify database schema and access rules.

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
