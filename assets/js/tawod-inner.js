/* Shared inner pages interactions for Tawod - safe version */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function showRevealElements() {
    document.querySelectorAll('.reveal-up, .reveal, [data-reveal]').forEach(function (el) {
      el.classList.add('visible', 'active', 'in-view', 'revealed', 'show');
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none';
    });
  }

  function setupMobileMenu() {
    var menuBtn = document.getElementById('menuBtn');
    var closeBtn = document.getElementById('closeSidebar');
    var sidebar = document.getElementById('mobileSidebar');
    var overlay = document.getElementById('sidebarOverlay');

    function openMenu() {
      if (sidebar) sidebar.classList.add('active', 'open', 'show');
      if (overlay) overlay.classList.add('active', 'open', 'show');
      document.body.classList.add('menu-open');
    }

    function closeMenu() {
      if (sidebar) sidebar.classList.remove('active', 'open', 'show');
      if (overlay) overlay.classList.remove('active', 'open', 'show');
      document.body.classList.remove('menu-open');
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', openMenu);
      menuBtn.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') openMenu();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
    document.querySelectorAll('.mobile-sidebar a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  function fixBlogLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      if (/^(https?:|mailto:|tel:|#|\/)/.test(href)) return;
      if (href.indexOf('../') === 0 || href.indexOf('./') === 0) return;
      if (href.indexOf('index.html') !== -1) return;
      if (href.indexOf('/') > -1 && href.slice(-1) === '/') {
        link.setAttribute('href', href + 'index.html');
      }
    });
  }

  function restoreBlogImages() {
    var articleImages = {
      'best-contracting-company-riyadh': '/images/blog/best-contracting-company-riyadh.webp',
      'construction-building-riyadh': '/images/blog/construction-building-riyadh.webp',
      'bone-construction-riyadh-guide': '/images/blog/bone-construction-riyadh-guide.webp',
      'bone-contractor-turnkey-riyadh': '/images/landing/bone-contractor-riyadh.webp',
      'contracting-riyadh-project-guide': '/images/blog/bone-construction-riyadh-guide.webp',
      'finishing-interior-design-riyadh': '/images/blog/finishing-interior-design-riyadh.webp',
      'mechanical-mep-works-riyadh': '/images/blog/mechanical-mep-works-riyadh.webp',
      'electrical-installation-maintenance-riyadh': '/images/blog/electrical-installation-maintenance-riyadh.webp',
      'plumbing-installation-riyadh': '/images/blog/plumbing-installation-riyadh.webp',
      'finishing-facades-restoration-riyadh': '/images/projects/villa-finishing-01.webp',
      'facades-interior-decor-insulation-riyadh': '/images/projects/interior-01.webp',
      'turnkey-construction-riyadh-guide': '/images/landing/bone-contractor-riyadh.webp',
      'turnkey-villa-riyadh': '/images/landing/bone-contractor-riyadh.webp',
      'turnkey-renovation-riyadh': '/images/blog/finishing-interior-design-riyadh.webp',
      'turnkey-commercial-fitout-riyadh': '/images/blog/finishing-interior-design-riyadh.webp',
      'turnkey-contract-checklist-riyadh': '/images/blog/bone-construction-riyadh-guide.webp',
      'finishing-villa-riyadh-guide': '/images/blog/finishing-interior-design-riyadh.webp',
      'finishing-apartment-riyadh': '/images/blog/finishing-interior-design-riyadh.webp',
      'finishing-materials-riyadh': '/images/blog/finishing-interior-design-riyadh.webp',
      'finishing-cost-riyadh': '/images/blog/finishing-interior-design-riyadh.webp',
      'finishing-mistakes-riyadh': '/images/blog/finishing-interior-design-riyadh.webp'
    };

    var parts = window.location.pathname.split('/').filter(Boolean);
    var blogIndex = parts.indexOf('blog');
    var slug = blogIndex > -1 && parts[blogIndex + 1] ? parts[blogIndex + 1] : '';

    if (slug && articleImages[slug]) {
      document.querySelectorAll('.article-content img').forEach(function (img) {
        img.src = articleImages[slug];
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      });
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(function (meta) {
        meta.setAttribute('content', window.location.origin + articleImages[slug]);
      });
    }

    document.querySelectorAll('.article-card').forEach(function (card) {
      var link = card.querySelector('a[href]');
      var img = card.querySelector('img');
      if (!link || !img) return;
      var href = link.getAttribute('href') || '';
      var key = href.replace(/^\.\//, '').replace(/^\//, '').split('/').filter(Boolean)[0];
      if (articleImages[key]) img.src = articleImages[key];
    });
  }

  function trackClicks() {
    document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'contact_click', { link_url: link.href });
        }
      });
    });
  }

  ready(function () {
    showRevealElements();
    setupMobileMenu();
    fixBlogLinks();
    restoreBlogImages();
    trackClicks();
    setTimeout(showRevealElements, 250);
    setTimeout(showRevealElements, 1000);
  });
})();
