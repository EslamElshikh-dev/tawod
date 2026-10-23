import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// All fixtures and transports in this test are local. No customer data, live
// Sheet writes, Supabase inserts or Google Ads uploads are permitted.
const context = vm.createContext({
  Deno: { env: { get: () => undefined }, serve: () => {} },
  URL, URLSearchParams, Response, Request, TextEncoder, TextDecoder,
  crypto: globalThis.crypto, btoa, atob, setTimeout,
  fetch: () => { throw new Error('Network access is forbidden in export tests'); },
});
vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/tawod-analytics/index.ts', 'utf8')), context);

const at = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const row = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', source_event_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  stage: 'qualified', notes: '', service_type: 'Fixture service',
  click_id: 'CjwKCAiA_LocalFixtureOnly_1234567890',
  qualified_at: at(24), last_contact_at: at(25), updated_at: at(24),
  contact_result: 'contacted', service_fit: 'suitable', estimated_value: 100,
};
const referral = {
  id: row.source_event_id, event_name: 'whatsapp_click', click_id: row.click_id,
  landing_path: '/?gclid=' + row.click_id, occurred_at: at(26),
};
const accepts = (lead) => lead.qualificationStatus === 'Qualified' && lead.conversionName === 'Qualified WhatsApp Conversation';
const lead = context.normalizeSheetLead(row, referral);
assert.equal(accepts(lead), true);
assert.equal(lead.googleClickId, row.click_id);
assert.equal(new Date(lead.conversionTime.replace(' ', 'T')).toISOString(), row.qualified_at.replace('Z', '.000Z'));
assert.equal(lead.email, '');
assert.equal(lead.phoneNumber, '');
assert.equal(lead.adUserDataConsent, 'DENIED');
assert.equal(lead.adPersonalizationConsent, 'DENIED');
assert.equal(context.normalizeSheetLead({ ...row, updated_at: at(1) }, referral).leadId, lead.leadId);
assert.equal(context.normalizeSheetLead({ ...row, updated_at: at(1) }, referral).conversionTime, lead.conversionTime);

const blockedCases = [
  ['test identifier', { click_id: 'TEST-LOCAL-ONLY-20261023' }, referral, 'TEST_ONLY'],
  ['test note', { notes: 'TEST_ONLY: local fixture' }, referral, 'TEST_ONLY'],
  ['missing ID', { click_id: null }, referral, 'INVALID_AD_CLICK_ID'],
  ['malformed ID', { click_id: 'invalid id' }, referral, 'INVALID_AD_CLICK_ID'],
  ['leading space', { click_id: ' ' + row.click_id }, referral, 'INVALID_AD_CLICK_ID'],
  ['overlong ID', { click_id: 'C'.repeat(301) }, referral, 'INVALID_AD_CLICK_ID'],
  ['missing qualification', { qualified_at: null }, referral, 'INVALID_QUALIFICATION_TIME'],
  ['future qualification', { qualified_at: at(-1) }, referral, 'INVALID_QUALIFICATION_TIME'],
  ['not contacted', { contact_result: 'not_contacted' }, referral, 'QUALIFICATION_NOT_VERIFIED'],
  ['unsuitable service', { service_fit: 'unsuitable' }, referral, 'QUALIFICATION_NOT_VERIFIED'],
  ['missing service', { service_type: '' }, referral, 'QUALIFICATION_NOT_VERIFIED'],
  ['missing contact evidence', { last_contact_at: null }, referral, 'QUALIFICATION_NOT_VERIFIED'],
  ['missing referral', {}, undefined, 'AD_REFERRAL_NOT_VERIFIED'],
  ['mismatched referral', {}, { ...referral, id: row.id }, 'AD_REFERRAL_NOT_VERIFIED'],
  ['wrong channel', {}, { ...referral, event_name: 'call_click' }, 'AD_REFERRAL_NOT_VERIFIED'],
  ['mismatched click', {}, { ...referral, click_id: 'different' }, 'AD_REFERRAL_NOT_VERIFIED'],
  ['conversion before click', {}, { ...referral, occurred_at: at(23) }, 'AD_CLICK_OUTSIDE_IMPORT_WINDOW'],
  ['expired click', {}, { ...referral, occurred_at: at(91 * 24) }, 'AD_CLICK_OUTSIDE_IMPORT_WINDOW'],
  ['missing type', {}, { ...referral, landing_path: '/' }, 'AD_CLICK_TYPE_NOT_VERIFIED'],
  ['duplicate URL parameter', {}, { ...referral, landing_path: '/?gclid=' + row.click_id + '&gclid=other' }, 'AD_CLICK_TYPE_NOT_VERIFIED'],
  ['ambiguous type', {}, { ...referral, landing_path: '/?gclid=' + row.click_id + '&gbraid=' + row.click_id }, 'AD_CLICK_TYPE_NOT_VERIFIED'],
  ['GBRAID', {}, { ...referral, landing_path: '/?gbraid=' + row.click_id }, 'GBRAID_REQUIRES_SEPARATE_MAPPING'],
  ['WBRAID', {}, { ...referral, landing_path: '/?wbraid=' + row.click_id }, 'WBRAID_REQUIRES_SEPARATE_MAPPING'],
];
for (const [name, changes, event, reason] of blockedCases) {
  const blocked = context.normalizeSheetLead({ ...row, ...changes }, event);
  assert.equal(accepts(blocked), false, name);
  assert.equal(blocked.googleClickId, '', name);
  assert.equal(blocked.conversionTime, '', name);
  assert.equal(blocked.conversionName, 'DO_NOT_IMPORT', name);
  assert.ok(['Pending', 'Unqualified'].includes(blocked.qualificationStatus), name);
  assert.ok(blocked.evidence.includes(reason), name);
}

