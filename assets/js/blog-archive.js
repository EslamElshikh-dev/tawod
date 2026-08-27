(function () {
  "use strict";

  document.documentElement.classList.add("blog-archive-js");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initHeaderScroll() {
    const header = document.getElementById("header");
    if (!header) return;

    let ticking = false;
    function update() {
      header.classList.toggle("scrolled", window.scrollY > 20);
      ticking = false;
    }
    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
  }

  function initServicesMenu() {
    const services = [
      { href: "/service-construction.html", label: "البناء والإنشاءات", detail: "الهياكل والأعمال الإنشائية" },
      { href: "/service-turnkey.html", label: "تسليم مفتاح", detail: "من التخطيط حتى التسليم" },
      { href: "/service-restoration.html", label: "الترميم والتجديد", detail: "معالجة المباني ورفع كفاءتها" },
      { href: "/service-finishing.html", label: "التشطيبات العامة", detail: "تشطيبات داخلية وخارجية" },
      { href: "/service-decor.html", label: "الديكور والتصميم الداخلي", detail: "تصميم وتنفيذ المساحات" },
      { href: "/service-mep.html", label: "الكهرباء والسباكة", detail: "حلول فنية متكاملة" }
    ];

    function isServicesLink(link) {
      const href = (link && link.getAttribute("href")) || "";
      return href === "#services" || /(?:^|\/)index\.html#services$/i.test(href) || /\/#services$/i.test(href);
    }

    function createServiceLink(service, index, mobile) {
      const link = document.createElement("a");
      const number = document.createElement("span");
      const copy = document.createElement("span");
      const title = document.createElement("strong");

      link.href = service.href;
      link.className = mobile ? "sidebar-service-link" : "nav-service-link";
      number.className = "nav-service-number";
      number.textContent = String(index + 1).padStart(2, "0");
      copy.className = "nav-service-copy";
      title.textContent = service.label;
      copy.appendChild(title);

      if (!mobile) {
        const detail = document.createElement("small");
        detail.textContent = service.detail;
        copy.appendChild(detail);
      }

      link.append(number, copy);
      return link;
    }

    const desktopLink = Array.from(document.querySelectorAll(".nav-links > li > a")).find(isServicesLink);
    if (desktopLink && !desktopLink.dataset.servicesMenuReady) {
      const item = desktopLink.closest("li");
      const toggle = document.createElement("button");
      const menu = document.createElement("ul");
      const menuId = "header-services-menu";

      desktopLink.dataset.servicesMenuReady = "true";
      desktopLink.classList.add("nav-services-main-link");
      item.classList.add("nav-services-item");
      menu.id = menuId;
      menu.className = "nav-services-dropdown";
      menu.setAttribute("aria-label", "خدمات شركة تعاود");

      services.forEach(function (service, index) {
        const menuItem = document.createElement("li");
        menuItem.appendChild(createServiceLink(service, index, false));
        menu.appendChild(menuItem);
      });

      toggle.type = "button";
      toggle.className = "nav-services-toggle";
      toggle.setAttribute("aria-label", "عرض قائمة الخدمات");
      toggle.setAttribute("aria-controls", menuId);
      toggle.setAttribute("aria-haspopup", "true");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      desktopLink.insertAdjacentElement("afterend", toggle);
      item.appendChild(menu);

      function setOpen(open) {
        item.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      }

      toggle.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(!item.classList.contains("is-open"));
      });
      item.addEventListener("mouseenter", function () { toggle.setAttribute("aria-expanded", "true"); });
      item.addEventListener("mouseleave", function () {
        if (!item.classList.contains("is-open")) toggle.setAttribute("aria-expanded", "false");
      });
      item.addEventListener("focusin", function () { toggle.setAttribute("aria-expanded", "true"); });
      item.addEventListener("focusout", function () {
        window.setTimeout(function () {
          if (!item.contains(document.activeElement)) setOpen(false);
        }, 0);
      });
      document.addEventListener("pointerdown", function (event) {
        if (!item.contains(event.target)) setOpen(false);
      });
      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || !item.contains(document.activeElement)) return;
        setOpen(false);
        toggle.focus();
      });
    }

    const mobileLink = Array.from(document.querySelectorAll(".sidebar-nav > a")).find(isServicesLink);
    if (mobileLink && !mobileLink.dataset.servicesMenuReady) {
      const wrapper = document.createElement("div");
      const row = document.createElement("div");
      const toggle = document.createElement("button");
      const menu = document.createElement("div");
      const list = document.createElement("div");
      const menuId = "sidebar-services-menu";

      mobileLink.dataset.servicesMenuReady = "true";
      mobileLink.classList.add("sidebar-services-main-link");
      wrapper.className = "sidebar-services";
      row.className = "sidebar-services-row";
      toggle.type = "button";
      toggle.className = "sidebar-services-toggle";
      toggle.setAttribute("aria-label", "عرض قائمة الخدمات");
      toggle.setAttribute("aria-controls", menuId);
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      menu.id = menuId;
      menu.className = "sidebar-services-menu";
      list.className = "sidebar-services-list";

      services.forEach(function (service, index) {
        list.appendChild(createServiceLink(service, index, true));
      });

      menu.appendChild(list);
      mobileLink.parentNode.insertBefore(wrapper, mobileLink);
      row.append(mobileLink, toggle);
      wrapper.append(row, menu);

      toggle.addEventListener("click", function () {
        const open = !wrapper.classList.contains("is-open");
        wrapper.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    document.documentElement.classList.add("tawod-services-nav-ready");
  }

  function initMobileMenu() {
    const openButton = document.getElementById("menuBtn");
    const closeButton = document.getElementById("closeSidebar");
    const sidebar = document.getElementById("mobileSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (!openButton || !closeButton || !sidebar || !overlay) return;

    let previouslyFocused = null;
    openButton.setAttribute("aria-expanded", "false");
    sidebar.setAttribute("aria-hidden", "true");
    sidebar.inert = true;

    function openMenu() {
      previouslyFocused = document.activeElement;
      sidebar.classList.add("active");
      overlay.classList.add("active");
      document.body.classList.add("menu-open");
      openButton.setAttribute("aria-expanded", "true");
      sidebar.setAttribute("aria-hidden", "false");
      sidebar.inert = false;
      closeButton.focus();
    }

    function closeMenu(restoreFocus) {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
      document.body.classList.remove("menu-open");
      openButton.setAttribute("aria-expanded", "false");
      sidebar.setAttribute("aria-hidden", "true");
      if (restoreFocus && previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      sidebar.inert = true;
    }

    openButton.addEventListener("click", openMenu);
    closeButton.addEventListener("click", function () { closeMenu(true); });
    overlay.addEventListener("click", function () { closeMenu(true); });
    sidebar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { closeMenu(false); });
    });

    document.addEventListener("keydown", function (event) {
      if (!sidebar.classList.contains("active")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(sidebar.querySelectorAll("a[href], button:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initCarousel() {
    const carousel = document.querySelector("[data-featured-carousel]");
    if (!carousel) return;

    const viewport = carousel.querySelector(".featured-viewport");
    const track = carousel.querySelector(".featured-track");
    const slides = Array.from(carousel.querySelectorAll(".featured-slide"));
    const controlsScope = carousel.closest("section") || document;
    const previousButton = controlsScope.querySelector("[data-carousel-prev]");
    const nextButton = controlsScope.querySelector("[data-carousel-next]");
    const dotsContainer = carousel.querySelector("[data-carousel-dots]");
    const status = carousel.querySelector("[data-carousel-status]");
    if (!viewport || !track || !slides.length || !previousButton || !nextButton || !dotsContainer) return;

    let index = 0;
    let perView = 1;
    let maximumIndex = 0;
    let autoplayTimer = null;
    let pointerStartX = null;
    let carouselIsVisible = true;
    let resizeTimer = null;

    function getGap() {
      const styles = window.getComputedStyle(track);
      return parseFloat(styles.columnGap || styles.gap) || 0;
    }

    function measure() {
      if (!slides[0]) return;
      const gap = getGap();
      const slideWidth = slides[0].getBoundingClientRect().width;
      perView = Math.max(1, Math.min(slides.length, Math.round((viewport.clientWidth + gap) / (slideWidth + gap))));
      maximumIndex = Math.max(0, slides.length - perView);
      index = Math.min(index, maximumIndex);
      renderDots();
      update(false);
    }

    function update(announce) {
      const gap = getGap();
      const slideWidth = slides[0].getBoundingClientRect().width;
      track.style.transform = "translate3d(" + (index * (slideWidth + gap)) + "px, 0, 0)";
      previousButton.disabled = index === 0;
      nextButton.disabled = index === maximumIndex;

      const visibleStart = index;
      const visibleEnd = Math.min(slides.length, index + perView);
      slides.forEach(function (slide, slideIndex) {
        const visible = slideIndex >= visibleStart && slideIndex < visibleEnd;
        slide.setAttribute("aria-hidden", visible ? "false" : "true");
        slide.querySelectorAll("a, button").forEach(function (element) {
          if (visible) element.removeAttribute("tabindex");
          else element.setAttribute("tabindex", "-1");
        });
      });

      dotsContainer.querySelectorAll(".carousel-dot").forEach(function (dot, dotIndex) {
        const active = dotIndex === index;
        dot.classList.toggle("active", active);
        dot.setAttribute("aria-current", active ? "true" : "false");
      });

      if (announce && status) {
        const end = Math.min(slides.length, visibleEnd);
        status.textContent = perView === 1
          ? "المقال " + (visibleStart + 1) + " من " + slides.length
          : "المقالات من " + (visibleStart + 1) + " إلى " + end + " من " + slides.length;
      }
    }

    function goTo(nextIndex, announce) {
      index = Math.max(0, Math.min(nextIndex, maximumIndex));
      update(announce);
    }

    function renderDots() {
      dotsContainer.replaceChildren();
      for (let dotIndex = 0; dotIndex <= maximumIndex; dotIndex += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", "عرض المجموعة " + (dotIndex + 1));
        dot.addEventListener("click", function () {
          goTo(dotIndex, true);
          restartAutoplay();
        });
        dotsContainer.appendChild(dot);
      }
    }

    function stopAutoplay() {
      if (autoplayTimer) window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }

    function startAutoplay() {
      stopAutoplay();
      if (reducedMotion.matches || maximumIndex === 0 || !carouselIsVisible || document.hidden) return;
      autoplayTimer = window.setInterval(function () {
        goTo(index >= maximumIndex ? 0 : index + 1, false);
      }, 5600);
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    previousButton.addEventListener("click", function () {
      goTo(index - 1, true);
      restartAutoplay();
    });

    nextButton.addEventListener("click", function () {
      goTo(index + 1, true);
      restartAutoplay();
    });

    carousel.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index + 1, true);
        restartAutoplay();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index - 1, true);
        restartAutoplay();
      }
    });

    carousel.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse") return;
      pointerStartX = event.clientX;
      stopAutoplay();
    }, { passive: true });

    carousel.addEventListener("pointerup", function (event) {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) > 48) goTo(distance > 0 ? index + 1 : index - 1, true);
      restartAutoplay();
    }, { passive: true });

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("focusin", stopAutoplay);
    carousel.addEventListener("focusout", function (event) {
      if (!carousel.contains(event.relatedTarget)) startAutoplay();
    });

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver(function (entries) {
        carouselIsVisible = entries[0].isIntersecting;
        if (carouselIsVisible) startAutoplay();
        else stopAutoplay();
      }, { threshold: 0.2 });
      visibilityObserver.observe(carousel);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 120);
    }, { passive: true });

    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", startAutoplay);
    }

    measure();
    startAutoplay();
  }

  function initReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }

    const observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -42px" });

    elements.forEach(function (element) { observer.observe(element); });
  }

  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(function (button) {
      button.addEventListener("click", function () {
        const item = button.closest(".faq-item");
        const answer = item && item.querySelector(".faq-answer");
        if (!item || !answer) return;
        const willOpen = !item.classList.contains("active");

        document.querySelectorAll(".faq-item.active").forEach(function (openItem) {
          openItem.classList.remove("active");
          const openButton = openItem.querySelector(".faq-question");
          const openAnswer = openItem.querySelector(".faq-answer");
          if (openButton) openButton.setAttribute("aria-expanded", "false");
          if (openAnswer) openAnswer.style.maxHeight = "";
        });

        if (willOpen) {
          item.classList.add("active");
          button.setAttribute("aria-expanded", "true");
          answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
      });
    });
  }

  initServicesMenu();
  initHeaderScroll();
  initMobileMenu();
  initCarousel();
  initReveal();
  initFaq();
})();
