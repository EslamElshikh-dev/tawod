/* Tawod shared interactions only. Content, FAQ and schema are static HTML. */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback);
    else callback();
  }

  function setupRevealElements() {
    var elements = document.querySelectorAll('.reveal-up, .reveal, [data-reveal]');
    if (!elements.length) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(function (element) {
        element.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
      });
      return;
    }
    elements.forEach(function (element) { element.classList.add('tawod-reveal-pending'); });
    var observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('tawod-reveal-pending');
        entry.target.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });
    elements.forEach(function (element) { observer.observe(element); });
    window.setTimeout(function () {
      elements.forEach(function (element) {
        element.classList.remove('tawod-reveal-pending');
        element.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
      });
    }, 1600);
  }

  function setupMobileMenu() {
    var menuButton = document.getElementById('menuBtn');
    var closeButton = document.getElementById('closeSidebar');
    var sidebar = document.getElementById('mobileSidebar');
    var overlay = document.getElementById('sidebarOverlay');

    function openMenu() {
      if (sidebar) sidebar.classList.add('active', 'open', 'show');
      if (overlay) overlay.classList.add('active', 'open', 'show');
      document.body.classList.add('menu-open');
      if (menuButton) menuButton.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      if (sidebar) sidebar.classList.remove('active', 'open', 'show');
      if (overlay) overlay.classList.remove('active', 'open', 'show');
      document.body.classList.remove('menu-open');
      if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
    }

    if (menuButton) {
      menuButton.setAttribute('aria-expanded', 'false');
      if (!menuButton.getAttribute('aria-label')) menuButton.setAttribute('aria-label', 'فتح قائمة التنقل');
      menuButton.addEventListener('click', openMenu);
      menuButton.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMenu();
        }
      });
    }
    if (closeButton) {
      if (!closeButton.getAttribute('aria-label')) closeButton.setAttribute('aria-label', 'إغلاق قائمة التنقل');
      closeButton.addEventListener('click', closeMenu);
    }
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
    document.querySelectorAll('.mobile-sidebar a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  }

  function setupFaqAccordions() {
    document.querySelectorAll('.faq-question').forEach(function (button) {
      if (button.dataset.faqReady === 'true') return;
      button.dataset.faqReady = 'true';
      button.addEventListener('click', function () {
        var item = button.closest('.faq-item');
        var answer = item ? item.querySelector('.faq-answer') : null;
        if (!item || !answer) return;
        var wasOpen = item.classList.contains('active');
        document.querySelectorAll('.faq-item.active').forEach(function (openItem) {
          openItem.classList.remove('active');
          var openButton = openItem.querySelector('.faq-question');
          var openAnswer = openItem.querySelector('.faq-answer');
          if (openButton) openButton.setAttribute('aria-expanded', 'false');
          if (openAnswer) openAnswer.style.maxHeight = '';
        });
        if (!wasOpen) {
          item.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  function setupReadingProgress() {
    var article = document.querySelector('.article-content');
    if (!article) return;
    var progress = document.querySelector('.tawod-reading-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'tawod-reading-progress';
      progress.setAttribute('aria-hidden', 'true');
      progress.innerHTML = '<span></span>';
      document.body.insertBefore(progress, document.body.firstChild);
    }
    var fill = progress.querySelector('span');
    if (!fill) return;
    function update() {
      var rect = article.getBoundingClientRect();
      var total = Math.max(1, article.offsetHeight - window.innerHeight * 0.55);
      var read = Math.min(total, Math.max(0, -rect.top + window.innerHeight * 0.35));
      fill.style.transform = 'scaleX(' + (read / total) + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function setupArticleTools() {
    var shareButton = document.querySelector('[data-share-article]');
    var printButton = document.querySelector('[data-print-article]');
    var whatsappLink = document.querySelector('[data-whatsapp-share]');
    if (whatsappLink) {
      whatsappLink.href = 'https://wa.me/?text=' + encodeURIComponent(document.title + ' ' + window.location.href);
    }
    if (shareButton) {
      shareButton.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({ title: document.title, url: window.location.href }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(window.location.href).then(function () {
            shareButton.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> تم نسخ الرابط';
          }).catch(function () {});
        }
      });
    }
    if (printButton) printButton.addEventListener('click', function () { window.print(); });
  }

  function improveMediaLoading() {
    document.querySelectorAll('img').forEach(function (image, index) {
      image.decoding = 'async';
      if (index > 0 && !image.hasAttribute('loading')) image.loading = 'lazy';
    });
    document.querySelectorAll('iframe').forEach(function (frame) {
      if (!frame.hasAttribute('loading')) frame.loading = 'lazy';
      if (!frame.getAttribute('title')) frame.title = 'محتوى مضمّن من شركة تعاود للمقاولات';
    });
  }

  function secureExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      var values = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      ['noopener', 'noreferrer'].forEach(function (value) {
        if (values.indexOf(value) === -1) values.push(value);
      });
      link.setAttribute('rel', values.join(' '));
    });
  }

  function removeMobileActionBar() {
    document.querySelectorAll('.mobile-action-bar').forEach(function (bar) { bar.remove(); });
    document.body.classList.add('no-mobile-action-bar');
  }

  function trackContactClicks() {
    document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'contact_click', {
            link_url: link.href,
            page_path: window.location.pathname,
            transport_type: 'beacon'
          });
        }
      });
    });
  }

  ready(function () {
    removeMobileActionBar();
    setupMobileMenu();
    setupFaqAccordions();
    setupReadingProgress();
    setupArticleTools();
    setupRevealElements();
    improveMediaLoading();
    secureExternalLinks();
    trackContactClicks();
    document.documentElement.classList.add('tawod-polished', 'tawod-system-ready');
  });
})();