context.verifySyncKey = async () => true;
let eventFetchFails = false;
const requests = [];
context.supabase = async (path, options = {}) => {
  requests.push({ path, method: options.method || 'GET' });
  if (path.startsWith('/rest/v1/tawod_sales_outcomes?')) {
    const select = new URL('https://local.invalid' + path).searchParams.get('select');
    assert.ok(select.includes('contact_result') && select.includes('service_fit'));
    return new Response(JSON.stringify([row]));
  }
  if (path.startsWith('/rest/v1/tawod_analytics_events?')) {
    return eventFetchFails ? new Response('{}', { status: 503 }) : new Response(JSON.stringify([referral]));
  }
  if (path === '/rest/v1/tawod_sync_keys?name=eq.google_sheets' && options.method === 'PATCH') return new Response(null, { status: 204 });
  throw new Error('Unexpected local request: ' + path);
};
let response = await context.exportQualifiedWhatsAppLeads({ syncKey: 'local-fixture-only' }, null);
assert.equal(response.status, 200);
assert.equal(accepts((await response.json()).leads[0]), true);
assert.equal(requests.filter((request) => request.method !== 'GET').length, 1, 'only heartbeat may change on export');
eventFetchFails = true;
requests.length = 0;
response = await context.exportQualifiedWhatsAppLeads({ syncKey: 'local-fixture-only' }, null);
assert.equal(response.status, 500, 'failed attribution lookups must not produce importable rows');
assert.equal(requests.some((request) => request.method !== 'GET'), false);

// Exercise the existing Apps Script write-before-ack retry in memory. An ACK
// failure and a second run must update the same Lead ID, not append it twice.
let attempts = 0;
const grid = [];
const sheet = {
  getLastRow: () => grid.length,
  getRange: (startRow, startColumn, rowCount, columnCount) => ({
    getDisplayValues: () => Array.from({ length: rowCount }, (_, r) => Array.from({ length: columnCount }, (_, c) => String(grid[startRow - 1 + r]?.[startColumn - 1 + c] ?? ''))),
    setValues: (values) => { values.forEach((valuesRow, r) => { grid[startRow - 1 + r] ||= []; valuesRow.forEach((value, c) => { grid[startRow - 1 + r][startColumn - 1 + c] = value; }); }); },
  }),
};
const sheetsContext = vm.createContext({
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'local-key-never-sent'.repeat(2) }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getId: () => '1EA8m8v7im0x3g-kgi-F3v-yQRvM1-_1vlWZVK28Tzxc', getSheetByName: () => sheet }), flush: () => {} },
  UrlFetchApp: { fetch: (url, options) => {
    assert.equal(url, 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics');
    const payload = JSON.parse(options.payload);
    const ack = payload.mode === 'google_sheets_ack';
    assert.ok(ack || payload.mode === 'google_sheets_export');
    const fail = ack && ++attempts === 1;
    return { getResponseCode: () => fail ? 503 : 200, getContentText: () => JSON.stringify(fail ? { error: 'local_ack_failure' } : { ok: true, leads: [lead], acknowledged: 1 }) };
  } },
});
vm.runInContext(fs.readFileSync('scripts/google-sheets-qualified-leads.gs', 'utf8'), sheetsContext);
grid.push(Array.from(sheetsContext.TAWOD_HEADERS));
assert.throws(() => sheetsContext.syncQualifiedWhatsAppLeads(), /503/);
assert.equal(grid.length, 2);
assert.equal(sheetsContext.syncQualifiedWhatsAppLeads().processed, 1);
assert.equal(grid.length, 2, 'retry keeps one row per Lead ID');
assert.equal(grid[1][0], lead.leadId);
console.log('Verified 23 blocked export cases, valid GCLID/qualification, consent preservation, failed lookup handling and Sheet retry deduplication; no external writes.');
