import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Synthetic data in local Postgres only. No Google calls or production writes.
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
const baseline = fs.readFileSync('supabase/migrations/20260905_tawod_command_center_v2.sql','utf8');
for (const table of ['tawod_business_profile_daily','tawod_business_profile_keywords_monthly']) {
  const start = baseline.indexOf('create table if not exists public.' + table + ' (');
  await db.exec(baseline.slice(start,baseline.indexOf('\n);',start)+3));
  await db.exec('alter table public.' + table + ' enable row level security');
}
for (const file of ['20261004161315_tawod_gbp_riyadh_coverage.sql','20261005055002_tawod_gbp_keyword_thresholds.sql','20261012055125_tawod_gbp_atomic_sync.sql']) await db.exec(fs.readFileSync('supabase/migrations/' + file,'utf8'));
await db.exec("insert into public.tawod_business_profile_connection(slot,location_id) values('primary','locations/111')");
const { today } = (await db.query("select (now() at time zone 'Asia/Riyadh')::date::text today")).rows[0];
const beforeDate = offset => new Date(Date.parse(today+'T00:00:00Z')-offset*86400000).toISOString().slice(0,10);
const yesterday = beforeDate(1), month = yesterday.slice(0,7)+'-01';
const fields = ['search_desktop_impressions','search_mobile_impressions','maps_desktop_impressions','maps_mobile_impressions','call_clicks','website_clicks','direction_requests','bookings'];
const cachedAt = '2020-01-02T03:04:05.123456Z';
const daily = Array.from({length:90},(_,i)=>({
  report_date:beforeDate(90-i), location_id:'locations/111', profile_name:'شركة تعاود للمقاولات · الرياض',
  ...Object.fromEntries(fields.map((field,j)=>[field,j===7?0:i+j+1])),synced_at:cachedAt
}));
const keywords = [
  {search_keyword:'exact',impressions:23,threshold:null},
  {search_keyword:'true-zero',impressions:0,threshold:null},
  ...Array.from({length:40},(_,i)=>({search_keyword:'bound-'+i,impressions:null,threshold:15}))
].map(row=>({...row,report_month:month,location_id:'locations/111',synced_at:cachedAt}));
await db.query(`insert into public.tawod_business_profile_daily(report_date,location_id,conversations,synced_at)
  values($1,'locations/111',13,'2019-01-01T00:00:00Z'),($1,'locations/222',900,'2019-01-01T00:00:00Z')`,[yesterday]);
await db.query(`insert into public.tawod_business_profile_keywords_monthly(report_month,location_id,search_keyword,impressions,threshold)
  values($1,'locations/222','other branch',900,null)`,[month]);
