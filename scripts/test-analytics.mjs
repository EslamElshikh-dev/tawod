import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source = fs.readFileSync('assets/js/tawod-analytics.js', 'utf8');
const landingSource = fs.readFileSync('app/lp/[slug]/route.ts', 'utf8');

assert.match(source, /مسجد و ٢ فيلا \| حي العروبة/, 'the injected project card must preserve the approved title');
assert.doesNotMatch(source, /حي العربية/, 'the obsolete project location must not return through analytics injection');
assert.match(source, /gclid/, 'Ads click IDs must be preserved for attribution');
assert.match(source, /tawod_form_start/, 'form start may remain a GA4 diagnostic event');
assert.doesNotMatch(source, /gtag\(['"]event['"],\s*['"]conversion['"]/, 'website analytics must never fire a Google Ads conversion event');
assert.doesNotMatch(source, /track\(['"]generate_lead['"]/, 'website forms must not emit the standard GA4 lead event');
assert.match(source, /adsConversionsFromWebsite:\s*false/, 'analytics API must explicitly declare that website Ads conversions are disabled');

assert.doesNotMatch(landingSource, /<form\b/i, 'Ads landing pages must not contain a form');
assert.doesNotMatch(landingSource, /formsubmit\.co/i, 'Ads landing pages must not post to FormSubmit');
assert.doesNotMatch(landingSource, /contact-conversion\.js/i, 'Ads landing pages must not load form conversion code');
assert.doesNotMatch(landingSource, /tawod-ads-rescue\.js/i, 'Ads landing pages must not need a conversion guard script');
assert.match(landingSource, /tel:0551128884/, 'Ads landing pages must expose the direct phone CTA');
assert.match(landingSource, /https:\/\/wa\.me\/966551128884/, 'Ads landing pages must expose the direct WhatsApp CTA');
assert.match(landingSource, /noindex,follow/, 'Ads landing pages must remain noindex');
for (const canonical of [
  'https://tawodco.com/service-turnkey.html',
  'https://tawodco.com/service-construction.html',
  'https://tawodco.com/service-restoration.html',
  'https://tawodco.com/service-finishing.html',
]) assert.match(landingSource, new RegExp(canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing canonical ${canonical}`);

function runAnalytics({ pathname = '/', leadFlag = null } = {}) {
  const listeners = new Map();
  const windowListeners = new Map();
  const storage = new Map();
  const localStorage = new Map();
  const appendedScripts = [];
  const timers = [];
  if (leadFlag !== null) storage.set('tawodLeadSubmitted', leadFlag);

  const document = {
    readyState: 'loading',
    body: null,
    head: { appendChild: (element) => appendedScripts.push(element) },
    createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
    addEventListener: (name, handler) => listeners.set(name, handler)
  };
  const window = {
    location: { pathname, href: `https://tawodco.com${pathname}`, search: '' },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    localStorage: {
      getItem: (key) => localStorage.get(key) ?? null,
      setItem: (key, value) => localStorage.set(key, String(value)),
      removeItem: (key) => localStorage.delete(key)
    },
    addEventListener: (name, handler) => windowListeners.set(name, handler),
    removeEventListener: () => {},
    setTimeout: (handler, delay) => {
      timers.push({ handler, delay });
      return timers.length;
    },
    clearTimeout: () => {}
  };
  const sandbox = { window, document, encodeURIComponent, Date, Object, console, URLSearchParams };
  vm.runInNewContext(source, sandbox, { filename: 'tawod-analytics.js' });
  return { window, listeners, windowListeners, storage, localStorage, appendedScripts, timers, rerun: () => vm.runInNewContext(source, sandbox) };
}

const normal = runAnalytics({ pathname: '/service-construction.html' });
const configs = normal.window.dataLayer.filter((item) => item[0] === 'config').map((item) => item[1]);
assert.deepEqual([...configs], ['G-4M3LNJF2ED'], 'the website must configure GA4 only, not a Google Ads website conversion destination');
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'conversion').length, 0);
assert.equal(normal.appendedScripts.length, 0, 'Google Tag must stay off the critical loading path');
normal.windowListeners.get('scroll')();
assert.equal(normal.appendedScripts.length, 0, 'scrolling may schedule the tag but must not parse it during the input task');
assert.equal(normal.timers.at(-1).delay, 2000, 'interaction loading must be delayed away from the input task');
normal.rerun();
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'config').length, 1, 'analytics must initialize once');

const phoneLink = {
  target: '',
  href: 'tel:0551128884',
  getAttribute: () => 'tel:0551128884'
};
const phoneEvent = {
  target: { closest: () => phoneLink },
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  preventDefault() { this.defaultPrevented = true; }
};
normal.listeners.get('click')(phoneEvent);
assert.equal(phoneEvent.defaultPrevented, false, 'phone navigation must stay immediate and must not be delayed for tracking');
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'tawod_call_click').length, 1);
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'conversion').length, 0, 'phone clicks must never fire an Ads conversion');

