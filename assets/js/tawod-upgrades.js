/* Tawod upgrade interactions: lazy map + UX helpers */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function polishHomepageBlogCards() {
    var cards = document.querySelectorAll('#blog .blog-card');
    if (!cards.length) return;
    var data = [
      {
        img: 'images/blog/best-contracting-company-riyadh.webp',
        alt: 'اختيار أفضل شركة مقاولات في الرياض',
        title: 'كيف تختار أفضل شركة مقاولات في الرياض؟',
        text: 'دليل عملي يساعدك على مقارنة شركات المقاولات حسب وضوح العرض، خبرة التنفيذ، جودة التواصل، تنظيم مراحل المشروع، وآلية تسليم الأعمال.'
      },
      {
        img: 'images/blog/finishing-interior-design-riyadh.webp',
        alt: 'التشطيب والتصميم الداخلي في الرياض',
        title: 'دليل التشطيب والتصميم الداخلي في الرياض',
        text: 'تعرف على خطوات تنسيق المواد والألوان والإضاءة والكهرباء والسباكة قبل التشطيب للحصول على مساحة عملية ومظهر احترافي.'
      },
      {
        img: 'images/blog/mechanical-mep-works-riyadh.webp',
        alt: 'أعمال الكهرباء والسباكة والميكانيكا في الرياض',
        title: 'أعمال الكهرباء والسباكة في المشاريع',
        text: 'شرح لأهمية تخطيط أعمال MEP مبكرًا لتقليل التعارضات، حماية التشطيب، وتحسين جودة الاستخدام بعد التسليم.'
      }
    ];
    cards.forEach(function (card, index) {
      var item = data[index];
      if (!item) return;
      var img = card.querySelector('.card-img');
      var title = card.querySelector('h3');
      var text = card.querySelector('p');
      if (img) {
        img.src = item.img;
        img.alt = item.alt;
        img.loading = 'lazy';
        img.decoding = 'async';
      }
      if (title) title.textContent = item.title;
      if (text) text.textContent = item.text;
    });
  }

  ready(function () {
    polishHomepageBlogCards();

    var mapButton = document.querySelector('[data-load-map]');
    var mapHolder = document.querySelector('[data-map-holder]');

    function loadMap() {
      if (!mapButton || !mapHolder || mapHolder.dataset.loaded === 'true') return;
      var src = mapButton.getAttribute('data-map-src');
      if (!src) return;
      mapHolder.dataset.loaded = 'true';
      mapHolder.innerHTML = '<iframe title="موقع شركة تعاود في الرياض" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="' + src + '"></iframe>';
    }

    if (mapButton) {
      mapButton.addEventListener('click', loadMap);
    }

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