const ingest = async (d=daily,k=keywords,location='locations/111') => (await db.query('select public.tawod_business_profile_ingest($1,$2::jsonb,$3::jsonb) receipt',[location,JSON.stringify(d),JSON.stringify(k)])).rows[0].receipt;
const receipt = await ingest();
assert.equal(receipt.verified,true);
assert.equal(receipt.dailyWritten,90);
assert.equal(receipt.keywordsWritten,42);
assert.equal(receipt.sourceFetchedAt,cachedAt,'original microsecond cache time survives Postgres, always reported in UTC');
for (const days of [7,30,90]) {
  assert.equal(receipt.windows[days].reportingDays,days-1,'today is deliberately absent, through-yesterday coverage is explicit');
  assert.equal(receipt.windows[days].keywordRows,42,'all monthly rows are verified without a top-30 cutoff');
}
const stored = async()=> (await db.query("select to_char(synced_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') fetched,call_clicks,conversations from public.tawod_business_profile_daily where location_id='locations/111' and report_date=$1",[yesterday])).rows[0];
assert.equal((await stored()).fetched,cachedAt);
assert.equal((await stored()).conversations,13,'discontinued conversations is never updated');
const older = await ingest(daily.map(row=>({...row,call_clicks:9999,synced_at:'2018-01-01T00:00:00Z'})),keywords.map(row=>({...row,synced_at:'2018-01-01T00:00:00Z'})));
assert.equal(older.dailyWritten,0);
assert.equal(older.dailySkippedOlder,90);
assert.equal(older.keywordsSkippedOlder,42);
assert.equal((await stored()).call_clicks,daily.at(-1).call_clicks);
assert.equal((await ingest()).dailyWritten,90,'replaying an equal cache timestamp is idempotent');
const newer = [{...daily.at(-1),call_clicks:321,synced_at:'2022-01-01T00:00:00Z'}];
for (const patch of [{call_clicks:null},{call_clicks:-1},{call_clicks:1.5},{call_clicks:9007199254740992},{call_clicks:undefined},{synced_at:null},{synced_at:'2020-02-30T00:00:00Z'},{report_date:today},{conversations:0},{location_id:'locations/222'}]) {
  await assert.rejects(ingest([{...newer[0],...patch}],[]));
  assert.equal((await stored()).fetched,cachedAt,'invalid input never writes');
}
await assert.rejects(ingest(newer,[{...keywords[0],threshold:15}]));
await assert.rejects(ingest(newer,[{...keywords[0],impressions:null}]));
await assert.rejects(ingest(newer,[{...keywords[0],threshold:undefined}]));
await assert.rejects(ingest([newer[0],newer[0]],[]));
await assert.rejects(ingest(newer,[keywords[0],keywords[0]]));
await assert.rejects(ingest(newer,[],'locations/222'));
assert.equal((await stored()).fetched,cachedAt,'bad keywords roll back/prevent the daily write too');
assert.equal((await db.query("select conversations from public.tawod_business_profile_daily where location_id='locations/222'")).rows[0].conversations,900,'other branches remain untouched');
assert.equal((await ingest([],[])).verified,true,'an empty keyword page still checks the configured account and existing RPC totals');
for (const role of ['anon','authenticated']) {
  await db.exec('set role ' + role);
  await assert.rejects(ingest([],[]),'private ingestion is unavailable to public roles');
  await db.exec('reset role');
}
// A corrupt analytics result after writes must roll the transaction back.
await db.exec(`alter function public.tawod_business_profile_analytics(integer) rename to tawod_business_profile_analytics_valid;
  create function public.tawod_business_profile_analytics(p_days integer) returns jsonb language sql stable set search_path='' as
  $$ select jsonb_set(public.tawod_business_profile_analytics_valid(p_days),'{summary,calls}','999999999'::jsonb) $$;`);
await assert.rejects(ingest(newer,[{...keywords[0],impressions:55,synced_at:'2022-01-01T00:00:00Z'}]),/profile_analytics_mismatch/);
assert.equal((await stored()).fetched,cachedAt,'post-write validation rolls daily writes back');
assert.equal((await db.query("select impressions from public.tawod_business_profile_keywords_monthly where search_keyword='exact' and location_id='locations/111'")).rows[0].impressions,23,'post-write validation rolls keyword writes back');
await db.exec(`drop function public.tawod_business_profile_analytics(integer); alter function public.tawod_business_profile_analytics_valid(integer) rename to tawod_business_profile_analytics;`);

const edge = fs.readFileSync('supabase/functions/tawod-analytics/index.ts','utf8');
const requests=[];
let authorized=true, rpcFailure=false;
const sandbox=vm.createContext({
  Response, setTimeout:fn=>fn(),text:(x,max)=>typeof x==='string'?x.trim().slice(0,max):null,
  validDate:x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:null,
  verifySyncKey:async()=>authorized,json:(body,status=200)=>new Response(JSON.stringify(body),{status}),
  supabase:async(path,init)=>{
    const body=JSON.parse(init.body);requests.push({path,body});
    if (!path.includes('/rpc/')) return new Response(null,{status:204});
    if (rpcFailure) return new Response(JSON.stringify({error:'unavailable'}),{status:503});
    try { return new Response(JSON.stringify(await ingest(body.p_daily,body.p_keywords,body.p_location_id))); }
    catch { return new Response(JSON.stringify({error:'invalid_batch'}),{status:400}); }
  }
});
vm.runInContext(ts.transpile(edge.slice(edge.indexOf('const PROFILE_FIELDS:'),edge.indexOf('function normalizeSalesRow(')),{target:ts.ScriptTarget.ES2022}),sandbox);
const apiMetrics=['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_SEARCH','BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_MOBILE_MAPS','CALL_CLICKS','WEBSITE_CLICKS','BUSINESS_DIRECTION_REQUESTS','BUSINESS_BOOKINGS'];
const dateParts=Object.fromEntries(['year','month','day'].map((key,i)=>[key,Number(yesterday.split('-')[i])]));
const google={mode:'business_profile_google_sync',locationId:'locations/111',syncedAt:'2023-01-02T03:04:05.123456Z',rangeStart:beforeDate(90),rangeEnd:yesterday,
  dailyResponse:{multiDailyMetricTimeSeries:[{dailyMetricTimeSeries:apiMetrics.map((dailyMetric,i)=>({dailyMetric,timeSeries:{datedValues:[{date:dateParts,...(i===7?{}:{value:String(i+1)})}]}}))}]}};
