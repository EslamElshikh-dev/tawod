/* Tawod sitewide analytics and confirmed-lead tracking. */
(function () {
  'use strict';

  var GA4_ID = 'G-YE1NT4R4YT';
  var GOOGLE_ADS_ID = 'AW-18266173285';
  var CONTACT_CONVERSION = 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE';
  var LEAD_SESSION_KEY = 'tawodLeadSubmitted';
  var INTERACTION_LOAD_DELAY = 2000;
  var FALLBACK_LOAD_DELAY = 8000;

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
  var scheduledFor = 0;

  function loadGoogleTag() {
    if (tagRequested) return;
    tagRequested = true;
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = 0;
    scheduledFor = 0;

    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    tag.setAttribute('data-tawod-google-tag', 'true');
    document.head.appendChild(tag);
  }

  function scheduleGoogleTag(delay) {
    if (tagRequested) return;
    var nextRun = Date.now() + delay;
    if (idleTimer && scheduledFor <= nextRun) return;
    if (idleTimer) window.clearTimeout(idleTimer);
    scheduledFor = nextRun;
    idleTimer = window.setTimeout(function () {
      idleTimer = 0;
      scheduledFor = 0;
      loadGoogleTag();
    }, delay);
  }

  function scheduleFallbackLoad() {
    var schedule = function () { scheduleGoogleTag(FALLBACK_LOAD_DELAY); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
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

  function injectFeaturedProject() {
    if (!/(?:^|\/)projects\.html$/.test(window.location.pathname)) return;
    if (document.querySelector('[data-project="arouba-mosque-villas"]')) return;

    var grid = document.querySelector('.projects-grid');
    if (!grid) return;

    var article = document.createElement('article');
    article.className = 'project-card reveal-up active visible in-view revealed show';
    article.setAttribute('data-project', 'arouba-mosque-villas');
    article.innerHTML = '<div class="card-img-wrap"><img class="card-img" src="images/projects/arouba-mosque-villas-01.webp" width="420" height="560" loading="eager" decoding="async" alt="مشروع مسجد و٢ فيلا في حي العربية - شركة تعاود للمقاولات"></div><div class="card-body"><div class="project-meta"><span>مسجد + فلل</span><span>تسليم مفتاح</span></div><h3>مسجد و ٢ فيلا | حي العربية</h3><p>تنفيذ متكامل بنظام تسليم مفتاح كامل بمساحة 1800 م² خلال مدة زمنية قدرها 12 شهرًا.</p><a class="card-link" href="project-arouba-mosque-villas.html" aria-label="تفاصيل مشروع مسجد و ٢ فيلا | حي العربية">تفاصيل المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>';
    grid.insertBefore(article, grid.firstChild);
  }

  window.TawodAnalytics = Object.freeze({
    ga4Id: GA4_ID,
    googleAdsId: GOOGLE_ADS_ID,
    load: loadGoogleTag,
    track: track
  });

  document.addEventListener('click', trackContactClick, true);
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (eventName) {
    window.addEventListener(eventName, function () {
      scheduleGoogleTag(INTERACTION_LOAD_DELAY);
    }, { once: true, passive: true });
  });

  if (/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) loadGoogleTag();
  else scheduleFallbackLoad();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectFeaturedProject);
  else injectFeaturedProject();
  trackConfirmedLead();
})();
