import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

// A real, in-memory PostgreSQL process. It never connects to a live project.
// Only managed Auth/Storage scaffolding and cron/network entrypoints are local
// stand-ins. Application tables, functions, grants and RLS come from migrations.
export async function fresh() {
  const db = new PGlite({ extensions: { pgcrypto, pg_trgm } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    -- No implicit table or sequence grants: simulate the 30 October behavior.
    alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
    alter default privileges in schema public revoke all on sequences from public, anon, authenticated, service_role;
    create schema extensions;
    create extension pgcrypto with schema extensions;
    grant usage on schema extensions to anon, authenticated, service_role;
    grant execute on all functions in schema extensions to anon, authenticated, service_role;
    create schema auth;
    grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users (
      id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}',
      created_at timestamptz default now(), updated_at timestamptz default now(),
      email_confirmed_at timestamptz, phone_confirmed_at timestamptz, deleted_at timestamptz,
      last_sign_in_at timestamptz, phone text
    );
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select coalesce(auth.jwt()->>'sub',nullif(current_setting('request.jwt.claim.sub',true),''))::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(auth.jwt()->>'role',nullif(current_setting('request.jwt.claim.role',true),'')) $$;
    create schema storage;
    grant usage on schema storage to anon, authenticated, service_role;
    create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text,owner uuid,owner_id text,metadata jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now(),unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name,'/'))[array_length(string_to_array(name,'/'),1)] $$;
    create function storage.extension(name text) returns text language sql immutable as $$ select lower((string_to_array(name,'.'))[array_length(string_to_array(name,'.'),1)]) $$;
    -- Local scheduler stand-in; no scheduling or network calls leave this process.
    create schema cron;
    create table cron.job(jobid bigint generated always as identity,jobname text,schedule text,command text);
    create function cron.schedule(text,text,text) returns bigint language sql as $$ select 1::bigint $$;
    create function cron.unschedule(text) returns boolean language sql as $$ select true $$;
    create function cron.unschedule(bigint) returns boolean language sql as $$ select true $$;
    create schema net;
    create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds int default 1000) returns bigint language sql as $$ select 1::bigint $$;
    create schema vault;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
  `);
  return db;
}

export async function replayMigrations(db) {
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
  for (const name of files) {
    const sql = fs.readFileSync(new URL(name,dir),'utf8').replace(
      /create\s+extension\s+if\s+not\s+exists\s+(?:pg_cron|pg_net)(?:\s+with\s+schema\s+\w+)?\s*;/gi,
      '-- Managed scheduler/network extension replaced by isolated scaffolding.'
    );
    try { await db.exec(sql); }
    catch (cause) { throw new Error(`Migration ${name}: ${cause.message}`, { cause }); }
  }
  return files;
}

export async function asRole(db,role,user,sql,params=[]) {
  assert.ok(['anon','authenticated','service_role'].includes(role));
  await db.exec(`set role ${role}`);
  try {
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(user ? {sub:user,role} : {role})]);
    return await db.query(sql,params);
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims','{}',false)");
  }
}

export async function denied(db,role,user,sql,params=[]) {
  await assert.rejects(() => asRole(db,role,user,sql,params), e => e.code==='42501');
}

export async function assertRls(db,expectedCount) {
  const rows=(await db.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'")).rows;
  assert.equal(rows.length,expectedCount);
  assert.deepEqual(rows.filter(r=>!r.relrowsecurity),[],'Every public application table must enable RLS');
}