requests.length=0;
const success=await sandbox.syncBusinessProfile(structuredClone(google),null);
assert.equal(success.status,200,'raw Google -> strict Edge -> real SQL transaction succeeds');
const result=await success.json();
assert.equal(result.receipt.verified,true);
assert.equal(result.receipt.dailyWritten,1);
assert.equal((await stored()).fetched,google.syncedAt,'Edge preserves microsecond precision, not execution time');
assert.equal(requests[0].body.p_daily[0].bookings,0,'documented omitted Google DatedValue is a true zero');
assert.equal(Object.hasOwn(requests[0].body.p_daily[0],'conversations'),false);
const mutateGoogle=edit=>{const body=structuredClone(google);edit(body,body.dailyResponse.multiDailyMetricTimeSeries[0].dailyMetricTimeSeries);return body;};
const invalidGoogle=[
  mutateGoogle((b,s)=>s.pop()),
  mutateGoogle((b,s)=>s[0].timeSeries.datedValues=[]),
  mutateGoogle((b,s)=>s[0].timeSeries.datedValues[0].value=null),
  mutateGoogle((b,s)=>s[0].timeSeries.datedValues[0].value='-1'),
  mutateGoogle((b,s)=>s[0].timeSeries.datedValues[0].value='1.5'),
  mutateGoogle((b,s)=>s[0].timeSeries.datedValues[0].value='9007199254740992'),
  mutateGoogle((b,s)=>s.push(s[0])),
  mutateGoogle((b,s)=>s[0].timeSeries.datedValues.push(s[0].timeSeries.datedValues[0])),
  mutateGoogle(b=>delete b.syncedAt),
  mutateGoogle(b=>b.rangeStart='2020-01-01'),
  mutateGoogle(b=>b.daily=[]),
];
for(const bad of invalidGoogle){requests.length=0;assert.equal((await sandbox.syncBusinessProfile(bad,null)).status,400);assert.equal(requests.length,0,'source failure is rejected before SQL writes');}
const inputKeys=['searchDesktopImpressions','searchMobileImpressions','mapsDesktopImpressions','mapsMobileImpressions','callClicks','websiteClicks','directionRequests','bookings'];
const observation={date:yesterday,...Object.fromEntries(inputKeys.map(key=>[key,0])),syncedAt:'2024-01-01T00:00:00Z'};
for(const patch of [{callClicks:null},{callClicks:undefined},{callClicks:true},{callClicks:''},{callClicks:-1},{callClicks:1.5},{syncedAt:undefined},{date:'2026-02-30'},{location_id:'locations/222'}]){
  requests.length=0;const response=await sandbox.syncBusinessProfile({locationId:'locations/111',daily:[{...observation,...patch}]},null);
  assert.equal(response.status,400);assert.equal(requests.length,0);
}
const keywordPage={mode:'business_profile_google_sync',locationId:'locations/111',syncedAt:'2024-01-01T00:00:00Z',reportMonth:month,
  keywordResponse:{searchKeywordsCounts:[{searchKeyword:'google bound',insightsValue:{threshold:'15'}},{searchKeyword:'google zero',insightsValue:{value:'0'}}],nextPageToken:'next-page'}};
