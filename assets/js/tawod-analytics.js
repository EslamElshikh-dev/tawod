/* Tawod sitewide analytics and confirmed-lead tracking. */
(function () {
  'use strict';

  var GA4_ID = 'G-YE1NT4R4YT';
  var GOOGLE_ADS_ID = 'AW-18266173285';
  var CONTACT_CONVERSION = 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE';
  var FIRST_PARTY_ENDPOINT = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
  var LEAD_SESSION_KEY = 'tawodLeadSubmitted';
  var VISITOR_KEY = 'tawodVisitorId';
  var SESSION_KEY = 'tawodSession';
  var LEAD_CONTEXT_VERSION = 1;
  var INTERACTION_LOAD_DELAY = 2000;
  var FALLBACK_LOAD_DELAY = 8000;

  if (window.__tawodAnalyticsInitialized) return;
  window.__tawodAnalyticsInitialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { send_page_view: true });
  window.gtag('config', GOOGLE_ADS_ID);

  var tagRequested = false;
  var idleTimer = 0;
  var scheduledFor = 0;

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return prefix + '-' + window.crypto.randomUUID();
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function readStorage(storage, key) { try { return storage.getItem(key); } catch (error) { return null; } }
  function writeStorage(storage, key, value) { try { storage.setItem(key, value); } catch (error) {} }

  function visitorId() {
    var id = readStorage(window.localStorage, VISITOR_KEY);
    if (!id) { id = uid('v'); writeStorage(window.localStorage, VISITOR_KEY, id); }
    return id;
  }

  function sessionContext() {
    var now = Date.now();
    var current = null;
    try { current = JSON.parse(readStorage(window.sessionStorage, SESSION_KEY) || 'null'); } catch (error) {}
    if (!current || !current.id || now - Number(current.lastSeen || 0) > 30 * 60 * 1000) {
      current = { id: uid('s'), startedAt: now, lastSeen: now, landingPath: window.location.pathname + window.location.search };
    } else current.lastSeen = now;
    writeStorage(window.sessionStorage, SESSION_KEY, JSON.stringify(current));
    return current;
  }

  function deviceType() {
    var width = Math.min(window.screen && window.screen.width || 9999, window.innerWidth || 9999);
    if (width < 768) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }

  function campaign() {
    var params = new URLSearchParams(window.location.search || '');
    return {
      utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'), utm_term: params.get('utm_term'), utm_content: params.get('utm_content')
    };
  }

  function referrerHost() {
    if (!document.referrer) return null;
    try { return new URL(document.referrer).hostname; } catch (error) { return null; }
  }

  function firstParty(name, extra) {
    if (window.location.hostname !== 'tawodco.com' && window.location.hostname !== 'www.tawodco.com') return;
    var session = sessionContext();
    var utm = campaign();
    var event = {
      event_name: name,
      visitor_id: visitorId(), session_id: session.id,
      page_path: window.location.pathname, page_title: document.title,
      landing_path: session.landingPath, referrer_host: referrerHost(), device_type: deviceType(),
      utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
      utm_term: utm.utm_term, utm_content: utm.utm_content
    };
    Object.keys(extra || {}).forEach(function (key) { event[key] = extra[key]; });
    try {
      fetch(FIRST_PARTY_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [event] }), keepalive: true, credentials: 'omit'
      }).catch(function () {});
    } catch (error) {}
  }

  function loadGoogleTag() {
    if (tagRequested) return;
    tagRequested = true;
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = 0; scheduledFor = 0;
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
    idleTimer = window.setTimeout(function () { idleTimer = 0; scheduledFor = 0; loadGoogleTag(); }, delay);
  }

  function scheduleFallbackLoad() {
    var schedule = function () { scheduleGoogleTag(FALLBACK_LOAD_DELAY); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  }

  function track(name, parameters) { loadGoogleTag(); window.gtag('event', name, parameters || {}); }

  function closestLink(target) {
    if (!target) return null;
    if (target.closest) return target.closest('a[href]');
    while (target && target !== document) { if (target.tagName === 'A' && target.getAttribute('href')) return target; target = target.parentNode; }
    return null;
  }

  function articleContext() {
    var body = document.body;
    if (!body || !body.dataset.articleSlug) return null;
    return { article_slug: body.dataset.articleSlug, article_topic: body.dataset.articleTopic || 'unclassified', content_role: body.dataset.articleRole || 'supporting', page_path: window.location.pathname };
  }

  function articleParameters(extra) {
    var context = articleContext(); if (!context) return null;
    Object.keys(extra || {}).forEach(function (key) { context[key] = extra[key]; });
    context.send_to = GA4_ID; context.transport_type = 'beacon'; return context;
  }

  function trackArticleClick(event) {
    var context = articleContext(); if (!context) return;
    var link = closestLink(event.target); if (!link) return;
    var kind = link.getAttribute('data-article-link');
    var names = { service: 'article_service_click', project: 'article_project_click', related: 'related_article_click', quote: 'article_quote_click', hub: 'article_hub_click' };
    if (!names[kind]) return;
    track(names[kind], articleParameters({ target_url: link.href, link_type: kind }));
    firstParty(names[kind], { article_slug: context.article_slug, metadata: { link_type: kind } });
  }

  function initializeArticleTracking() {
    var context = articleContext(); if (!context) return;
    window.gtag('event', 'article_view', articleParameters());
    firstParty('article_view', { article_slug: context.article_slug });
    var sent50 = false, sent90 = false;
    function trackScrollDepth() {
      var documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      var available = Math.max(1, documentHeight - window.innerHeight);
      var depth = Math.min(100, Math.round((window.scrollY / available) * 100));
      if (!sent50 && depth >= 50) { sent50 = true; track('article_50_scroll', articleParameters({ scroll_depth: 50 })); firstParty('article_50_scroll', { article_slug: context.article_slug }); }
      if (!sent90 && depth >= 90) { sent90 = true; track('article_90_scroll', articleParameters({ scroll_depth: 90 })); firstParty('article_90_scroll', { article_slug: context.article_slug }); window.removeEventListener('scroll', trackScrollDepth); }
    }
    window.addEventListener('scroll', trackScrollDepth, { passive: true });
  }

  function trackContactClick(event) {
    var link = closestLink(event.target); if (!link) return;
    var href = link.getAttribute('href') || '';
    var isCall = /^tel:/i.test(href), isWhatsApp = /(?:wa\.me\/|api\.whatsapp\.com\/)/i.test(href);
    if (!isCall && !isWhatsApp) return;
    var method = isCall ? 'phone' : 'whatsapp';
    var eventName = isCall ? 'tawod_call_click' : 'tawod_whatsapp_click';
    var shouldDelayNavigation = !link.target && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    var navigated = false;
    function continueNavigation() { if (navigated || !shouldDelayNavigation) return; navigated = true; window.location.href = link.href; }
    if (shouldDelayNavigation) event.preventDefault();
    loadGoogleTag();
    window.gtag('event', eventName, { send_to: GA4_ID, contact_method: method, page_path: window.location.pathname, link_url: link.href, transport_type: 'beacon' });
    firstParty(isCall ? 'call_click' : 'whatsapp_click', { contact_method: method });
    var articleEvent = isCall ? 'article_call_click' : 'article_whatsapp_click';
    var parameters = articleParameters({ contact_method: method, link_url: link.href }); if (parameters) window.gtag('event', articleEvent, parameters);
    window.gtag('event', 'conversion', { send_to: CONTACT_CONVERSION, event_callback: continueNavigation, event_timeout: 800 });
    if (shouldDelayNavigation) window.setTimeout(continueNavigation, 850);
  }

  function isLeadForm(form) { return !!(form && form.tagName === 'FORM' && typeof form.getAttribute === 'function' && /(?:^|\/\/)(?:www\.)?formsubmit\.co(?:\/|$)/i.test(form.getAttribute('action') || '')); }
  function createSubmissionId() { return uid('tawod'); }

  function trackFormSubmit(event) {
    var form = event.target; if (event.defaultPrevented || !isLeadForm(form)) return;
    var service = form.querySelector ? form.querySelector('[name="الخدمة_المطلوبة"]') : null;
    var context = { version: LEAD_CONTEXT_VERSION, submission_id: createSubmissionId(), form_name: form.getAttribute('data-analytics-form') || 'contact_quote_request', form_source_path: window.location.pathname, service_type: service && service.value ? service.value : 'not_selected' };
    try { window.sessionStorage.setItem(LEAD_SESSION_KEY, JSON.stringify(context)); } catch (error) {}
    track('form_submit_attempt', { send_to: GA4_ID, form_name: context.form_name, form_source_path: context.form_source_path, service_type: context.service_type, page_path: window.location.pathname, transport_type: 'beacon' });
    firstParty('form_submit_attempt', { form_name: context.form_name, form_source_path: context.form_source_path, service_type: context.service_type });
  }

  function storedLeadContext() {
    var stored = null; try { stored = window.sessionStorage.getItem(LEAD_SESSION_KEY); } catch (error) {}
    if (!stored) return null;
    if (stored === '1') return { version: 0, form_name: 'contact_quote_request', form_source_path: 'unknown', service_type: 'unknown' };
    try { var parsed = JSON.parse(stored); return parsed && parsed.form_name ? parsed : null; } catch (error) { return null; }
  }

  function trackConfirmedLead() {
    if (!/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) return;
    var context = storedLeadContext(); if (!context) return;
    track('generate_lead', { send_to: GA4_ID, lead_source: 'contact_form', form_name: context.form_name, form_source_path: context.form_source_path || 'unknown', service_type: context.service_type || 'unknown', page_path: window.location.pathname, transport_type: 'beacon' });
    firstParty('generate_lead', { form_name: context.form_name, form_source_path: context.form_source_path || 'unknown', service_type: context.service_type || 'unknown', metadata: { submission_id: context.submission_id || null } });
    var adsParameters = { send_to: CONTACT_CONVERSION, form_name: context.form_name, form_source_path: context.form_source_path || 'unknown', service_type: context.service_type || 'unknown', transport_type: 'beacon' };
    if (context.submission_id) adsParameters.transaction_id = context.submission_id;
    window.gtag('event', 'conversion', adsParameters);
    try { window.sessionStorage.removeItem(LEAD_SESSION_KEY); } catch (error) {}
  }

  function injectFeaturedProject() {
    if (!/(?:^|\/)projects\.html$/.test(window.location.pathname) || document.querySelector('[data-project="arouba-mosque-villas"]')) return;
    var grid = document.querySelector('.projects-grid'); if (!grid) return;
    var article = document.createElement('article');
    article.className = 'project-card reveal-up active visible in-view revealed show'; article.setAttribute('data-project', 'arouba-mosque-villas');
    article.innerHTML = '<div class="card-img-wrap"><img class="card-img" src="images/projects/arouba-mosque-villas-01.webp" width="420" height="560" loading="eager" decoding="async" alt="مشروع مسجد و٢ فيلا في حي العروبة - شركة تعاود للمقاولات"></div><div class="card-body"><div class="project-meta"><span>مسجد + فلل</span><span>تسليم مفتاح</span></div><h3>مسجد و ٢ فيلا | حي العروبة</h3><p>تنفيذ متكامل بنظام تسليم مفتاح كامل بمساحة 1800 م² خلال مدة زمنية قدرها 12 شهرًا.</p><a class="card-link" href="project-arouba-mosque-villas.html" aria-label="تفاصيل مشروع مسجد و ٢ فيلا | حي العروبة">تفاصيل المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>';
    grid.insertBefore(article, grid.firstChild);
  }

  window.TawodAnalytics = Object.freeze({ ga4Id: GA4_ID, googleAdsId: GOOGLE_ADS_ID, load: loadGoogleTag, track: track });
  document.addEventListener('click', function (event) { trackContactClick(event); trackArticleClick(event); }, true);
  document.addEventListener('submit', trackFormSubmit);
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (eventName) { window.addEventListener(eventName, function () { scheduleGoogleTag(INTERACTION_LOAD_DELAY); }, { once: true, passive: true }); });
  firstParty('page_view');
  if (/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) loadGoogleTag(); else scheduleFallbackLoad();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { injectFeaturedProject(); initializeArticleTracking(); });
  else { injectFeaturedProject(); initializeArticleTracking(); }
  trackConfirmedLead();
})();
