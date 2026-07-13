/* Tawod upgrade interactions: content strength, FAQ, lazy map and UX helpers */
(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function setHtml(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.innerHTML = value;
  }

  function setListText(selector, values) {
    document.querySelectorAll(selector).forEach(function (element, index) {
      if (values[index]) element.textContent = values[index];
    });
  }

  function polishHomepageBlogCards() {
    var cards = document.querySelectorAll('#blog .blog-card');
    if (!cards.length) return;
    var data = [
      {
        img: 'images/blog/best-contracting-company-riyadh.webp',
        alt: 'اختيار أفضل شركة مقاولات في الرياض',
        title: 'كيف تختار أفضل شركة مقاولات في الرياض؟',
        text: 'دليل عملي يساعدك على مقارنة شركات المقاولات حسب وضوح العرض، خبرة التنفيذ، جودة التواصل، تنظيم مراحل المشروع، وآلية تسليم الأعمال.'
      },
      {
        img: 'images/blog/finishing-interior-design-riyadh.webp',
        alt: 'التشطيب والتصميم الداخلي في الرياض',
        title: 'دليل التشطيب والتصميم الداخلي في الرياض',
        text: 'تعرف على خطوات تنسيق المواد والألوان والإضاءة والكهرباء والسباكة قبل التشطيب للحصول على مساحة عملية ومظهر احترافي.'
      },
      {
        img: 'images/blog/mechanical-mep-works-riyadh.webp',
        alt: 'أعمال الكهرباء والسباكة والميكانيكا في الرياض',
        title: 'أعمال الكهرباء والسباكة في المشاريع',
        text: 'شرح لأهمية تخطيط أعمال MEP مبكرًا لتقليل التعارضات، حماية التشطيب، وتحسين جودة الاستخدام بعد التسليم.'
      }
    ];
    cards.forEach(function (card, index) {
      var item = data[index];
      if (!item) return;
      var img = card.querySelector('.card-img');
      var title = card.querySelector('h3');
      var text = card.querySelector('p');
      if (img) {
        img.src = item.img;
        img.alt = item.alt;
        img.loading = 'lazy';
        img.decoding = 'async';
      }
      if (title) title.textContent = item.title;
      if (text) text.textContent = item.text;
    });
  }

  function strengthenHomepageContent() {
    setHtml('.hero-badge', '<i class="fa-solid fa-award"></i> شركة مقاولات عامة في الرياض بإدارة هندسية وتنفيذ متكامل');
    setHtml('.hero h1', 'نبني مشروعك على أسس واضحة ونحوّل التفاصيل إلى نتيجة تليق باستثمارك <span>شركة تعاود للمقاولات العامة بالرياض</span>');
    setText('.hero p', 'نقدّم حلول المقاولات العامة للمشاريع السكنية والتجارية في الرياض، من أعمال البناء والعظم والترميم إلى التشطيب والديكور والكهرباء والسباكة وتسليم المفتاح، ضمن نطاق عمل منظم ومتابعة هندسية وتنسيق دقيق بين جميع مراحل التنفيذ.');

    setListText('.trust-item span', [
      'خبرات تنفيذية وتنسيق بين التخصصات',
      'بنود ومراحل ومسؤوليات محددة',
      'فحص مرحلي واهتمام بالتفاصيل',
      'قنوات مباشرة لمتابعة المشروع'
    ]);

    setText('#about .section-title h2', 'شريك مقاولات يدير المشروع كمنظومة واحدة');
    setText('#about .section-title p', 'في شركة تعاود نربط التخطيط والتنفيذ والمتابعة في مسار واحد، حتى يحصل العميل على رؤية واضحة للمشروع، وتنسيق فعّال بين فرق البناء والتشطيب والأعمال الكهروميكانيكية، ونتيجة عملية تراعي الجودة والوقت والميزانية المتفق عليها.');
    setListText('#about .about-features li', [
      'حلول متكاملة للبناء والترميم والتشطيب وتسليم المفتاح',
      'إدارة ومتابعة للمراحل من المعاينة وحتى الاستلام',
      'تنسيق منظم لأعمال الكهرباء والسباكة والديكور',
      'خدمة المشاريع السكنية والتجارية داخل مدينة الرياض'
    ]);

    setText('#services .section-title h2', 'خدمات مقاولات متكاملة من الفكرة حتى التسليم');
    setText('#services .section-title p', 'ننفذ كل خدمة وفق احتياج المشروع الفعلي، مع تحديد واضح للنطاق، واختيار المواد المناسبة، وربط الأعمال الإنشائية والمعمارية والكهروميكانيكية لتقليل التعارضات وتحسين جودة النتيجة النهائية.');
    setListText('#services .premium-card .card-body p', [
      'تنفيذ أعمال البناء والعظم للفلل والملاحق والمباني السكنية والتجارية، مع تنظيم المراحل ومتابعة جودة الأعمال الأساسية وربطها بمتطلبات المشروع اللاحقة.',
      'إدارة متكاملة للمشروع من دراسة الاحتياج وتنسيق البنود إلى التنفيذ والتشطيبات والفحص النهائي، لتستلم مساحة جاهزة للاستخدام ضمن نطاق واضح.',
      'إعادة تأهيل المباني ومعالجة مظاهر التلف وتجديد الواجهات والمساحات الداخلية، مع دراسة الحالة القائمة وتحديد الأولويات قبل بدء التنفيذ.',
      'تنفيذ تشطيبات داخلية وخارجية تجمع بين جودة التفاصيل، ملاءمة الخامات، ودقة تنسيق الأرضيات والدهانات والأسقف والواجهات.',
      'تصميم وتنفيذ حلول ديكور وظيفية وهوية بصرية متناسقة للمنازل والمكاتب والمحلات، مع مراعاة الحركة والإضاءة والاستخدام اليومي.',
      'تنسيق وتنفيذ أعمال الكهرباء والسباكة والميكانيكا بما يخدم المخططات ومراحل التشطيب، ويحد من التعارضات والتعديلات المكلفة لاحقًا.'
    ]);

    setText('#why-us .section-title h2', 'منهج تنفيذ يحمي جودة المشروع وقرار العميل');
    setText('#why-us .section-title p', 'قوة المقاول لا تظهر في التنفيذ فقط، بل في وضوح البنود، إدارة التفاصيل، اكتشاف التعارضات مبكرًا، واستمرار التواصل حتى إغلاق الملاحظات وتسليم الأعمال بصورة منظمة.');
    setListText('#why-us .why-card p', [
      'نراجع المتطلبات والموقع وتسلسل الأعمال قبل البدء، ونحدد النقاط الحرجة التي تؤثر في التكلفة والمدة وجودة التنفيذ.',
      'نعتمد مراجعات مرحلية للأعمال الأساسية والتشطيبات، بحيث تُكتشف الملاحظات في وقتها قبل انتقال المشروع إلى المرحلة التالية.',
      'نحافظ على قناة تواصل مباشرة لتوضيح القرارات والتحديثات والملاحظات، وتقليل الفجوة بين توقعات العميل والتنفيذ الفعلي.',
      'نوحّد تنسيق البناء والكهرباء والسباكة والتشطيب والديكور ضمن خطة مترابطة، بدل تنفيذ كل تخصص بمعزل عن الآخر.'
    ]);

    setText('#process .section-title h2', 'مسار عمل واضح من دراسة المشروع إلى التسليم');
    setText('#process .section-title p', 'كل مشروع له ظروفه، لكن ثبات خطوات الإدارة يساعد على ضبط القرارات وتقليل المفاجآت وتحويل المتطلبات إلى خطة تنفيذ مفهومة وقابلة للمتابعة.');
    setListText('#process .process-card p', [
      'استقبال تفاصيل المشروع وفهم الاستخدام المطلوب وتحديد موعد للمعاينة عند الحاجة.',
      'حصر البنود وتوضيح نطاق العمل والمواد والمراحل والعناصر المؤثرة في التكلفة.',
      'تنفيذ الأعمال وفق التسلسل المناسب مع التنسيق بين الفرق ومتابعة نقاط الجودة.',
      'فحص الأعمال النهائية ومعالجة الملاحظات والتأكد من تكامل التفاصيل قبل الإغلاق.',
      'تسليم الأعمال المتفق عليها بصورة منظمة مع توضيح ما تم تنفيذه وإغلاق الملاحظات الأساسية.'
    ]);

    setText('#projects .section-title h2', 'خبرة تنفيذ تغطي احتياجات المشاريع السكنية والتجارية');
    setText('#projects .section-title p', 'نخدم مشاريع البناء وتسليم المفتاح والترميم والتشطيب، ونركّز في كل مشروع على جودة التفاصيل، كفاءة التنسيق، وتحويل المتطلبات المعمارية والفنية إلى واقع قابل للاستخدام والاستدامة.');
    setListText('#projects .project-card .card-body p', [
      'إدارة وتنفيذ متكامل للمشاريع السكنية من الأعمال الأساسية إلى التشطيبات، مع ربط جميع التخصصات في برنامج عمل واحد.',
      'تشطيبات داخلية للمنازل والمكاتب والمساحات التجارية تجمع بين المظهر المتناسق، سهولة الاستخدام، وجودة التفاصيل النهائية.',
      'ترميم وتجديد المباني القائمة وفق تقييم للحالة والأولويات، مع تطوير الواجهات والمساحات وتحسين كفاءة الاستخدام.'
    ]);

    setText('#blog .section-title h2', 'معرفة عملية تساعدك على اتخاذ قرار مقاولات أفضل');
    setText('#blog .section-title p', 'مقالات متخصصة تشرح مراحل البناء والترميم والتشطيب، وتساعد ملاك المشاريع في الرياض على فهم العروض والمواد والأخطاء الشائعة قبل التعاقد والتنفيذ.');

    setText('#contact .section-title h2', 'ناقش مشروعك مع فريق تعاود');
    setText('#contact .section-title p', 'أرسل نوع المشروع وموقعه والمساحة والمرحلة الحالية والخدمة المطلوبة، وسنتواصل معك لمراجعة الاحتياج وتحديد الخطوة المناسبة للمعاينة أو إعداد العرض.');

    setText('.cta-band h2', 'ابدأ مشروعك بخطة أوضح وتنفيذ أكثر تنظيمًا');
    setText('.cta-band p', 'تواصل مع شركة تعاود لمناقشة متطلبات البناء أو الترميم أو التشطيب أو تسليم المفتاح في الرياض.');
  }

  function transformTestimonialsIntoCommitments() {
    var section = document.querySelector('#testimonials');
    if (!section) return;
    setText('#testimonials .section-title .eyebrow', 'تجربة العميل');
    setText('#testimonials .section-title h2', 'ما الذي يقدمه أسلوب عمل تعاود للعميل؟');
    setText('#testimonials .section-title p', 'نفضّل عرض التزامات تشغيلية قابلة للملاحظة بدل استخدام تقييمات غير موثقة؛ لذلك نركز على الوضوح والمتابعة وجودة الإغلاق في كل مرحلة.');
    var items = [
      {
        label: 'وضوح الاتفاق',
        text: 'فهم نطاق العمل والبنود والمراحل قبل البدء، حتى تكون القرارات والتوقعات أكثر وضوحًا لجميع الأطراف.',
        footer: 'منهج إدارة المشروع'
      },
      {
        label: 'متابعة مرحلية',
        text: 'مراجعة الأعمال أثناء التنفيذ وليس بعد انتهائها فقط، بما يساعد على اكتشاف الملاحظات وتقليل إعادة العمل.',
        footer: 'منهج ضبط الجودة'
      },
      {
        label: 'تسليم منظم',
        text: 'فحص التفاصيل النهائية ومراجعة الملاحظات وإغلاق البنود المتفق عليها قبل اعتماد مرحلة التسليم.',
        footer: 'منهج إغلاق الأعمال'
      }
    ];
    section.querySelectorAll('.testimonial-card').forEach(function (card, index) {
      var item = items[index];
      if (!item) return;
      var stars = card.querySelector('.stars');
      var text = card.querySelector('p');
      var client = card.querySelector('.client');
      if (stars) stars.innerHTML = '<i class="fa-solid fa-shield-check"></i> ' + item.label;
      if (text) text.textContent = item.text;
      if (client) client.innerHTML = '<span><i class="fa-solid fa-check"></i></span> ' + item.footer;
    });
  }

  function homepageFaqs() {
    return [
      ['ما الخدمات التي تقدمها شركة تعاود للمقاولات في الرياض؟', 'نقدم خدمات البناء والإنشاءات، تنفيذ العظم، تسليم المفتاح، ترميم المباني، التشطيبات الداخلية والخارجية، الديكور، وأعمال الكهرباء والسباكة والميكانيكا للمشاريع السكنية والتجارية.'],
      ['ما أنواع المشاريع التي تستقبلها شركة تعاود؟', 'نستقبل مشاريع الفلل والملاحق والمباني السكنية والتجارية والمكاتب والمحلات، إضافة إلى مشاريع التجديد والترميم والتشطيب الجزئي أو المتكامل داخل الرياض.'],
      ['هل تقدمون خدمة تسليم مفتاح كاملة؟', 'نعم، ويمكن أن تشمل الخدمة تنسيق نطاق المشروع، الأعمال الإنشائية والمعمارية والكهروميكانيكية، التشطيبات والفحص النهائي، بحسب البنود المتفق عليها في العرض والعقد.'],
      ['كيف يتم إعداد عرض السعر للمشروع؟', 'يُبنى عرض السعر على نوع المشروع ومساحته وحالته الحالية ونطاق الأعمال والمواصفات والخامات والمدة المتوقعة. وقد تتطلب بعض المشاريع معاينة أو مخططات قبل التسعير الدقيق.'],
      ['هل يمكن ترتيب معاينة للموقع قبل التعاقد؟', 'نعم، يمكن ترتيب معاينة عند الحاجة لفهم الحالة القائمة وقياس المساحات ومراجعة متطلبات التنفيذ والعوامل التي قد تؤثر في التكلفة أو الجدول الزمني.'],
      ['كم تستغرق مدة تنفيذ المشروع؟', 'تختلف المدة حسب حجم المشروع ونوع الأعمال وتوفر المواد وتسلسل التخصصات والتعديلات المطلوبة. بعد مراجعة النطاق يمكن تقديم مدة تقديرية أو برنامج زمني مناسب.'],
      ['هل تساعدون في اختيار مواد التشطيب؟', 'يمكن مناقشة الخامات والبدائل وفق الاستخدام والميزانية والمتطلبات الفنية، مع توضيح أثر الاختيار على الجودة والصيانة والمظهر والتكلفة.'],
      ['كيف تتابعون جودة التنفيذ؟', 'تعتمد المتابعة على مراجعة الأعمال خلال المراحل المهمة، والتنسيق بين الفرق، وفحص التفاصيل قبل الانتقال للمرحلة التالية، ثم مراجعة الملاحظات قبل التسليم.'],
      ['هل تغطي خدماتكم جميع أحياء الرياض؟', 'نخدم مدينة الرياض وأحياءها، ويُراجع موقع المشروع وطبيعة الأعمال عند التواصل لتحديد إمكانية الخدمة وترتيب المعاينة والتنفيذ.'],
      ['ما المعلومات المطلوبة لبدء مناقشة المشروع؟', 'يفضل إرسال نوع المشروع، الموقع، المساحة التقريبية، المرحلة الحالية، الخدمة المطلوبة، المخططات أو الصور المتاحة، والموعد المستهدف للتنفيذ.']
    ];
  }

  function faqMarkup(items) {
    return items.map(function (item, index) {
      var id = 'home-faq-answer-' + index;
      return '<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="' + id + '"><span>' + item[0] + '</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="faq-answer" id="' + id + '"><p>' + item[1] + '</p></div></div>';
    }).join('');
  }

  function updateFaqSchema(items) {
    var entities = items.map(function (item) {
      return {
        '@type': 'Question',
        name: item[0],
        acceptedAnswer: { '@type': 'Answer', text: item[1] }
      };
    });

    var updated = false;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      if (updated || script.textContent.indexOf('FAQPage') === -1) return;
      try {
        var data = JSON.parse(script.textContent);
        function walk(node) {
          if (!node || typeof node !== 'object') return false;
          if (node['@type'] === 'FAQPage') {
            node.mainEntity = entities;
            return true;
          }
          if (Array.isArray(node)) {
            return node.some(walk);
          }
          return Object.keys(node).some(function (key) { return walk(node[key]); });
        }
        if (walk(data)) {
          script.textContent = JSON.stringify(data);
          updated = true;
        }
      } catch (error) {
        /* Keep the existing schema if parsing fails. */
      }
    });
  }

  function setupFaqAccordions(root) {
    (root || document).querySelectorAll('.faq-question').forEach(function (button) {
      if (button.dataset.faqReady === 'true') return;
      button.dataset.faqReady = 'true';
      button.addEventListener('click', function () {
        var faqItem = button.closest('.faq-item');
        var faqAnswer = faqItem ? faqItem.querySelector('.faq-answer') : null;
        if (!faqItem || !faqAnswer) return;

        var isOpen = faqItem.classList.contains('active');
        document.querySelectorAll('.faq-item.active').forEach(function (item) {
          item.classList.remove('active');
          var otherButton = item.querySelector('.faq-question');
          var otherAnswer = item.querySelector('.faq-answer');
          if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        });

        if (!isOpen) {
          faqItem.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
          faqAnswer.style.maxHeight = faqAnswer.scrollHeight + 'px';
        }
      });
    });
  }

  function expandHomepageFaq() {
    var wrapper = document.querySelector('#faq .faq-wrap');
    if (!wrapper) return;
    var items = homepageFaqs();
    setText('#faq .section-title h2', 'إجابات شاملة قبل التعاقد وبدء التنفيذ');
    var faqIntro = document.querySelector('#faq .section-title p');
    if (!faqIntro) {
      faqIntro = document.createElement('p');
      document.querySelector('#faq .section-title').appendChild(faqIntro);
    }
    faqIntro.textContent = 'جمعنا أهم الأسئلة التي يطرحها ملاك المشاريع في الرياض حول نطاق الخدمات، التسعير، المدة، المعاينة، المواد، المتابعة والتسليم.';
    wrapper.innerHTML = faqMarkup(items);
    updateFaqSchema(items);
    setupFaqAccordions(wrapper);
  }

  function improveMediaLoading() {
    document.querySelectorAll('img').forEach(function (img, index) {
      img.decoding = 'async';
      if (!img.hasAttribute('width') && img.naturalWidth) img.width = img.naturalWidth;
      if (!img.hasAttribute('height') && img.naturalHeight) img.height = img.naturalHeight;
      if (index > 1 && !img.hasAttribute('loading')) img.loading = 'lazy';
    });
  }

  function removeMobileActionBar() {
    document.querySelectorAll('.mobile-action-bar').forEach(function (bar) {
      bar.remove();
    });
    document.body.classList.add('no-mobile-action-bar');
  }

  ready(function () {
    removeMobileActionBar();
    strengthenHomepageContent();
    transformTestimonialsIntoCommitments();
    polishHomepageBlogCards();
    expandHomepageFaq();
    improveMediaLoading();
    document.documentElement.classList.add('tawod-polished');

    var mapButton = document.querySelector('[data-load-map]');
    var mapHolder = document.querySelector('[data-map-holder]');

    function loadMap() {
      if (!mapButton || !mapHolder || mapHolder.dataset.loaded === 'true') return;
      var src = mapButton.getAttribute('data-map-src');
      if (!src) return;
      mapHolder.dataset.loaded = 'true';
      mapHolder.innerHTML = '<iframe title="موقع شركة تعاود في الرياض" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="' + src + '"></iframe>';
    }

    if (mapButton) {
      mapButton.addEventListener('click', loadMap);
    }

    if (mapHolder && 'IntersectionObserver' in window) {
      var mapObserver = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          window.setTimeout(loadMap, 500);
          mapObserver.disconnect();
        }
      }, { rootMargin: '180px 0px' });
      mapObserver.observe(mapHolder);
    }
  });
})();
