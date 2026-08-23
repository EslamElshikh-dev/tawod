/* Tawod sitewide analytics and confirmed-lead tracking. */
(function () {
  'use strict';

  var GA4_ID = 'G-YE1NT4R4YT';
  var GOOGLE_ADS_ID = 'AW-18266173285';
  var CONTACT_CONVERSION = 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE';
  var LEAD_SESSION_KEY = 'tawodLeadSubmitted';

  if (window.__tawodAnalyticsInitialized) return;
  window.__tawodAnalyticsInitialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { send_page_view: true });
  window.gtag('config', GOOGLE_ADS_ID);

  var tagRequested = false;
  var idleTimer = 0;

  function loadGoogleTag() {
    if (tagRequested) return;
    tagRequested = true;
    if (idleTimer) window.clearTimeout(idleTimer);

    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    tag.setAttribute('data-tawod-google-tag', 'true');
    document.head.appendChild(tag);
  }

  function track(name, parameters) {
    loadGoogleTag();
    window.gtag('event', name, parameters || {});
  }

  function closestLink(target) {
    if (!target) return null;
    if (target.closest) return target.closest('a[href]');
    while (target && target !== document) {
      if (target.tagName === 'A' && target.getAttribute('href')) return target;
      target = target.parentNode;
    }
    return null;
  }

  function trackContactClick(event) {
    var link = closestLink(event.target);
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var isCall = /^tel:/i.test(href);
    var isWhatsApp = /(?:wa\.me\/|api\.whatsapp\.com\/)/i.test(href);
    if (!isCall && !isWhatsApp) return;

    var method = isCall ? 'phone' : 'whatsapp';
    var eventName = isCall ? 'tawod_call_click' : 'tawod_whatsapp_click';
    var shouldDelayNavigation = !link.target && !event.defaultPrevented && event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    var navigated = false;

    function continueNavigation() {
      if (navigated || !shouldDelayNavigation) return;
      navigated = true;
      window.location.href = link.href;
    }

    if (shouldDelayNavigation) event.preventDefault();
    loadGoogleTag();
    window.gtag('event', eventName, {
      send_to: GA4_ID,
      contact_method: method,
      page_path: window.location.pathname,
      link_url: link.href,
      transport_type: 'beacon'
    });
    window.gtag('event', 'conversion', {
      send_to: CONTACT_CONVERSION,
      event_callback: continueNavigation,
      event_timeout: 800
    });
    if (shouldDelayNavigation) window.setTimeout(continueNavigation, 850);
  }

  function trackConfirmedLead() {
    if (!/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) return;

    var confirmed = false;
    try {
      confirmed = window.sessionStorage.getItem(LEAD_SESSION_KEY) === '1';
    } catch (error) {}
    if (!confirmed) return;

    track('generate_lead', {
      send_to: GA4_ID,
      lead_source: 'contact_form',
      form_name: 'contact_quote_request',
      page_path: window.location.pathname,
      transport_type: 'beacon'
    });
    try {
      window.sessionStorage.removeItem(LEAD_SESSION_KEY);
    } catch (error) {}
  }

  window.TawodAnalytics = Object.freeze({
    ga4Id: GA4_ID,
    googleAdsId: GOOGLE_ADS_ID,
    load: loadGoogleTag,
    track: track
  });

  document.addEventListener('click', trackContactClick, true);
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (eventName) {
    window.addEventListener(eventName, loadGoogleTag, { once: true, passive: true });
  });
  window.addEventListener('pagehide', loadGoogleTag, { once: true });

  if (/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) loadGoogleTag();
  else idleTimer = window.setTimeout(loadGoogleTag, 1500);

  trackConfirmedLead();
})();
