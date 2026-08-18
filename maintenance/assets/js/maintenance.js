(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var header = document.getElementById("site-header");
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var menuShell = document.querySelector("[data-mobile-menu]");
  var menuClose = document.querySelector("[data-menu-close]");
  var lastFocusedElement = null;

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  function getMenuFocusableElements() {
    if (!menuShell) return [];
    return Array.prototype.slice.call(
      menuShell.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (element) {
      return element !== menuClose && !element.hasAttribute("hidden");
    });
  }

  function setMenuState(isOpen) {
    if (!menuToggle || !menuShell) return;

    body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل");
    menuShell.setAttribute("aria-hidden", String(!isOpen));

    if ("inert" in menuShell) {
      menuShell.inert = !isOpen;
    }

    if (isOpen) {
      lastFocusedElement = document.activeElement;
      window.requestAnimationFrame(function () {
        var focusable = getMenuFocusableElements();
        if (focusable.length) focusable[0].focus();
      });
    } else if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  if (menuShell && "inert" in menuShell) {
    menuShell.inert = true;
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      setMenuState(!body.classList.contains("menu-open"));
    });
  }

  if (menuClose) {
    menuClose.addEventListener("click", function () {
      setMenuState(false);
    });
  }

  if (menuShell) {
    menuShell.querySelectorAll("a[href]").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuState(false);
      });
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!body.classList.contains("menu-open")) return;

    if (event.key === "Escape") {
      setMenuState(false);
      return;
    }

    if (event.key !== "Tab") return;

    var focusable = getMenuFocusableElements();
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  var desktopQuery = window.matchMedia("(min-width: 1121px)");
  function closeMenuOnDesktop(event) {
    if (event.matches && body.classList.contains("menu-open")) {
      setMenuState(false);
    }
  }

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", closeMenuOnDesktop);
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(closeMenuOnDesktop);
  }

  var revealElements = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!revealElements.length || reducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(function (element) {
      element.classList.add("is-visible");
    });
  } else {
    revealElements.forEach(function (element) {
      var rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        element.classList.add("is-visible");
      }
    });

    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08
      }
    );

    revealElements.forEach(function (element) {
      if (!element.classList.contains("is-visible")) {
        revealObserver.observe(element);
      }
    });

    root.classList.add("reveal-ready");
  }

  var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq-list details"));
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (otherItem) {
        if (otherItem !== item) otherItem.open = false;
      });
    });
  });

  var year = String(new Date().getFullYear());
  document.querySelectorAll("[data-current-year]").forEach(function (element) {
    element.textContent = year;
  });
})();
