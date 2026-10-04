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
    click_id text, session_id text, visitor_id text, device_type text, utm_content text, service_type text
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
await db.exec(fs.readFileSync('supabase/migrations/20260930024439_tawod_decisions_commercial_workspace.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260930034625_tawod_notification_feed.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260930051049_tawod_social_measurement_workspace.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260930062353_tawod_meta_attribution_clarity.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260930161904_tawod_customer_records.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260930170548_customer_activity_index.sql','utf8'));
const legacy = (await db.query('select * from tawod_sales_outcomes where id=$1',[legacyId])).rows[0];
assert.equal(legacy.acquisition_source,'google-ads');
assert.equal(legacy.stage_entered_at,null,'do not invent historical stage timestamps');
assert.equal((await db.query('select count(*)::int as n from tawod_sales_history')).rows[0].n,0);
assert.equal((await db.query(`select has_table_privilege('anon','tawod_sales_history','SELECT') as allowed`)).rows[0].allowed,false);
assert.equal((await db.query(`select has_function_privilege('authenticated','tawod_sales_workspace(integer)','EXECUTE') as allowed`)).rows[0].allowed,false);

const fakePassword = 'isolated-test-password';
const fakeSyncKey = 'isolated-sync-key-'.repeat(3);
const hash = v => createHash('sha256').update(v).digest('hex');
const tables = new Set(['tawod_sales_outcomes','tawod_sales_history','tawod_analytics_events','tawod_decisions','tawod_decision_history']);
const identifier = value => { assert.match(value,/^[a-z_][a-z0-9_]*$/); return '"'+value+'"'; };
const response = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
let concurrentChange = false;
async function restFetch(url,init={}) {
  const parsed = new URL(url);
  assert.equal(parsed.origin,'https://isolated.local','test must never use external services');
  const path = parsed.pathname.replace('/rest/v1/','');
  if (path === 'tawod_admin_config') return response([{value_hash:hash(fakePassword)}]);
  if (path === 'tawod_sync_keys') return response([{key_hash:hash(fakeSyncKey),enabled:true}]);
  if (['rpc/tawod_social_import','rpc/tawod_social_workspace','rpc/tawod_admin_analytics','rpc/tawod_visitor_frequency','rpc/tawod_attribution_source'].includes(path)) {
    const args=JSON.parse(init.body), fn=path.slice(4);
    const values=fn==='tawod_social_import'?[JSON.stringify(args.p_rows)]:fn==='tawod_social_workspace'?[args.p_days,args.p_start_at||null,args.p_end_at||null]:fn==='tawod_attribution_source'?[args.p_source,args.p_medium,args.p_referrer,args.p_click_id,args.p_landing]:[args.p_days];
    return response((await db.query('select '+identifier(fn)+'('+values.map((_,i)=>'$'+(i+1)).join(',')+') as result',values)).rows[0].result);
  }
  if (['rpc/tawod_google_ads_analytics','rpc/tawod_business_profile_analytics'].includes(path)) return response({connected:false});
  if (path === 'rpc/tawod_paid_referral_costs') return response({available:false});
  if (path === 'rpc/tawod_customer_api') { const a=JSON.parse(init.body); return response((await db.query('select tawod_customer_api($1,$2::jsonb) as data',[a.p_action,JSON.stringify(a.p_payload)])).rows[0].data); }
  if (path === 'rpc/tawod_sales_workspace') {
    const rows = await db.query('select tawod_sales_workspace($1) as workspace',[JSON.parse(init.body).p_days]);
    return response(rows.rows[0].workspace);
  }
  if (path === 'rpc/tawod_sales_commercial') return response((await db.query('select tawod_sales_commercial($1) as result',[JSON.parse(init.body).p_days])).rows[0].result);
  if (path === 'rpc/tawod_decision_workspace') return response((await db.query('select tawod_decision_workspace() as result')).rows[0].result);
  if (path === 'rpc/tawod_notification_feed') return response((await db.query('select tawod_notification_feed() as result')).rows[0].result);
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
      await db.query(`update ${identifier(path)} set updated_at=now()+interval '1 second' where id=$1`,[params[0]]);
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
vm.runInContext(compiled+'\nglobalThis.salesTest={loadSalesPipeline,normalizeSheetLead,loadCommercial,loadDecisions,loadNotificationFeed,referralSource,normalizeSocialReports};',context);
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
assert.equal(login.adminProfile.username,'admin');
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

// A contract can close during the period even when its referral cohort is older.
let commercial = await context.salesTest.loadCommercial(7);
assert.equal(commercial.activity.contracts,1);
assert.equal(commercial.activity.lost,1);
assert.equal(commercial.activity.closedWinRate,50);
assert.equal(commercial.sources.length,1);
assert.equal(commercial.sources[0].source_key,'unlinked','manual source labels cannot manufacture measured attribution');
assert.equal(commercial.sources[0].contracts,1);
assert.equal(commercial.sources[0].contract_value,10000);
const oldSigned = await save({...review,id:linked.outcome.id,sourceType:'whatsapp',sourceRef:eventId,stage:'contract_signed',contractValue:60000,expectedUpdatedAt:lost.outcome.updatedAt});
assert.equal(oldSigned.status,200);
commercial = await context.salesTest.loadCommercial(7);
assert.equal(commercial.activity.contracts,2,'closure activity includes old referrals');
assert.equal(commercial.activity.contractValue,70000);
assert.equal(commercial.sources[0].contracts,1,'source table is a referral cohort, not closure activity');
const reopened = await save({...review,id:linked.outcome.id,sourceType:'whatsapp',sourceRef:eventId,stage:'qualified',expectedUpdatedAt:oldSigned.outcome.updatedAt});
assert.equal(reopened.status,200);
assert.equal((await context.salesTest.loadCommercial(7)).activity.contracts,1,'reopened deals leave current closed activity');
await save({...review,id:linked.outcome.id,sourceType:'whatsapp',sourceRef:eventId,stage:'lost',lostReason:'timing',expectedUpdatedAt:reopened.outcome.updatedAt});
const historicalClosed = randomUUID();
await db.query(`insert into tawod_sales_outcomes(id,source_type,stage,occurred_at,contract_value) values($1,'other','contract_signed',now()-interval '120 days',888)`,[historicalClosed]);
await db.query('update tawod_sales_outcomes set stage_entered_at=null where id=$1',[historicalClosed]);
commercial = await context.salesTest.loadCommercial(7);
assert.equal(commercial.unknownClosedDates,1);
assert.equal(commercial.activity.contracts,1,'unknown historical closure dates are never invented');
const organicEvent = randomUUID();
await db.query(`insert into tawod_analytics_events(id,event_name,page_path,landing_path,referrer_host) values($1,'call_click','/bone','/bone','www.google.com')`,[organicEvent]);
const organic = await save({...review,sourceType:'call',sourceRef:organicEvent,stage:'qualified',estimatedValue:20000});
assert.equal(organic.status,200);
await db.query(`update tawod_sales_outcomes set stage_entered_at=now()-interval '20 days' where id=$1`,[organic.outcome.id]);
const organicLoss = await save({...review,sourceType:'call',sourceRef:organicEvent,id:organic.outcome.id,stage:'lost',lostReason:'price',expectedUpdatedAt:organic.outcome.updatedAt});
assert.equal(organicLoss.status,200);
commercial = await context.salesTest.loadCommercial(7);
assert.equal(commercial.sources.find(row=>row.source_key==='google-organic').lost,1);
assert.equal(commercial.lossReasons.find(row=>row.reason==='price').total,1);

// Persistent actions require review, keep immutable evidence, and reject conflicting edits.
assert.equal((await call({mode:'decision_get',id:randomUUID()})).status,401);
assert.equal((await call({mode:'decision_get',token,insightKey:'safe-key'},'https://untrusted.example')).status,403);
for (const table of ['tawod_decisions','tawod_decision_history']) {
  assert.equal((await db.query("select has_table_privilege('anon',$1,'SELECT') as allowed",[table])).rows[0].allowed,false);
}
for (const rpc of ['tawod_sales_commercial(integer)','tawod_decision_workspace()']) {
  assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') as allowed",[rpc])).rows[0].allowed,false);
}
const decisionSave = body => call({mode:'decision_upsert',token,title:'مراجعة تغطية الرد',action:'توزيع ساعات الرد وتسجيل النتيجة',priority:'high',status:'planned',...body});
assert.equal((await decisionSave({status:'in_progress'})).error,'decision_owner_date_required');
assert.equal((await decisionSave({status:'done',assignee:'الفريق أ'})).error,'decision_result_required');
assert.equal((await decisionSave({status:'dismissed'})).error,'decision_result_required');
assert.equal((await decisionSave({insightKey:'coverage-rule'})).error,'decision_evidence_required');
const firstDecision = await decisionSave({insightKey:'coverage-rule',source:'مسار البيع',evidence:'3 متابعات متأخرة وقت المراجعة',periodDays:7});
assert.equal(firstDecision.status,200);
const decisionId = firstDecision.decision.id;
assert.equal((await decisionSave({insightKey:'coverage-rule',evidence:'جديد',periodDays:7})).error,'decision_already_saved');
assert.equal((await call({mode:'decision_get',token,insightKey:'coverage-rule'})).decision.id,decisionId);
assert.equal((await call({mode:'decision_get',token,id:decisionId})).history.length,1);
const underway = await decisionSave({id:decisionId,status:'in_progress',assignee:'الفريق أ',dueAt:new Date(Date.now()-60000).toISOString(),expectedUpdatedAt:firstDecision.decision.updatedAt,evidence:'forged replacement',source:'forged source'});
assert.equal(underway.status,200);
assert.equal(underway.decision.evidence,firstDecision.decision.evidence,'evidence stays frozen when data/rules change');
assert.equal(underway.decision.source,'مسار البيع');
assert.equal((await decisionSave({id:decisionId,expectedUpdatedAt:firstDecision.decision.updatedAt})).error,'decision_conflict');
concurrentChange=true;
assert.equal((await decisionSave({id:decisionId,expectedUpdatedAt:underway.decision.updatedAt})).error,'decision_conflict','atomic conflict prevents overwriting another session');
const currentDecision = (await call({mode:'decision_get',token,id:decisionId})).decision;
const doneDecision = await decisionSave({id:decisionId,status:'done',assignee:'الفريق أ',result:'تم توزيع الجدول وتوثيق ساعات التغطية',expectedUpdatedAt:currentDecision.updatedAt});
assert.equal(doneDecision.status,200);
assert.ok(doneDecision.decision.completedAt);
assert.equal((await context.salesTest.loadDecisions()).summary.active,0);
assert.equal((await context.salesTest.loadDecisions()).summary.done,1);
assert.equal((await call({mode:'decision_get',token,id:decisionId})).history[0].event_type,'status_changed');
const again = await decisionSave({id:decisionId,status:'planned',expectedUpdatedAt:doneDecision.decision.updatedAt});
assert.equal(again.status,200);
assert.equal(again.decision.completedAt,null,'reopening clears completion timestamp without erasing history');
// Stable historical events are independent of report periods and current follow-up alerts.
assert.equal((await call({mode:'notification_feed'})).status,401);
assert.equal((await call({mode:'notification_feed',token},'https://untrusted.example')).status,403);
for (const role of ['anon','authenticated']) {
  assert.equal((await db.query("select has_function_privilege($1,'tawod_notification_feed()','EXECUTE') as allowed",[role])).rows[0].allowed,false);
}
const historicEvent = randomUUID(), futureEvent = randomUUID(), realNotificationEvent = randomUUID();
await db.query(`insert into tawod_analytics_events(id,event_name,page_path,occurred_at) values
  ($1,'call_click','/historic/',now()-interval '8 days'),
  ($2,'call_click','/future/',now()+interval '1 day'),
  ($3,'call_click','/services/',now()-interval '2 minutes')`,[historicEvent,futureEvent,realNotificationEvent]);
let feed = await call({mode:'notification_feed',token,days:7});
assert.equal(feed.status,200); assert.equal(feed.connected,true); assert.equal(feed.windowDays,7);
assert.ok(feed.entries.some(row=>row.id==='referral:'+realNotificationEvent && row.kind==='referral' && row.detail.method==='call'));
assert.ok(feed.entries.some(row=>row.kind==='sales' && row.outcomeId===id && row.detail.eventType==='stage_changed'));
assert.ok(feed.entries.some(row=>row.kind==='decision' && row.decisionId===decisionId && row.detail.eventType==='status_changed'));
assert.ok(feed.entries.every(row=>['created','stage_changed','status_changed'].includes(row.detail.eventType) || row.kind==='referral'),'metadata updates and Sheets acknowledgements are not invented notifications');
assert.ok(feed.entries.every(row=>row.id!=='referral:'+legacyEvent && row.outcomeId!==legacyId),'test sales and clicks are excluded');
assert.ok(feed.entries.every(row=>!['referral:'+historicEvent,'referral:'+futureEvent].includes(row.id)));
assert.equal(new Set(feed.entries.map(row=>row.id)).size,feed.entries.length);
const againFeed = await call({mode:'notification_feed',token,days:90});
assert.deepEqual(againFeed.entries,feed.entries,'refreshing/changing report periods preserves event IDs and timestamps');
assert.equal(feed.alerts.overdueFollowups,(await context.salesTest.loadSalesPipeline(7)).followups.overdue);
// Display limits never truncate the totals. Database queries run with API service privileges.
await db.exec(`set role service_role;
  insert into tawod_sales_outcomes(source_type,stage,occurred_at)
  select 'other','new',now()-interval '1 hour' from generate_series(1,501);`);
pipeline = await context.salesTest.loadSalesPipeline(7);
assert.equal(pipeline.followups.total,501);
assert.equal(pipeline.openEntries.length,500);
assert.equal(pipeline.openEntriesTruncated,true);
assert.equal(pipeline.summary.opportunities,503);
assert.equal(pipeline.entries.length,500);
assert.equal(pipeline.entriesTruncated,true);
commercial = await context.salesTest.loadCommercial(7);
const openStage = commercial.board.stages.find(row=>row.scope==='open' && row.stage==='new');
assert.equal(openStage.total,501);
assert.equal(commercial.board.entries.filter(row=>row.scope==='open' && row.stage==='new').length,40);
assert.equal(commercial.sources.find(row=>row.source_key==='unlinked').opportunities,502);
await db.exec(`insert into tawod_decisions(title,action,status) select 'إجراء اختباري','مراجعة','planned' from generate_series(1,501);`);
const cappedDecisions = await context.salesTest.loadDecisions();
assert.equal(cappedDecisions.summary.total,502);
assert.equal(cappedDecisions.entries.length,500);
assert.equal(cappedDecisions.entriesTruncated,true);
assert.equal((await call({mode:'decision_get',token,insightKey:'coverage-rule'})).decision.id,decisionId,'exact lookup works outside a capped workspace');
feed = await context.salesTest.loadNotificationFeed();
assert.equal(feed.entries.length,100); assert.equal(feed.truncated,true); assert.ok(feed.totalAvailable>100);
assert.equal(feed.alerts.unassignedOpportunities,501,'alert counts are not limited by displayed events');
assert.ok(feed.entries.every((row,i,all)=>!i || new Date(all[i-1].at)>=new Date(row.at)),'newest real events appear first');
// Social reports and acquisition parity run against real Postgres and the actual authenticated handler.
await db.exec('reset role');
const attributionCases=[
  ['meta','paid_social',null,null,'/'],
  ['instagram','organic_social',null,null,'/'],['ig','paid_social',null,null,'/'],['fb','unpaid',null,null,'/'],['facebook_ads',null,null,null,'/'],
  ['tiktok','cpc',null,null,'/'],['tt','social',null,null,'/'],['Twitter','paid_social',null,null,'/'],['x','organic_social',null,null,'/'],
  [null,null,'l.instagram.com',null,'/'],[null,null,'www.facebook.com',null,'/'],[null,null,'m.tiktok.com',null,'/'],[null,null,'t.co',null,'/'],
  [null,null,'chatgpt.com',null,'/'],[null,null,'t.co.attacker.example',null,'/'],['instagram',null,null,'real-gclid','/'],
  ['facebook',null,null,null,'/?gclid=real'],['x',null,null,null,'/?gad_source=1'],[null,null,null,null,'/?ttclid=real'],
  [null,null,'www.google.com',null,'/'],['google_ads',null,null,null,'/'],['google','organic',null,null,'/'],[null,null,'tawodco.com',null,'/']
];
for(const params of attributionCases){
  const sql=(await db.query('select tawod_attribution_source($1,$2,$3,$4,$5) as source',params)).rows[0].source;
  const js=context.salesTest.referralSource(Object.fromEntries(['utm_source','utm_medium','referrer_host','click_id','landing_path'].map((key,i)=>[key,params[i]])));
  assert.equal(js,sql,'Edge and PostgreSQL must classify identically: '+JSON.stringify(params));
}
assert.equal(context.salesTest.referralSource({referrer_host:'chatgpt.com'}),'chatgpt.com');
assert.equal(context.salesTest.referralSource({utm_source:'meta',utm_medium:'paid_social'}),'meta-ads','Meta without placement is not falsely assigned to Facebook');
assert.equal(context.salesTest.referralSource({utm_source:'facebook',utm_medium:'unpaid'}),'facebook');
const snapshot={platform:'instagram',account_id:'isolated-account',account_name:'حساب معزول',period_start:new Date(Date.now()-6*86400000).toISOString().slice(0,10),
  period_end:new Date(Date.now()-86400000).toISOString().slice(0,10),scope:'organic',time_zone:'Asia/Riyadh',source_name:'Instagram account-period export',
  aggregation:'account_period',observed_at:new Date().toISOString(),reach:12,views:null,interactions:0,followers_start:100,followers_end:95};
assert.equal((await call({mode:'social_reports_import',rows:[snapshot]})).status,401);
assert.equal((await call({mode:'social_reports_import',token,rows:[snapshot]},'https://untrusted.example')).status,403);
let importResult=await call({mode:'social_reports_import',token,rows:[snapshot]}); assert.equal(importResult.status,200);assert.equal(importResult.saved,1);
importResult=await call({mode:'social_reports_import',token,rows:[snapshot]});assert.equal(importResult.saved,1);
assert.equal((await db.query('select count(*)::int as n from tawod_social_reports')).rows[0].n,1,'idempotent account/scope/period snapshots');
let native=(await db.query('select * from tawod_social_reports')).rows[0];assert.equal(Number(native.reach),12);assert.equal(native.views,null);assert.equal(Number(native.interactions),0);
const older={...snapshot,reach:999,observed_at:new Date(Date.now()-3600000).toISOString()};
assert.equal((await call({mode:'social_reports_import',token,rows:[older]})).saved,0,'older extraction must not overwrite newer report');
for(const invalid of [
  {...snapshot,reach:-1},{...snapshot,reach:1.5},{...snapshot,reach:'1,000'},{...snapshot,reach:'99999999999999999'},
  {...snapshot,aggregation:'daily_sum'},{...snapshot,period_end:'2099-01-01'},{...snapshot,period_start:'2026-02-30'},
  {...snapshot,time_zone:'Not/AZone'},{...snapshot,spend:10,currency:null},{...snapshot,observed_at:'2099-01-01T00:00:00Z'},
  {...snapshot,reach:null,interactions:null,followers_start:null,followers_end:null}
]) assert.equal((await call({mode:'social_reports_import',token,rows:[invalid]})).status,400,JSON.stringify(invalid));
assert.equal((await call({mode:'social_reports_import',token,rows:[snapshot,snapshot]})).status,400);
assert.equal((await call({mode:'social_reports_import',token,rows:[{...snapshot,account_id:'new'}, {...snapshot,platform:'invalid'}]})).status,400);
assert.equal((await db.query('select count(*)::int as n from tawod_social_reports')).rows[0].n,1,'bad batch makes no partial writes');
assert.equal((await call({mode:'social_reports_sync',syncKey:'wrong',rows:[snapshot]},'')).status,401);
assert.equal((await call({mode:'social_reports_sync',syncKey:fakeSyncKey,rows:[{...snapshot,platform:'x'}]},'')).status,200);
assert.equal((await db.query("select input_kind from tawod_social_reports where platform='x'")).rows[0].input_kind,'connector');
for(const role of ['anon','authenticated']){
  assert.equal((await db.query("select has_table_privilege($1,'tawod_social_reports','SELECT') as allowed",[role])).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege($1,'tawod_social_workspace(integer,timestamptz,timestamptz)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege($1,'tawod_social_import(jsonb)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
}
const beforeSocialAudit=(await db.query('select tawod_admin_analytics(30) as data')).rows[0].data;
await db.exec(`insert into tawod_analytics_events(event_name,visitor_id,session_id,device_type,utm_source,occurred_at)
  select 'page_view','visitor-extra-'||i,'session-extra-'||i,'mobile','source-extra-'||i,now()-interval '1 hour' from generate_series(1,20) i;
  insert into tawod_analytics_events(event_name,visitor_id,session_id,device_type,utm_source,utm_medium,utm_campaign,utm_content,occurred_at)
  values ('page_view','social-v','social-s','mobile','ig','organic_social','isolated-campaign','reel-01',now()-interval '1 hour'),
    ('whatsapp_click','social-v','social-s','mobile','ig','organic_social','isolated-campaign','reel-01',now()-interval '59 minutes'),
    ('call_click','social-v','social-s','mobile','ig','organic_social','isolated-campaign','reel-01',now()-interval '58 minutes');
  insert into tawod_analytics_events(event_name,session_id,visitor_id,occurred_at)
  values ('page_view','cross-midnight','cross-v',(date_trunc('day',now() at time zone 'Asia/Riyadh')-interval '1 day'-interval '2 minutes') at time zone 'Asia/Riyadh'),
    ('page_view','cross-midnight','cross-v',(date_trunc('day',now() at time zone 'Asia/Riyadh')-interval '1 day'+interval '2 minutes') at time zone 'Asia/Riyadh'),
    ('whatsapp_click','cross-midnight','cross-v',(date_trunc('day',now() at time zone 'Asia/Riyadh')-interval '1 day'+interval '3 minutes') at time zone 'Asia/Riyadh'),
    ('page_view','earlier-session','social-v',now()-interval '60 days'),
    ('page_view','boundary-before','boundary-v',now()-interval '30 days 2 minutes'),
    ('page_view','boundary-inside','boundary-v',now()-interval '29 days 23 hours 58 minutes'),
    ('call_click','orphan-session',null,now()-interval '1 hour'),('whatsapp_click',null,null,now()-interval '1 hour');
  insert into tawod_analytics_events(event_name,session_id,visitor_id,click_id,utm_source,occurred_at)
  values ('page_view','excluded-test','excluded-v','TEST-isolated','tiktok',now()-interval '1 hour'),
    ('page_view','future-event','future-v',null,'x',now()+interval '2 days'),
    ('page_view','conflict-session','conflict-v','real-google-id','instagram',now()-interval '1 hour');`);
const socialEvent=(await db.query("select id from tawod_analytics_events where session_id='social-s' and event_name='whatsapp_click'")).rows[0].id;
const socialSale=await save({sourceType:'whatsapp',sourceRef:socialEvent,stage:'qualified',...review,assignee:'الفريق',nextAction:'متابعة',nextFollowUpAt:new Date(Date.now()+86400000).toISOString()});
assert.equal(socialSale.status,200);assert.equal(socialSale.outcome.acquisitionSource,'instagram');
await db.exec('set role service_role');
const audit=(await db.query('select tawod_admin_analytics(30) as data')).rows[0].data;
assert.ok(audit.sources.length>15);assert.equal(audit.dataQuality.reconciled,true);
assert.equal(audit.sources.reduce((sum,r)=>sum+r.sessions,0),audit.summary.sessions);
assert.equal(audit.daily.reduce((sum,r)=>sum+r.sessions,0),audit.summary.sessions,'one session crossing midnight must not double count');
assert.equal(audit.daily.reduce((sum,r)=>sum+r.referrals,0),audit.summary.referralSessions);
assert.equal(audit.daily.reduce((sum,r)=>sum+r.newVisitors,0),audit.summary.newVisitors,'new visitor day buckets honor the exact period start');
assert.equal(audit.dataQuality.attributionConflicts,1);assert.equal(audit.dataQuality.contactEventsWithoutSession,beforeSocialAudit.dataQuality.contactEventsWithoutSession+1);assert.equal(audit.dataQuality.contactSessionsWithoutPage,beforeSocialAudit.dataQuality.contactSessionsWithoutPage+1);
assert.ok(audit.dataQuality.excludedTestEvents>=1);assert.equal(audit.summary.returningVisitors,2,'first seen before period is a returning visitor');
let workspace=(await db.query('select tawod_social_workspace(30) as data')).rows[0].data;
const ig=workspace.platforms.find(row=>row.platform==='instagram');
assert.equal(ig.sessions,1);assert.equal(ig.referrals,1,'call and WhatsApp in same session are one referral');assert.equal(ig.calls,1);assert.equal(ig.whatsapp,1);assert.equal(ig.qualified,1);
assert.equal(workspace.platforms.find(r=>r.platform==='x').sessions,0,'future events excluded');
assert.equal(workspace.platforms.find(r=>r.platform==='tiktok').sessions,0,'fixtures excluded');
assert.equal(workspace.campaigns.find(r=>r.platform==='instagram').content,'reel-01');
assert.equal(workspace.reports.find(r=>r.platform==='instagram').views,null);assert.equal(workspace.reports.find(r=>r.platform==='instagram').reach,12);
const actualAdmin=await call({mode:'admin',token,days:30});assert.equal(actualAdmin.status,200);assert.equal(actualAdmin.social.available,true);
assert.equal(actualAdmin.social.window.startAt,actualAdmin.dataQuality.startAt,'website and social use identical bounds');
assert.equal(actualAdmin.social.window.endAt,actualAdmin.dataQuality.endAt);
assert.equal(actualAdmin.summary.newVisitors,audit.summary.newVisitors,'true first-seen metric must not be overwritten by frequency');
assert.equal(actualAdmin.summary.returningVisitors,audit.summary.returningVisitors);assert.equal(actualAdmin.summary.singleSessionVisitors+actualAdmin.summary.repeatSessionVisitors,audit.summary.visitors);
await db.exec('reset role');

// Identity is private; customer links never add PII to analytics or Sheets.
const contactId=randomUUID();
const customerCall=(action,payload,auth=token)=>call({mode:'customer_api',token:auth,action,payload});
assert.equal((await customerCall('list',{},'forged')).status,401);
assert.equal((await customerCall('save',{id:contactId,version:0,name:'اختبار ملف عميل',phone:'٠٥٠٠٠٠٠٠٠٢'})).status,200);
const customer=(await customerCall('detail',{id:contactId})).contact;
assert.equal(customer.phone,'+966500000002');
assert.equal((await customerCall('save',{id:randomUUID(),version:0,name:'تكرار',phone:'+966500000002'})).error,'customer_duplicate');
assert.equal((await customerCall('save',{...customer,name:'تحديث الملف'})).status,200);
assert.equal((await customerCall('save',customer)).error,'customer_conflict');
const linkId=(await db.query('select id from tawod_sales_outcomes order by created_at limit 1')).rows[0].id;
assert.equal((await customerCall('link',{outcome_id:linkId,contact_id:contactId})).status,200);
assert.equal((await customerCall('link',{outcome_id:linkId,contact_id:null})).error,'customer_conflict','stale link cannot overwrite another operator');
let customerDetail=await customerCall('detail',{id:contactId});
assert.equal(customerDetail.stats.opportunities,1);assert.ok(customerDetail.timeline.some(x=>x.event_type==='linked'));
assert.equal((await call({mode:'sales_outcome_get',token,id:linkId})).contact.id,contactId);
assert.equal((await customerCall('list',{search:'تحديث الملف'})).total,1);
assert.equal((await customerCall('link',{outcome_id:linkId,contact_id:null,expected_contact_id:contactId})).status,200);
assert.equal((await customerCall('detail',{id:contactId})).stats.opportunities,0);
assert.equal((await db.query("select has_schema_privilege('anon','tawod_crm','USAGE') as allowed")).rows[0].allowed,false);
assert.equal((await db.query("select has_table_privilege('authenticated','tawod_crm.contacts','SELECT') as allowed")).rows[0].allowed,false);
assert.equal((await db.query("select has_function_privilege('anon','tawod_customer_api(text,jsonb)','EXECUTE') as allowed")).rows[0].allowed,false);
assert.equal((await db.query("select count(*)::int as n from information_schema.columns where table_name in ('tawod_analytics_events','tawod_sales_outcomes') and column_name in ('customer_name','phone','contact_id')")).rows[0].n,0);
await db.close();
console.log('Verified private Postgres migrations, uncapped sales/source/stage aggregates, cohort vs closure activity, unknown historical dates, persistent decision review/history/conflicts, follow-ups, social account snapshots/import validation, attribution parity, daily/source reconciliation, and Sheets regression guards.');
