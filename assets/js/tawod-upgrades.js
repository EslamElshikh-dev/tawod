/* Tawod homepage enhancements that do not rewrite visible content outside local Dammam cleanup. */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function cleanDammamCustomerCopy() {
    if (!/^\/dammam(?:\/|$)/.test(window.location.pathname)) return;

    /* Remove internal/policy-facing blocks that are not useful to customers. */
    document.querySelectorAll('section').forEach(function (section) {
      var heading = section.querySelector('h1, h2, h3');
      if (!heading) return;
      var text = heading.textContent.trim();
      if (
        text.indexOf('نخدم المشروع كنطاق خدمة') !== -1 ||
        text.indexOf('نطاق خدمة وليس كفرع') !== -1
      ) {
        section.remove();
      }
    });

    /* Remove branch/address-policy questions from the visible FAQ only. */
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var text = item.textContent;
      if (
        text.indexOf('هل لديكم فرع') !== -1 ||
        text.indexOf('هل صفحة الدمام تمثل فرع') !== -1 ||
        text.indexOf('هل يوجد عنوان استقبال عملاء') !== -1
      ) {
        item.remove();
      }
    });

    /* Remove the contact card that explains service-area/branch policy. */
    document.querySelectorAll('.contact-card').forEach(function (card) {
      var text = card.textContent;
      if (
        text.indexOf('نطاق الخدمة') !== -1 ||
        text.indexOf('بدون عرض عنوان فرع') !== -1
      ) {
        card.remove();
      }
    });

    /* Customer-facing wording should simply say Dammam, not explain internal setup. */
    var replacements = [
      ['الدمام — نطاق خدمة', 'الدمام'],
      ['ضمن نطاق خدمة الدمام', 'في الدمام'],
      ['داخل نطاق خدمة الدمام', 'داخل الدمام'],
      ['في نطاق خدمة الدمام', 'في الدمام'],
      ['داخل نطاق الدمام', 'داخل الدمام'],
      ['في الدمام نقدم خدماتنا كنطاق خدمة ونقيّم كل مشروع', 'في الدمام نقيّم كل مشروع'],
      ['خدمات تعاود للمشاريع التي يمكن خدمتها داخل مدينة الدمام كنطاق خدمة', 'خدمات تعاود للمشاريع داخل مدينة الدمام']
    ];

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var parent = node.parentElement;
      if (!parent || parent.closest('script, style, noscript')) return;
      var value = node.nodeValue;
      var next = value;
      replacements.forEach(function (pair) {
        next = next.split(pair[0]).join(pair[1]);
      });
      if (next !== value) node.nodeValue = next;
    });
  }

  ready(function () {
    document.documentElement.classList.add('tawod-polished');
    cleanDammamCustomerCopy();

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
