/* Tawod homepage interactions */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback);
    else callback();
  }

  function menuIcon() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  }

  function closeIcon() {
    return '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  }

  function setupLanguageLinks() {
    var englishUrl = '/en/';
    document.querySelectorAll('.lang-switch a, a[aria-label*="English"], a[data-language="en"]').forEach(function (link) {
      var label = (link.textContent || '').trim().toUpperCase();
      if (label === 'EN' || /English/i.test(link.getAttribute('aria-label') || '')) {
        link.href = englishUrl;
        link.setAttribute('aria-label', 'English version');
      }
    });

    var sidebar = document.querySelector('.sidebar-nav');
    if (sidebar && !sidebar.querySelector('[data-language="en"]')) {
      var englishLink = document.createElement('a');
      englishLink.href = englishUrl;
      englishLink.dataset.language = 'en';
      englishLink.textContent = 'English';
      sidebar.appendChild(englishLink);
    }
  }

  ready(function () {
    var header = document.getElementById('header');
    var menuBtn = document.getElementById('menuBtn');
    var mobileSidebar = document.getElementById('mobileSidebar');
    var closeSidebar = document.getElementById('closeSidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a');

    if (menuBtn) {
      menuBtn.innerHTML = menuIcon();
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (closeSidebar) closeSidebar.innerHTML = closeIcon();
    setupLanguageLinks();

    var headerTicking = false;
    var headerIsScrolled = null;

    function updateHeaderState() {
      if (!header) return;
      var nextState = window.pageYOffset > 20;
      if (nextState !== headerIsScrolled) {
        header.classList.toggle('scrolled', nextState);
        headerIsScrolled = nextState;
      }
      headerTicking = false;
    }

    function requestHeaderState() {
      if (headerTicking) return;
      headerTicking = true;
      window.requestAnimationFrame(updateHeaderState);
    }

    requestHeaderState();
    window.addEventListener('scroll', requestHeaderState, { passive: true });

    function openMenu() {
      if (!mobileSidebar || !sidebarOverlay) return;
      mobileSidebar.inert = false;
      mobileSidebar.setAttribute('aria-hidden', 'false');
      mobileSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
      if (closeSidebar) closeSidebar.focus();
    }

    function closeMenu(returnFocus) {
      if (!mobileSidebar || !sidebarOverlay) return;
      mobileSidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      mobileSidebar.setAttribute('aria-hidden', 'true');
      mobileSidebar.inert = true;
      if (returnFocus && menuBtn) menuBtn.focus();
    }

    if (menuBtn) menuBtn.addEventListener('click', openMenu);
    if (closeSidebar) closeSidebar.addEventListener('click', function () { closeMenu(true); });
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', function () { closeMenu(true); });

    sidebarLinks.forEach(function (link) {
      link.addEventListener('click', function () { closeMenu(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mobileSidebar && mobileSidebar.classList.contains('active')) closeMenu(true);
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
      revealElements.forEach(function (element) { revealObserver.observe(element); });
    } else {
      revealElements.forEach(function (element) { element.classList.add('active'); });
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
      if (!link || typeof window.gtag !== 'function') return;
      var href = link.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) {
        window.gtag('event', 'conversion', { send_to: 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE' });
        window.gtag('event', 'tawod_call_click', { event_category: 'qualified_ads_lead', event_label: document.title, page_path: window.location.pathname, transport_type: 'beacon' });
      }
      if (href.indexOf('wa.me/') !== -1) {
        window.gtag('event', 'conversion', { send_to: 'AW-18266173285/qi4gCLu5lsUcEOXe_oVE' });
        window.gtag('event', 'tawod_whatsapp_click', { event_category: 'qualified_ads_lead', event_label: document.title, page_path: window.location.pathname, transport_type: 'beacon' });
      }
    });
  });
})();
