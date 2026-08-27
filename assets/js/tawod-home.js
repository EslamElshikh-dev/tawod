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

  function removeLanguageControls() {
    document.querySelectorAll('.lang-switch, .lang-switch-link, [data-language="en"], a[aria-label*="English"]').forEach(function (element) {
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

    var desktopLink = Array.from(document.querySelectorAll('.nav-links > li > a')).find(isServicesLink);
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

    var mobileLink = Array.from(document.querySelectorAll('.sidebar-nav > a')).find(isServicesLink);
    if (mobileLink && !mobileLink.dataset.servicesMenuReady) {
      var mobileWrap = document.createElement('div');
      var mobileRow = document.createElement('div');
      var mobileToggle = document.createElement('button');
      var mobileMenu = document.createElement('div');
      var mobileList = document.createElement('div');
      var mobileMenuId = 'sidebar-services-menu';
      var existingIcon = mobileLink.querySelector('i');

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

  ready(function () {
    setupHeaderServicesMenu();
    var header = document.getElementById('header');
    var menuBtn = document.getElementById('menuBtn');
    var mobileSidebar = document.getElementById('mobileSidebar');
    var closeSidebar = document.getElementById('closeSidebar');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a');

    removeLanguageControls();
    if (menuBtn && !menuBtn.dataset.menuIconReady) {
      menuBtn.innerHTML = menuIcon();
      menuBtn.dataset.menuIconReady = 'true';
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (closeSidebar && !closeSidebar.dataset.menuIconReady) {
      closeSidebar.innerHTML = closeIcon();
      closeSidebar.dataset.menuIconReady = 'true';
    }

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
      mobileSidebar.classList.add('active', 'open', 'show');
      sidebarOverlay.classList.add('active', 'open', 'show');
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
      if (closeSidebar && typeof closeSidebar.focus === 'function') closeSidebar.focus();
    }

    function closeMenu(returnFocus) {
      if (!mobileSidebar || !sidebarOverlay) return;
      mobileSidebar.classList.remove('active', 'open', 'show');
      sidebarOverlay.classList.remove('active', 'open', 'show');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
      mobileSidebar.setAttribute('aria-hidden', 'true');
      mobileSidebar.inert = true;
      if (returnFocus && menuBtn) menuBtn.focus();
    }

    if (menuBtn && !menuBtn.dataset.menuReady) {
      menuBtn.dataset.menuReady = 'true';
      menuBtn.addEventListener('click', openMenu);
    }
    if (closeSidebar && !closeSidebar.dataset.menuReady) {
      closeSidebar.dataset.menuReady = 'true';
      closeSidebar.addEventListener('click', function () { closeMenu(true); });
    }
    if (sidebarOverlay && !sidebarOverlay.dataset.menuReady) {
      sidebarOverlay.dataset.menuReady = 'true';
      sidebarOverlay.addEventListener('click', function () { closeMenu(true); });
    }

    sidebarLinks.forEach(function (link) {
      if (link.dataset.menuReady) return;
      link.dataset.menuReady = 'true';
      link.addEventListener('click', function () { closeMenu(false); });
    });

    var sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"], .sidebar-nav a[href^="#"]'));
    var homeLinks = Array.from(document.querySelectorAll('.nav-links a[href="index.html"], .sidebar-nav a[href="index.html"]'));
    var sectionTargets = Array.from(new Set(sectionLinks.map(function (link) {
      return link.getAttribute('href').slice(1);
    }))).map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);
    var navigationTicking = false;
    var geometryTicking = false;
    var navigationHeaderHeight = 88;
    var sectionPositions = [];

    function refreshNavigationGeometry() {
      navigationHeaderHeight = header ? header.offsetHeight : 88;
      sectionPositions = sectionTargets.map(function (target) {
        return { id: target.id, top: target.offsetTop };
      });
      geometryTicking = false;
    }

    function requestNavigationGeometry() {
      if (geometryTicking) return;
      geometryTicking = true;
      window.requestAnimationFrame(function () {
        refreshNavigationGeometry();
        requestNavigationState();
      });
    }

    function setActiveNavigation(activeId) {
      sectionLinks.concat(homeLinks).forEach(function (link) {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });
      var activeLinks = activeId
        ? sectionLinks.filter(function (link) { return link.getAttribute('href') === '#' + activeId; })
        : homeLinks;
      activeLinks.forEach(function (link) {
        link.classList.add('active');
        link.setAttribute('aria-current', activeId ? 'location' : 'page');
      });
    }

    function updateNavigationState() {
      var marker = window.scrollY + navigationHeaderHeight + 120;
      var activeId = '';
      sectionPositions.forEach(function (section) {
        if (section.top <= marker) activeId = section.id;
      });
      if (window.scrollY < 260) activeId = '';
      setActiveNavigation(activeId);
      navigationTicking = false;
    }

    function requestNavigationState() {
      if (navigationTicking) return;
      navigationTicking = true;
      window.requestAnimationFrame(updateNavigationState);
    }

    requestNavigationGeometry();
    window.addEventListener('scroll', requestNavigationState, { passive: true });
    window.addEventListener('hashchange', requestNavigationState);
    window.addEventListener('resize', requestNavigationGeometry, { passive: true });
    window.addEventListener('load', requestNavigationGeometry, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(requestNavigationGeometry).catch(function () {});
    }

    if (!document.documentElement.dataset.menuEscapeReady) {
      document.documentElement.dataset.menuEscapeReady = 'true';
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && mobileSidebar && mobileSidebar.classList.contains('active')) closeMenu(true);
      });
    }

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
      if (button.dataset.faqReady) return;
      button.dataset.faqReady = 'true';
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

  });
})();
