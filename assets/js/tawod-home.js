/* Tawod homepage interactions */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  ready(function () {
    var header = document.getElementById('header');
    var menuBtn = document.getElementById('menuBtn');
    var mobileSidebar = document.getElementById('mobileSidebar');
    var closeSidebar = document.getElementById('closeSidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a');

    function setHeaderState() {
      if (!header) return;
      header.classList.toggle('scrolled', window.scrollY > 20);
    }

    setHeaderState();
    window.addEventListener('scroll', setHeaderState, { passive: true });

    function openMenu() {
      if (!mobileSidebar || !sidebarOverlay) return;
      mobileSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      menuBtn && menuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      if (!mobileSidebar || !sidebarOverlay) return;
      mobileSidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
      menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
    }

    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.addEventListener('click', openMenu);
      menuBtn.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMenu();
        }
      });
    }

    if (closeSidebar) closeSidebar.addEventListener('click', closeMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMenu);

    sidebarLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    var revealElements = document.querySelectorAll('.reveal-up');
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

      revealElements.forEach(function (element) {
        revealObserver.observe(element);
      });
    } else {
      revealElements.forEach(function (element) {
        element.classList.add('active');
      });
    }

    document.querySelectorAll('.faq-question').forEach(function (button) {
      button.addEventListener('click', function () {
        var faqItem = button.closest('.faq-item');
        var faqAnswer = faqItem ? faqItem.querySelector('.faq-answer') : null;
        if (!faqItem || !faqAnswer) return;

        var isOpen = faqItem.classList.contains('active');

        document.querySelectorAll('.faq-item.active').forEach(function (item) {
          item.classList.remove('active');
          var itemButton = item.querySelector('.faq-question');
          var answer = item.querySelector('.faq-answer');
          if (itemButton) itemButton.setAttribute('aria-expanded', 'false');
          if (answer) answer.style.maxHeight = null;
        });

        if (!isOpen) {
          faqItem.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
          faqAnswer.style.maxHeight = faqAnswer.scrollHeight + 'px';
        }
      });
    });

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      if (typeof window.gtag !== 'function') return;

      if (href.indexOf('tel:') === 0) {
        window.gtag('event', 'conversion', { send_to: 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE' });
        window.gtag('event', 'tawod_call_click', {
          event_category: 'qualified_ads_lead',
          event_label: document.title,
          page_path: window.location.pathname,
          transport_type: 'beacon'
        });
      }

      if (href.indexOf('https://wa.me/') === 0 || href.indexOf('wa.me/') !== -1) {
        window.gtag('event', 'conversion', { send_to: 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE' });
        window.gtag('event', 'tawod_whatsapp_click', {
          event_category: 'qualified_ads_lead',
          event_label: document.title,
          page_path: window.location.pathname,
          transport_type: 'beacon'
        });
      }
    });
  });
})();