requests.length=0;
const pageResponse=await sandbox.syncBusinessProfile(keywordPage,null);assert.equal(pageResponse.status,200);
assert.equal((await pageResponse.json()).nextPageToken,'next-page');
assert.equal(requests[0].body.p_keywords[0].impressions,null);
assert.equal(requests[0].body.p_keywords[0].threshold,15);
assert.equal(requests[0].body.p_keywords[1].impressions,0);
for(const insight of [{},{threshold:'0'},{value:'0',threshold:'15'},{value:'23',threshold:'15'},{value:null}]){
  requests.length=0;const bad={...keywordPage,keywordResponse:{searchKeywordsCounts:[{searchKeyword:'bad',insightsValue:insight}]}};
  assert.equal((await sandbox.syncBusinessProfile(bad,null)).status,400);assert.equal(requests.length,0);
}
requests.length=0;
assert.equal((await sandbox.syncBusinessProfile({...keywordPage,keywordResponse:{}},null)).status,200,'a documented empty repeated list writes no observations');
assert.equal(requests[0].body.p_keywords.length,0);
for (const invalid of [{error:{code:403}},{status:'pending'},{searchKeywordsCounts:null}]) {
  requests.length=0;assert.equal((await sandbox.syncBusinessProfile({...keywordPage,keywordResponse:invalid},null)).status,400);assert.equal(requests.length,0);
}
authorized=false;requests.length=0;
assert.equal((await sandbox.syncBusinessProfile(google,null)).status,401);assert.equal(requests.length,0);authorized=true;
rpcFailure=true;requests.length=0;
assert.equal((await sandbox.syncBusinessProfile(google,null)).status,500);assert.equal(requests.length,1,'failed ingestion is never reported as success or followed by last_used_at');

// Exercise the real HTTP dispatcher and hash authentication with a synthetic key.
let handler;
const testKey='synthetic-business-profile-key-not-a-real-secret';
const testHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(testKey))),b=>b.toString(16).padStart(2,'0')).join('');
const dispatcher=vm.createContext({Request,Response,URL,TextEncoder,TextDecoder,crypto,setTimeout:fn=>fn(),
  Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://synthetic.invalid':'synthetic-server-credential'},serve:fn=>{handler=fn;}},
  fetch:async(url,init)=>{
    if(url.includes('/tawod_sync_keys')) return init?.method==='PATCH'?new Response(null,{status:204}):new Response(JSON.stringify([{key_hash:testHash,enabled:true}]));
    assert.ok(url.endsWith('/rpc/tawod_business_profile_ingest'));
    const body=JSON.parse(init.body);return new Response(JSON.stringify(await ingest(body.p_daily,body.p_keywords,body.p_location_id)));
  }
});
vm.runInContext(ts.transpile(edge,{target:ts.ScriptTarget.ES2022}),dispatcher);
const requestWithKey=key=>new Request('https://synthetic.invalid/analytics',{method:'POST',headers:{'content-type':'application/json',...(key?{'x-tawod-sync-key':key}:{})},body:JSON.stringify(google)});
assert.equal((await handler(requestWithKey(testKey))).status,200,'Make API Key header passes the existing scoped hash verification');
assert.equal((await handler(requestWithKey('synthetic-wrong-business-profile-key'))).status,401);
assert.equal((await handler(requestWithKey(null))).status,401);

// Apps Script alternative uses the same precise calendar/range semantics.
const script=vm.createContext({Utilities:{formatDate:(date,zone)=>new Date(date.getTime()+(zone==='Asia/Riyadh'?3*3600000:0)).toISOString().slice(0,10)}});
vm.runInContext(fs.readFileSync('scripts/google-business-profile-sync.js','utf8'),script);
const range=script.profileRange_(new Date('2026-01-01T21:30:00Z'));
assert.equal(range.end.toISOString().slice(0,10),'2026-01-01','Riyadh local yesterday crosses UTC/year boundaries correctly');
assert.equal((range.end-range.start)/86400000,89);
let calls=0;
script.googleGet_=()=>{calls++;return{searchKeywordsCounts:[]};};
script.fetchMonthlyKeywords_('locations/111',new Date('2026-07-14T00:00:00Z'),new Date('2026-10-11T00:00:00Z'),'synthetic');
assert.equal(calls,4,'90 days can span four calendar months; request each month separately');
script.googleGet_=()=>structuredClone(google.dailyResponse);
assert.equal(script.fetchDailyMetrics_('locations/111',new Date(google.rangeStart+'T00:00:00Z'),new Date(yesterday+'T00:00:00Z'),'synthetic')[0].bookings,0);
script.googleGet_=()=>invalidGoogle[0].dailyResponse;
assert.throws(()=>script.fetchDailyMetrics_('locations/111',new Date(google.rangeStart+'T00:00:00Z'),new Date(yesterday+'T00:00:00Z'),'synthetic'));
await db.close();
console.log('Verified atomic 90-day ingestion, account isolation, 7/30/90 RPC totals, keyword bounds/pagination, cache timestamps, older-cache protection and rejection/rollback of incomplete source data.');
