/* Maintenance account only: diagnostic contact clicks, not completed calls or messages. */
(function () {
  'use strict';
  if (!/^\/maintenance(?:\/|$)/.test(window.location.pathname)) return;
  if (window.__tawodMaintenanceAdsInitialized) return;
  window.__tawodMaintenanceAdsInitialized = true;

  var adsId = 'AW-18506806186';
  var destinations = {
    phone: adsId + '/y0IuCOiuipkdEKrn3fhE',
    whatsapp: adsId + '/oec3COuuipkdEKrn3fhE'
  };
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('config', adsId);
  if (window.TawodAnalytics) window.TawodAnalytics.load();

  var lastClick = Object.create(null);
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a[href]');
    if (!anchor) return;
    var url;
    try { url = new URL(anchor.href, window.location.href); } catch (_) { return; }
    var method = '';
    if (url.protocol === 'tel:' && /^(?:\+?966|0)?533152133$/.test(url.pathname.replace(/[\s()-]/g, ''))) {
      method = 'phone';
    } else if (url.hostname === 'wa.me' && url.pathname === '/966533152133') {
      method = 'whatsapp';
    } else if ((url.hostname === 'api.whatsapp.com' || url.hostname === 'web.whatsapp.com') && url.searchParams.get('phone') === '966533152133') {
      method = 'whatsapp';
    }
    if (!method) return;
    var now = Date.now();
    if (lastClick[method] && now - lastClick[method] < 1000) return;
    lastClick[method] = now;
    if (window.TawodAnalytics) window.TawodAnalytics.load();
    window.gtag('event', 'conversion', {
      send_to: destinations[method],
      transport_type: 'beacon'
    });
  }, true);
})();
