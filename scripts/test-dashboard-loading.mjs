import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// Synthetic credentials, provider responses and DOM only. No live account access.
async function server(profileFailure = false) {
  let handler;
  const calls = [];
  const fixturePassword = 'synthetic-dashboard-test';
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fixturePassword))).toString('hex');
  const context = vm.createContext({
    crypto, TextEncoder, TextDecoder, Uint8Array, URL, URLSearchParams, Request, Response,
    Headers, btoa, atob, setTimeout, clearTimeout,
    Deno: { env: { get: name => ({ SUPABASE_URL: 'https://synthetic.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'SYNTHETIC_SERVER_KEY' }[name]) }, serve: value => { handler = value; } },
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (url.includes('/tawod_admin_config?')) return Response.json([{ value_hash: hash }]);
      if (url.endsWith('/rpc/tawod_business_profile_analytics')) return profileFailure ? Response.json({ error: 'fixture' }, { status: 500 }) : Response.json({ connected: true, periodDays: JSON.parse(init.body).p_days, summary: { calls: 11 }, reportingDays: 6 });
      throw new Error('Unrelated report was requested');
    }
  });
  const ts = fs.readFileSync('supabase/functions/tawod-analytics/index.ts', 'utf8');
  vm.runInContext(stripTypeScriptTypes(ts), context);
  const request = (body, origin = 'https://tawodco.com') => handler(new Request('https://synthetic.supabase.co/functions/v1/tawod-analytics', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  const login = await request({ mode: 'admin_login', username: 'admin', password: fixturePassword });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  calls.length = 0;
  return { request, token, calls };
}

test('profile reads call only its RPC after real administrator authentication', async () => {
  const x = await server();
  const response = await x.request({ mode: 'admin', view: 'business-profile', token: x.token, days: 7 });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.partial, true);
  assert.equal(data.view, 'business-profile');
  assert.equal(data.periodDays, 7);
  assert.equal(data.businessProfile.summary.calls, 11);
  assert.equal(x.calls.length, 1);
  assert.match(x.calls[0].url, /tawod_business_profile_analytics$/);
  assert.equal(data.salesPipeline, undefined);
  assert.equal(data.summary, undefined);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('the faster profile path still rejects unsigned sessions and foreign origins', async () => {
  const x = await server();
  assert.equal((await x.request({ mode: 'admin', view: 'business-profile', token: 'invalid' })).status, 401);
  assert.equal((await x.request({ mode: 'admin', view: 'business-profile', token: x.token }, 'https://untrusted.test')).status, 403);
  assert.equal(x.calls.length, 0);
});

test('profile provider failures remain errors and never become successful empty metrics', async () => {
  const x = await server(true);
  const response = await x.request({ mode: 'admin', view: 'business-profile', token: x.token });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'business_profile_query_failed');
  assert.equal(x.calls.length, 1);
});

function ui(fetcher) {
  const nodes = new Map();
  const timers = new Map();
  let timerId = 0;
  const window = { rendered: [], notices: [] };
  const context = vm.createContext({
    window, document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, { value: '', hidden: false, classList: { toggle() {} } }); return nodes.get(id); } },
    AbortController, Intl, Date, URL, URLSearchParams,
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: id => timers.delete(id), fetch: fetcher
  });
  const source = fs.readFileSync('assets/js/tawod-command-center.js', 'utf8');
  const end = source.indexOf("  el('adminLoginForm').addEventListener");
  assert(end > 0);
  const access = `
    setLoading = function (on) { window.loading = on; };
    showToast = function (message) { window.notices.push(message); };
    render = function (data) { payload = data; window.rendered.push(data); };
    window.test = {
      load: load, renderCurrentView: renderCurrentView,
      seed: function (data, view) { token='synthetic-session'; payload=data; activeView=view; },
      payload: function () { return payload; },
      view: function (value) { activeView=value; }
    };
  })();`;
  vm.runInContext(source.slice(0, end) + access, context);
  const old = { periodDays: 30, marker: 'previous-success', partial: false };
  window.test.seed(old, 'business-profile');
  nodes.set('periodSelect', { value: '7' });
  return { api: window.test, window, nodes, timers, old };
}

test('failed period changes restore the last successful period and disclose retained data', async () => {
  let body;
  const x = ui(async (url, init) => { body = JSON.parse(init.body); return Response.json({ error: 'analytics_query_failed' }, { status: 500 }); });
  await x.api.load();
  assert.equal(body.view, 'business-profile');
  assert.equal(body.days, 7);
  assert.equal(x.nodes.get('periodSelect').value, '30');
  assert.equal(x.api.payload(), x.old);
  assert.equal(x.window.rendered.length, 0);
  assert.match(x.window.notices.at(-1), /الفترة السابقة/);
  assert.equal(x.window.loading, false);
});

test('a stalled report is aborted and never leaves the loading overlay indefinitely', async () => {
  const x = ui((url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
  const pending = x.api.load();
  const deadline = [...x.timers.values()].find(timer => timer.delay === 15000);
  assert(deadline);
  deadline.callback();
  await pending;
  assert.match(x.window.notices.at(-1), /انتهت مهلة/);
  assert.equal(x.nodes.get('periodSelect').value, '30');
  assert.equal(x.window.loading, false);
  assert.equal(x.timers.size, 0);
});

test('superseded period reads are cancelled and cannot overwrite the newer response', async () => {
  let reads = 0;
  const x = ui((url, init) => {
    reads++;
    if (reads === 1) return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    return Promise.resolve(Response.json({ partial: true, view: 'business-profile', periodDays: 90 }));
  });
  const first = x.api.load();
  x.nodes.get('periodSelect').value = '90';
  await x.api.load();
  await first;
  assert.equal(x.window.rendered.length, 1);
  assert.equal(x.api.payload().periodDays, 90);
  assert.equal(x.nodes.get('periodSelect').value, '90');
  assert.equal(x.window.notices.some(message => /الفترة السابقة/.test(message)), false);
});

test('leaving a partial profile response requests the full view instead of rendering missing data as zero', async () => {
  let body;
  const x = ui(async (url, init) => { body = JSON.parse(init.body); return Response.json({ periodDays: 30, summary: { sessions: 5 } }); });
  x.api.seed({ partial: true, view: 'business-profile', periodDays: 30 }, 'executive');
  x.api.renderCurrentView();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(body.mode, 'admin');
  assert.equal(body.view, undefined);
  assert.equal(x.window.rendered.length, 1);
  assert.equal(x.api.payload().summary.sessions, 5);
});
