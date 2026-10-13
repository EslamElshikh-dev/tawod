(function () {
  'use strict';
  var button = document.getElementById('en-menu-toggle');
  var menu = document.getElementById('en-nav');
  if (!button || !menu) return;
  function closeMenu(returnFocus) {
    menu.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
    if (returnFocus) button.focus();
  }
  button.addEventListener('click', function () {
    var open = button.getAttribute('aria-expanded') !== 'true';
    menu.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  menu.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', function (event) {
    if (!menu.contains(event.target) && !button.contains(event.target)) closeMenu(false);
  });
  var servicesButton = document.getElementById('en-services-toggle');
  var servicesItem = servicesButton && servicesButton.closest('.nav-services-item');
  function closeServices(returnFocus) {
    if (!servicesItem) return;
    servicesItem.classList.remove('is-open');
    servicesButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) servicesButton.focus();
  }
  if (servicesButton) {
    servicesButton.addEventListener('click', function () {
      var open = servicesButton.getAttribute('aria-expanded') !== 'true';
      servicesItem.classList.toggle('is-open', open);
      servicesButton.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (event) {
      if (!servicesItem.contains(event.target)) closeServices(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && servicesButton.getAttribute('aria-expanded') === 'true') closeServices(true);
    });
  }
  document.querySelectorAll('.faq-question').forEach(function (question) {
    question.addEventListener('click', function () {
      var item = question.closest('.faq-item');
      var open = !item.classList.contains('active');
      item.classList.toggle('active', open);
      question.setAttribute('aria-expanded', String(open));
    });
  });
  document.querySelectorAll('[data-load-map]').forEach(function (loadButton) {
    loadButton.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.src = loadButton.getAttribute('data-map-src').replace('!2ssa', '!2sen');
      frame.title = 'Tawod’s Riyadh location';
      frame.className = 'en-map-frame';
      frame.loading = 'lazy';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      loadButton.replaceWith(frame);
    });
  });
  var footerPhone = window.matchMedia('(max-width: 767px)');
  function updateFooter() {
    document.querySelectorAll('.contracting-footer-group').forEach(function (group) {
      group.open = !footerPhone.matches;
    });
  }
  updateFooter();
  footerPhone.addEventListener('change', updateFooter);
  var header = document.getElementById('header');
  function updateHeader() { header.classList.toggle('scrolled', window.scrollY > 24); }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
})();
