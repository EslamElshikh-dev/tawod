import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('admin.html', 'utf8');
const app = fs.readFileSync('assets/js/tawod-command-center.js', 'utf8');
const tracker = fs.readFileSync('assets/js/tawod-first-party.js', 'utf8');
const adsSync = fs.readFileSync('scripts/google-ads-sync.js', 'utf8');
const profileSync = fs.readFileSync('scripts/google-business-profile-sync.js', 'utf8');
const sheetsSync = fs.readFileSync('scripts/google-sheets-qualified-leads.gs', 'utf8');
const edge = fs.readFileSync('supabase/functions/tawod-analytics/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260905_tawod_command_center_v2.sql', 'utf8');
const salesMigration = fs.readFileSync('supabase/migrations/20260906_tawod_sales_pipeline.sql', 'utf8');
const adminCredentialsMigration = fs.readFileSync('supabase/migrations/20260906_tawod_admin_credentials.sql', 'utf8');
const adsCompletenessMigration = fs.readFileSync('supabase/migrations/20260907081401_tawod_ads_sync_completeness.sql', 'utf8');
const sheetsMigration = fs.readFileSync('supabase/migrations/20260911090000_tawod_google_sheets_qualified_leads.sql', 'utf8');
const visitorFrequencyMigration = fs.readFileSync('supabase/migrations/20260911064119_tawod_visitor_frequency.sql', 'utf8');

new Function(app);
new Function(tracker);
new Function(adsSync);
new Function(profileSync);
new Function(sheetsSync);

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
assert.match(html, /زوار بجلسة واحدة/);
assert.match(html, /زوار متكررون/);
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
assert.match(edge, /google_sheets_export/);
assert.match(edge, /google_sheets_ack/);
assert.match(edge, /loadRecentReferrals/);
assert.match(edge, /loadVisitorFrequency/);
assert.match(edge, /tawod_visitor_frequency/);
assert.match(edge, /sourceEventId/);
assert.match(edge, /TEST_ONLY/);
assert.match(edge, /DO_NOT_IMPORT/);
assert.match(edge, /qualificationStatus: 'Qualified'/);
assert.match(edge, /projectStage: 'غير محدد'/);
assert.match(edge, /inspectionRequested: 'غير محدد'/);
assert.match(edge, /quotationRequested: 'غير محدد'/);
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
assert.match(sheetsMigration, /source_event_id/);
assert.match(sheetsMigration, /qualified_at/);
assert.match(sheetsMigration, /sheets_synced_at/);
assert.match(sheetsMigration, /tawod_sales_outcomes_source_event_id_uidx/);
assert.match(sheetsMigration, /google_sheets/);
assert.match(visitorFrequencyMigration, /tawod_visitor_frequency/);
assert.match(visitorFrequencyMigration, /count\(distinct e\.session_id\)/);
assert.match(visitorFrequencyMigration, /session_count > 1/);
assert.match(visitorFrequencyMigration, /security invoker/);
assert.match(visitorFrequencyMigration, /revoke all .* public, anon, authenticated/);
assert.match(sheetsSync, /LockService\.getScriptLock/);
assert.match(sheetsSync, /existingLeadRows_/);
assert.match(sheetsSync, /google_sheets_export/);
assert.match(sheetsSync, /google_sheets_ack/);
assert.match(sheetsSync, /acknowledged\.acknowledged/);
assert.match(sheetsSync, /everyMinutes\(5\)/);
assert.match(sheetsSync, /@OnlyCurrentDoc/);
assert.match(sheetsSync, /getActiveSpreadsheet/);
assert.doesNotMatch(sheetsSync, /SpreadsheetApp\.openById/);
assert.doesNotMatch(sheetsSync, /TAWOD_SHEETS_SYNC_KEY\s*=\s*['"][^'"]{32}/);

console.log('Verified dashboard definitions, source integrations, qualified WhatsApp Sheets sync, deduplication, and strict call qualification rules.');
