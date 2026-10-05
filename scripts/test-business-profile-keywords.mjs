import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Synthetic observations only; exercise the real schema, RPC and sync parser.
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
const baseline = fs.readFileSync('supabase/migrations/20260905_tawod_command_center_v2.sql', 'utf8');
for (const name of ['tawod_business_profile_daily', 'tawod_business_profile_keywords_monthly']) {
  const start = baseline.indexOf('create table if not exists public.' + name + ' (');
  await db.exec(baseline.slice(start, baseline.indexOf('\n);', start) + 3));
  await db.exec('alter table public.' + name + ' enable row level security;');
}
await db.exec(fs.readFileSync('supabase/migrations/20261004161315_tawod_gbp_riyadh_coverage.sql', 'utf8'));
await db.exec("insert into tawod_business_profile_connection(slot,location_id) values('primary','locations/111')");
await db.exec(`insert into tawod_business_profile_daily(report_date,location_id,search_desktop_impressions,call_clicks)
  values((now() at time zone 'Asia/Riyadh')::date-1,'locations/111',23,4),
        ((now() at time zone 'Asia/Riyadh')::date-1,'locations/222',900,900);`);
const before = new Map();
for (const days of [7,30,90]) before.set(days, (await db.query('select tawod_business_profile_analytics($1) result', [days])).rows[0].result);
await db.exec(fs.readFileSync('supabase/migrations/20261005055002_tawod_gbp_keyword_thresholds.sql', 'utf8'));
const { month, previousMonth, oldMonth } = (await db.query(`select
  date_trunc('month',now() at time zone 'Asia/Riyadh')::date::text as month,
  (date_trunc('month',now() at time zone 'Asia/Riyadh')-interval '1 month')::date::text as "previousMonth",
  (date_trunc('month',now() at time zone 'Asia/Riyadh')-interval '6 months')::date::text as "oldMonth"`)).rows[0];
async function put(keyword, impressions, threshold, reportMonth = month, location = 'locations/111') {
  return db.query(`insert into tawod_business_profile_keywords_monthly(report_month,location_id,search_keyword,impressions,threshold,synced_at)
    values($1,$2,$3,$4,$5,'2020-01-02T03:04:05Z')
    on conflict(report_month,location_id,search_keyword) do update
    set impressions=excluded.impressions,threshold=excluded.threshold,synced_at=excluded.synced_at`, [reportMonth,location,keyword,impressions,threshold]);
}
await put('exact',23,null);
await put('zero',0,null);
await put('same-keyword',null,15);
await put('same-keyword',31,null,previousMonth);
await put('other-location',900,null,month,'locations/222');
await put('outside-window',900,null,oldMonth);
for (let i=0; i<40; i++) await put('bounded-' + String(i).padStart(2,'0'),null,15);
for (const [value,bound] of [[null,null],[-1,null],[null,0],[null,-1],[3,15],[0,15]]) {
  await assert.rejects(put('invalid',value,bound), /observation_check/);
}
await assert.rejects(db.query(`insert into tawod_business_profile_keywords_monthly(report_month,location_id,search_keyword) values($1,'locations/111','omitted')`,[month]), /observation_check/);
await put('changes',null,15);
await put('changes',19,null);
await put('changes',null,15);
assert.equal((await db.query("select impressions from tawod_business_profile_keywords_monthly where search_keyword='changes'")).rows[0].impressions,null,'later bounds replace exact observations without manufacturing a count');
for (const days of [7,30,90]) {
  const result = (await db.query('select tawod_business_profile_analytics($1) result',[days])).rows[0].result;
  const expected = (await db.query(`select report_month::text as month,search_keyword as keyword,impressions::int,threshold::int
    from tawod_business_profile_keywords_monthly
    where location_id='locations/111' and report_month between date_trunc('month',(now() at time zone 'Asia/Riyadh')::date-($1::int-1))::date and date_trunc('month',now() at time zone 'Asia/Riyadh')::date
    order by report_month desc,impressions desc nulls last,search_keyword`,[days])).rows;
  assert.deepEqual(result.keywords,expected,'RPC preserves every monthly observation and its bound');
  assert.ok(result.keywords.length > 30,'the former top-30 cut must not hide bound-only records');
  assert.deepEqual({...result,keywords:[]},{...before.get(days),keywords:[]},'daily figures and location coverage remain identical');
  assert.equal(result.keywords.find(x=>x.keyword==='zero').impressions,0,'a genuine zero stays zero');
  assert.ok(result.keywords.filter(x=>x.threshold!=null).every(x=>x.impressions===null));
}
assert.equal((await db.query("select relrowsecurity from pg_class where relname='tawod_business_profile_keywords_monthly'")).rows[0].relrowsecurity,true);
assert.equal((await db.query("select has_function_privilege('anon','tawod_business_profile_analytics(integer)','execute') allowed")).rows[0].allowed,false);
assert.equal((await db.query("select is_nullable,column_default from information_schema.columns where table_name='tawod_business_profile_keywords_monthly' and column_name='impressions'")).rows[0].column_default,null);

