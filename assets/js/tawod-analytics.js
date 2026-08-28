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

  function articleContext() {
    var body = document.body;
    if (!body || !body.dataset.articleSlug) return null;
    return {
      article_slug: body.dataset.articleSlug,
      article_topic: body.dataset.articleTopic || 'unclassified',
      content_role: body.dataset.articleRole || 'supporting',
      page_path: window.location.pathname
    };
  }

  function articleParameters(extra) {
    var context = articleContext();
    if (!context) return null;
    Object.keys(extra || {}).forEach(function (key) { context[key] = extra[key]; });
    context.send_to = GA4_ID;
    context.transport_type = 'beacon';
    return context;
  }

  function trackArticleClick(event) {
    var context = articleContext();
    if (!context) return;
    var link = closestLink(event.target);
    if (!link) return;
    var kind = link.getAttribute('data-article-link');
    var names = {
      service: 'article_service_click',
      project: 'article_project_click',
      related: 'related_article_click',
      quote: 'article_quote_click',
      hub: 'article_hub_click'
    };
    if (!names[kind]) return;
    track(names[kind], articleParameters({ target_url: link.href, link_type: kind }));
  }

  function initializeArticleTracking() {
    var context = articleContext();
    if (!context) return;
    window.gtag('event', 'article_view', articleParameters());

    var sent50 = false;
    var sent90 = false;
    function trackScrollDepth() {
      var documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      var available = Math.max(1, documentHeight - window.innerHeight);
      var depth = Math.min(100, Math.round((window.scrollY / available) * 100));
      if (!sent50 && depth >= 50) {
        sent50 = true;
        track('article_50_scroll', articleParameters({ scroll_depth: 50 }));
      }
      if (!sent90 && depth >= 90) {
        sent90 = true;
        track('article_90_scroll', articleParameters({ scroll_depth: 90 }));
        window.removeEventListener('scroll', trackScrollDepth);
      }
    }
    window.addEventListener('scroll', trackScrollDepth, { passive: true });
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
    var articleEvent = isCall ? 'article_call_click' : 'article_whatsapp_click';
    var parameters = articleParameters({ contact_method: method, link_url: link.href });
    if (parameters) window.gtag('event', articleEvent, parameters);
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
    article.innerHTML = '<div class="card-img-wrap"><img class="card-img" src="images/projects/arouba-mosque-villas-01.webp" width="420" height="560" loading="eager" decoding="async" alt="مشروع مسجد و٢ فيلا في حي العروبة - شركة تعاود للمقاولات"></div><div class="card-body"><div class="project-meta"><span>مسجد + فلل</span><span>تسليم مفتاح</span></div><h3>مسجد و ٢ فيلا | حي العروبة</h3><p>تنفيذ متكامل بنظام تسليم مفتاح كامل بمساحة 1800 م² خلال مدة زمنية قدرها 12 شهرًا.</p><a class="card-link" href="project-arouba-mosque-villas.html" aria-label="تفاصيل مشروع مسجد و ٢ فيلا | حي العروبة">تفاصيل المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>';
    grid.insertBefore(article, grid.firstChild);
  }

  window.TawodAnalytics = Object.freeze({
    ga4Id: GA4_ID,
    googleAdsId: GOOGLE_ADS_ID,
    load: loadGoogleTag,
    track: track
  });

  document.addEventListener('click', function (event) {
    trackContactClick(event);
    trackArticleClick(event);
  }, true);
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (eventName) {
    window.addEventListener(eventName, function () {
      scheduleGoogleTag(INTERACTION_LOAD_DELAY);
    }, { once: true, passive: true });
  });

  if (/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) loadGoogleTag();
  else scheduleFallbackLoad();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () {
    injectFeaturedProject();
    initializeArticleTracking();
  });
  else {
    injectFeaturedProject();
    initializeArticleTracking();
  }
  trackConfirmedLead();
})();
