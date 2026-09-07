import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('admin.html', 'utf8');
const app = fs.readFileSync('assets/js/tawod-command-center.js', 'utf8');
const tracker = fs.readFileSync('assets/js/tawod-first-party.js', 'utf8');
const adsSync = fs.readFileSync('scripts/google-ads-sync.js', 'utf8');
const profileSync = fs.readFileSync('scripts/google-business-profile-sync.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/tawod-analytics/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260905_tawod_command_center_v2.sql', 'utf8');
const salesMigration = fs.readFileSync('supabase/migrations/20260906_tawod_sales_pipeline.sql', 'utf8');
const adminCredentialsMigration = fs.readFileSync('supabase/migrations/20260906_tawod_admin_credentials.sql', 'utf8');
const adsCompletenessMigration = fs.readFileSync('supabase/migrations/20260907081401_tawod_ads_sync_completeness.sql', 'utf8');

new Function(app);
new Function(tracker);
new Function(adsSync);
new Function(profileSync);

const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'admin IDs must be unique');

for (const match of app.matchAll(/el('([^']+)')/g)) {
  assert.ok(ids.includes(match[1]), `dashboard references missing HTML id: ${match[1]}`);
}

assert.match(html + app, /الإحالات الناجحة|الإحالة الناجحة/);
assert.match(html, /أداء الملف التجاري للشركة/);
assert.match(html, /الميزانية والصرف وجودة المكالمات/);
assert.match(html, /notificationDrawer/);
assert.match(html, /متابعة العروض والعقود/);
assert.match(html, /عقد موقّع/);
assert.doesNotMatch(html, /tawod-admin(?:-ads)?.js/);

assert.match(tracker, /click_id/);
assert.match(tracker, /host === 'tawodco.com'/);
assert.match(adsSync, /campaign_budget.amount_micros/);
assert.match(adsSync, /call_view.call_duration_seconds/);
assert.match(adsSync, /FROM conversion_action/);
assert.match(adsSync, /conversion_action.primary_for_goal/);
assert.match(adsSync, /campaignConfigRows/);
assert.match(profileSync, /businessprofileperformance.googleapis.com/);
assert.match(profileSync, /BUSINESS_IMPRESSIONS_DESKTOP_SEARCH/);

assert.match(migration, /duration_seconds > 60/);
assert.match(migration, /repeat_contacts > 1 or visit_requested/);
assert.match(migration, /called or s.whatsapp/);
assert.match(migration, /duplicateOrCrossChannelClicks/);
assert.match(edge, /call_qualification_update/);
assert.match(edge, /business_profile_sync/);
assert.match(edge, /sales_outcome_upsert/);
assert.match(edge, /loadSalesPipeline/);
assert.match(edge, /tawod_google_ads_conversion_actions/);
assert.match(edge, /enrichGoogleAdsWithFirstParty/);
assert.match(edge, /adminPasswordHash/);
assert.doesNotMatch(edge, /const ADMIN_HASH|[0-9a-f]{64}';/);
assert.match(salesMigration, /tawod_sales_outcomes/);
assert.match(salesMigration, /contract_signed/);
assert.match(salesMigration, /enable row level security/);
assert.match(salesMigration, /revoke all .* anon, authenticated/);
assert.match(adminCredentialsMigration, /tawod_admin_config/);
assert.doesNotMatch(adminCredentialsMigration, /[0-9a-f]{64}/);
assert.match(adsCompletenessMigration, /tawod_google_ads_conversion_actions/);
assert.match(adsCompletenessMigration, /enable row level security/);
assert.match(adsCompletenessMigration, /revoke all .* anon, authenticated/);

console.log('Verified dashboard definitions, source integrations, contract pipeline, unique IDs, notification UI, and strict call qualification rules.');
