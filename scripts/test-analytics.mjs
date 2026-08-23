import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('assets/js/tawod-analytics.js', 'utf8');

function runAnalytics({ pathname = '/', leadFlag = null } = {}) {
  const listeners = new Map();
  const windowListeners = new Map();
  const storage = new Map();
  const appendedScripts = [];
  if (leadFlag !== null) storage.set('tawodLeadSubmitted', leadFlag);

  const document = {
    head: { appendChild: (element) => appendedScripts.push(element) },
    createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
    addEventListener: (name, handler) => listeners.set(name, handler)
  };
  const window = {
    location: { pathname, href: `https://tawodco.com${pathname}` },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    addEventListener: (name, handler) => windowListeners.set(name, handler),
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  const sandbox = { window, document, encodeURIComponent, Date, Object, console };
  vm.runInNewContext(source, sandbox, { filename: 'tawod-analytics.js' });
  return { window, listeners, storage, appendedScripts, rerun: () => vm.runInNewContext(source, sandbox) };
}

const normal = runAnalytics({ pathname: '/service-construction.html' });
const configs = normal.window.dataLayer.filter((item) => item[0] === 'config').map((item) => item[1]);
assert.deepEqual([...configs], ['G-YE1NT4R4YT', 'AW-18266173285']);
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead').length, 0);
normal.rerun();
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'config').length, 2, 'analytics must initialize once');

const phoneLink = {
  target: '_blank',
  href: 'tel:0551128884',
  getAttribute: () => 'tel:0551128884'
};
normal.listeners.get('click')({
  target: { closest: () => phoneLink },
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false
});
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'tawod_call_click').length, 1);
const adsConversion = normal.window.dataLayer.find((item) => item[0] === 'event' && item[1] === 'conversion');
assert.equal(adsConversion[2].send_to, 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE');

const directThankYou = runAnalytics({ pathname: '/thank-you.html' });
assert.equal(directThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead').length, 0, 'direct visits are not leads');

const confirmedThankYou = runAnalytics({ pathname: '/thank-you.html', leadFlag: '1' });
const confirmedLeads = confirmedThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead');
assert.equal(confirmedLeads.length, 1);
assert.equal(confirmedLeads[0][2].send_to, 'G-YE1NT4R4YT');
assert.equal(confirmedThankYou.storage.has('tawodLeadSubmitted'), false, 'confirmed lead flag must be consumed');

console.log('Verified sitewide GA4/Ads configuration, contact conversion, initialization guard and confirmed-form lead flow.');
