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

    var statsSection = document.getElementById('stats');
    var counters = document.querySelectorAll('.stat-number');
    var hasCounted = false;

    function formatCounter(target) {
      if (target === 24) return '24/7';
      if (target === 100) return '100%';
      if (target === 15 || target === 500) return target + '+';
      return String(target);
    }

    function runCounters() {
      if (hasCounted) return;
      hasCounted = true;
      counters.forEach(function (counter) {
        var target = Number(counter.getAttribute('data-target')) || 0;
        var current = 0;
        var steps = 70;
        var increment = Math.max(target / steps, 1);

        function tick() {
          current += increment;
          if (current < target) {
            counter.textContent = String(Math.ceil(current));
            window.setTimeout(tick, 18);
          } else {
            counter.textContent = formatCounter(target);
          }
        }

        tick();
      });
    }

    if (statsSection && counters.length && 'IntersectionObserver' in window) {
      var countObserver = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) runCounters();
      }, { threshold: 0.35 });
      countObserver.observe(statsSection);
    } else if (counters.length) {
      runCounters();
    }

    document.querySelectorAll('.faq-question').forEach(function (button) {
      button.addEventListener('click', function () {
        var faqItem = button.closest('.faq-item');
        var faqAnswer = faqItem ? faqItem.querySelector('.faq-answer') : null;
        if (!faqItem || !faqAnswer) return;

        document.querySelectorAll('.faq-item.active').forEach(function (item) {
          if (item !== faqItem) {
            item.classList.remove('active');
            var answer = item.querySelector('.faq-answer');
            if (answer) answer.style.maxHeight = null;
          }
        });

        faqItem.classList.toggle('active');
        faqAnswer.style.maxHeight = faqItem.classList.contains('active') ? faqAnswer.scrollHeight + 'px' : null;
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
