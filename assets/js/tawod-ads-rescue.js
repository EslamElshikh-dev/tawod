/* Google Ads rescue layer: separates click diagnostics from confirmed leads and preserves ad attribution. */
(function () {
  'use strict';

  var FORM_CONVERSION = 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE';
  var GA4_ID = 'G-YE1NT4R4YT';
  var STORAGE_KEY = 'tawodAdsAttributionV1';
  var PARAMS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  if (window.__tawodAdsRescueInitialized) return;
  window.__tawodAdsRescueInitialized = true;

  function isThankYou() {
    return /(?:^|\/)thank-you\.html$/.test(window.location.pathname);
  }

  function wrapGoogleAdsConversion() {
    if (typeof window.gtag !== 'function' || window.__tawodAdsRescueGtagWrapped) return;
    var original = window.gtag;
    window.gtag = function () {
      var args = Array.prototype.slice.call(arguments);
      var payload = args[2] || {};
      if (args[0] === 'event' && args[1] === 'conversion' && payload.send_to === FORM_CONVERSION && !isThankYou()) {
        return;
      }
      return original.apply(window, args);
    };
    window.__tawodAdsRescueGtagWrapped = true;
  }

  function readStored() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeStored(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {}
  }

  function captureAttribution() {
    var data = readStored();
    var search = new URLSearchParams(window.location.search || '');
    var touched = false;
    PARAMS.forEach(function (key) {
      var value = search.get(key);
      if (value) {
        data[key] = value;
        touched = true;
      }
    });
    if (!data.first_landing_page) {
      data.first_landing_page = window.location.pathname + (window.location.search || '');
      data.first_seen_at = new Date().toISOString();
      touched = true;
    }
    data.last_landing_page = window.location.pathname + (window.location.search || '');
    data.last_seen_at = new Date().toISOString();
    touched = true;
    if (touched) writeStored(data);
    return data;
  }

  function upsertHidden(form, name, value) {
    if (!value) return;
    var input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  function applyAttributionToForms() {
    var data = captureAttribution();
    var forms = document.querySelectorAll('form[action*="formsubmit.co"]');
    forms.forEach(function (form) {
      PARAMS.forEach(function (key) { upsertHidden(form, 'ads_' + key, data[key]); });
      upsertHidden(form, 'ads_first_landing_page', data.first_landing_page);
      upsertHidden(form, 'ads_last_landing_page', data.last_landing_page);
      upsertHidden(form, 'ads_first_seen_at', data.first_seen_at);
    });
  }

  function trackFormStart(event) {
    var form = event.target && event.target.closest ? event.target.closest('form[action*="formsubmit.co"]') : null;
    if (!form || form.dataset.adsFormStarted === '1' || typeof window.gtag !== 'function') return;
    form.dataset.adsFormStarted = '1';
    window.gtag('event', 'tawod_form_start', {
      send_to: GA4_ID,
      form_name: form.getAttribute('data-analytics-form') || 'quote_request',
      page_path: window.location.pathname,
      transport_type: 'beacon'
    });
  }

  wrapGoogleAdsConversion();
  captureAttribution();
  document.addEventListener('focusin', trackFormStart, true);
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form && form.matches && form.matches('form[action*="formsubmit.co"]')) applyAttributionToForms();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAttributionToForms, { once: true });
  } else {
    applyAttributionToForms();
  }
})();
