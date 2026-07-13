/* Tawod shared inner-page system: content depth, SEO, accessibility and article UX */
(function () {
  'use strict';

  var loadedScript = document.currentScript;
  var revisionDate = '2026-07-13';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback);
    else callback();
  }

  function loadSystemStyles() {
    if (document.querySelector('link[data-tawod-system]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.tawodSystem = 'true';
    link.href = loadedScript && loadedScript.src
      ? new URL('../css/tawod-system.css', loadedScript.src).href
      : '/assets/css/tawod-system.css';
    document.head.appendChild(link);
  }

  loadSystemStyles();

  function pageState() {
    var path = window.location.pathname.toLowerCase().replace(/\/index\.html$/, '/');
    var article = Boolean(document.querySelector('.article-content'));
    return {
      path: path,
      article: article,
      blogIndex: /\/blog\/?$/.test(path) && !article,
      landing: path.indexOf('/lp/') !== -1,
      service: path.indexOf('service-') !== -1,
      privacy: path.indexOf('privacy-policy') !== -1,
      home: path === '/' || /\/tawod\/?$/.test(path)
    };
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
    }, { threshold: 0.08, rootMargin: '0px 0px -28px 0px' });
    elements.forEach(function (el) { observer.observe(el); });
    window.setTimeout(function () {
      elements.forEach(function (el) {
        el.classList.remove('tawod-reveal-pending');
        el.classList.add('active', 'visible', 'in-view', 'revealed', 'show');
      });
    }, 1600);
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
      menuBtn.setAttribute('aria-label', 'فتح قائمة التنقل');
      menuBtn.addEventListener('click', openMenu);
      menuBtn.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMenu();
        }
      });
    }
    if (closeBtn) {
      closeBtn.setAttribute('aria-label', 'إغلاق قائمة التنقل');
      closeBtn.addEventListener('click', closeMenu);
    }
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
    document.querySelectorAll('.mobile-sidebar a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  }

  function fixBlogLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#|\/)/.test(href)) return;
      if (href.indexOf('../') === 0 || href.indexOf('./') === 0 || href.indexOf('index.html') !== -1) return;
      if (href.indexOf('/') > -1 && href.slice(-1) === '/') link.setAttribute('href', href + 'index.html');
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
        img.loading = 'lazy';
        img.decoding = 'async';
      });
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(function (meta) {
        meta.content = window.location.origin + articleImages[slug];
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

  function profiles() {
    return {
      'service-construction.html': {
        name: 'خدمة البناء والإنشاءات',
        hero: 'تنفيذ أعمال البناء والعظم للفلل والملاحق والمباني السكنية والتجارية في الرياض ضمن نطاق واضح وتسلسل مدروس ومتابعة للمراحل المؤثرة في جودة المشروع.',
        heading: 'تنفيذ إنشائي يبدأ بالتخطيط وينتهي بمرحلة قابلة للاستلام',
        intro: 'نتعامل مع البناء كمنظومة مترابطة تبدأ بمراجعة المتطلبات والمخططات وحالة الموقع، ثم تنظيم مراحل التنفيذ والتنسيق بين الأعمال الإنشائية وما يليها من تمديدات وتشطيبات. الهدف هو تقليل التعارضات، وضبط القرارات مبكرًا، والحفاظ على وضوح المسؤوليات طوال المشروع.',
        benefits: ['بناء فلل وملاحق ومبانٍ سكنية وتجارية', 'مراجعة المتطلبات وتسلسل مراحل التنفيذ', 'تنسيق الأعمال الإنشائية مع الكهرباء والسباكة', 'إمكانية استكمال المشروع بالتشطيب أو تسليم المفتاح'],
        scope: 'أعمال البناء والعظم للفلل والملاحق والمباني السكنية والتجارية، مع تنظيم مراحل التنفيذ وربطها بمتطلبات المشروع التالية.',
        factors: 'المساحة، نوع المبنى، حالة الموقع، المخططات، المواصفات الإنشائية، نطاق الأعمال، والمدة المطلوبة.'
      },
      'service-turnkey.html': {
        name: 'خدمة تسليم المفتاح',
        hero: 'إدارة متكاملة لمراحل المشروع من تحديد النطاق وتنسيق التخصصات إلى التشطيب والفحص والتسليم الجاهز للاستخدام وفق البنود المعتمدة.',
        heading: 'جهة واحدة تنسق التفاصيل وتدير رحلة المشروع كاملة',
        intro: 'خدمة تسليم المفتاح مناسبة لمن يريد تقليل تعدد الجهات وتوحيد المسؤولية. نرتب مراحل الأعمال الإنشائية والمعمارية والكهروميكانيكية والتشطيبات، ونوضح نقاط الاعتماد والقرارات المطلوبة، ثم نراجع الأعمال والملاحظات قبل التسليم.',
        benefits: ['نطاق موحد للبناء والتشطيب والأعمال الفنية', 'تنسيق فرق التنفيذ وتقليل تضارب المسؤوليات', 'متابعة القرارات والخامات والمراحل الرئيسية', 'مراجعة نهائية وإغلاق منظم للملاحظات'],
        scope: 'إدارة مراحل المشروع المتفق عليها من تنسيق البنود والأعمال الأساسية إلى التشطيبات والفحص والتسليم الجاهز للاستخدام.',
        factors: 'نوع المشروع، مستوى التشطيب، نطاق التصميم والتنفيذ، المواد، الأنظمة الفنية، والبرنامج الزمني.'
      },
      'service-restoration.html': {
        name: 'خدمة ترميم وتجديد المباني',
        hero: 'ترميم وتجديد المباني في الرياض بعد تقييم الحالة القائمة وتحديد مسببات التلف وأولويات المعالجة قبل تنفيذ التحسينات المعمارية والتشطيبية.',
        heading: 'معالجة مدروسة للمشكلة قبل تجميل النتيجة',
        intro: 'الترميم الاحترافي لا يبدأ بالدهان أو الكسوة، بل بفهم حالة المبنى والعناصر المتضررة والأعمال المخفية المحتملة. نحدد نطاق المعالجة، وننسق الإصلاحات مع التمديدات والتشطيبات، ثم نعيد تأهيل المساحة بصورة عملية ومتناسقة.',
        benefits: ['تقييم الحالة القائمة وتحديد الأولويات', 'معالجة آثار التلف والرطوبة والتشققات حسب الحالة', 'تجديد الواجهات والمساحات الداخلية', 'تنسيق الترميم مع الكهرباء والسباكة والتشطيب'],
        scope: 'تقييم الحالة القائمة، معالجة مظاهر التلف، تجديد الواجهات والمساحات، وتحسين الوظيفة والمظهر بحسب احتياج المبنى.',
        factors: 'عمر المبنى، نوع الضرر، نتائج المعاينة، الأعمال المخفية، المواد المطلوبة، ومدى التغيير المعماري أو الفني.'
      },
      'service-finishing.html': {
        name: 'خدمة التشطيبات العامة',
        hero: 'تشطيبات داخلية وخارجية للمشاريع السكنية والتجارية في الرياض مع تنسيق الخامات والألوان والإضاءة والأعمال الفنية قبل إغلاق التفاصيل.',
        heading: 'تشطيب متناسق وظيفيًا وبصريًا من أول بند إلى آخر تفصيلة',
        intro: 'نجاح التشطيب يعتمد على القرارات المبكرة وتسلسل التنفيذ بقدر اعتماده على جودة الخامة. ننسق الأرضيات والدهانات والأسقف والواجهات مع الكهرباء والسباكة والنجارة والديكور، ونراجع نقاط الالتقاء حتى لا تتحول التفاصيل الصغيرة إلى تعديلات مكلفة.',
        benefits: ['تشطيبات داخلية وخارجية متكاملة', 'تنسيق الخامات والألوان ومستوى التشطيب', 'ربط التشطيب بالأعمال الكهربائية والصحية', 'فحص التفاصيل ومعالجة الملاحظات قبل التسليم'],
        scope: 'تنسيق وتنفيذ بنود التشطيب الداخلي والخارجي مثل الأرضيات والدهانات والأسقف والواجهات والتفاصيل النهائية ضمن مستوى تشطيب متفق عليه.',
        factors: 'المساحة، مستوى التشطيب، أنواع الخامات، حالة الأعمال السابقة، عدد البنود، ودقة التفاصيل المطلوبة.'
      },
      'service-decor.html': {
        name: 'خدمة الديكور والتصميم الداخلي',
        hero: 'تصميم وتنفيذ ديكور داخلي يوازن بين الهوية البصرية والاستخدام اليومي، مع مراعاة الحركة والإضاءة والخامات وواقع التنفيذ في الموقع.',
        heading: 'تصميم جميل قابل للتنفيذ ومناسب لطبيعة المكان',
        intro: 'نحوّل الاحتياج الوظيفي والذوق المطلوب إلى تصور متناسق يمكن تنفيذه فعليًا. نراجع توزيع المساحات والإضاءة والخامات والألوان والعناصر المخصصة، وننسقها مع التمديدات والتشطيبات لتظهر النتيجة النهائية كوحدة واحدة.',
        benefits: ['تصميم داخلي للمنازل والمكاتب والمحلات', 'توزيع وظيفي يراعي الحركة والاستخدام', 'تنسيق الألوان والخامات والإضاءة', 'ربط التصميم بالتنفيذ والتفاصيل الفنية'],
        scope: 'تطوير وتنفيذ حلول ديكور عملية ومتناسقة للمنازل والمكاتب والمحلات، مع مراعاة الاستخدام والإضاءة والحركة وهوية المكان.',
        factors: 'المساحة، أسلوب التصميم، المواد، الأعمال المخصصة، الإضاءة، الأثاث، ومتطلبات التنفيذ في الموقع.'
      },
      'service-mep.html': {
        name: 'خدمة الكهرباء والسباكة والأعمال الميكانيكية',
        hero: 'تنفيذ وتنسيق أعمال الكهرباء والسباكة والميكانيكا في الرياض بما يتوافق مع استخدام المشروع ومراحل البناء والتشطيب ويقلل التعارضات المستقبلية.',
        heading: 'أنظمة فنية مخططة بعناية قبل أن تختفي خلف التشطيبات',
        intro: 'الأعمال الكهروميكانيكية تؤثر مباشرة في الراحة والسلامة وسهولة الصيانة. نراجع النقاط والأحمال والمسارات والاحتياجات التشغيلية، وننسق التنفيذ مع الجدران والأسقف والأرضيات قبل الإغلاق، ثم نتابع الاختبارات والملاحظات بحسب نطاق المشروع.',
        benefits: ['تمديدات كهربائية ونقاط إنارة وقوى', 'أعمال سباكة وتغذية وصرف حسب المشروع', 'تنسيق المسارات مع البناء والتشطيبات', 'اختبارات ومراجعات قبل الإغلاق والتسليم'],
        scope: 'تنفيذ وتنسيق الأعمال الكهربائية والصحية والميكانيكية وربطها بمراحل البناء والتشطيب لتقليل التعارضات وتحسين كفاءة الاستخدام.',
        factors: 'المخططات، الأحمال والنقاط، نوع الأنظمة، عدد الوحدات، حالة التمديدات القائمة، ومتطلبات الاختبار والتشغيل.'
      },
      'lp/best-contracting-company-riyadh/': {
        name: 'حلول المقاولات العامة في الرياض',
        hero: 'حلول متكاملة للمشاريع السكنية والتجارية في الرياض تجمع البناء والترميم والتشطيب والديكور والأعمال الفنية ضمن إدارة واضحة ونقطة تواصل واحدة.',
        heading: 'اختيار شركة المقاولات يبدأ من وضوح المنهج قبل مقارنة الأسعار',
        intro: 'المقاول المناسب لا يقدّم رقمًا فقط؛ بل يوضح نطاق العمل وتسلسل المراحل والمسؤوليات وطريقة المتابعة. في تعاود نربط القرارات الفنية والتنفيذية من البداية حتى يكون العرض مفهومًا، والتنسيق أفضل، والملاحظات قابلة للإغلاق.',
        benefits: ['حلول متكاملة للمشاريع السكنية والتجارية', 'وضوح نطاق العمل والمراحل والمسؤوليات', 'تنسيق البناء والتشطيب والأعمال الفنية', 'متابعة مباشرة من مناقشة المشروع إلى التسليم'],
        scope: 'إدارة وتنفيذ خدمات المقاولات العامة للمشاريع السكنية والتجارية في الرياض، من البناء والترميم إلى التشطيب وتسليم المفتاح.',
        factors: 'نوع المشروع، مساحته، حالته، موقعه، نطاق الأعمال، مستوى الخامات، والبرنامج الزمني.'
      },
      'lp/construction-riyadh/': {
        name: 'مقاولات البناء في الرياض',
        hero: 'تنفيذ مشاريع البناء في الرياض ضمن مراحل واضحة تبدأ بمراجعة المتطلبات والموقع، ثم تنظيم الأعمال الإنشائية وربطها بالتمديدات والتشطيبات اللاحقة.',
        heading: 'بناء منظم يحافظ على جودة القرارات الأساسية للمشروع',
        intro: 'نراجع احتياجات المشروع والمخططات وتسلسل الأعمال قبل التنفيذ، ثم ننسق الأعمال الإنشائية مع باقي التخصصات. هذا المنهج يساعد على اكتشاف التعارضات مبكرًا ويجعل الانتقال إلى التشطيبات أكثر وضوحًا.',
        benefits: ['تنفيذ فلل وملاحق ومبانٍ سكنية وتجارية', 'تنظيم مراحل العظم والأعمال الأساسية', 'تنسيق مبكر مع الكهرباء والسباكة', 'إمكانية استكمال المشروع حتى التسليم'],
        scope: 'تنفيذ أعمال البناء للمشاريع السكنية والتجارية في الرياض مع تنظيم المراحل والتنسيق بين التخصصات.',
        factors: 'نوع المبنى، المساحة، المخططات، حالة الموقع، المواصفات، نطاق الأعمال، والمدة.'
      },
      'lp/bone-contractor-riyadh/': {
        name: 'مقاول عظم في الرياض',
        hero: 'تنفيذ أعمال العظم للفلل والمباني في الرياض مع مراجعة المخططات وتنظيم مراحل الخرسانة والمباني والتنسيق المبكر مع احتياجات المشروع التالية.',
        heading: 'مرحلة العظم هي الأساس الذي تُبنى عليه جودة بقية المشروع',
        intro: 'نهتم بتسلسل الأعمال الأساسية ونقاط الربط بين العناصر الإنشائية والمعمارية، ونراجع احتياجات الفتحات والتمديدات قبل الانتقال للمراحل التالية، حتى لا تتحول القرارات المؤجلة إلى تكسير أو تعديل مكلف.',
        benefits: ['تنفيذ عظم للفلل والملاحق والمباني', 'تنظيم مراحل الخرسانة والمباني', 'مراجعة الفتحات واحتياجات التمديدات', 'ربط مرحلة العظم بخطة التشطيب اللاحقة'],
        scope: 'تنفيذ مرحلة العظم والأعمال الإنشائية الأساسية وفق متطلبات المشروع والمخططات والنطاق المتفق عليه.',
        factors: 'المساحة، النظام الإنشائي، المخططات، الموقع، الأعمال الترابية، المواد، والبرنامج الزمني.'
      },
      'lp/finishing-riyadh/': {
        name: 'تشطيب المشاريع في الرياض',
        hero: 'تشطيب فلل وشقق ومكاتب ومحلات في الرياض مع تنسيق الأرضيات والدهانات والأسقف والإضاءة والكهرباء والسباكة ضمن خطة واحدة.',
        heading: 'التشطيب الاحترافي يبدأ قبل تركيب أول خامة',
        intro: 'نحدد مستوى التشطيب والخامات ونقاط الاعتماد، ونراجع تعارضات الكهرباء والسباكة والنجارة والديكور قبل الإغلاق. بهذه الطريقة تصبح التفاصيل النهائية أكثر اتساقًا ويقل الهدر وإعادة العمل.',
        benefits: ['تشطيبات داخلية وخارجية متكاملة', 'اختيار ومقارنة الخامات حسب الاستخدام', 'تنسيق جميع التخصصات قبل الإغلاق', 'مراجعة جودة التفاصيل قبل التسليم'],
        scope: 'تنفيذ وإدارة أعمال التشطيب للمشاريع السكنية والتجارية في الرياض وفق مستوى وخامات ونطاق متفق عليه.',
        factors: 'المساحة، حالة المشروع، مستوى التشطيب، الخامات، عدد البنود، الأعمال الفنية، والمدة.'
      },
      'lp/interior-design-riyadh/': {
        name: 'التصميم والديكور الداخلي في الرياض',
        hero: 'تصميم وتنفيذ مساحات داخلية في الرياض تحقق التوازن بين الجمال والوظيفة، وتربط توزيع الأثاث والإضاءة والخامات بواقع التنفيذ.',
        heading: 'هوية بصرية متناسقة لا تتعارض مع الاستخدام أو التفاصيل الفنية',
        intro: 'نبدأ بفهم طبيعة المساحة والمستخدمين والاحتياجات اليومية، ثم ننسق الألوان والخامات والإضاءة والعناصر المخصصة، ونراجع علاقتها بالكهرباء والأسقف والأرضيات حتى يكون التصميم قابلًا للتنفيذ بوضوح.',
        benefits: ['تصميم داخلي للمنازل والمكاتب والمحلات', 'توزيع عملي للمساحات والحركة', 'تنسيق الخامات والألوان والإضاءة', 'ربط التصميم بالتنفيذ والأعمال الفنية'],
        scope: 'تصميم وتنفيذ الديكور الداخلي للمشاريع السكنية والتجارية في الرياض وفق احتياج المكان وهوية العميل.',
        factors: 'المساحة، أسلوب التصميم، الوظائف المطلوبة، الخامات، الإضاءة، الأثاث، والميزانية.'
      }
    };
  }

  function contextForPage(state) {
    var map = profiles();
    var key = Object.keys(map).find(function (file) { return state.path.indexOf(file) !== -1; });
    if (key) return map[key];
    var heading = document.querySelector('h1');
    var title = heading ? heading.textContent.trim() : 'خدمات شركة تعاود للمقاولات';
    if (state.article) {
      var category = 'دليل المقاولات العامة';
      if (/finishing|decor|facades|interior/.test(state.path)) category = 'دليل التشطيب والديكور';
      if (/electrical|plumbing|mechanical|mep/.test(state.path)) category = 'دليل الكهرباء والسباكة والأعمال الميكانيكية';
      if (/construction|bone|contracting|turnkey/.test(state.path)) category = 'دليل البناء وتسليم المفتاح';
      return {
        name: title,
        category: category,
        scope: 'يوضح المقال الجوانب العملية التي يحتاجها مالك المشروع لاتخاذ قرار أفضل، مع ربط المعلومات بواقع التنفيذ والتنسيق بين مراحل المشروع في الرياض.',
        factors: 'نوع المشروع، المساحة، الحالة الحالية، نطاق التنفيذ، الخامات، تسلسل الأعمال، والمدة المستهدفة.'
      };
    }
    if (state.landing) {
      return {
        name: title,
        scope: 'حلول مقاولات مخصصة للمشاريع السكنية والتجارية في الرياض، تبدأ بفهم الاحتياج وتحديد النطاق ثم تنظيم التنفيذ والمتابعة والتسليم.',
        factors: 'نوع المشروع، المساحة، الموقع، الحالة الحالية، مستوى التشطيب، البنود المطلوبة، والخامات.'
      };
    }
    return {
      name: title,
      scope: 'حلول متكاملة للبناء والترميم والتشطيب والديكور والأعمال الكهروميكانيكية للمشاريع السكنية والتجارية في الرياض.',
      factors: 'نوع المشروع، المساحة، الموقع، الحالة الحالية، نطاق البنود، الخامات، والمواعيد المطلوبة.'
    };
  }

  function applyServiceProfile(state, context) {
    if (!(state.service || state.landing) || !context.hero) return;
    var heroText = document.querySelector('.page-hero p, .blog-hero p');
    var contentHeading = document.querySelector('main .content h2');
    var contentIntro = document.querySelector('main .content > p');
    if (heroText) heroText.textContent = context.hero;
    if (contentHeading) contentHeading.textContent = context.heading;
    if (contentIntro) contentIntro.textContent = context.intro;
    document.querySelectorAll('main .content .check-list li').forEach(function (item, index) {
      if (!context.benefits || !context.benefits[index]) return;
      item.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ' + context.benefits[index];
    });
    var steps = [
      ['فهم المشروع والمعاينة', 'جمع المعلومات ومراجعة الموقع والمخططات أو الصور لتحديد الاحتياج الفعلي.'],
      ['تحديد النطاق والقرارات', 'توضيح البنود والخامات والمراحل والمسؤوليات والعناصر المؤثرة في السعر والمدة.'],
      ['تنفيذ وتنسيق مرحلي', 'تنظيم فرق العمل ومراجعة نقاط الالتقاء بين التخصصات أثناء التنفيذ.'],
      ['فحص وإغلاق الملاحظات', 'مراجعة الأعمال المنفذة ومعالجة الملاحظات الأساسية قبل التسليم.']
    ];
    document.querySelectorAll('.steps-grid .step-card').forEach(function (card, index) {
      if (!steps[index]) return;
      var h3 = card.querySelector('h3');
      var p = card.querySelector('p');
      if (h3) h3.textContent = steps[index][0];
      if (p) p.textContent = steps[index][1];
    });
    var ctaHeading = document.querySelector('.mini-cta h2');
    var ctaText = document.querySelector('.mini-cta p');
    if (ctaHeading) ctaHeading.textContent = 'ناقش تفاصيل ' + context.name + ' مع فريق تعاود';
    if (ctaText) ctaText.textContent = 'أرسل موقع المشروع ونوعه ومساحته والمرحلة الحالية والصور أو المخططات المتاحة للحصول على تصور أولي للخطوة التالية.';
  }

  function injectTrustStrip(state) {
    if (state.home || state.privacy || document.querySelector('.tawod-inner-trust')) return;
    var hero = document.querySelector('.page-hero, .blog-hero, .article-hero');
    if (!hero || !hero.parentNode) return;
    var section = document.createElement('section');
    section.className = 'tawod-inner-trust';
    section.setAttribute('aria-label', 'منهج شركة تعاود في إدارة المشاريع');
    section.innerHTML = '<div class="container"><div class="tawod-inner-trust-grid">' +
      '<div><i class="fa-solid fa-list-check" aria-hidden="true"></i><span><strong>نطاق واضح</strong><small>بنود ومسؤوليات قابلة للمتابعة</small></span></div>' +
      '<div><i class="fa-solid fa-compass-drafting" aria-hidden="true"></i><span><strong>تنسيق هندسي</strong><small>ربط التخصصات قبل ظهور التعارضات</small></span></div>' +
      '<div><i class="fa-solid fa-magnifying-glass-chart" aria-hidden="true"></i><span><strong>متابعة مرحلية</strong><small>مراجعة الأعمال في توقيتها المناسب</small></span></div>' +
      '<div><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i><span><strong>تسليم منظم</strong><small>فحص الملاحظات وإغلاق البنود</small></span></div>' +
      '</div></div>';
    hero.insertAdjacentElement('afterend', section);
  }

  function addMeta(selector, attrs) {
    var element = document.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      Object.keys(attrs).forEach(function (key) { element.setAttribute(key, attrs[key]); });
      document.head.appendChild(element);
    }
    return element;
  }

  function normalizeMetadata(state) {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    var description = document.querySelector('meta[name="description"]');
    var title = document.title;
    var canonical = document.querySelector('link[rel="canonical"]');
    var canonicalUrl = canonical ? canonical.href : window.location.href.split('#')[0];
    addMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'ar_SA' }).content = 'ar_SA';
    addMeta('meta[property="og:type"]', { property: 'og:type', content: state.article ? 'article' : 'website' }).content = state.article ? 'article' : 'website';
    addMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl }).content = canonicalUrl;
    addMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' }).content = 'summary_large_image';
    addMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title }).content = title;
    addMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description ? description.content : '' }).content = description ? description.content : '';
    addMeta('meta[name="author"]', { name: 'author', content: 'شركة تعاود للمقاولات العامة' }).content = 'شركة تعاود للمقاولات العامة';
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      var rel = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      ['noopener', 'noreferrer'].forEach(function (token) { if (rel.indexOf(token) === -1) rel.push(token); });
      link.setAttribute('rel', rel.join(' '));
    });
    document.querySelectorAll('.float-btn').forEach(function (button) {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', button.href.indexOf('wa.me') !== -1 ? 'تواصل عبر واتساب' : 'اتصل بشركة تعاود');
    });
  }

  function addBreadcrumbSchema() {
    var breadcrumbs = document.querySelector('.breadcrumbs');
    if (!breadcrumbs || document.getElementById('tawod-breadcrumb-schema')) return;
    var items = [];
    breadcrumbs.querySelectorAll('a, span').forEach(function (element, index) {
      var text = (element.textContent || '').trim();
      if (!text) return;
      items.push({
        '@type': 'ListItem',
        position: index + 1,
        name: text,
        item: element.tagName.toLowerCase() === 'a' ? element.href : window.location.href.split('#')[0]
      });
    });
    if (!items.length) return;
    var script = document.createElement('script');
    script.id = 'tawod-breadcrumb-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items });
    document.head.appendChild(script);
  }

  function addPageSchema(state, context, articleStats) {
    var existing = document.getElementById('tawod-page-schema');
    if (existing) existing.remove();
    var canonical = document.querySelector('link[rel="canonical"]');
    var description = document.querySelector('meta[name="description"]');
    var image = document.querySelector('meta[property="og:image"]');
    var heading = document.querySelector('h1');
    var data = {
      '@context': 'https://schema.org',
      '@type': state.article ? 'Article' : 'WebPage',
      name: heading ? heading.textContent.trim() : document.title,
      headline: heading ? heading.textContent.trim() : document.title,
      description: description ? description.content : context.scope,
      url: canonical ? canonical.href : window.location.href.split('#')[0],
      inLanguage: 'ar-SA',
      dateModified: revisionDate,
      isPartOf: { '@type': 'WebSite', name: 'شركة تعاود للمقاولات العامة', url: window.location.origin + '/' },
      publisher: { '@type': 'Organization', name: 'شركة تعاود للمقاولات العامة', logo: { '@type': 'ImageObject', url: window.location.origin + '/images/logo/tawod-logo.png' } }
    };
    if (image) data.primaryImageOfPage = { '@type': 'ImageObject', url: image.content };
    if (state.article) {
      data.author = { '@type': 'Organization', name: 'شركة تعاود للمقاولات العامة' };
      data.mainEntityOfPage = data.url;
      if (articleStats) {
        data.wordCount = articleStats.words;
        data.timeRequired = 'PT' + articleStats.minutes + 'M';
      }
    } else {
      data.about = { '@type': 'Thing', name: context.name };
    }
    var script = document.createElement('script');
    script.id = 'tawod-page-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function comprehensiveFaqs(context, state) {
    var articleLead = state.article
      ? ['ما الفائدة العملية من هذا الدليل؟', 'يساعدك الدليل على فهم القرارات والنقاط التي يجب مراجعتها قبل التنفيذ أو التعاقد، حتى تقارن الخيارات على أساس واضح وتقلل التعديلات والمفاجآت أثناء المشروع.']
      : ['ما الذي تشمل ' + context.name + '؟', context.scope];
    return [
      articleLead,
      ['ما أنواع المشاريع المناسبة لهذا الموضوع؟', 'تنطبق المبادئ على الفلل والملاحق والمباني السكنية والتجارية والمكاتب والمحلات، مع اختلاف التفاصيل حسب حالة المشروع ونطاق الأعمال.'],
      ['كيف يتم تحديد تكلفة المشروع؟', 'تُحدد التكلفة بعد مراجعة ' + context.factors + ' ويُفضّل توفير مخططات أو صور أو جدول كميات إن وُجد للحصول على تقدير أدق.'],
      ['هل يحتاج المشروع إلى معاينة قبل عرض السعر؟', 'بعض الأعمال يمكن مناقشتها مبدئيًا من خلال المعلومات والصور، بينما تحتاج المشاريع الإنشائية أو أعمال الترميم والتشطيب المتكاملة إلى معاينة لفهم الحالة والقياسات والتحديات.'],
      ['كم تستغرق مدة التنفيذ؟', 'تعتمد المدة على حجم المشروع وعدد البنود وتسلسل التخصصات وتوفر المواد والموافقات والتعديلات. بعد تحديد النطاق يمكن وضع مدة تقديرية أو برنامج زمني مناسب.'],
      ['هل يمكن اختيار الخامات ومستوى التشطيب؟', 'نعم، تُناقش الخيارات وفق الاستخدام والميزانية والمتطلبات الفنية، مع توضيح الفروقات بين البدائل من حيث الجودة والصيانة والمظهر والتكلفة.'],
      ['كيف تتم متابعة جودة الأعمال؟', 'تتم المتابعة خلال المراحل المهمة، مع مراجعة التنسيق بين التخصصات وفحص التفاصيل قبل تغطيتها أو الانتقال للمرحلة التالية، ثم إغلاق الملاحظات قبل التسليم.'],
      ['هل يمكن تعديل بعض البنود أثناء التنفيذ؟', 'يمكن دراسة التعديلات قبل تنفيذها، مع توضيح أثرها على التكلفة والمدة وتسلسل الأعمال. الأفضل اعتماد القرارات مبكرًا لتجنب إعادة العمل أو التأخير.'],
      ['هل تخدمون جميع أحياء مدينة الرياض؟', 'نخدم مشاريع داخل مدينة الرياض، ويُراجع موقع المشروع وطبيعة الأعمال عند التواصل لتحديد الترتيبات المناسبة للمعاينة والتنفيذ.'],
      ['كيف أبدأ مناقشة المشروع أو طلب عرض السعر؟', 'أرسل نوع المشروع والموقع والمساحة والمرحلة الحالية والخدمة المطلوبة والصور أو المخططات المتاحة عبر نموذج التواصل أو واتساب، ثم تتم مراجعة التفاصيل وتحديد الخطوة التالية.']
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
        return { '@type': 'Question', name: item[0], acceptedAnswer: { '@type': 'Answer', text: item[1] } };
      })
    });
    document.head.appendChild(script);
  }

  function injectComprehensiveFaq(state, context) {
    var main = document.querySelector('main');
    if (!main || state.home || state.privacy) return;
    document.querySelectorAll('.seo-faq, #faq.tawod-faq-section').forEach(function (oldFaq) { oldFaq.remove(); });
    var items = comprehensiveFaqs(context, state);
    var section = document.createElement('section');
    section.id = 'faq';
    section.className = 'section-padding bg-light tawod-faq-section';
    section.innerHTML = '<div class="container"><div class="section-title reveal-up"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات واضحة حول ' + context.name + '</h2><p>معلومات تساعدك على فهم النطاق والتكلفة والمدة والمعاينة والمواد والمتابعة والتسليم قبل اتخاذ القرار.</p></div><div class="faq-wrap tawod-faq-grid reveal-up">' + faqMarkup(items) + '</div></div>';
    var sections = Array.prototype.filter.call(main.children, function (child) { return child.tagName && child.tagName.toLowerCase() === 'section'; });
    if (state.article || !sections.length) main.appendChild(section);
    else main.insertBefore(section, sections[sections.length - 1]);
    setupFaqAccordions(section);
    addFaqSchema(items);
  }

  function articleCatalog() {
    return [
      ['كيف تختار أفضل شركة مقاولات في الرياض؟', '/blog/best-contracting-company-riyadh/'],
      ['دليل البناء والإنشاءات في الرياض', '/blog/construction-building-riyadh/'],
      ['دليل بناء العظم في الرياض', '/blog/bone-construction-riyadh-guide/'],
      ['مقاول عظم وتسليم مفتاح في الرياض', '/blog/bone-contractor-turnkey-riyadh/'],
      ['دليل إدارة مشروع مقاولات في الرياض', '/blog/contracting-riyadh-project-guide/'],
      ['التشطيب والتصميم الداخلي في الرياض', '/blog/finishing-interior-design-riyadh/'],
      ['أعمال الكهرباء والسباكة والميكانيكا', '/blog/mechanical-mep-works-riyadh/'],
      ['تركيب وصيانة الكهرباء في الرياض', '/blog/electrical-installation-maintenance-riyadh/'],
      ['تأسيس وتمديد السباكة في الرياض', '/blog/plumbing-installation-riyadh/'],
      ['تشطيب الواجهات والترميم في الرياض', '/blog/finishing-facades-restoration-riyadh/'],
      ['الواجهات والديكور والعزل في الرياض', '/blog/facades-interior-decor-insulation-riyadh/'],
      ['دليل تسليم المفتاح في الرياض', '/blog/turnkey-construction-riyadh-guide/'],
      ['تسليم مفتاح للفلل في الرياض', '/blog/turnkey-villa-riyadh/'],
      ['ترميم وتجديد تسليم مفتاح', '/blog/turnkey-renovation-riyadh/'],
      ['تجهيز المحلات والمكاتب تسليم مفتاح', '/blog/turnkey-commercial-fitout-riyadh/'],
      ['قائمة مراجعة عقد تسليم المفتاح', '/blog/turnkey-contract-checklist-riyadh/'],
      ['دليل تشطيب الفلل في الرياض', '/blog/finishing-villa-riyadh-guide/'],
      ['تشطيب الشقق في الرياض', '/blog/finishing-apartment-riyadh/'],
      ['اختيار مواد التشطيب', '/blog/finishing-materials-riyadh/'],
      ['عوامل تكلفة التشطيب في الرياض', '/blog/finishing-cost-riyadh/'],
      ['أخطاء التشطيب الشائعة', '/blog/finishing-mistakes-riyadh/']
    ];
  }

  function relatedArticles(path) {
    var catalog = articleCatalog();
    var pattern = /finishing|decor|facades|interior/;
    if (/electrical|plumbing|mechanical|mep/.test(path)) pattern = /electrical|plumbing|mechanical|mep/;
    else if (/construction|bone|contracting|turnkey/.test(path)) pattern = /construction|bone|contracting|turnkey/;
    var matches = catalog.filter(function (item) { return pattern.test(item[1]) && path.indexOf(item[1]) === -1; });
    return matches.slice(0, 3).concat(catalog.filter(function (item) { return path.indexOf(item[1]) === -1 && matches.indexOf(item) === -1; }).slice(0, Math.max(0, 3 - matches.length)));
  }

  function slugSection(index) { return 'article-section-' + (index + 1); }

  function enhanceArticle(state) {
    if (!state.article) return null;
    var article = document.querySelector('.article-content');
    if (!article || article.dataset.enhanced === 'true') return null;
    article.dataset.enhanced = 'true';
    document.body.classList.add('tawod-article-page');
    var text = (article.textContent || '').replace(/\s+/g, ' ').trim();
    var words = text ? text.split(' ').filter(Boolean).length : 0;
    var minutes = Math.max(1, Math.ceil(words / 180));
    var stats = { words: words, minutes: minutes };

    var progress = document.createElement('div');
    progress.className = 'tawod-reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span></span>';
    document.body.insertBefore(progress, document.body.firstChild);
    var progressFill = progress.querySelector('span');
    function updateProgress() {
      var rect = article.getBoundingClientRect();
      var total = Math.max(1, article.offsetHeight - window.innerHeight * 0.55);
      var read = Math.min(total, Math.max(0, -rect.top + window.innerHeight * 0.35));
      progressFill.style.transform = 'scaleX(' + (read / total) + ')';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    var metaLine = document.querySelector('.article-meta-line');
    if (metaLine && !metaLine.querySelector('[data-reading-time]')) {
      var reading = document.createElement('span');
      reading.dataset.readingTime = 'true';
      reading.innerHTML = '<i class="fa-regular fa-clock" aria-hidden="true"></i> ' + minutes + ' دقائق قراءة';
      metaLine.appendChild(reading);
    }

    var headings = Array.prototype.slice.call(article.querySelectorAll('h2'));
    headings.forEach(function (heading, index) { if (!heading.id) heading.id = slugSection(index); });
    if (headings.length >= 3) {
      var toc = document.createElement('nav');
      toc.className = 'tawod-article-toc';
      toc.setAttribute('aria-label', 'فهرس المقال');
      toc.innerHTML = '<div class="tawod-article-toc-head"><span><i class="fa-solid fa-list-ul" aria-hidden="true"></i> محتويات المقال</span><small>انتقل مباشرة إلى القسم المطلوب</small></div><ol>' + headings.map(function (heading) { return '<li><a href="#' + heading.id + '">' + heading.textContent.trim() + '</a></li>'; }).join('') + '</ol>';
      var firstImage = article.querySelector(':scope > img');
      if (firstImage) firstImage.insertAdjacentElement('afterend', toc);
      else article.insertBefore(toc, article.firstChild);

      var takeaways = document.createElement('aside');
      takeaways.className = 'tawod-key-takeaways';
      takeaways.innerHTML = '<h2><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> ما الذي ستخرج به من هذا الدليل؟</h2><ul>' + headings.slice(0, 4).map(function (heading) { return '<li>' + heading.textContent.trim() + '</li>'; }).join('') + '</ul>';
      toc.insertAdjacentElement('afterend', takeaways);
    }

    var tools = document.createElement('div');
    tools.className = 'tawod-article-tools';
    tools.innerHTML = '<strong>وجدت الدليل مفيدًا؟</strong><div><button type="button" data-share-article><i class="fa-solid fa-share-nodes" aria-hidden="true"></i> مشاركة</button><button type="button" data-print-article><i class="fa-solid fa-print" aria-hidden="true"></i> طباعة</button><a href="https://wa.me/966551128884?text=' + encodeURIComponent(document.title + ' ' + window.location.href) + '" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> واتساب</a></div>';
    article.appendChild(tools);
    var shareButton = tools.querySelector('[data-share-article]');
    var printButton = tools.querySelector('[data-print-article]');
    if (shareButton) shareButton.addEventListener('click', function () {
      if (navigator.share) navigator.share({ title: document.title, url: window.location.href }).catch(function () {});
      else navigator.clipboard.writeText(window.location.href).then(function () { shareButton.innerHTML = '<i class="fa-solid fa-check"></i> تم نسخ الرابط'; }).catch(function () {});
    });
    if (printButton) printButton.addEventListener('click', function () { window.print(); });

    var related = relatedArticles(state.path);
    if (related.length) {
      var relatedSection = document.createElement('section');
      relatedSection.className = 'section-padding tawod-related-reading';
      relatedSection.innerHTML = '<div class="container"><div class="section-title"><span class="eyebrow">استكمل المعرفة</span><h2>أدلة مرتبطة تساعدك في قرار المشروع</h2><p>اخترنا لك موضوعات تكمل الصورة وتربط التخطيط بالتنفيذ والتشطيب والتسليم.</p></div><div class="tawod-related-grid">' + related.map(function (item) { return '<a class="tawod-related-card" href="' + item[1] + '"><span>دليل عملي</span><h3>' + item[0] + '</h3><strong>اقرأ المقال <i class="fa-solid fa-arrow-left" aria-hidden="true"></i></strong></a>'; }).join('') + '</div></div>';
      var main = document.querySelector('main');
      if (main) main.appendChild(relatedSection);
    }
    return stats;
  }

  function injectContextLinks(state, context) {
    if (state.home || state.privacy || state.article || document.querySelector('.tawod-context-links')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var links = [
      ['البناء والإنشاءات', '/service-construction.html', 'fa-trowel-bricks'],
      ['تسليم المفتاح', '/service-turnkey.html', 'fa-key'],
      ['الترميم والتجديد', '/service-restoration.html', 'fa-house-chimney-crack'],
      ['التشطيبات العامة', '/service-finishing.html', 'fa-paint-roller'],
      ['الديكور الداخلي', '/service-decor.html', 'fa-couch'],
      ['الكهرباء والسباكة', '/service-mep.html', 'fa-screwdriver-wrench']
    ];
    var section = document.createElement('section');
    section.className = 'section-padding tawod-context-links';
    section.innerHTML = '<div class="container"><div class="section-title"><span class="eyebrow">خدمات مترابطة</span><h2>اربط ' + context.name + ' بباقي مراحل مشروعك</h2><p>التنسيق المبكر بين الخدمات يقلل التعارضات ويجعل القرارات والخامات وتسلسل التنفيذ أكثر وضوحًا.</p></div><div class="tawod-context-grid">' + links.map(function (item) { return '<a href="' + item[1] + '"><i class="fa-solid ' + item[2] + '" aria-hidden="true"></i><span>' + item[0] + '</span><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></a>'; }).join('') + '</div></div>';
    var faq = document.getElementById('faq');
    if (faq) main.insertBefore(section, faq);
    else main.appendChild(section);
  }

  function removeMobileActionBar() {
    document.querySelectorAll('.mobile-action-bar').forEach(function (bar) { bar.remove(); });
    document.body.classList.add('no-mobile-action-bar');
  }

  function improveMediaLoading() {
    document.querySelectorAll('img').forEach(function (img, index) {
      img.decoding = 'async';
      if (index > 0 && !img.hasAttribute('loading')) img.loading = 'lazy';
      if (!img.alt) img.alt = 'شركة تعاود للمقاولات العامة في الرياض';
    });
    document.querySelectorAll('iframe').forEach(function (frame) {
      if (!frame.hasAttribute('loading')) frame.loading = 'lazy';
      if (!frame.getAttribute('title')) frame.title = 'محتوى مضمّن من شركة تعاود للمقاولات';
    });
  }

  function trackClicks() {
    document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'contact_click', { link_url: link.href, page_path: window.location.pathname, transport_type: 'beacon' });
        }
      });
    });
  }

  ready(function () {
    var state = pageState();
    var context = contextForPage(state);
    document.body.classList.toggle('tawod-service-page', state.service);
    document.body.classList.toggle('tawod-landing-page', state.landing);
    document.body.classList.toggle('tawod-blog-index-page', state.blogIndex);
    removeMobileActionBar();
    setupMobileMenu();
    fixBlogLinks();
    restoreBlogImages();
    cleanVisibleSeoKeywordBlocks();
    normalizeMetadata(state);
    addBreadcrumbSchema();
    applyServiceProfile(state, context);
    injectTrustStrip(state);
    var articleStats = enhanceArticle(state);
    injectComprehensiveFaq(state, context);
    injectContextLinks(state, context);
    addPageSchema(state, context, articleStats);
    setupRevealElements();
    improveMediaLoading();
    trackClicks();
    document.documentElement.classList.add('tawod-polished', 'tawod-system-ready');
    window.setTimeout(cleanVisibleSeoKeywordBlocks, 300);
  });
})();
