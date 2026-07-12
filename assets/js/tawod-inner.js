/* Shared inner pages interactions and SEO enhancements for Tawod */
(function () {
  'use strict';

  document.documentElement.classList.add('js-motion');

  var pageKey = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var configs = {
    'service-construction.html': {
      heading: 'تنفيذ أعمال البناء والإنشاءات بإدارة هندسية واضحة',
      intro: 'نحوّل المخططات والمتطلبات إلى مراحل تنفيذ منظمة، مع تنسيق الأعمال الإنشائية والتأسيسات ومراجعة النقاط المؤثرة في الجودة والمدة قبل الانتقال إلى المراحل التالية.',
      items: [
        ['ما أنواع مشاريع البناء التي تنفذها شركة تعاود؟','ننّفذ أعمال بناء الفلل والملاحق والمباني السكنية والتجارية والتوسعات حسب المخططات وحالة الموقع ومتطلبات المالك.'],
        ['هل تشمل الخدمة تنفيذ العظم فقط؟','يمكن الاتفاق على تنفيذ العظم فقط أو ربطه بالتأسيسات والتشطيب وتسليم المفتاح ضمن نطاق واحد.'],
        ['كيف يتم تحديد تكلفة البناء؟','تعتمد على المساحة والنظام الإنشائي والكميات وطبيعة الموقع والمخططات والمدة المطلوبة.'],
        ['هل تحتاجون مخططات قبل البدء؟','وجود مخططات معتمدة يرفع دقة التسعير والتنفيذ، ويمكن مراجعة المتاح وتحديد النواقص.'],
        ['كيف تتم متابعة جودة العظم؟','عبر نقاط فحص للأبعاد والتسليح والشدات والصب والعزل والأعمال المرتبطة قبل الانتقال للمرحلة التالية.'],
        ['هل تنفذون ملاحق أو توسعات؟','نعم، بعد فحص الموقع والحالة الإنشائية ومتطلبات الربط أو التدعيم.'],
        ['كم تستغرق مدة البناء؟','تختلف حسب المساحة والنوع وتوفر المخططات والمواد والاعتمادات.'],
        ['هل يمكن تعديل البنود أثناء التنفيذ؟','يمكن دراسة التعديل بعد تقييم أثره على التكلفة والمدة والأعمال المنفذة.'],
        ['هل تشمل الخدمة تنسيق الكهرباء والسباكة؟','يمكن تنسيق التأسيسات مع مراحل البناء لتقليل التعارضات وإعادة العمل.'],
        ['كيف أطلب عرض سعر؟','أرسل الموقع والمساحة والمخططات والصور ونوع المشروع والمرحلة المطلوبة.']
      ]
    },
    'service-turnkey.html': {
      heading: 'إدارة مشروع متكاملة من الفكرة حتى التسليم الجاهز',
      intro: 'تجمع خدمة تسليم المفتاح بين التخطيط والتنفيذ والتنسيق والفحص ضمن مسار واحد لتقليل تعدد المسؤوليات وتحسين وضوح القرارات والجدول.',
      items: [
        ['ما الذي يشمله تسليم المفتاح؟','يشمل البنود المتفق عليها من التخطيط والتنفيذ والتأسيسات والتشطيبات حتى الفحص والتسليم.'],
        ['هل يشمل التصميم واختيار المواد؟','يمكن أن يشمل التصميم وتنسيق المواد حسب نطاق العقد.'],
        ['كيف يتم تحديد السعر؟','بعد تحديد المساحة والمخططات ومستوى التشطيب والمواد ونطاق المسؤوليات.'],
        ['هل يمكن للمالك اختيار الخامات؟','نعم، ويتم توثيق الاختيارات والبدائل واعتمادها قبل التنفيذ.'],
        ['كيف تتم الدفعات؟','تربط عادة بمراحل تنفيذ واضحة حسب الاتفاق.'],
        ['هل يمكن تنفيذ فيلا كاملة؟','نعم، من الأعمال الأساسية حتى التشطيبات والتسليم.'],
        ['هل تشمل المشاريع التجارية؟','نعم، للمكاتب والمحلات والمساحات التجارية.'],
        ['كيف تدار التعديلات؟','يتم تقييم أثرها على التكلفة والمدة واعتمادها قبل التنفيذ.'],
        ['ما مدة المشروع؟','تختلف حسب المساحة ومستوى التشطيب وجاهزية المخططات والمواد.'],
        ['كيف أبدأ؟','أرسل المخططات والموقع والمساحة والمتطلبات لتحديد الخطوة التالية.']
      ]
    },
    'service-restoration.html': {
      heading: 'ترميم وتجديد يعالج المشكلة ويحسن قيمة المبنى',
      intro: 'نبدأ بفهم حالة المبنى وأسباب التلف ثم نحدد أولويات المعالجة والتجديد حتى لا تتحول أعمال الترميم إلى تحسين شكلي مؤقت.',
      items: [
        ['ما أنواع أعمال الترميم؟','معالجة التشققات والتسربات والعزل وتجديد الواجهات والمساحات الداخلية والتأسيسات.'],
        ['هل يتم فحص المبنى قبل التسعير؟','المعاينة مهمة لتحديد الحالة والأعمال الظاهرة والمحتملة.'],
        ['هل يمكن ترميم جزء فقط؟','نعم، مثل واجهة أو دور أو حمامات أو مطبخ.'],
        ['هل تعالجون التشققات؟','يتم تقييم نوع التشقق وسببه قبل اختيار المعالجة.'],
        ['هل يشمل الترميم العزل؟','يمكن أن يشمل عزل الأسطح والحمامات والمناطق الرطبة.'],
        ['هل يمكن العمل مع بقاء السكان؟','أحيانًا حسب نطاق الأعمال وإجراءات السلامة والغبار والضوضاء.'],
        ['كيف تحدد التكلفة؟','حسب حالة المبنى ومساحة العمل ودرجة الإزالة والمعالجة والمواد.'],
        ['كم تستغرق المدة؟','تختلف حسب حجم التلف ونطاق التجديد وتوفر المواد.'],
        ['هل يتم تحديث الكهرباء والسباكة؟','يمكن تحديثهما ضمن المشروع عند الحاجة.'],
        ['كيف أطلب معاينة؟','أرسل الموقع والصور ووصف المشكلة لتحديد المعاينة.']
      ]
    },
    'service-finishing.html': {
      heading: 'تشطيبات متناسقة تبدأ بالتنسيق قبل اختيار الشكل',
      intro: 'ننسق بين الأرضيات والدهانات والأسقف والإضاءة والتأسيسات والخامات حتى تعمل التفاصيل كوحدة واحدة.',
      items: [
        ['ما أعمال التشطيب التي تقدمونها؟','أرضيات ودهانات وأسقف وواجهات ونجارة وديكور وتنسيق كهرباء وسباكة.'],
        ['هل تنفذون تشطيب فلل وشقق؟','نعم، للمشاريع السكنية والتجارية.'],
        ['كيف أختار مستوى التشطيب؟','حسب الاستخدام والميزانية ومتطلبات الصيانة والمظهر المطلوب.'],
        ['هل توفرون المواد؟','يمكن أن يشمل العرض التوريد أو التنفيذ فقط حسب الاتفاق.'],
        ['كيف تحسب التكلفة؟','حسب المساحة والبنود والخامات وحالة الموقع ومستوى التفاصيل.'],
        ['هل يمكن التشطيب على مراحل؟','نعم، مع ترتيب يحمي الأعمال المنفذة.'],
        ['هل تنسقون الإضاءة والأسقف؟','نعم، لتجنب التعارضات وتحسين النتيجة النهائية.'],
        ['كم تستغرق المدة؟','حسب المساحة والبنود والاعتمادات وتوفر المواد.'],
        ['كيف يتم الاستلام؟','عبر مراجعة البنود والملاحظات ومعالجتها.'],
        ['ما المطلوب لعرض السعر؟','المخططات والمساحة والصور والبنود ومستوى الخامات.']
      ]
    },
    'service-decor.html': {
      heading: 'ديكور عملي يوازن بين الهوية والجمال وسهولة الاستخدام',
      intro: 'نربط التصميم بالخامات والإضاءة والأثاث والحركة داخل المكان حتى لا يكون الديكور مجرد شكل منفصل عن احتياجات المستخدم.',
      items: [
        ['ما خدمات الديكور؟','تصميم وتنفيذ ديكورات داخلية وخارجية وأسقف وجدران وإضاءة وعناصر مخصصة.'],
        ['هل تعملون للمنازل والمكاتب؟','نعم، للمنازل والفلل والمكاتب والمحلات.'],
        ['هل يبدأ العمل بتصميم؟','يفضل تحديد التصور والمقاسات والخامات قبل التنفيذ.'],
        ['هل يمكن تنفيذ تصميم جاهز؟','نعم، بعد مراجعته فنيًا.'],
        ['كيف تختارون الخامات؟','حسب الاستخدام والجودة والصيانة والميزانية.'],
        ['هل تشمل الخدمة الإضاءة؟','يمكن تنسيق نقاط وأنواع الإضاءة مع التصميم.'],
        ['هل تنفذون واجهات؟','نعم، حسب نوع الواجهة والمواد المناسبة.'],
        ['كم تستغرق المدة؟','حسب حجم المكان وتعقيد التفاصيل وتوفر المواد.'],
        ['هل يمكن تنفيذ جزء محدد؟','نعم، مثل مجلس أو مدخل أو مكتب أو محل.'],
        ['كيف أبدأ؟','أرسل الصور والمقاسات والستايل المطلوب والميزانية التقريبية.']
      ]
    },
    'service-mep.html': {
      heading: 'تأسيسات كهرباء وسباكة وميكانيكا تحمي مراحل التشطيب',
      intro: 'الأعمال المخفية هي أساس الاستخدام الآمن والمريح، لذلك نركز على التخطيط والاختبار والتنسيق قبل إغلاق الجدران والأسقف.',
      items: [
        ['ما الذي تشمل أعمال MEP؟','الكهرباء والسباكة والميكانيكا والتكييف والتنسيق بينها.'],
        ['هل تنفذون تأسيسًا جديدًا؟','نعم، للمشاريع الجديدة والتجديدات.'],
        ['هل تصلحون الأعطال؟','يمكن تنفيذ أعمال صيانة وتعديل حسب الحالة.'],
        ['لماذا التنسيق قبل التشطيب مهم؟','لمنع التعارضات والتكسير وإعادة العمل بعد تركيب الخامات.'],
        ['هل يتم اختبار السباكة؟','يجب اختبار التغذية والصرف والعزل قبل الإغلاق.'],
        ['هل تراجعون الأحمال الكهربائية؟','يتم توزيع الدوائر والنقاط وفق الاستخدام والمعدات.'],
        ['هل يمكن تحديث مبنى قديم؟','نعم، بعد فحص الشبكات الحالية.'],
        ['كيف تحدد التكلفة؟','حسب عدد النقاط والمسارات والأحمال والمواد وحالة الموقع.'],
        ['كم تستغرق الأعمال؟','حسب حجم المشروع ومرحلة البناء والتنسيق مع الفرق الأخرى.'],
        ['كيف أطلب عرض سعر؟','أرسل المخططات أو عدد النقاط ووصف الأعمال والصور.']
      ]
    }
  };

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback);
    else callback();
  }

  function setupMobileMenu() {
    var menuBtn = document.getElementById('menuBtn');
    var closeBtn = document.getElementById('closeSidebar');
    var sidebar = document.getElementById('mobileSidebar');
    var overlay = document.getElementById('sidebarOverlay');
    function openMenu() { if (sidebar) sidebar.classList.add('active'); if (overlay) overlay.classList.add('active'); document.body.classList.add('menu-open'); }
    function closeMenu() { if (sidebar) sidebar.classList.remove('active'); if (overlay) overlay.classList.remove('active'); document.body.classList.remove('menu-open'); }
    if (menuBtn) menuBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
    document.querySelectorAll('.mobile-sidebar a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  }

  function setupReveal() {
    var elements = document.querySelectorAll('.reveal-up, .reveal, [data-reveal]');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('active'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('active'); obs.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    elements.forEach(function (el) { observer.observe(el); });
  }

  function addAuthoritySection(config) {
    if (!config || document.querySelector('.inner-authority')) return;
    var firstSection = document.querySelector('main .section-padding');
    if (!firstSection) return;
    var section = document.createElement('section');
    section.className = 'section-padding bg-light inner-authority';
    section.innerHTML = '<div class="container"><div class="section-title reveal-up"><span class="eyebrow">منهجية التنفيذ</span><h2>' + config.heading + '</h2><p>' + config.intro + '</p></div><div class="inner-authority-grid"><article class="inner-pillar reveal-up"><i class="fa-solid fa-list-check"></i><h3>نطاق واضح</h3><p>تحديد البنود والمراحل والمسؤوليات قبل بدء التنفيذ.</p></article><article class="inner-pillar reveal-up delay-100"><i class="fa-solid fa-people-group"></i><h3>تنسيق الفرق</h3><p>ربط التخصصات ضمن تسلسل عمل يقلل التعارضات.</p></article><article class="inner-pillar reveal-up delay-200"><i class="fa-solid fa-magnifying-glass"></i><h3>مراجعة مرحلية</h3><p>فحص النقاط المؤثرة قبل الانتقال إلى المرحلة التالية.</p></article><article class="inner-pillar reveal-up delay-300"><i class="fa-solid fa-clipboard-check"></i><h3>تسليم منظم</h3><p>تجميع الملاحظات ومراجعة نطاق الأعمال قبل الاستلام.</p></article></div></div>';
    firstSection.parentNode.insertBefore(section, firstSection.nextSibling);
  }

  function addFaq(config) {
    if (!config || document.querySelector('.tawod-inner-faq')) return;
    var main = document.querySelector('main');
    var cta = main ? main.querySelector('.mini-cta') : null;
    var hostSection = cta ? cta.closest('section') : null;
    if (!main) return;
    var section = document.createElement('section');
    section.className = 'section-padding tawod-inner-faq';
    section.innerHTML = '<div class="container"><div class="section-title reveal-up"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات مهمة قبل بدء الخدمة</h2><p>إجابات عملية تساعدك على فهم نطاق العمل والتكلفة والمدة وخطوات التنفيذ قبل اتخاذ القرار.</p></div><div class="faq-wrap">' + config.items.map(function (item, index) {
      return '<div class="faq-item reveal-up"><button class="faq-question" type="button" aria-expanded="false"><span>' + item[0] + '</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer"><p>' + item[1] + '</p></div></div>';
    }).join('') + '</div></div>';
    if (hostSection) main.insertBefore(section, hostSection);
    else main.appendChild(section);

    section.querySelectorAll('.faq-question').forEach(function (button) {
      button.addEventListener('click', function () {
        var item = button.closest('.faq-item');
        var answer = item.querySelector('.faq-answer');
        section.querySelectorAll('.faq-item.active').forEach(function (openItem) {
          if (openItem !== item) { openItem.classList.remove('active'); openItem.querySelector('.faq-answer').style.maxHeight = null; openItem.querySelector('.faq-question').setAttribute('aria-expanded','false'); }
        });
        item.classList.toggle('active');
        var active = item.classList.contains('active');
        button.setAttribute('aria-expanded', active ? 'true' : 'false');
        answer.style.maxHeight = active ? answer.scrollHeight + 'px' : null;
      });
    });
  }

  function addSchema(config) {
    if (!config || document.getElementById('tawod-inner-faq-schema')) return;
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'tawod-inner-faq-schema';
    script.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@graph':[
        {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'الرئيسية','item':'https://tawodco.com/'},{'@type':'ListItem','position':2,'name':document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : document.title,'item':window.location.href.split('#')[0]}]},
        {'@type':'FAQPage','mainEntity':config.items.map(function (item) { return {'@type':'Question','name':item[0],'acceptedAnswer':{'@type':'Answer','text':item[1]}}; })}
      ]
    });
    document.head.appendChild(script);
  }

  function removeMobileBar() { document.querySelectorAll('.mobile-action-bar').forEach(function (bar) { bar.remove(); }); }

  function trackClicks() {
    document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (typeof window.gtag === 'function') window.gtag('event','contact_click',{link_url:link.href});
      });
    });
  }

  ready(function () {
    var config = configs[pageKey];
    removeMobileBar();
    setupMobileMenu();
    addAuthoritySection(config);
    addFaq(config);
    addSchema(config);
    setupReveal();
    trackClicks();
  });
})();
