(function () {
  "use strict";

  document.documentElement.classList.add("blog-archive-js");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
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

  function initLeadTracking() {
    if (window.__tawodLeadTracking) return;
    window.__tawodLeadTracking = true;
    document.addEventListener("click", function (event) {
      const link = event.target.closest && event.target.closest("a[href]");
      if (!link || typeof window.gtag !== "function") return;
      const href = link.getAttribute("href") || "";
      const isCall = href.indexOf("tel:") === 0;
      const isWhatsApp = href.indexOf("wa.me/") !== -1;
      if (!isCall && !isWhatsApp) return;
      window.gtag("event", "conversion", { send_to: "AW-18266173285/qi4gCLu5lsUcEOXe_oVE" });
      window.gtag("event", isCall ? "tawod_call_click" : "tawod_whatsapp_click", {
        event_category: "lead",
        event_label: href,
        page_path: window.location.pathname,
        transport_type: "beacon"
      });
    }, true);
  }

  initMobileMenu();
  initCarousel();
  initReveal();
  initFaq();
  initLeadTracking();
})();
