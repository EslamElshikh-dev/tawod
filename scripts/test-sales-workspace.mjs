import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, randomUUID, createHash } from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Real, isolated PostgreSQL + the actual Edge handler. No network or production writes.
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  grant usage on schema public to service_role, anon, authenticated;
  create table public.tawod_analytics_events (
    id uuid primary key default gen_random_uuid(), occurred_at timestamptz default now(),
    event_name text, contact_method text, page_path text, landing_path text,
    referrer_host text, utm_source text, utm_medium text, utm_campaign text,
    click_id text, session_id text
  );
  grant select on public.tawod_analytics_events to service_role;
  create table public.tawod_sync_keys(name text primary key,key_hash text,enabled boolean);
`);
await db.exec(fs.readFileSync('supabase/migrations/20260906_tawod_sales_pipeline.sql','utf8'));
const legacyId = randomUUID(), legacyEvent = randomUUID();
await db.query(`insert into tawod_analytics_events(id,event_name,page_path,landing_path,utm_campaign,click_id)
  values($1,'whatsapp_click','/services/','/','legacy','DUMMY-fixture')`,[legacyEvent]);
await db.query(`insert into tawod_sales_outcomes(id,source_type,source_ref,stage,occurred_at)
  values($1,'whatsapp',$2,'qualified',now()-interval '100 days')`,[legacyId,legacyEvent]);
await db.exec(fs.readFileSync('supabase/migrations/20260911090000_tawod_google_sheets_qualified_leads.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260930014446_tawod_sales_followup_workspace.sql','utf8'));
const legacy = (await db.query('select * from tawod_sales_outcomes where id=$1',[legacyId])).rows[0];
assert.equal(legacy.acquisition_source,'google-ads');
assert.equal(legacy.stage_entered_at,null,'do not invent historical stage timestamps');
assert.equal((await db.query('select count(*)::int as n from tawod_sales_history')).rows[0].n,0);
assert.equal((await db.query(`select has_table_privilege('anon','tawod_sales_history','SELECT') as allowed`)).rows[0].allowed,false);
assert.equal((await db.query(`select has_function_privilege('authenticated','tawod_sales_workspace(integer)','EXECUTE') as allowed`)).rows[0].allowed,false);

const fakePassword = 'isolated-test-password';
const fakeSyncKey = 'isolated-sync-key-'.repeat(3);
const hash = v => createHash('sha256').update(v).digest('hex');
const tables = new Set(['tawod_sales_outcomes','tawod_sales_history','tawod_analytics_events']);
const identifier = value => { assert.match(value,/^[a-z_][a-z0-9_]*$/); return '"'+value+'"'; };
const response = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
let concurrentChange = false;
async function restFetch(url,init={}) {
  const parsed = new URL(url);
  assert.equal(parsed.origin,'https://isolated.local','test must never use external services');
  const path = parsed.pathname.replace('/rest/v1/','');
  if (path === 'tawod_admin_config') return response([{value_hash:hash(fakePassword)}]);
  if (path === 'tawod_sync_keys') return response([{key_hash:hash(fakeSyncKey),enabled:true}]);
  if (path === 'rpc/tawod_sales_workspace') {
    const rows = await db.query('select tawod_sales_workspace($1) as workspace',[JSON.parse(init.body).p_days]);
    return response(rows.rows[0].workspace);
  }
  assert.ok(tables.has(path),'unexpected REST table: '+path);
  const params = [], conditions = [];
  for (const [column,filter] of parsed.searchParams) {
    if (['select','order','limit','on_conflict'].includes(column)) continue;
    const col = identifier(column), dot = filter.indexOf('.'), op = filter.slice(0,dot), value = filter.slice(dot+1);
    if (op === 'eq' || op === 'gte') { params.push(value); conditions.push(`${col} ${op==='eq'?'=':'>='} $${params.length}`); }
    else if (op === 'in') { params.push(value.slice(1,-1).split(',')); conditions.push(`${col}=any($${params.length}::text[])`); }
    else if (filter === 'is.null' || filter === 'not.is.null') conditions.push(`${col} is ${filter==='not.is.null'?'not ':''}null`);
    else throw new Error('unexpected filter '+filter);
  }
  const where = conditions.length ? ' where '+conditions.join(' and ') : '';
  try {
    if (!init.method || init.method==='GET') {
      const columns = parsed.searchParams.get('select') || '*';
      const select = columns==='*' ? '*' : columns.split(',').map(identifier).join(',');
      const order = parsed.searchParams.get('order');
      const orderSql = order ? ' order by '+order.split(',').map(piece => { const [col,direction]=piece.split('.'); assert.ok(['asc','desc'].includes(direction)); return identifier(col)+' '+direction; }).join(',') : '';
      const limit = parsed.searchParams.get('limit');
      if (limit) assert.match(limit,/^\d+$/);
      return response((await db.query(`select ${select} from ${identifier(path)}${where}${orderSql}${limit?' limit '+limit:''}`,params)).rows);
    }
    const body = JSON.parse(init.body), columns = Object.keys(body);
    if (init.method==='POST') {
      const sql = `insert into ${identifier(path)}(${columns.map(identifier).join(',')}) values(${columns.map((_,i)=>'$'+(i+1)).join(',')}) returning *`;
      return response((await db.query(sql,Object.values(body))).rows);
    }
    assert.equal(init.method,'PATCH');
    if (concurrentChange) {
      concurrentChange=false;
      await db.query('update tawod_sales_outcomes set updated_at=now()+interval \'1 second\' where id=$1',[params[0]]);
    }
    const values = Object.values(body);
    const assignments = columns.map((column,i)=>identifier(column)+'=$'+(params.length+i+1));
    return response((await db.query(`update ${identifier(path)} set ${assignments.join(',')}${where} returning *`,params.concat(values))).rows);
  } catch (error) {
    return response({error:error.code},error.code==='23505'?409:500);
  }
}
let handler;
const context = vm.createContext({
  crypto:webcrypto,fetch:restFetch,Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,
  btoa,atob,console,setTimeout,
  Deno:{env:{get:name=>({SUPABASE_URL:'https://isolated.local',SUPABASE_SERVICE_ROLE_KEY:'fake-local-service-role'})[name]},serve:fn=>{handler=fn;}}
});
const source = fs.readFileSync('supabase/functions/tawod-analytics/index.ts','utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
vm.runInContext(compiled+'\nglobalThis.salesTest={loadSalesPipeline,normalizeSheetLead};',context);
const origin = 'https://tawodco.com';
const call = async (body,requestOrigin=origin) => {
  const result = await handler(new Request('https://isolated.local/functions/v1/tawod-analytics',{
    method:'POST',headers:{origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)
  }));
  return {status:result.status,...await result.json()};
};
assert.equal((await call({mode:'sales_outcome_get',id:legacyId})).status,401);
assert.equal((await call({mode:'sales_outcome_get',id:legacyId},'https://untrusted.example')).status,403);
const login = await call({mode:'admin_login',username:'admin',password:fakePassword});
assert.equal(login.status,200);
const token = login.token;
const save = body => call({mode:'sales_outcome_upsert',token,sourceType:'other',stage:'new',estimatedValue:0,contractValue:0,...body});
const review = {serviceType:'بناء عظم',serviceFit:'suitable',contactResult:'contacted',
  lastContactAt:new Date(Date.now()-3600000).toISOString(),assignee:'الفريق أ',nextAction:'مراجعة العرض',
  nextFollowUpAt:new Date(Date.now()-60000).toISOString(),projectLocation:'الرياض',executionTiming:'immediate'};
assert.equal((await save({stage:'qualified'})).error,'qualification_required');
assert.equal((await save({stage:'qualified',...review,nextFollowUpAt:null})).error,'followup_required');
assert.equal((await save({stage:'lost'})).error,'lost_reason_required');
assert.equal((await save({stage:'contract_signed',...review})).error,'contract_value_required');
assert.equal((await save({estimatedValue:-1})).error,'invalid_sales_value');
assert.equal((await save({stage:'qualified',...review,lastContactAt:'invalid'})).error,'invalid_followup_date');
assert.equal((await save({stage:'qualified',...review,lastContactAt:new Date(Date.now()+86400000).toISOString()})).error,'invalid_followup_date');
assert.equal((await save({sourceType:'call',sourceRef:'session-suffix'})).error,'invalid_referral_id');
const created = await save({stage:'qualified',...review,estimatedValue:12345});
assert.equal(created.status,200);
const id = created.outcome.id;
assert.ok(created.outcome.qualifiedAt);
assert.ok(created.outcome.stageEnteredAt);
assert.equal(created.outcome.assignee,review.assignee);
const detail = await call({mode:'sales_outcome_get',token,id});
assert.equal(detail.history.length,1);
assert.equal(detail.history[0].event_type,'created');
const updated = await save({...review,id,stage:'quote_sent',estimatedValue:12345,expectedUpdatedAt:created.outcome.updatedAt});
assert.equal(updated.status,200);
assert.ok(updated.outcome.quoteSentAt);
assert.equal((await call({mode:'sales_outcome_get',token,id})).history.length,2);
assert.equal((await save({...review,id,stage:'qualified',expectedUpdatedAt:created.outcome.updatedAt})).error,'sales_outcome_conflict');
concurrentChange = true;
assert.equal((await save({...review,id,stage:'qualified',expectedUpdatedAt:updated.outcome.updatedAt})).error,'sales_outcome_conflict','atomic optimistic update rejects a race');
const latest = await call({mode:'sales_outcome_get',token,id});
const signed = await save({...review,id,stage:'contract_signed',contractValue:10000,expectedUpdatedAt:latest.outcome.updatedAt});
assert.equal(signed.status,200);
assert.equal(signed.outcome.nextFollowUpAt,null,'closed opportunities clear scheduled follow-up');
assert.ok(signed.outcome.contractSignedAt);

const eventId = randomUUID();
await db.query(`insert into tawod_analytics_events(id,event_name,occurred_at,page_path,landing_path,utm_source,utm_medium,utm_campaign,click_id)
  values($1,'whatsapp_click',now()-interval '60 days','/contact','/services/bone','google','cpc','verified-campaign','fixture-click-id-123456789')`,[eventId]);
const linked = await save({...review,stage:'qualified',sourceType:'whatsapp',sourceRef:eventId,campaignName:'forged-campaign'});
assert.equal(linked.status,200);
assert.equal(linked.outcome.sourceEventId,eventId);
assert.equal(linked.outcome.acquisitionSource,'google-ads');
assert.equal(linked.outcome.campaignName,'verified-campaign');
assert.equal(linked.outcome.landingPath,'/services/bone');
assert.equal((await save({sourceType:'whatsapp',sourceRef:eventId})).error,'referral_already_linked');
assert.equal((await save({...review,id:linked.outcome.id,stage:'qualified',sourceType:'call',sourceRef:eventId})).error,'source_is_locked');
assert.equal((await call({mode:'sales_outcome_get',token,sourceRef:eventId})).outcome.id,linked.outcome.id);
let pipeline = await context.salesTest.loadSalesPipeline(7);
assert.equal(pipeline.followups.total,1,'all-date active workspace excludes test fixtures and closed deals');
assert.equal(pipeline.followups.overdue,1);
assert.ok(pipeline.openEntries.find(row=>row.id===linked.outcome.id),'old active opportunities remain actionable');
assert.ok(!pipeline.entries.find(row=>row.id===linked.outcome.id),'period report remains a referral cohort');
const sheets = await call({mode:'google_sheets_export',syncKey:fakeSyncKey});
const exported = sheets.leads.find(row=>row.outcomeId===linked.outcome.id);
assert.equal(exported.qualificationStatus,'Qualified');
assert.equal(exported.projectLocation,'الرياض');
const beforeAck = (await call({mode:'sales_outcome_get',token,id:linked.outcome.id})).history.length;
const ack = await call({mode:'google_sheets_ack',syncKey:fakeSyncKey,leads:[{id:linked.outcome.id,updatedAt:linked.outcome.updatedAt}]});
assert.equal(ack.acknowledged,1);
assert.equal((await call({mode:'sales_outcome_get',token,id:linked.outcome.id})).history.length,beforeAck,'Sheets ACK must not create a fake sales activity');
assert.equal((await call({mode:'google_sheets_export',syncKey:fakeSyncKey})).leads.some(row=>row.outcomeId===linked.outcome.id),false);
for (const badId of ['TEST-fixture-id','DUMMY-fixture-id','fixture-id with spaces',null,'x'.repeat(301)]) {
  const lead = context.salesTest.normalizeSheetLead({id:'fixture',stage:'qualified',click_id:badId,qualified_at:new Date().toISOString()});
  assert.notEqual(lead.qualificationStatus,'Qualified','non-importable clicks must not become Qualified');
  assert.equal(lead.googleClickId,'');
  assert.equal(lead.conversionName,'DO_NOT_IMPORT');
}
const lost = await save({...review,id:linked.outcome.id,sourceType:'whatsapp',sourceRef:eventId,stage:'lost',lostReason:'price',expectedUpdatedAt:linked.outcome.updatedAt});
assert.equal(lost.status,200);
assert.equal(lost.outcome.nextFollowUpAt,null);
pipeline = await context.salesTest.loadSalesPipeline(7);
assert.equal(pipeline.followups.total,0);
// Display limits never truncate the totals. Database queries run with API service privileges.
await db.exec(`set role service_role;
  insert into tawod_sales_outcomes(source_type,stage,occurred_at)
  select 'other','new',now()-interval '1 hour' from generate_series(1,501);`);
pipeline = await context.salesTest.loadSalesPipeline(7);
assert.equal(pipeline.followups.total,501);
assert.equal(pipeline.openEntries.length,500);
assert.equal(pipeline.openEntriesTruncated,true);
assert.equal(pipeline.summary.opportunities,502);
assert.equal(pipeline.entries.length,500);
assert.equal(pipeline.entriesTruncated,true);
await db.close();
console.log('Verified real Postgres migration, private access, full aggregates, all-date follow-ups, exact attribution, qualifications, stage history, conflicts, and Sheets regression guards.');
