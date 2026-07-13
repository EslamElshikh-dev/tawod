/* Shared inner-page interactions for Tawod: responsive UX, motion and comprehensive FAQ */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function setupRevealElements() {
    var elements = document.querySelectorAll('.reveal-up, .reveal, [data-reveal]');
    if (!elements.length) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('active', 'visible', 'in-view', 'revealed', 'show'); });
      return;
    }

    elements.forEach(function (el) { el.classList.add('tawod-reveal-pending'); });
    var observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('tawod-reveal-pending');
        entry.target.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -35px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
    window.setTimeout(function () {
      elements.forEach(function (el) {
        el.classList.remove('tawod-reveal-pending');
        el.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
      });
    }, 1400);
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
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      if (sidebar) sidebar.classList.remove('active', 'open', 'show');
      if (overlay) overlay.classList.remove('active', 'open', 'show');
      document.body.classList.remove('menu-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
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

  function cleanVisibleSeoKeywordBlocks() {
    document.querySelectorAll('.article-content h2, .article-content h3').forEach(function (heading) {
      var text = (heading.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.indexOf('كلمات SEO') !== -1 || text.indexOf('الكلمات المفتاحية') !== -1 || text === 'كلمات السيو') {
        var next = heading.nextElementSibling;
        heading.remove();
        if (next && next.tagName && next.tagName.toLowerCase() === 'p') next.remove();
      }
    });
  }

  function serviceContext() {
    var path = window.location.pathname.toLowerCase();
    var serviceMap = {
      'service-construction.html': {
        name: 'خدمة البناء والإنشاءات',
        scope: 'أعمال البناء والعظم للفلل والملاحق والمباني السكنية والتجارية، مع تنظيم مراحل التنفيذ وربطها بمتطلبات المشروع التالية.',
        factors: 'المساحة، نوع المبنى، حالة الموقع، المخططات، المواصفات الإنشائية، نطاق الأعمال، والمدة المطلوبة.'
      },
      'service-turnkey.html': {
        name: 'خدمة تسليم المفتاح',
        scope: 'إدارة مراحل المشروع المتفق عليها من تنسيق البنود والأعمال الأساسية إلى التشطيبات والفحص والتسليم الجاهز للاستخدام.',
        factors: 'نوع المشروع، مستوى التشطيب، نطاق التصميم والتنفيذ، المواد، الأنظمة الفنية، والبرنامج الزمني.'
      },
      'service-restoration.html': {
        name: 'خدمة ترميم وتجديد المباني',
        scope: 'تقييم الحالة القائمة، معالجة مظاهر التلف، تجديد الواجهات والمساحات، وتحسين الوظيفة والمظهر بحسب احتياج المبنى.',
        factors: 'عمر المبنى، نوع الضرر، نتائج المعاينة، الأعمال المخفية، المواد المطلوبة، ومدى التغيير المعماري أو الفني.'
      },
      'service-finishing.html': {
        name: 'خدمة التشطيبات العامة',
        scope: 'تنسيق وتنفيذ بنود التشطيب الداخلي والخارجي مثل الأرضيات والدهانات والأسقف والواجهات والتفاصيل النهائية ضمن مستوى تشطيب متفق عليه.',
        factors: 'المساحة، مستوى التشطيب، أنواع الخامات، حالة الأعمال السابقة، عدد البنود، ودقة التفاصيل المطلوبة.'
      },
      'service-decor.html': {
        name: 'خدمة الديكور والتصميم الداخلي',
        scope: 'تطوير وتنفيذ حلول ديكور عملية ومتناسقة للمنازل والمكاتب والمحلات، مع مراعاة الاستخدام والإضاءة والحركة وهوية المكان.',
        factors: 'المساحة، أسلوب التصميم، المواد، الأعمال المخصصة، الإضاءة، الأثاث، ومتطلبات التنفيذ في الموقع.'
      },
      'service-mep.html': {
        name: 'خدمة الكهرباء والسباكة والأعمال الميكانيكية',
        scope: 'تنفيذ وتنسيق الأعمال الكهربائية والصحية والميكانيكية وربطها بمراحل البناء والتشطيب لتقليل التعارضات وتحسين كفاءة الاستخدام.',
        factors: 'المخططات، الأحمال والنقاط، نوع الأنظمة، عدد الوحدات، حالة التمديدات القائمة، ومتطلبات الاختبار والتشغيل.'
      }
    };

    var key = Object.keys(serviceMap).find(function (file) { return path.indexOf(file) !== -1; });
    if (key) return serviceMap[key];

    if (path.indexOf('/blog/') !== -1) {
      var category = 'خدمات المقاولات العامة';
      if (/finishing|decor|facades|interior/.test(path)) category = 'أعمال التشطيب والديكور';
      if (/electrical|plumbing|mechanical|mep/.test(path)) category = 'أعمال الكهرباء والسباكة والميكانيكا';
      if (/construction|bone|contracting|turnkey/.test(path)) category = 'أعمال البناء وتسليم المفتاح';
      return {
        name: category,
        scope: 'تختلف تفاصيل الخدمة حسب حالة المشروع ونطاق التنفيذ والمواصفات المطلوبة، وتبدأ المناقشة بجمع المعلومات أو معاينة الموقع عند الحاجة.',
        factors: 'نوع المشروع، المساحة، الحالة الحالية، المواصفات، الخامات، تسلسل الأعمال، والمدة المستهدفة.'
      };
    }

    return {
      name: 'خدمات شركة تعاود للمقاولات',
      scope: 'حلول متكاملة للبناء والترميم والتشطيب والديكور والأعمال الكهروميكانيكية للمشاريع السكنية والتجارية في الرياض.',
      factors: 'نوع المشروع، المساحة، الموقع، الحالة الحالية، نطاق البنود، الخامات، والمواعيد المطلوبة.'
    };
  }

  function comprehensiveFaqs(context) {
    return [
      ['ما الذي تشمل ' + context.name + '؟', context.scope],
      ['ما أنواع المشاريع المناسبة لهذه الخدمة؟', 'يمكن مناقشة المشاريع السكنية والتجارية والفلل والملاحق والمكاتب والمحلات، ويُحدد مدى ملاءمة الخدمة بعد مراجعة نطاق المشروع وحالته.'],
      ['كيف يتم تحديد تكلفة المشروع؟', 'تُحدد التكلفة بعد مراجعة ' + context.factors + ' ويُفضّل توفير مخططات أو صور أو جدول كميات إن وُجد للحصول على تقدير أدق.'],
      ['هل يحتاج المشروع إلى معاينة قبل عرض السعر؟', 'بعض الأعمال يمكن مناقشتها مبدئيًا من خلال المعلومات والصور، بينما تحتاج المشاريع الإنشائية أو أعمال الترميم والتشطيب المتكاملة إلى معاينة لفهم الحالة والقياسات والتحديات.'],
      ['كم تستغرق مدة التنفيذ؟', 'تعتمد المدة على حجم المشروع وعدد البنود وتسلسل التخصصات وتوفر المواد والموافقات والتعديلات. بعد تحديد النطاق يمكن وضع مدة تقديرية أو برنامج زمني مناسب.'],
      ['هل يمكن اختيار الخامات ومستوى التشطيب؟', 'نعم، تُناقش الخيارات وفق الاستخدام والميزانية والمتطلبات الفنية، مع توضيح الفروقات بين البدائل من حيث الجودة والصيانة والمظهر والتكلفة.'],
      ['كيف تتم متابعة جودة الأعمال؟', 'تتم المتابعة خلال المراحل المهمة، مع مراجعة التنسيق بين التخصصات وفحص التفاصيل قبل تغطيتها أو الانتقال للمرحلة التالية، ثم إغلاق الملاحظات قبل التسليم.'],
      ['هل يمكن تعديل بعض البنود أثناء التنفيذ؟', 'يمكن دراسة التعديلات قبل تنفيذها، مع توضيح أثرها على التكلفة والمدة وتسلسل الأعمال. الأفضل اعتماد القرارات مبكرًا لتجنب إعادة العمل أو التأخير.'],
      ['هل تخدمون جميع أحياء مدينة الرياض؟', 'نخدم مشاريع داخل مدينة الرياض، ويُراجع موقع المشروع وطبيعة الأعمال عند التواصل لتحديد الترتيبات المناسبة للمعاينة والتنفيذ.'],
      ['كيف أبدأ طلب الخدمة أو عرض السعر؟', 'أرسل نوع المشروع والموقع والمساحة والمرحلة الحالية والخدمة المطلوبة والصور أو المخططات المتاحة عبر نموذج التواصل أو واتساب، ثم تتم مراجعة التفاصيل وتحديد الخطوة التالية.']
    ];
  }

  function faqMarkup(items) {
    return items.map(function (item, index) {
      var id = 'inner-faq-answer-' + index;
      return '<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="' + id + '"><span>' + item[0] + '</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="faq-answer" id="' + id + '"><p>' + item[1] + '</p></div></div>';
    }).join('');
  }

  function setupFaqAccordions(root) {
    (root || document).querySelectorAll('.faq-question').forEach(function (button) {
      if (button.dataset.faqReady === 'true') return;
      button.dataset.faqReady = 'true';
      button.addEventListener('click', function () {
        var item = button.closest('.faq-item');
        var answer = item ? item.querySelector('.faq-answer') : null;
        if (!item || !answer) return;
        var isOpen = item.classList.contains('active');

        (root || document).querySelectorAll('.faq-item.active').forEach(function (openItem) {
          openItem.classList.remove('active');
          var openButton = openItem.querySelector('.faq-question');
          var openAnswer = openItem.querySelector('.faq-answer');
          if (openButton) openButton.setAttribute('aria-expanded', 'false');
          if (openAnswer) openAnswer.style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  function addFaqSchema(items) {
    var existing = document.getElementById('tawod-faq-schema');
    if (existing) existing.remove();
    var script = document.createElement('script');
    script.id = 'tawod-faq-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(function (item) {
        return {
          '@type': 'Question',
          name: item[0],
          acceptedAnswer: { '@type': 'Answer', text: item[1] }
        };
      })
    });
    document.head.appendChild(script);
  }

  function injectComprehensiveFaq() {
    var main = document.querySelector('main');
    if (!main || window.location.pathname === '/' || /\/index\.html$/.test(window.location.pathname) && !window.location.pathname.includes('/blog/')) return;

    document.querySelectorAll('.seo-faq').forEach(function (oldFaq) { oldFaq.remove(); });
    var existingSection = document.querySelector('#faq.tawod-faq-section');
    if (existingSection) existingSection.remove();

    var context = serviceContext();
    var items = comprehensiveFaqs(context);
    var section = document.createElement('section');
    section.id = 'faq';
    section.className = 'section-padding bg-light tawod-faq-section';
    section.innerHTML = '<div class="container"><div class="section-title reveal-up"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات شاملة حول ' + context.name + '</h2><p>إجابات على أهم أسئلة العملاء حول النطاق والتكلفة والمدة والمعاينة والمواد والمتابعة والتسليم قبل بدء المشروع.</p></div><div class="faq-wrap tawod-faq-grid reveal-up">' + faqMarkup(items) + '</div></div>';

    var directSections = Array.prototype.filter.call(main.children, function (child) {
      return child.tagName && child.tagName.toLowerCase() === 'section';
    });
    var isArticle = Boolean(document.querySelector('.article-content'));
    if (isArticle || !directSections.length) {
      main.appendChild(section);
    } else {
      main.insertBefore(section, directSections[directSections.length - 1]);
    }

    setupFaqAccordions(section);
    addFaqSchema(items);
  }

  function removeMobileActionBar() {
    document.querySelectorAll('.mobile-action-bar').forEach(function (bar) { bar.remove(); });
    document.body.classList.add('no-mobile-action-bar');
  }

  function improveMediaLoading() {
    document.querySelectorAll('img').forEach(function (img, index) {
      img.decoding = 'async';
      if (index > 0 && !img.hasAttribute('loading')) img.loading = 'lazy';
    });
  }

  function trackClicks() {
    document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'contact_click', {
            link_url: link.href,
            page_path: window.location.pathname,
            transport_type: 'beacon'
          });
        }
      });
    });
  }

  ready(function () {
    removeMobileActionBar();
    setupMobileMenu();
    fixBlogLinks();
    restoreBlogImages();
    cleanVisibleSeoKeywordBlocks();
    injectComprehensiveFaq();
    setupRevealElements();
    improveMediaLoading();
    trackClicks();
    document.documentElement.classList.add('tawod-polished');
    window.setTimeout(cleanVisibleSeoKeywordBlocks, 300);
  });
})();
