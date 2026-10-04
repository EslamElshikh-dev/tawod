import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table public.tawod_analytics_events(id bigint generated always as identity,session_id text,event_name text,occurred_at timestamptz,utm_source text,utm_medium text,referrer_host text,click_id text,landing_path text,utm_campaign text);
  create table public.tawod_google_ads_daily(report_date date,customer_id text default 'sample',campaign_id bigint,campaign_name text,campaign_status text default 'ENABLED',currency_code text default 'SAR',cost_micros bigint default 0,daily_budget_micros bigint default 0,total_budget_micros bigint default 0,impressions bigint default 0,clicks bigint default 0,conversions numeric default 0,all_conversions numeric default 0,phone_calls bigint default 0,synced_at timestamptz default now());
  create table public.tawod_google_ads_conversion_daily(report_date date,customer_id text,campaign_id bigint,conversion_action_name text,conversions numeric,conversions_value numeric);
`);
function createTable(file, name) {
  const sql = fs.readFileSync(file,'utf8');
  const start = sql.indexOf('create table if not exists public.' + name + ' (');
  return sql.slice(start, sql.indexOf('\n);',start)+3);
}
await db.exec(createTable('supabase/migrations/20260905_tawod_command_center_v2.sql','tawod_google_ads_calls'));
await db.exec(createTable('supabase/migrations/20260907081401_tawod_ads_sync_completeness.sql','tawod_google_ads_conversion_actions'));
await db.exec(fs.readFileSync('supabase/migrations/20260930062353_tawod_meta_attribution_clarity.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261004172050_tawod_paid_referral_costs.sql','utf8'));
const integrity = fs.readFileSync('supabase/migrations/20261004231108_tawod_measurement_integrity.sql','utf8');
await db.exec(integrity.slice(0,integrity.indexOf('create table if not exists')));
await db.exec(integrity.slice(integrity.indexOf('-- Pair completed'),integrity.indexOf('revoke all on function public.tawod_admin_analytics')));
const today = (await db.query("select (now() at time zone 'Asia/Riyadh')::date::text today")).rows[0].today;
const date = offset => new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
async function event(session, name, offset, campaign, source='google', medium='cpc', time='12:00:00', click=null) {
  await db.query('insert into public.tawod_analytics_events(session_id,event_name,occurred_at,utm_campaign,utm_source,utm_medium,click_id,landing_path) values($1,$2,$3,$4,$5,$6,$7,$8)',[session,name,date(offset)+'T'+time+'+03:00',campaign,source,medium,click,'/']);
}
await event('tracking-start','page_view',-45,'','', '');
for (let offset=-6;offset<=1;offset++) {
  for (let campaign=1;campaign<=3;campaign++) {
    await db.query('insert into public.tawod_google_ads_daily(report_date,campaign_id,campaign_name,cost_micros,daily_budget_micros) values($1,$2,$3,$4,$5)',[date(offset),campaign,'campaign-'+campaign,10000000,offset<0?90000000:20000000]);
  }
}
await event('paid-1','page_view',-6,'1','google','cpc','00:01:00');
await event('paid-1','call_click',-6,'1'); await event('paid-1','call_click',-6,'1'); await event('paid-1','whatsapp_click',-6,'1');
await event('paid-2','page_view',-1,'campaign-2'); await event('paid-2','whatsapp_click',-1,'campaign-2');
await event('organic','page_view',-1,'1','google','organic'); await event('organic','call_click',-1,'1','google','organic');
await event('unmatched','page_view',-1,'unmatched'); await event('unmatched','call_click',-1,'unmatched');
await event('test','page_view',-1,'1','google','cpc','12:00:00','TEST_fixture'); await event('test','call_click',-1,'1');
await event('today','page_view',0,'1'); await event('today','call_click',0,'1');
const measure = async days => (await db.query('select public.tawod_paid_referral_costs($1) result',[days])).rows[0].result;
await event('internal-qa','page_view',-1,'1','internal_qa','cpc'); await event('internal-qa','call_click',-1,'1','internal_qa','cpc');
const result = await measure(7);
assert.equal(result.available,true);
assert.equal(result.startDate,date(-6)); assert.equal(result.endDate,date(-1));
assert.equal(result.summary.periodCost,180); assert.equal(result.summary.matchedCost,120);
assert.equal(result.summary.referrals,2); assert.equal(result.summary.costPerReferral,60);
assert.equal(result.summary.unmatchedReferrals,1);
assert.equal(result.campaigns.find(r=>r.campaignId===1).siteReferrals,1,'repeat and cross-channel clicks count once');
assert.equal(result.campaigns.find(r=>r.campaignId===3).siteCostPerReferral,null,'no referrals must not look free');
assert.equal((await measure(90)).trackingWindowShortened,true);
const ads = (await db.query('select public.tawod_google_ads_analytics(7) result')).rows[0].result;
assert.equal(ads.summary.cost,210,'future records excluded, current day retained only in Ads totals');
assert.equal(ads.summary.dailyBudget,60,'latest budget is used');
assert.equal(ads.campaigns[0].dailyBudget,20,'campaign budget must not use historical maximum');
await db.query('delete from public.tawod_google_ads_daily where report_date=$1',[date(-3)]);
assert.equal((await measure(7)).available,false,'missing spend day prevents publishing an incomplete cost');
await db.exec("update public.tawod_google_ads_daily set campaign_name='same-name' where campaign_id<>2;");
await event('ambiguous','page_view',-1,'same-name'); await event('ambiguous','call_click',-1,'same-name');
assert.equal((await measure(7)).summary.unmatchedReferrals,2,'ambiguous names are never double attributed');
await db.exec('truncate public.tawod_analytics_events;');
assert.equal((await measure(7)).available,false,'no tracking means unavailable');
await db.close();
console.log('Verified paid referral costs: Riyadh dates, matched spend, unique sessions, organic/test exclusion, missing days, ambiguous names, zero denominator, and latest budgets.');
