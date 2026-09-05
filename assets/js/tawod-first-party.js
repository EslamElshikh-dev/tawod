/* Privacy-safe first-party analytics for Tawod Command Center. No customer PII is collected here. */
(function () {
  'use strict';

  var ENDPOINT = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
  var VISITOR_KEY = 'tawodVisitorId';
  var SESSION_KEY = 'tawodFirstPartySession';
  var LEAD_KEY = 'tawodFirstPartyLead';
  var SESSION_TIMEOUT = 30 * 60 * 1000;

  if (window.__tawodFirstPartyInitialized) return;
  window.__tawodFirstPartyInitialized = true;

  function isProductionHost() {
    return window.location.hostname === 'tawodco.com' || window.location.hostname === 'www.tawodco.com';
  }

  function read(storage, key) {
    try { return storage.getItem(key); } catch (e) { return null; }
  }

  function write(storage, key, value) {
    try { storage.setItem(key, value); } catch (e) {}
  }

  function remove(storage, key) {
    try { storage.removeItem(key); } catch (e) {}
  }

  function id(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return prefix + '-' + window.crypto.randomUUID();
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function visitorId() {
    var current = read(window.localStorage, VISITOR_KEY);
    if (!current) {
      current = id('v');
      write(window.localStorage, VISITOR_KEY, current);
    }
    return current;
  }

  function referrerHost() {
    if (!document.referrer) return null;
    try {
      var host = new URL(document.referrer).hostname.toLowerCase();
      if (host === 'tawodco.com' || host === 'www.tawodco.com') return null;
      return host;
    } catch (e) { return null; }
  }

  function campaignFromUrl() {
    var params;
    try { params = new URLSearchParams(window.location.search || ''); } catch (e) { return {}; }
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      click_id: params.get('gclid') || params.get('gbraid') || params.get('wbraid')
    };
  }

  function session() {
    var now = Date.now();
    var current = null;
    try { current = JSON.parse(read(window.sessionStorage, SESSION_KEY) || 'null'); } catch (e) {}

    if (!current || !current.id || now - Number(current.lastSeen || 0) > SESSION_TIMEOUT) {
      var utm = campaignFromUrl();
      current = {
        id: id('s'),
        startedAt: now,
        lastSeen: now,
        landingPath: (window.location.pathname || '/') + (window.location.search || ''),
        referrerHost: referrerHost(),
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_term: utm.utm_term,
        utm_content: utm.utm_content,
        click_id: utm.click_id
      };
    } else {
      current.lastSeen = now;
    }

    write(window.sessionStorage, SESSION_KEY, JSON.stringify(current));
    return current;
  }

  function deviceType() {
    var width = Math.min(
      window.innerWidth || 9999,
      window.screen && window.screen.width ? window.screen.width : 9999
    );
    if (width < 768) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }

  function send(eventName, extra) {
    if (!isProductionHost()) return;
    var current = session();
    var event = {
      event_name: eventName,
      visitor_id: visitorId(),
      session_id: current.id,
      page_path: window.location.pathname || '/',
      page_title: document.title || null,
      landing_path: current.landingPath,
      referrer_host: current.referrerHost,
      device_type: deviceType(),
      utm_source: current.utm_source,
      utm_medium: current.utm_medium,
      utm_campaign: current.utm_campaign,
      utm_term: current.utm_term,
      utm_content: current.utm_content,
      click_id: current.click_id
    };

    Object.keys(extra || {}).forEach(function (key) { event[key] = extra[key]; });

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [event] }),
        keepalive: true,
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) {}
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
    if (!body || !body.dataset || !body.dataset.articleSlug) return null;
    return { article_slug: body.dataset.articleSlug };
  }

  function trackArticleClick(event) {
    var article = articleContext();
    if (!article) return;
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
    send(names[kind], { article_slug: article.article_slug, metadata: { link_type: kind } });
  }

  function initializeArticleTracking() {
    var article = articleContext();
    if (!article) return;
    send('article_view', { article_slug: article.article_slug });
    var sent50 = false;
    var sent90 = false;

    function onScroll() {
      var height = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
      var available = Math.max(1, height - window.innerHeight);
      var depth = Math.min(100, Math.round((window.scrollY / available) * 100));
      if (!sent50 && depth >= 50) {
        sent50 = true;
        send('article_50_scroll', { article_slug: article.article_slug });
      }
      if (!sent90 && depth >= 90) {
        sent90 = true;
        send('article_90_scroll', { article_slug: article.article_slug });
        window.removeEventListener('scroll', onScroll);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function trackContact(event) {
    var link = closestLink(event.target);
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var isCall = /^tel:/i.test(href);
    var isWhatsApp = /(?:wa\.me\/|api\.whatsapp\.com\/)/i.test(href);
    if (!isCall && !isWhatsApp) return;
    send(isCall ? 'call_click' : 'whatsapp_click', {
      contact_method: isCall ? 'phone' : 'whatsapp'
    });
  }

  function isLeadForm(form) {
    return !!(
      form &&
      form.tagName === 'FORM' &&
      typeof form.getAttribute === 'function' &&
      /(?:^|\/\/)(?:www\.)?formsubmit\.co(?:\/|$)/i.test(form.getAttribute('action') || '')
    );
  }

  function trackFormSubmit(event) {
    var form = event.target;
    if (event.defaultPrevented || !isLeadForm(form)) return;
    var service = form.querySelector ? form.querySelector('[name="الخدمة_المطلوبة"]') : null;
    var context = {
      submission_id: id('lead'),
      form_name: form.getAttribute('data-analytics-form') || 'contact_quote_request',
      form_source_path: window.location.pathname || '/',
      service_type: service && service.value ? service.value : 'not_selected'
    };
    write(window.sessionStorage, LEAD_KEY, JSON.stringify(context));
    send('form_submit_attempt', {
      form_name: context.form_name,
      form_source_path: context.form_source_path,
      service_type: context.service_type,
      metadata: { submission_id: context.submission_id }
    });
  }

  function trackConfirmedLead() {
    if (!/(?:^|\/)thank-you\.html$/.test(window.location.pathname)) return;
    var context = null;
    try { context = JSON.parse(read(window.sessionStorage, LEAD_KEY) || 'null'); } catch (e) {}
    if (!context || !context.form_name) return;
    send('generate_lead', {
      form_name: context.form_name,
      form_source_path: context.form_source_path || 'unknown',
      service_type: context.service_type || 'unknown',
      metadata: { submission_id: context.submission_id || null }
    });
    remove(window.sessionStorage, LEAD_KEY);
  }

  document.addEventListener('click', function (event) {
    trackContact(event);
    trackArticleClick(event);
  }, true);
  document.addEventListener('submit', trackFormSubmit);

  send('page_view');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeArticleTracking);
  else initializeArticleTracking();
  trackConfirmedLead();
})();
