/* Tawod shared interactions for inner pages and blog. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function q(selector, context) {
    return (context || document).querySelector(selector);
  }

  function qa(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  function menuIcon() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  }

  function closeIcon() {
    return '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  }

  function fixCustomerFacingCopy() {
    if (!/^\/blog\/?$/.test(window.location.pathname)) return;
    qa('.blog-section-title').forEach(function (section) {
      var heading = q('h2', section);
      var paragraph = q('p', section);
      if (heading && /السيو|SEO/i.test(heading.textContent)) {
        heading.textContent = 'أدلة عملية لاتخاذ قرارات أفضل في البناء والتشطيب';
      }
      if (paragraph && /كلمات البحث|تستهدف/i.test(paragraph.textContent)) {
        paragraph.textContent = 'مجموعة من الأدلة المتخصصة التي تساعدك على فهم مراحل تسليم المفتاح، وتشطيب الفلل والشقق، وتقدير التكلفة، وتجنب أخطاء التنفيذ قبل بدء مشروعك في الرياض.';
      }
    });
  }

  function setupLanguageLinks() {
    var englishUrl = '/en/';
    qa('.lang-switch a, a[aria-label*="English"], a[data-language="en"]').forEach(function (link) {
      var label = (link.textContent || '').trim().toUpperCase();
      if (label === 'EN' || /English/i.test(link.getAttribute('aria-label') || '')) {
        link.href = englishUrl;
        link.setAttribute('aria-label', 'English version');
      }
    });

    var actions = q('.header-actions');
    if (actions && !q('[data-language="en"]', actions) && !q('.lang-switch', actions)) {
      var language = document.createElement('a');
      language.href = englishUrl;
      language.dataset.language = 'en';
      language.className = 'lang-switch-link';
      language.textContent = 'EN';
      language.setAttribute('aria-label', 'English version');
      actions.insertBefore(language, actions.firstChild);
    }

    var sidebar = q('.sidebar-nav');
    if (sidebar && !q('[data-language="en"]', sidebar)) {
      var sidebarEnglish = document.createElement('a');
      sidebarEnglish.href = englishUrl;
      sidebarEnglish.dataset.language = 'en';
      sidebarEnglish.textContent = 'English';
      sidebar.appendChild(sidebarEnglish);
    }
  }

  function setupMenu() {
    var button = q('#menuBtn');
    var closeButton = q('#closeSidebar');
    var sidebar = q('#mobileSidebar');
    var overlay = q('#sidebarOverlay');

    if (button) {
      button.innerHTML = menuIcon();
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', button.getAttribute('aria-label') || 'فتح قائمة التنقل');
    }
    if (closeButton) closeButton.innerHTML = closeIcon();

    function open() {
      if (!sidebar || !overlay) return;
      sidebar.classList.add('active', 'open', 'show');
      overlay.classList.add('active', 'open', 'show');
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      if (button) button.setAttribute('aria-expanded', 'true');
      if (closeButton) closeButton.focus();
    }

    function close(returnFocus) {
      if (sidebar) sidebar.classList.remove('active', 'open', 'show');
      if (overlay) overlay.classList.remove('active', 'open', 'show');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      if (button) button.setAttribute('aria-expanded', 'false');
      if (returnFocus && button) button.focus();
    }

    if (button) button.addEventListener('click', open);
    if (closeButton) closeButton.addEventListener('click', function () { close(true); });
    if (overlay) overlay.addEventListener('click', function () { close(true); });
    qa('.mobile-sidebar a').forEach(function (link) {
      link.addEventListener('click', function () { close(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close(true);
    });
  }

  function setupFaq() {
    qa('.faq-question').forEach(function (button) {
      if (button.dataset.faqReady) return;
      button.dataset.faqReady = 'true';
      button.addEventListener('click', function () {
        var item = button.closest('.faq-item');
        var answer = item && q('.faq-answer', item);
        if (!item || !answer) return;
        var wasOpen = item.classList.contains('active');

        qa('.faq-item.active').forEach(function (openItem) {
          openItem.classList.remove('active');
          var openButton = q('.faq-question', openItem);
          var openAnswer = q('.faq-answer', openItem);
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

  function setupReveal() {
    var elements = qa('.reveal-up,.reveal,[data-reveal]');
    if (!elements.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      elements.forEach(function (element) { element.classList.add('active', 'visible', 'in-view', 'revealed', 'show'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries, instance) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });
    elements.forEach(function (element) { observer.observe(element); });
  }

  function enhanceArticle() {
    var content = q('.article-content');
    var hero = q('.article-hero');
    if (!content || !hero) return;
    document.body.classList.add('tawod-article-page');

    var words = (content.innerText || '').trim().split(/\s+/).filter(Boolean).length;
    var minutes = Math.max(3, Math.ceil(words / 180));
    var reading = q('[data-reading-time]');
    if (reading) reading.innerHTML = '<i class="fa-regular fa-clock"></i> ' + minutes + ' دقائق قراءة';

    var cover = q(':scope > img', content);
    if (cover && !cover.closest('figure')) {
      var figure = document.createElement('figure');
      figure.className = 'article-cover-figure';
      cover.parentNode.insertBefore(figure, cover);
      figure.appendChild(cover);
      var caption = document.createElement('figcaption');
      caption.textContent = cover.alt || 'صورة توضيحية من مجال أعمال شركة تعاود للمقاولات';
      figure.appendChild(caption);
    }

    if (!q('.article-byline', content)) {
      var byline = document.createElement('div');
      byline.className = 'article-byline';
      byline.innerHTML = '<div class="article-byline-author"><span class="article-byline-logo"><img src="../../images/logo/tawod-logo.png" alt="شركة تعاود للمقاولات"></span><span class="article-byline-copy"><strong>إعداد فريق تعاود للمقاولات</strong><span>محتوى هندسي وتوعوي للمشاريع السكنية والتجارية في الرياض</span></span></div><span class="article-byline-badge"><i class="fa-solid fa-circle-check"></i> محتوى مراجع</span>';
      content.insertBefore(byline, content.firstChild);
    }
  }

  function setupTools() {
    var share = q('[data-share-article]');
    var print = q('[data-print-article]');
    var whatsapp = q('[data-whatsapp-share]');
    if (whatsapp) whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(document.title + ' ' + location.href);
    if (share) share.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: document.title, url: location.href }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          share.textContent = 'تم نسخ الرابط';
        });
      }
    });
    if (print) print.addEventListener('click', function () { window.print(); });
  }

  function improveMedia() {
    qa('img').forEach(function (image, index) {
      image.decoding = 'async';
      if (index > 0 && !image.hasAttribute('loading')) image.loading = 'lazy';
    });
    qa('iframe').forEach(function (frame) {
      if (!frame.hasAttribute('loading')) frame.loading = 'lazy';
      if (!frame.title) frame.title = 'محتوى مضمّن من شركة تعاود للمقاولات';
    });
  }

  function secureLinks() {
    qa('a[target="_blank"]').forEach(function (link) {
      var rel = (link.rel || '').split(/\s+/).filter(Boolean);
      ['noopener', 'noreferrer'].forEach(function (value) {
        if (rel.indexOf(value) < 0) rel.push(value);
      });
      link.rel = rel.join(' ');
    });
  }

  function removeMobileBar() {
    qa('.mobile-action-bar').forEach(function (bar) { bar.remove(); });
    document.body.classList.add('no-mobile-action-bar');
  }

  function trackContacts() {
    qa('a[href^="tel:"],a[href*="wa.me"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'contact_click', { link_url: link.href, page_path: location.pathname, transport_type: 'beacon' });
        }
      });
    });
  }

  ready(function () {
    fixCustomerFacingCopy();
    setupLanguageLinks();
    setupMenu();
    setupFaq();
    setupReveal();
    enhanceArticle();
    setupTools();
    improveMedia();
    secureLinks();
    removeMobileBar();
    trackContacts();
    document.documentElement.classList.add('tawod-polished', 'tawod-system-ready');
  });
})();
