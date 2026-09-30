/* Preserves Google Ads click identifiers into the user-approved WhatsApp message without firing a Google Ads conversion. */
(function () {
  'use strict';

  var STORAGE_KEY = 'tawodAdsAttributionV1';
  var IDENTIFIERS = ['gclid', 'gbraid', 'wbraid'];
  var REFERENCE_LABEL = 'مرجع الإعلان:';

  function readStoredAttribution() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function currentIdentifier() {
    var search = null;
    try { search = new URLSearchParams(window.location.search || ''); } catch (error) {}
    var freshCampaign = search && ['utm_source','utm_medium','utm_campaign','utm_content','ttclid','fbclid'].some(function (key) { return !!search.get(key); });
    for (var i = 0; i < IDENTIFIERS.length; i += 1) {
      var key = IDENTIFIERS[i], value = search ? search.get(key) : null;
      if (value) return { type: key.toUpperCase(), value: value };
    }
    if (freshCampaign) return null;
    var current = null;
    try { current = JSON.parse(window.sessionStorage.getItem('tawodFirstPartySession') || 'null'); } catch (error) {}
    if (!current || !current.click_id || !Number.isFinite(Number(current.lastSeen)) || Date.now() - Number(current.lastSeen) > 30 * 60000) return null;
    var stored = readStoredAttribution(), landing = null;
    try { landing = new URL(current.landingPath,window.location.href).searchParams; } catch (error) {}
    for (var j = 0; j < IDENTIFIERS.length; j += 1) {
      var identifier = IDENTIFIERS[j];
      if ((landing && landing.get(identifier) === current.click_id) || stored[identifier] === current.click_id) return {type:identifier.toUpperCase(),value:current.click_id};
    }
    return null;
  }

  function decorateWhatsAppLink(link, identifier) {
    if (!link || !identifier) return;
    var href = link.getAttribute('href') || '';
    if (!/(?:wa\.me\/|api\.whatsapp\.com\/)/i.test(href)) return;

    try {
      var url = new URL(href, window.location.href);
      var text = url.searchParams.get('text') || '';
      if (text.indexOf(REFERENCE_LABEL) !== -1) return;
      text += (text ? '\n\n' : '') + REFERENCE_LABEL + ' ' + identifier.type + ':' + identifier.value;
      url.searchParams.set('text', text);
      link.setAttribute('href', url.toString());
      link.setAttribute('data-ads-attribution-id', identifier.type);
    } catch (error) {}
  }

  function initialize() {
    var identifier = currentIdentifier();
    if (!identifier) return;
    var links = document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]');
    for (var i = 0; i < links.length; i += 1) decorateWhatsAppLink(links[i], identifier);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
