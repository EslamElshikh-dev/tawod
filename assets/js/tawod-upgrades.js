/* Tawod homepage authority, conversion and SEO upgrades */
(function () {
  'use strict';

  document.documentElement.classList.add('js-motion');

  var HOME_FAQS = [
    {
      q: 'ما الخدمات التي تقدمها شركة تعاود للمقاولات العامة في الرياض؟',
      a: 'تقدم شركة تعاود حلول مقاولات متكاملة تشمل البناء والإنشاءات، تنفيذ العظم، تسليم المفتاح، ترميم وتجديد المباني، التشطيبات الداخلية والخارجية، الديكور، وأعمال الكهرباء والسباكة والميكانيكا للمشاريع السكنية والتجارية في الرياض.'
    },
    {
      q: 'هل تنفذون مشاريع الفلل والمباني السكنية والتجارية؟',
      a: 'نعم، نستقبل مشاريع الفلل والملاحق والمباني السكنية والمكاتب والمحلات والمساحات التجارية، ويتم تحديد فريق التنفيذ وخطة العمل وفق مساحة المشروع وطبيعته وحالته الإنشائية ومتطلبات المالك.'
    },
    {
      q: 'ما المقصود بخدمة تسليم مفتاح؟',
      a: 'خدمة تسليم المفتاح تعني إدارة مراحل المشروع ضمن نطاق متفق عليه، بداية من دراسة المتطلبات والتخطيط والتنسيق بين الأعمال، مرورًا بالبناء والتأسيسات والتشطيبات، وحتى الفحص والتسليم النهائي الجاهز للاستخدام.'
    },
    {
      q: 'كيف يتم تحديد تكلفة مشروع البناء أو التشطيب؟',
      a: 'تتحدد التكلفة بعد معرفة مساحة المشروع وحالته ونطاق الأعمال ومستوى المواد والتشطيب والمدة المطلوبة. المعاينة والمخططات وجداول الكميات تساعد على تقديم عرض أوضح من الاعتماد على سعر عام غير مرتبط بتفاصيل المشروع.'
    },
    {
      q: 'هل يمكن طلب معاينة للموقع قبل تقديم عرض السعر؟',
      a: 'يمكن ترتيب معاينة للموقع عند الحاجة لمراجعة الحالة الحالية، القياسات، سهولة الوصول، الأعمال القائمة والمتطلبات الفنية. بعد المعاينة يتم توضيح نطاق العمل والخطوات المقترحة بصورة أدق.'
    },
    {
      q: 'كيف تتابعون جودة التنفيذ أثناء المشروع؟',
      a: 'تعتمد المتابعة على تقسيم المشروع إلى مراحل واضحة، مراجعة الأعمال قبل الانتقال للمرحلة التالية، تنسيق التخصصات، فحص النقاط المؤثرة في التشطيب، وتوثيق الملاحظات الأساسية حتى الوصول إلى نتيجة متناسقة وقابلة للاستلام.'
    },
    {
      q: 'هل يتم تحديد مدة التنفيذ قبل بدء العمل؟',
      a: 'يتم وضع مدة تقديرية وجدول للمراحل بعد اعتماد نطاق العمل وتوفر المواد وجاهزية الموقع. وقد تتأثر المدة بالتعديلات الإضافية أو الأعمال غير الظاهرة أو تأخر الاعتمادات، لذلك نحرص على توضيح هذه العوامل من البداية.'
    },
    {
      q: 'هل يمكن تنفيذ جزء محدد من المشروع فقط؟',
      a: 'نعم، يمكن الاتفاق على خدمة مستقلة مثل العظم، الترميم، التشطيب، الديكور، الكهرباء أو السباكة، كما يمكن دمج عدة تخصصات ضمن عقد واحد عندما يكون ذلك أنسب لتنظيم المشروع وتقليل التعارضات.'
    },
    {
      q: 'ما المعلومات المطلوبة للحصول على عرض مبدئي؟',
      a: 'يفضل إرسال نوع المشروع، الموقع داخل الرياض، المساحة التقريبية، صور أو مخططات إن وجدت، وصف الأعمال المطلوبة، مستوى التشطيب المتوقع، والموعد المناسب للبدء. كلما كانت المعلومات أوضح كان التقدير المبدئي أدق.'
    },
    {
      q: 'كيف أتواصل مع شركة تعاود لبدء مشروعي؟',
      a: 'يمكن التواصل مباشرة عبر الاتصال أو واتساب وإرسال تفاصيل المشروع والصور والمخططات المتاحة. يقوم الفريق بمراجعة الطلب وتحديد الخطوة التالية، سواء كانت استشارة أولية أو معاينة أو إعداد نطاق عمل وعرض سعر.'
    }
  ];

  function text(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function html(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.innerHTML = value;
  }

  function setMeta(name, value) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (meta) meta.setAttribute('content', value);
  }

  function removeMobileActionBar() {
    document.querySelectorAll('.mobile-action-bar').forEach(function (bar) {
      bar.remove();
    });
  }

  function strengthenHomepageCopy() {
    if (!document.querySelector('.hero') || !document.getElementById('services')) return;

    document.title = 'شركة تعاود للمقاولات العامة بالرياض | بناء وتشطيب وترميم وتسليم مفتاح';
    setMeta('description', 'شركة تعاود للمقاولات العامة بالرياض لإدارة وتنفيذ مشاريع البناء والعظم وتسليم المفتاح والترميم والتشطيب والديكور وأعمال الكهرباء والسباكة للمشاريع السكنية والتجارية.');

    html('.hero-badge', '<i class="fa-solid fa-award"></i> شركة مقاولات عامة بالرياض بإدارة هندسية وتنفيذ متكامل');
    html('.hero h1', 'نحوّل خطط البناء إلى مشاريع متقنة<br><span>شركة تعاود للمقاولات العامة بالرياض</span>');
    text('.hero p', 'ندير وننفذ مشاريع البناء والترميم والتشطيب للمنازل والفلل والمنشآت التجارية من دراسة المتطلبات وتنسيق التخصصات حتى الفحص والتسليم، مع وضوح في نطاق الأعمال ومتابعة دقيقة للتفاصيل المؤثرة في الجودة والمدة والتكلفة.');

    var trustItems = document.querySelectorAll('.trust-item');
    var trustData = [
      ['إدارة هندسية', 'تخطيط ومتابعة لمراحل المشروع'],
      ['نطاق عمل واضح', 'بنود ومراحل ومسؤوليات محددة'],
      ['ضبط جودة التنفيذ', 'مراجعة الأعمال قبل التسليم'],
      ['تواصل مباشر', 'متابعة سريعة عبر الاتصال والواتساب']
    ];
    trustItems.forEach(function (item, index) {
      if (!trustData[index]) return;
      var strong = item.querySelector('strong');
      var span = item.querySelector('span');
      if (strong) strong.textContent = trustData[index][0];
      if (span) span.textContent = trustData[index][1];
    });

    text('#about .section-title h2', 'شريك تنفيذ يدير تفاصيل المشروع من البداية حتى التسليم');
    text('#about .section-title p', 'شركة تعاود للمقاولات العامة في الرياض تقدم منظومة تنفيذ مترابطة للمشاريع السكنية والتجارية، تجمع بين دراسة المتطلبات والتخطيط وتنسيق فرق العمل ومتابعة الجودة، حتى يحصل العميل على مشروع منظم ونتيجة تتوافق مع الاستخدام والتصميم المتفق عليه.');

    var aboutFeatures = document.querySelectorAll('#about .about-features li');
    var aboutData = [
      'إدارة متكاملة لأعمال البناء والعظم والترميم والتشطيب',
      'تنسيق مبكر بين الإنشاء والكهرباء والسباكة والديكور',
      'متابعة مرحلية تقلل التعارضات والتعديلات غير المخططة',
      'حلول مناسبة للفلل والمنازل والمكاتب والمشاريع التجارية'
    ];
    aboutFeatures.forEach(function (item, index) {
      if (!aboutData[index]) return;
      var icon = item.querySelector('i');
      item.textContent = aboutData[index];
      if (icon) item.prepend(icon);
    });

    text('#services .section-title h2', 'خدمات مقاولات متكاملة تغطي دورة المشروع بالكامل');
    text('#services .section-title p', 'نربط بين التخطيط والأعمال الإنشائية والتأسيسات والتشطيبات ضمن مسار واضح يساعد على حماية الجودة وتقليل التعارضات والوصول إلى تسليم أكثر تنظيمًا.');

    var serviceDescriptions = [
      'تنفيذ أعمال البناء والعظم للفلل والملاحق والمباني السكنية والتجارية، مع تنظيم المراحل ومتابعة الأعمال الأساسية والتنسيق مع التخصصات المرتبطة بالمشروع.',
      'إدارة المشروع ضمن نطاق متكامل يبدأ من التخطيط وتجهيز الموقع ويمر بالإنشاء والتأسيسات والتشطيبات حتى الفحص والتسليم الجاهز للاستخدام.',
      'إعادة تأهيل المباني ومعالجة عناصر التلف وتجديد الواجهات والمساحات الداخلية وتحسين كفاءة الاستخدام وفق حالة المبنى وأهداف المالك.',
      'تشطيبات داخلية وخارجية تشمل تنسيق المواد والأرضيات والدهانات والأسقف والواجهات، مع الاهتمام بالتفاصيل التي تؤثر في الجودة والمظهر النهائي.',
      'تصميم وتنفيذ حلول ديكور عملية للمنازل والمكاتب والمحلات، مع تنسيق الألوان والخامات والإضاءة والفراغات بما يناسب هوية المكان واستخدامه.',
      'تأسيس وتنفيذ وتنسيق أعمال الكهرباء والسباكة والميكانيكا، مع مراجعة المسارات والنقاط قبل إغلاق الجدران والأسقف وحماية مراحل التشطيب التالية.'
    ];
    document.querySelectorAll('#services .premium-card .card-body p').forEach(function (paragraph, index) {
      if (serviceDescriptions[index]) paragraph.textContent = serviceDescriptions[index];
    });

    text('#why-us .section-title h2', 'منهجية تنفيذ تقلل المخاطر وتحافظ على وضوح المشروع');
    text('#why-us .section-title p', 'قوة التنفيذ لا تعتمد على العمالة فقط، بل على التخطيط وتتابع القرارات والتنسيق بين التخصصات ومراجعة كل مرحلة قبل البناء عليها.');

    var whyDescriptions = [
      'نراجع المتطلبات والمخططات والموقع ونحدد نقاط القرار والمواد والمراحل قبل بدء التنفيذ لتقليل التغييرات المتأخرة.',
      'نتابع الأعمال الأساسية والتأسيسات والتشطيبات وفق نقاط مراجعة مرحلية تساعد على اكتشاف الملاحظات قبل انتقالها إلى مراحل لاحقة.',
      'نوضح المستجدات والقرارات المطلوبة ونوفر قنوات اتصال مباشرة تساعد صاحب المشروع على متابعة الأعمال دون تعقيد.',
      'نوحد تنسيق البناء والكهرباء والسباكة والتشطيب والديكور ضمن مسار واحد لتقليل التعارضات بين الفرق والبنود.'
    ];
    document.querySelectorAll('#why-us .why-card p').forEach(function (paragraph, index) {
      if (whyDescriptions[index]) paragraph.textContent = whyDescriptions[index];
    });

    text('#process .section-title h2', 'مسار عمل واضح من دراسة المشروع حتى الاستلام');
    text('#process .section-title p', 'نقسم المشروع إلى مراحل يمكن متابعتها وقياس تقدمها، مع تحديد القرارات المطلوبة قبل كل مرحلة لتقليل التأخير وإعادة العمل.');
    var processDescriptions = [
      'استلام تفاصيل المشروع وفهم الأهداف والاستخدام والميزانية المتوقعة وترتيب المعاينة عند الحاجة.',
      'تحديد البنود والمواد والمراحل والمسؤوليات والمدة التقديرية وفق المعلومات والمخططات المتاحة.',
      'تنظيم فرق التنفيذ ومتابعة تسلسل الأعمال والتنسيق بين التخصصات خلال مراحل المشروع.',
      'فحص الأعمال النهائية والتشطيبات وتجميع الملاحظات ومعالجتها قبل اعتماد التسليم.',
      'تسليم المشروع بعد مراجعة النطاق المتفق عليه وتوضيح المعلومات الأساسية المتعلقة بالاستخدام والصيانة.'
    ];
    document.querySelectorAll('#process .process-card p').forEach(function (paragraph, index) {
      if (processDescriptions[index]) paragraph.textContent = processDescriptions[index];
    });

    text('#projects .section-title h2', 'مجالات تنفيذ نخطط لها بعناية وننفذها بمعايير واضحة');
    text('#projects .section-title p', 'نعمل على مشاريع سكنية وتجارية متنوعة، ونركز في كل مشروع على ملاءمة الحل لطبيعة الموقع وتنسيق مراحل التنفيذ وتحقيق نتيجة عملية قابلة للاستخدام والاستلام.');

    text('#testimonials .section-title .eyebrow', 'تجربة العميل');
    text('#testimonials .section-title h2', 'ما الذي يتوقعه العميل عند العمل مع تعاود؟');
    text('#testimonials .section-title p', 'تجربة مقاولات أكثر وضوحًا تقوم على تنظيم القرارات والمتابعة المرحلية والتواصل المباشر حتى يكون صاحب المشروع على معرفة بمسار التنفيذ.');
    var experienceCards = [
      ['وضوح قبل البدء', 'نساعد على تحديد نطاق الأعمال والبنود والمواد والقرارات الأساسية قبل انطلاق التنفيذ لتقليل المفاجآت والتغييرات المتأخرة.'],
      ['متابعة أثناء التنفيذ', 'يتم تقسيم الأعمال إلى مراحل ومراجعة النقاط المؤثرة في الجودة قبل الانتقال إلى التشطيبات أو إغلاق الأعمال المخفية.'],
      ['تسليم منظم', 'نجمع الملاحظات النهائية ونراجع الأعمال ضمن النطاق المتفق عليه حتى تكون عملية الاستلام أكثر وضوحًا وترتيبًا.']
    ];
    document.querySelectorAll('#testimonials .testimonial-card').forEach(function (card, index) {
      var data = experienceCards[index];
      if (!data) return;
      var stars = card.querySelector('.stars');
      if (stars) stars.remove();
      var paragraph = card.querySelector('p');
      if (paragraph) paragraph.textContent = data[1];
      var client = card.querySelector('.client');
      if (client) client.innerHTML = '<span><i class="fa-solid fa-check"></i></span>' + data[0];
    });

    text('#blog .section-title h2', 'معرفة عملية تساعدك قبل قرار البناء أو الترميم');
    text('#blog .section-title p', 'مقالات متخصصة تشرح مراحل المشاريع وأخطاء التنفيذ واختيار المقاول والمواد والتشطيبات، لتساعدك على اتخاذ قرارات أكثر وعيًا قبل التعاقد وأثناء العمل.');

    text('#faq .section-title h2', 'إجابات واضحة عن أهم أسئلة مشاريع المقاولات في الرياض');
  }

  function addExecutiveSection() {
    if (!document.getElementById('about') || document.querySelector('.executive-section')) return;
    var services = document.getElementById('services');
    if (!services) return;

    var section = document.createElement('section');
    section.className = 'section-padding executive-section';
    section.setAttribute('aria-labelledby', 'executiveTitle');
    section.innerHTML =
      '<div class="container">' +
        '<div class="executive-intro reveal-up">' +
          '<span class="eyebrow">إدارة المشروع</span>' +
          '<h2 id="executiveTitle">المقاولات الاحترافية تبدأ بإدارة القرارات قبل إدارة العمالة</h2>' +
          '<p>ننظر إلى المشروع باعتباره سلسلة مترابطة من القرارات الفنية والتنفيذية. لذلك نركز على وضوح النطاق، ترتيب المراحل، اعتماد المواد في الوقت المناسب، وتنسيق الأعمال المخفية قبل الانتقال إلى التشطيبات النهائية.</p>' +
        '</div>' +
        '<div class="executive-grid">' +
          '<article class="executive-card reveal-up"><i class="fa-solid fa-compass-drafting"></i><h3>دراسة وتخطيط</h3><p>نراجع المتطلبات والموقع والمخططات ونحدد نقاط القرار التي تؤثر في التكلفة والمدة وجودة الاستخدام.</p><ul><li>تحديد نطاق الأعمال</li><li>مراجعة الأولويات والمواد</li><li>ترتيب مراحل التنفيذ</li></ul></article>' +
          '<article class="executive-card reveal-up delay-100"><i class="fa-solid fa-people-group"></i><h3>تنسيق التخصصات</h3><p>نربط بين الإنشاء والكهرباء والسباكة والتكييف والديكور لتقليل التعارضات وإعادة العمل.</p><ul><li>مراجعة المسارات والنقاط</li><li>تنسيق الأعمال المخفية</li><li>حماية مراحل التشطيب</li></ul></article>' +
          '<article class="executive-card reveal-up delay-200"><i class="fa-solid fa-shield-halved"></i><h3>مراجعة وتسليم</h3><p>نستخدم مراجعات مرحلية ونهائية لتجميع الملاحظات ومعالجتها قبل اعتماد الاستلام.</p><ul><li>فحص الأعمال المنفذة</li><li>إدارة الملاحظات</li><li>تسليم أكثر تنظيمًا</li></ul></article>' +
        '</div>' +
      '</div>';
    services.parentNode.insertBefore(section, services);
  }

  function renderFaqs() {
    var wrap = document.querySelector('#faq .faq-wrap');
    if (!wrap) return;
    wrap.innerHTML = HOME_FAQS.map(function (item, index) {
      var id = 'home-faq-' + (index + 1);
      return '<div class="faq-item">' +
        '<button class="faq-question" type="button" aria-expanded="false" aria-controls="' + id + '">' +
          '<span>' + item.q + '</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>' +
        '</button>' +
        '<div class="faq-answer" id="' + id + '"><p>' + item.a + '</p></div>' +
      '</div>';
    }).join('');
  }

  function updateFaqSchema() {
    var entities = HOME_FAQS.map(function (item) {
      return {
        '@type': 'Question',
        'name': item.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': item.a }
      };
    });

    var updated = false;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      if (updated) return;
      try {
        var data = JSON.parse(script.textContent);
        if (data && Array.isArray(data['@graph'])) {
          var faq = data['@graph'].find(function (node) { return node && node['@type'] === 'FAQPage'; });
          if (faq) {
            faq.mainEntity = entities;
            script.textContent = JSON.stringify(data);
            updated = true;
          }
        }
      } catch (error) {
        /* Keep page functional if third-party JSON-LD is malformed. */
      }
    });

    if (!updated) {
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'tawod-home-faq-schema';
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': entities });
      document.head.appendChild(script);
    }
  }

  function improveFaqAccessibility() {
    document.querySelectorAll('#faq .faq-question').forEach(function (button) {
      button.addEventListener('click', function () {
        window.setTimeout(function () {
          var item = button.closest('.faq-item');
          button.setAttribute('aria-expanded', item && item.classList.contains('active') ? 'true' : 'false');
          document.querySelectorAll('#faq .faq-question').forEach(function (other) {
            if (other !== button) other.setAttribute('aria-expanded', 'false');
          });
        }, 0);
      });
    });
  }

  function polishHomepageBlogCards() {
    var cards = document.querySelectorAll('#blog .blog-card');
    if (!cards.length) return;
    var data = [
      { img: 'images/blog/best-contracting-company-riyadh.webp', alt: 'اختيار أفضل شركة مقاولات في الرياض', title: 'كيف تختار أفضل شركة مقاولات في الرياض؟', text: 'دليل عملي لمقارنة شركات المقاولات من حيث وضوح العرض وخبرة التنفيذ وتنظيم مراحل المشروع وآلية المتابعة والتسليم.' },
      { img: 'images/blog/finishing-interior-design-riyadh.webp', alt: 'التشطيب والتصميم الداخلي في الرياض', title: 'دليل التشطيب والتصميم الداخلي في الرياض', text: 'خطوات تنسيق المواد والألوان والإضاءة والكهرباء والسباكة قبل التشطيب للوصول إلى مساحة عملية ومظهر متناسق.' },
      { img: 'images/blog/mechanical-mep-works-riyadh.webp', alt: 'أعمال الكهرباء والسباكة والميكانيكا في الرياض', title: 'تخطيط أعمال الكهرباء والسباكة قبل التشطيب', text: 'كيف يساعد تخطيط أعمال MEP مبكرًا على تقليل التعارضات وحماية التشطيبات وتحسين جودة الاستخدام بعد التسليم.' }
    ];
    cards.forEach(function (card, index) {
      var item = data[index];
      if (!item) return;
      var img = card.querySelector('.card-img');
      var title = card.querySelector('h3');
      var paragraph = card.querySelector('p');
      if (img) { img.src = item.img; img.alt = item.alt; img.loading = 'lazy'; img.decoding = 'async'; }
      if (title) title.textContent = item.title;
      if (paragraph) paragraph.textContent = item.text;
    });
  }

  function setupLazyMap() {
    var mapButton = document.querySelector('[data-load-map]');
    var mapHolder = document.querySelector('[data-map-holder]');
    function loadMap() {
      if (!mapButton || !mapHolder || mapHolder.dataset.loaded === 'true') return;
      var src = mapButton.getAttribute('data-map-src');
      if (!src) return;
      mapHolder.dataset.loaded = 'true';
      mapHolder.innerHTML = '<iframe title="موقع شركة تعاود في الرياض" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="' + src + '"></iframe>';
    }
    if (mapButton) mapButton.addEventListener('click', loadMap);
    if (mapHolder && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          window.setTimeout(loadMap, 450);
          observer.disconnect();
        }
      }, { rootMargin: '180px 0px' });
      observer.observe(mapHolder);
    }
  }

  function runBeforeReady() {
    removeMobileActionBar();
    strengthenHomepageCopy();
    addExecutiveSection();
    renderFaqs();
    updateFaqSchema();
    polishHomepageBlogCards();
  }

  if (document.body) runBeforeReady();
  else document.addEventListener('DOMContentLoaded', runBeforeReady, { once: true });

  document.addEventListener('DOMContentLoaded', function () {
    removeMobileActionBar();
    improveFaqAccessibility();
    setupLazyMap();
  });
})();
