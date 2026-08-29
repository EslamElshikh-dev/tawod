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

  function removeLanguageControls() {
    qa('.lang-switch, .lang-switch-link, [data-language="en"], a[aria-label*="English"]').forEach(function (element) {
      element.remove();
    });
  }

  function setupHeaderServicesMenu() {
    var services = [
      { href: '/service-construction.html', label: 'البناء والإنشاءات', detail: 'الهياكل والأعمال الإنشائية' },
      { href: '/service-turnkey.html', label: 'تسليم مفتاح', detail: 'من التخطيط حتى التسليم' },
      { href: '/service-restoration.html', label: 'الترميم والتجديد', detail: 'معالجة المباني ورفع كفاءتها' },
      { href: '/service-finishing.html', label: 'التشطيبات العامة', detail: 'تشطيبات داخلية وخارجية' },
      { href: '/service-decor.html', label: 'الديكور والتصميم الداخلي', detail: 'تصميم وتنفيذ المساحات' },
      { href: '/service-mep.html', label: 'الكهرباء والسباكة', detail: 'حلول فنية متكاملة' }
    ];
    var currentFile = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';

    function isServicesLink(link) {
      var href = (link && link.getAttribute('href')) || '';
      return href === '#services' || /(?:^|\/)index\.html#services$/i.test(href) || /\/#services$/i.test(href);
    }

    function createServiceLink(service, index, mobile) {
      var link = document.createElement('a');
      var label = document.createElement('span');
      var number = document.createElement('span');
      link.href = service.href;
      link.className = mobile ? 'sidebar-service-link' : 'nav-service-link';
      number.className = 'nav-service-number';
      number.textContent = String(index + 1).padStart(2, '0');
      label.className = 'nav-service-copy';
      label.innerHTML = '<strong>' + service.label + '</strong>' + (mobile ? '' : '<small>' + service.detail + '</small>');
      link.appendChild(number);
      link.appendChild(label);
      if (currentFile === service.href.slice(1)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
      return link;
    }

    var desktopLink = qa('.nav-links > li > a').find(isServicesLink);
    if (desktopLink && !desktopLink.dataset.servicesMenuReady) {
      var desktopItem = desktopLink.closest('li');
      var desktopMenu = document.createElement('ul');
      var desktopToggle = document.createElement('button');
      var desktopMenuId = 'header-services-menu';

      desktopLink.dataset.servicesMenuReady = 'true';
      desktopLink.classList.add('nav-services-main-link');
      desktopItem.classList.add('nav-services-item');
      desktopMenu.id = desktopMenuId;
      desktopMenu.className = 'nav-services-dropdown';
      desktopMenu.setAttribute('aria-label', 'خدمات شركة تعاود');
      services.forEach(function (service, index) {
        var item = document.createElement('li');
        item.appendChild(createServiceLink(service, index, false));
        desktopMenu.appendChild(item);
      });

      desktopToggle.type = 'button';
      desktopToggle.className = 'nav-services-toggle';
      desktopToggle.setAttribute('aria-label', 'عرض قائمة الخدمات');
      desktopToggle.setAttribute('aria-controls', desktopMenuId);
      desktopToggle.setAttribute('aria-haspopup', 'true');
      desktopToggle.setAttribute('aria-expanded', 'false');
      desktopToggle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      desktopLink.insertAdjacentElement('afterend', desktopToggle);
      desktopItem.appendChild(desktopMenu);

      function setDesktopOpen(open) {
        desktopItem.classList.toggle('is-open', open);
        desktopToggle.setAttribute('aria-expanded', String(open));
      }

      desktopToggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setDesktopOpen(!desktopItem.classList.contains('is-open'));
      });
      desktopItem.addEventListener('mouseenter', function () { desktopToggle.setAttribute('aria-expanded', 'true'); });
      desktopItem.addEventListener('mouseleave', function () {
        if (!desktopItem.classList.contains('is-open')) desktopToggle.setAttribute('aria-expanded', 'false');
      });
      desktopItem.addEventListener('focusin', function () { desktopToggle.setAttribute('aria-expanded', 'true'); });
      desktopItem.addEventListener('focusout', function () {
        window.setTimeout(function () {
          if (!desktopItem.contains(document.activeElement)) setDesktopOpen(false);
        }, 0);
      });
      document.addEventListener('pointerdown', function (event) {
        if (!desktopItem.contains(event.target)) setDesktopOpen(false);
      });
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' || !desktopItem.contains(document.activeElement)) return;
        setDesktopOpen(false);
        desktopToggle.focus();
      });

      if (/^service-[a-z-]+\.html$/i.test(currentFile)) desktopLink.classList.add('active');
    }

    var mobileLink = qa('.sidebar-nav > a').find(isServicesLink);
    if (mobileLink && !mobileLink.dataset.servicesMenuReady) {
      var mobileWrap = document.createElement('div');
      var mobileRow = document.createElement('div');
      var mobileToggle = document.createElement('button');
      var mobileMenu = document.createElement('div');
      var mobileList = document.createElement('div');
      var mobileMenuId = 'sidebar-services-menu';
      var existingIcon = q('i', mobileLink);

      mobileLink.dataset.servicesMenuReady = 'true';
      mobileLink.classList.add('sidebar-services-main-link');
      if (existingIcon) existingIcon.remove();
      mobileWrap.className = 'sidebar-services';
      mobileRow.className = 'sidebar-services-row';
      mobileToggle.type = 'button';
      mobileToggle.className = 'sidebar-services-toggle';
      mobileToggle.setAttribute('aria-label', 'عرض قائمة الخدمات');
      mobileToggle.setAttribute('aria-controls', mobileMenuId);
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      mobileMenu.id = mobileMenuId;
      mobileMenu.className = 'sidebar-services-menu';
      mobileList.className = 'sidebar-services-list';
      services.forEach(function (service, index) {
        mobileList.appendChild(createServiceLink(service, index, true));
      });
      mobileMenu.appendChild(mobileList);
      mobileLink.parentNode.insertBefore(mobileWrap, mobileLink);
      mobileRow.appendChild(mobileLink);
      mobileRow.appendChild(mobileToggle);
      mobileWrap.appendChild(mobileRow);
      mobileWrap.appendChild(mobileMenu);

      function setMobileServicesOpen(open) {
        mobileWrap.classList.toggle('is-open', open);
        mobileToggle.setAttribute('aria-expanded', String(open));
      }

      mobileToggle.addEventListener('click', function () {
        setMobileServicesOpen(!mobileWrap.classList.contains('is-open'));
      });
      if (/^service-[a-z-]+\.html$/i.test(currentFile)) {
        mobileLink.classList.add('active');
        setMobileServicesOpen(true);
      }
    }

    document.documentElement.classList.add('tawod-services-nav-ready');
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
        paragraph.textContent = 'مجموعة من الأدلة المتخصصة التي تساعدك على فهم مراحل تسليم المفتاح وتشطيب الفلل والشقق وتقدير التكلفة وتجنب أخطاء التنفيذ قبل بدء مشروعك.';
      }
    });
  }

  function cleanDammamCustomerCopy() {
    if (!/^\/dammam(?:\/|$)/.test(window.location.pathname)) return;

    qa('.faq-item').forEach(function (item) {
      var text = item.textContent;
      if (
        text.indexOf('هل لديكم فرع') !== -1 ||
        text.indexOf('هل صفحة الدمام تمثل فرع') !== -1 ||
        text.indexOf('هل يوجد عنوان استقبال عملاء') !== -1
      ) {
        item.remove();
      }
    });

    qa('.contact-card').forEach(function (card) {
      var text = card.textContent;
      if (
        text.indexOf('نطاق الخدمة') !== -1 ||
        text.indexOf('بدون عرض عنوان فرع') !== -1
      ) {
        card.remove();
      }
    });

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

  function setupMenu() {
    var button = q('#menuBtn');
    var closeButton = q('#closeSidebar');
    var sidebar = q('#mobileSidebar');
    var overlay = q('#sidebarOverlay');

    if (button && !button.dataset.menuIconReady) {
      button.innerHTML = menuIcon();
      button.dataset.menuIconReady = 'true';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', button.getAttribute('aria-label') || 'فتح قائمة التنقل');
    }
    if (closeButton && !closeButton.dataset.menuIconReady) {
      closeButton.innerHTML = closeIcon();
      closeButton.dataset.menuIconReady = 'true';
    }

    function open() {
      if (!sidebar || !overlay) return;
      sidebar.inert = false;
      sidebar.setAttribute('aria-hidden', 'false');
      sidebar.classList.add('active', 'open', 'show');
      overlay.classList.add('active', 'open', 'show');
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      if (button) button.setAttribute('aria-expanded', 'true');
      if (closeButton && typeof closeButton.focus === 'function') closeButton.focus();
    }

    function close(returnFocus) {
      if (sidebar) {
        sidebar.classList.remove('active', 'open', 'show');
        sidebar.setAttribute('aria-hidden', 'true');
        sidebar.inert = true;
      }
      if (overlay) overlay.classList.remove('active', 'open', 'show');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      if (button) button.setAttribute('aria-expanded', 'false');
      if (returnFocus && button) button.focus();
    }

    if (button && !button.dataset.menuReady) {
      button.dataset.menuReady = 'true';
      button.addEventListener('click', open);
    }
    if (closeButton && !closeButton.dataset.menuReady) {
      closeButton.dataset.menuReady = 'true';
      closeButton.addEventListener('click', function () { close(true); });
    }
    if (overlay && !overlay.dataset.menuReady) {
      overlay.dataset.menuReady = 'true';
      overlay.addEventListener('click', function () { close(true); });
    }
    qa('.mobile-sidebar a').forEach(function (link) {
      if (link.dataset.menuReady) return;
      link.dataset.menuReady = 'true';
      link.addEventListener('click', function () { close(false); });
    });
    if (!document.documentElement.dataset.menuEscapeReady) {
      document.documentElement.dataset.menuEscapeReady = 'true';
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') close(true);
      });
    }
  }

  function setupHeaderScrollState() {
    var header = q('#header');
    if (!header || header.dataset.scrollStateReady) return;
    var ticking = false;
    var isScrolled = null;

    header.dataset.scrollStateReady = 'true';

    function update() {
      var nextState = window.pageYOffset > 20;
      if (nextState !== isScrolled) {
        header.classList.toggle('scrolled', nextState);
        isScrolled = nextState;
      }
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
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
    function show(element) {
      element.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      elements.forEach(show);
      return;
    }
    elements = elements.filter(function (element) {
      var criticalArticleContent = element.classList.contains('article-content');
      var tallerThanViewport = element.getBoundingClientRect().height > window.innerHeight;
      if (!criticalArticleContent && !tallerThanViewport) return true;
      show(element);
      return false;
    });
    if (!elements.length) return;
    var observer = new IntersectionObserver(function (entries, instance) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -18px 0px' });
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
      byline.innerHTML = '<div class="article-byline-author"><span class="article-byline-logo"><img src="/images/logo/tawod-logo.png" alt="شركة تعاود للمقاولات"></span><span class="article-byline-copy"><strong>إعداد فريق تعاود للمقاولات</strong><span>محتوى هندسي وتوعوي للمشاريع السكنية والتجارية</span></span></div><span class="article-byline-badge"><i class="fa-solid fa-circle-check"></i> محتوى مراجع</span>';
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

  ready(function () {
    fixCustomerFacingCopy();
    cleanDammamCustomerCopy();
    removeLanguageControls();
    setupHeaderServicesMenu();
    setupHeaderScrollState();
    setupMenu();
    setupFaq();
    setupReveal();
    enhanceArticle();
    setupTools();
    improveMedia();
    secureLinks();
    removeMobileBar();
    document.documentElement.classList.add('tawod-polished', 'tawod-system-ready');
  });
})();

/* Featured real project: Al Orouba mosque + two villas. */
(function () {
  'use strict';
  function addProject() {
    if (!/^\/projects(?:\.html)?\/?$/.test(window.location.pathname)) return;
    var grid = document.querySelector('.projects-grid');
    if (!grid || grid.querySelector('[data-project="arouba-mosque-villas"]')) return;
    var card = document.createElement('article');
    card.className = 'project-card reveal-up active visible in-view revealed show';
    card.setAttribute('data-project', 'arouba-mosque-villas');
    card.innerHTML = '<div class="card-img-wrap"><img class="card-img" src="images/projects/arouba-mosque-villas-01.webp" width="420" height="560" loading="eager" decoding="async" alt="مشروع مسجد وفللتين سكنيتين تسليم مفتاح في حي العروبة - شركة تعاود للمقاولات"></div><div class="card-body"><div class="project-meta"><span>حي العروبة</span><span>تسليم مفتاح</span></div><h3>مسجد وفللتان سكنيتان</h3><p>تنفيذ تسليم مفتاح كامل بمساحة 1800 م² خلال مدة تنفيذ 12 شهرًا.</p><a class="card-link" href="project-arouba-mosque-villas.html">تفاصيل المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>';
    grid.insertBefore(card, grid.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addProject);
  else addProject();
})();
