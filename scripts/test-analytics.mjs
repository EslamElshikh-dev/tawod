import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source = fs.readFileSync('assets/js/tawod-analytics.js', 'utf8');
assert.match(source, /مسجد و ٢ فيلا \| حي العروبة/, 'the injected project card must preserve the approved title');
assert.doesNotMatch(source, /حي العربية/, 'the obsolete project location must not return through analytics injection');

function runAnalytics({ pathname = '/', leadFlag = null } = {}) {
  const listeners = new Map();
  const windowListeners = new Map();
  const storage = new Map();
  const appendedScripts = [];
  const timers = [];
  if (leadFlag !== null) storage.set('tawodLeadSubmitted', leadFlag);

  const document = {
    readyState: 'loading',
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
    setTimeout: (handler, delay) => {
      timers.push({ handler, delay });
      return timers.length;
    },
    clearTimeout: () => {}
  };
  const sandbox = { window, document, encodeURIComponent, Date, Object, console };
  vm.runInNewContext(source, sandbox, { filename: 'tawod-analytics.js' });
  return { window, listeners, windowListeners, storage, appendedScripts, timers, rerun: () => vm.runInNewContext(source, sandbox) };
}

const normal = runAnalytics({ pathname: '/service-construction.html' });
const configs = normal.window.dataLayer.filter((item) => item[0] === 'config').map((item) => item[1]);
assert.deepEqual([...configs], ['G-YE1NT4R4YT', 'AW-18266173285']);
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead').length, 0);
assert.equal(normal.appendedScripts.length, 0, 'Google Tag must stay off the critical loading path');
normal.windowListeners.get('scroll')();
assert.equal(normal.appendedScripts.length, 0, 'scrolling may schedule Google Tag but must not parse it during the interaction');
assert.equal(normal.timers.at(-1).delay, 2000, 'interaction loading must be delayed away from the input task');
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

const leadForm = {
  tagName: 'FORM',
  getAttribute: (name) => ({
    action: 'https://formsubmit.co/info@tawodco.com',
    'data-analytics-form': 'home_quote_request'
  })[name] || null,
  querySelector: (selector) => selector === '[name="الخدمة_المطلوبة"]'
    ? { value: 'البناء والإنشاءات' }
    : null
};
normal.listeners.get('submit')({ target: leadForm, defaultPrevented: false });
const submitAttempts = normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'form_submit_attempt');
assert.equal(submitAttempts.length, 1, 'a valid FormSubmit request must record one submit attempt');
assert.equal(submitAttempts[0][2].form_name, 'home_quote_request');
assert.equal(submitAttempts[0][2].service_type, 'البناء والإنشاءات');
const storedLead = JSON.parse(normal.storage.get('tawodLeadSubmitted'));
assert.equal(storedLead.form_source_path, '/service-construction.html');
assert.match(storedLead.submission_id, /^tawod-/);
normal.listeners.get('submit')({ target: leadForm, defaultPrevented: true });
assert.equal(normal.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'form_submit_attempt').length, 1, 'prevented submissions must not be measured');

const directThankYou = runAnalytics({ pathname: '/thank-you.html' });
assert.equal(directThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead').length, 0, 'direct visits are not leads');

const confirmedContext = JSON.stringify({
  version: 1,
  submission_id: 'submission-test-1',
  form_name: 'khobar_quote_request',
  form_source_path: '/khobar/contact/',
  service_type: 'تسليم مفتاح'
});
const confirmedThankYou = runAnalytics({ pathname: '/thank-you.html', leadFlag: confirmedContext });
const confirmedLeads = confirmedThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead');
assert.equal(confirmedLeads.length, 1);
assert.equal(confirmedLeads[0][2].send_to, 'G-YE1NT4R4YT');
assert.equal(confirmedLeads[0][2].form_name, 'khobar_quote_request');
assert.equal(confirmedLeads[0][2].form_source_path, '/khobar/contact/');
const confirmedAds = confirmedThankYou.window.dataLayer.find((item) => item[0] === 'event' && item[1] === 'conversion');
assert.equal(confirmedAds[2].send_to, 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE');
assert.equal(confirmedAds[2].transaction_id, 'submission-test-1');
assert.equal(confirmedThankYou.storage.has('tawodLeadSubmitted'), false, 'confirmed lead flag must be consumed');

const legacyThankYou = runAnalytics({ pathname: '/thank-you.html', leadFlag: '1' });
assert.equal(legacyThankYou.window.dataLayer.filter((item) => item[0] === 'event' && item[1] === 'generate_lead').length, 1, 'legacy in-flight submissions must remain measurable');

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', '.next', 'node_modules', 'out', 'public'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}

const measuredForms = [];
for (const file of htmlFiles('.')) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<form\b(?=[^>]*\baction=["']https:\/\/(?:www\.)?formsubmit\.co\/[^"']+["'])[^>]*>[\s\S]*?<\/form>/gi)) {
    measuredForms.push({ file, html: match[0] });
  }
}
assert.equal(measuredForms.length, 5, 'all five quote forms must stay in the confirmed conversion flow');
for (const form of measuredForms) {
  assert.match(form.html, /\bdata-analytics-form=["'][^"']+["']/i, `${form.file} must identify its form source`);
  assert.match(form.html, /<input\b[^>]*\bname=["']_next["'][^>]*\bvalue=["']https:\/\/tawodco\.com\/thank-you\.html["'][^>]*>/i, `${form.file} must redirect to the confirmed thank-you page`);
}

console.log('Verified sitewide GA4/Ads configuration, click conversions, all quote forms, deduplicated confirmation and source attribution.');
