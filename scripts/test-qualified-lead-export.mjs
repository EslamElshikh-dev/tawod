import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const source = fs.readFileSync('supabase/functions/tawod-analytics/index.ts', 'utf8');
const context = vm.createContext({
  Deno: { env: { get: () => undefined }, serve: () => {} },
  URL, URLSearchParams, Response, Request, TextEncoder, TextDecoder,
  crypto: globalThis.crypto, btoa, atob,
  fetch: () => { throw new Error('No network calls are permitted in this regression test'); },
});
vm.runInContext(stripTypeScriptTypes(source), context);

// Synthetic fixtures stay in this local test; none are sent to Google or Supabase.
const row = {
  id: 'fixture-only', stage: 'qualified', notes: '',
  click_id: 'CjwKCAiA_SyntheticFixtureOnly_1234567890',
  qualified_at: '2026-09-11T05:16:14Z',
  updated_at: '2026-09-11T05:16:14Z', estimated_value: 100,
};
const acceptedByGoogleFilter = lead => lead.qualificationStatus === 'Qualified' &&
  lead.conversionName === 'Qualified WhatsApp Conversation';
const valid = context.normalizeSheetLead(row);
assert.equal(acceptedByGoogleFilter(valid), true);
assert.equal(valid.googleClickId, row.click_id, 'preserve the opaque identifier exactly');
assert.equal(valid.conversionTime, '2026-09-11 08:16:14+03:00');

for (const override of [
  { click_id: 'TEST-CHATGPT-20260911' },
  { notes: 'Local verification — TEST_ONLY' },
  { click_id: null }, { click_id: 'invalid id' },
  { click_id: ' ' + row.click_id }, { click_id: row.click_id + ' ' },
  { click_id: 'C'.repeat(301) }, { qualified_at: null },
]) {
  const blocked = context.normalizeSheetLead({ ...row, ...override });
  assert.equal(acceptedByGoogleFilter(blocked), false);
  assert.equal(blocked.googleClickId, '');
  assert.equal(blocked.conversionName, 'DO_NOT_IMPORT');
  assert.equal(blocked.conversionTime, '');
  assert.ok(['Pending', 'Unqualified'].includes(blocked.qualificationStatus));
}

context.supabase = async () => new Response(JSON.stringify([
  { ...row, click_id: 'TEST-CHATGPT-20260911', stage: 'contract_signed', contract_value: 999 },
  { ...row, id: 'real-fixture', stage: 'qualified' },
]));
const pipeline = await context.loadSalesPipeline(7);
assert.equal(pipeline.entries.length, 2, 'retain the test record for audit');
assert.equal(pipeline.summary.opportunities, 1);
assert.equal(pipeline.summary.qualified, 1);
assert.equal(pipeline.summary.contracts, 0);
assert.equal(pipeline.summary.contractValue, 0);
console.log('Verified test-row exclusion, identifier preservation, import filters, and pipeline totals.');
