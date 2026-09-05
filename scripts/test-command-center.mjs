import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('admin.html', 'utf8');
const app = fs.readFileSync('assets/js/tawod-command-center.js', 'utf8');
const tracker = fs.readFileSync('assets/js/tawod-first-party.js', 'utf8');
const adsSync = fs.readFileSync('scripts/google-ads-sync.js', 'utf8');
const profileSync = fs.readFileSync('scripts/google-business-profile-sync.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/tawod-analytics/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260905_tawod_command_center_v2.sql', 'utf8');

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
assert.doesNotMatch(html, /tawod-admin(?:-ads)?.js/);

assert.match(tracker, /click_id/);
assert.match(tracker, /host === 'tawodco.com'/);
assert.match(adsSync, /campaign_budget.amount_micros/);
assert.match(adsSync, /call_view.call_duration_seconds/);
assert.match(profileSync, /businessprofileperformance.googleapis.com/);
assert.match(profileSync, /BUSINESS_IMPRESSIONS_DESKTOP_SEARCH/);

assert.match(migration, /duration_seconds > 60/);
assert.match(migration, /repeat_contacts > 1 or visit_requested/);
assert.match(migration, /called or s.whatsapp/);
assert.match(migration, /duplicateOrCrossChannelClicks/);
assert.match(edge, /call_qualification_update/);
assert.match(edge, /business_profile_sync/);

console.log('Verified dashboard definitions, source integrations, unique IDs, notification UI, and strict call qualification rules.');