const whatsappLink = {
  target: '',
  href: 'https://wa.me/966551128884',
  getAttribute: () => 'https://wa.me/966551128884'
};
const whatsappEvent = {
  target: { closest: () => whatsappLink },
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  preventDefault() { this.defaultPrevented = true; }
};
normal.listeners.get('click')(whatsappEvent);
assert.equal(whatsappEvent.defaultPrevented, false, 'WhatsApp navigation must stay immediate and must not be delayed for tracking');
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'tawod_whatsapp_click').length, 1);
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'conversion').length, 0, 'WhatsApp clicks must never fire an Ads conversion');

const leadForm = {
  tagName: 'FORM',
  appendChild: () => {},
  getAttribute: (name) => ({
    action: 'https://formsubmit.co/info@tawodco.com',
    'data-analytics-form': 'home_quote_request'
  })[name] || null,
  querySelector: (selector) => selector === '[name="الخدمة_المطلوبة"]'
    ? { value: 'البناء والإنشاءات' }
    : null
};
normal.listeners.get('submit')({ target: leadForm, defaultPrevented: false });
const submitAttempts = normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'tawod_form_submit_attempt');
assert.equal(submitAttempts.length, 1, 'organic forms may remain measurable in GA4 diagnostics');
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'conversion').length, 0, 'form submit must never fire an Ads conversion');
const storedLead = JSON.parse(normal.storage.get('tawodLeadSubmitted'));
assert.equal(storedLead.form_source_path, '/service-construction.html');
assert.match(storedLead.submission_id, /^tawod-/);

const directThankYou = runAnalytics({ pathname: '/thank-you.html' });
assert.equal(directThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'tawod_form_confirmed').length, 0, 'direct thank-you visits are not form confirmations');
assert.equal(directThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'conversion').length, 0);

const confirmedContext = JSON.stringify({
  version: 3,
  submission_id: 'submission-test-1',
  form_name: 'khobar_quote_request',
  form_source_path: '/khobar/contact/',
  service_type: 'تسليم مفتاح'
});
const confirmedThankYou = runAnalytics({ pathname: '/thank-you.html', leadFlag: confirmedContext });
const confirmedForms = confirmedThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'tawod_form_confirmed');
assert.equal(confirmedForms.length, 1);
assert.equal(confirmedForms[0][2].send_to, 'G-4M3LNJF2ED');
assert.equal(confirmedThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'conversion').length, 0, 'thank-you confirmation must remain GA4-only');
assert.equal(confirmedThankYou.storage.has('tawodLeadSubmitted'), false, 'diagnostic form context must be consumed');

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', '.next', 'node_modules', 'out', 'public'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}

const organicForms = [];
for (const file of htmlFiles('.')) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<form\b(?=[^>]*\baction=["']https:\/\/(?:www\.)?formsubmit\.co\/[^"']+["'])[^>]*>[\s\S]*?<\/form>/gi)) {
    organicForms.push({ file, html: match[0] });
  }
}
assert.equal(organicForms.length, 5, 'the five existing organic quote forms must remain intact');

console.log('Verified call/WhatsApp-only Ads landing flow, immediate contact navigation, GA4-only diagnostics, attribution storage, and zero website Google Ads conversion events.');
