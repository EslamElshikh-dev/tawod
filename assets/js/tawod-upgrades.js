/* Tawod homepage enhancements that do not rewrite visible content. */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function improveMediaLoading() {
    document.querySelectorAll('img').forEach(function (img, index) {
      img.decoding = 'async';
      if (index > 1 && !img.hasAttribute('loading')) img.loading = 'lazy';
    });
  }

  ready(function () {
    improveMediaLoading();
    document.documentElement.classList.add('tawod-polished');

    var mapButton = document.querySelector('[data-load-map]');
    var mapHolder = document.querySelector('[data-map-holder]');

    function loadMap() {
      if (!mapButton || !mapHolder || mapHolder.dataset.loaded === 'true') return;
      var src = mapButton.getAttribute('data-map-src');
      if (!src) return;
      mapHolder.dataset.loaded = 'true';
      mapHolder.innerHTML = '<iframe title="موقع شركة تعاود في الرياض" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="' + src + '"></iframe>';
    }

    if (mapButton) mapButton.addEventListener('click', loadMap);

    if (mapHolder && 'IntersectionObserver' in window) {
      var mapObserver = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          window.setTimeout(loadMap, 500);
          mapObserver.disconnect();
        }
      }, { rootMargin: '180px 0px' });
      mapObserver.observe(mapHolder);
    }
  });
})();