const edge = fs.readFileSync('supabase/functions/tawod-analytics/index.ts','utf8');
const calls = [];
const sandbox = vm.createContext({
  text:(x,max)=>String(x??'').trim().slice(0,max),validDate:x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:null,
  verifySyncKey:async()=>true,cleanProfileRows:body=>body.daily||[],
  supabase:async(path,init)=>{ calls.push({path,body:JSON.parse(init.body)}); return new Response(null,{status:204}); },
  json:(body,status=200)=>new Response(JSON.stringify(body),{status}),Response
});
const snippet = edge.slice(edge.indexOf('function cleanKeywordRows('),edge.indexOf('function normalizeSalesRow('));
vm.runInContext(ts.transpile(snippet,{target:ts.ScriptTarget.ES2022}),sandbox);
const fixture = {month:'2026-07-01',keyword:'synthetic',syncedAt:'2020-01-02T03:04:05Z'};
const body = keywords=>({locationId:'locations/111',keywords});
for (const [impressions,threshold,expected] of [[null,15,null],[0,15,null],[0,null,0],[23,null,23]]) {
  const actual = sandbox.cleanKeywordRows(body([{...fixture,impressions,threshold}]))[0];
  assert.equal(actual.impressions,expected);
  assert.equal(actual.threshold,threshold);
  assert.equal(actual.synced_at,'2020-01-02T03:04:05.000Z','source cache time is preserved');
}
assert.equal(sandbox.cleanKeywordRows(body([{...fixture,syncedAt:undefined,data_fetched_at:'2020-01-02T03:04:05',threshold:15}]))[0].synced_at,'2020-01-02T03:04:05.000Z','Windsor timestamps are declared UTC');
for (const row of [
  {impressions:null,threshold:null},{impressions:-1},{impressions:1.5},{impressions:true},
  {impressions:''},{threshold:0},{threshold:1.5},{impressions:23,threshold:15},
  {impressions:0,month:'2026-02-30'},{impressions:0,syncedAt:'invalid'}
]) {
  calls.length=0;
  const response = await sandbox.syncBusinessProfile({...body([{...fixture,...row}]),daily:[{date:'2026-07-01'}]},null);
  assert.equal(response.status,400,'malformed keyword aborts the complete request before writes');
  assert.equal(calls.length,0);
}
assert.throws(()=>sandbox.cleanKeywordRows(body([{...fixture,threshold:15},{...fixture,threshold:15}])));
assert.throws(()=>sandbox.cleanKeywordRows(body(Array(2001).fill({...fixture,threshold:15}))));
calls.length=0;
const synced = await sandbox.syncBusinessProfile(body([{...fixture,threshold:15}]),null);
assert.equal(synced.status,200);
assert.equal(calls[0].body[0].impressions,null,'actual sync sends JSON null, not zero');

const script = vm.createContext({});
vm.runInContext(fs.readFileSync('scripts/google-business-profile-sync.js','utf8'),script);
for (const [input,value,bound] of [[{value:'0'},0,null],[{value:'23'},23,null],[{threshold:'15'},null,15]]) {
  const result = script.keywordCount_(input); assert.equal(result.impressions,value); assert.equal(result.threshold,bound);
}
for (const input of [{},{value:'',threshold:null},{threshold:'0'},{value:'1.2'},{value:'2',threshold:'15'}]) assert.throws(()=>script.keywordCount_(input));
const app = fs.readFileSync('assets/js/tawod-command-center.js','utf8');
const renderer = vm.createContext({Intl,n:x=>Number(x).toLocaleString('ar-SA'),esc:x=>String(x).replace(/</g,'&lt;')});
vm.runInContext(app.slice(app.indexOf('  function renderProfileKeyword('),app.indexOf('  function renderReferralsAndCalls(')),renderer);
const boundedHtml = renderer.renderProfileKeyword({keyword:'<test>',month:'2026-07-01',impressions:null,threshold:15},0);
assert.ok(boundedHtml.includes('أقل من '+(15).toLocaleString('ar-SA')));
assert.ok(boundedHtml.includes('يوليو') && boundedHtml.includes('&lt;test>'));
assert.ok(renderer.renderProfileKeyword({keyword:'missing',month:'2026-07-01',impressions:null,threshold:null},0).includes('غير متاح'));
await db.close();
console.log('Verified exact counts, true zeroes, bound-only keywords, monthly coverage, private RPC access, source timestamps and rejection before writes.');
