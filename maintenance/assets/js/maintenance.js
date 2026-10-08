(function () {
  'use strict';
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('mobile-menu');
  var panel = menu && menu.querySelector('.menu-panel');
  var previousFocus;
  var background = ['.topline', '.site-header', '#main-content', '.site-footer', '.contact-float'].map(function (s) { return document.querySelector(s); }).filter(Boolean);
  function setMenu(open) {
    if (!menu || !toggle) return;
    if (open) previousFocus = document.activeElement;
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل');
    background.forEach(function (el) { el.inert = open; });
    if (open) panel.querySelector('button').focus();
    else if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
  }
  if (toggle) toggle.addEventListener('click', function () { setMenu(menu.hidden); });
  if (menu) {
    menu.querySelectorAll('[data-menu-close], nav a').forEach(function (el) { el.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (event) {
      if (menu.hidden) return;
      if (event.key === 'Escape') { setMenu(false); return; }
      if (event.key !== 'Tab') return;
      var elements = Array.from(panel.querySelectorAll('a[href], button'));
      var first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    var desktop = window.matchMedia('(min-width: 1101px)');
    var reset = function (e) { if (e.matches && !menu.hidden) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', reset);
    else if (desktop.addListener) desktop.addListener(reset);
  }
  // The thin header line follows reading progress without changing the layout.
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    var scrollFrame = 0;
    var updateReadingProgress = function () {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      siteHeader.style.setProperty('--scroll-progress', String(maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0));
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
      scrollFrame = 0;
    };
    updateReadingProgress();
    window.addEventListener('scroll', function () {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateReadingProgress);
    }, { passive: true });
    window.addEventListener('resize', updateReadingProgress, { passive: true });
  }
  // Reveal below-the-fold content only when motion is supported and welcome.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var revealTargets = document.querySelectorAll('.section-heading, .service-card, .catalog-card, .service-photo-grid figure, .scope-card, .process-grid li, .sector-card, .related-grid > a, .scope-sheet, .service-brief');
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    revealTargets.forEach(function (el, index) {
      // Above-the-fold content stays immediately readable while the page loads.
      if (el.getBoundingClientRect().top < window.innerHeight - 32) return;
      el.style.setProperty('--reveal-delay', String(index % 3 * 75) + 'ms');
      el.classList.add('reveal-pending');
      revealObserver.observe(el);
    });
  }
  // The complete service catalogue is rendered before this optional filter is enabled.
  var filters = document.querySelector('[data-service-filters]');
  var serviceGrid = document.getElementById('service-grid');
  if (filters && serviceGrid) {
    var filterButtons = Array.from(filters.querySelectorAll('[data-service-filter]'));
    var serviceCards = Array.from(serviceGrid.querySelectorAll('[data-service-category]'));
    var filterResult = filters.querySelector('[data-filter-result]');
    filters.hidden = false;
    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var category = button.getAttribute('data-service-filter');
        var visible = 0;
        filterButtons.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
        serviceCards.forEach(function (card) {
          card.hidden = category !== 'all' && card.getAttribute('data-service-category') !== category;
          if (!card.hidden) visible++;
        });
        if (filterResult) filterResult.textContent = visible + ' مجالات خدمة';
      });
    });
  }
  var form = document.getElementById('service-request');
  var review = document.getElementById('request-review');
  if (form && review) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var selected = Array.from(form.querySelectorAll('input[name="services"]:checked')).map(function (el) { return el.value; });
      var error = document.getElementById('form-error');
      if (!selected.length) { error.textContent = 'اختر خدمة واحدة على الأقل لتجهيز طلبك.'; form.querySelector('input[name="services"]').focus(); return; }
      error.textContent = '';
      var district = form.elements.district.value.trim();
      if (!district) { error.textContent = 'اكتب اسم الحي داخل الرياض.'; form.elements.district.focus(); return; }
      var message = ['السلام عليكم، أرغب في دراسة احتياجي لدى تعاود للصيانة والتشغيل وإدارة المرافق.', '', 'الخدمات: ' + selected.join('، '), 'نوع الموقع: ' + form.elements.property.value, 'الموقع: الرياض، ' + district, 'نوع الطلب: ' + form.elements.duration.value];
      var notes = form.elements.notes.value.trim();
      if (notes) message.push('التفاصيل: ' + notes);
      message.push('', 'أرجو التواصل لتحديد نطاق الخدمة والخطوة المناسبة.');
      var text = message.join('\n');
      document.getElementById('request-summary').textContent = text;
      document.getElementById('request-whatsapp').href = 'https://wa.me/966533152133?text=' + encodeURIComponent(text);
      form.hidden = true; review.hidden = false;
      review.focus({preventScroll:true});
      review.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      // Preparation is not a confirmed lead. Never send user-entered text to analytics.
      if (/^(www\.)?tawodco\.com$/.test(window.location.hostname) && typeof window.gtag === 'function') {
        window.gtag('event','maintenance_request_prepared',{service_count:selected.length,page_path:window.location.pathname});
      }
    });
    document.getElementById('request-edit').addEventListener('click',function () { review.hidden = true; form.hidden = false; form.querySelector('input').focus({preventScroll:true}); form.scrollIntoView({behavior:'auto',block:'start'}); });
    form.addEventListener('change',function () { document.getElementById('form-error').textContent = ''; });
  }
  document.querySelectorAll('[data-current-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  // Keep quick contact buttons clear of the request flow and footer contacts.
  var floatingContact = document.querySelector('.contact-float');
  if (floatingContact && 'IntersectionObserver' in window) {
    var contactSections = new Set();
    var contactObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) contactSections.add(entry.target);
        else contactSections.delete(entry.target);
      });
      floatingContact.hidden = contactSections.size > 0;
    });
    document.querySelectorAll('.request-section, .service-cta, .site-footer').forEach(function (el) { contactObserver.observe(el); });
  }
})();
