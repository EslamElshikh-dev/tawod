// Dedicated villa-cleaning journey. The general home-cleaning page keeps its
// broader apartment/home audience; paid villa traffic gets a focused scope.
export const villaCleaningSlug = 'villa-cleaning-riyadh';

export function villaCleaningPage({ B, shell, icon, whatsapp, faq, faqSchema, commitmentsBlock, photoAssets, photoUrl, revision }) {
  const file = `${villaCleaningSlug}.html`;
  const url = B.url + file;
  const title = 'شركة تنظيف فلل بالرياض | قبل السكن وبعد التشطيب | تعاود';
  const description = 'تنظيف فلل بالرياض قبل السكن وبعد التشطيب ومع وجود الأثاث. أرضيات وزجاج ومطابخ وحمامات بنطاق يراعي الخامات، وعرض حسب مساحة الفيلا وحالتها من تعاود.';
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const inquiry = (subject = 'تنظيف فيلا') => `https://wa.me/${B.whatsapp}?text=${encodeURIComponent([
    `السلام عليكم، أرغب في طلب ${subject} داخل الرياض من تعاود.`,
    'الحي: ', 'المساحة التقريبية وعدد الأدوار: ',
    'حالة الفيلا: فارغة / مفروشة / بعد التشطيب',
    'الأعمال المطلوبة: ', 'الموعد المطلوب: ',
  ].join('\n'))}`;
  const image = (key, alt, hero = false) => {
    const a = photoAssets[key];
    const srcset = a.srcset.split(',').map(candidate => {
      const [src, width] = candidate.trim().split(/\s+/);
      return `${photoUrl(src.split('/').pop())} ${width}`;
    }).join(', ');
    return `<img src="${photoUrl(a.file)}" srcset="${srcset}" sizes="(max-width: 760px) calc(100vw - 40px), 510px" width="${a.width}" height="${a.height}" alt="${esc(alt)}" loading="${hero ? 'eager' : 'lazy'}"${hero ? ' fetchpriority="high"' : ''} decoding="async">`;
  };
  const actions = (subject, label = 'اطلب عرض تنظيف') => `<div class="villa-actions"><a class="button" href="${inquiry(subject)}" target="_blank" rel="noopener">${whatsapp()} ${esc(label)}</a><a class="button button-outline" href="tel:${B.international}" aria-label="اتصل بتعاود لتنظيف الفلل ${B.phone}">${icon('phone')} اتصل بنا</a></div>`;
  const cases = [
    ['تنظيف فلل قبل السكن', 'للفيلا الفارغة قبل نقل الأثاث أو استلامها؛ نراجع الغرف والأدوار والخزائن والأسطح التي تحتاج عناية.', 'تنظيف فيلا قبل السكن'],
    ['تنظيف فلل بعد التشطيب', 'نراجع الأتربة وآثار الأعمال ونوع الأرضيات والزجاج، ثم نحدد طريقة التنظيف والبنود القابلة للتنفيذ.', 'تنظيف فيلا بعد التشطيب'],
    ['تنظيف فيلا مفروشة', 'ننسق الأعمال حول الأثاث واستخدام المكان، ونحدد المفروشات والأسطح المطلوبة وطريقة العناية المناسبة.', 'تنظيف فيلا مفروشة'],
  ];
  const scope = [
    ['الأرضيات والسلالم', 'تنظيف بحسب نوع الأرضية وحالتها. يُناقش الجلي أو التلميع المتخصص كبند مستقل عند الحاجة.', 'sparkles'],
    ['الزجاج والمرايا الداخلية', 'تحديد الأسطح ونقاط الوصول قبل التنفيذ، مع مراعاة الإطارات والخامات المحيطة.', 'check'],
    ['المطابخ والخزائن', 'تنظيف الأسطح والأجزاء المتفق عليها. نوضح مسبقًا ما إذا كان النطاق يشمل داخل الخزائن أو الأجهزة.', 'list'],
    ['الحمامات ودورات المياه', 'عناية بالأرضيات والأحواض والأسطح وفق حالتها والمواد المناسبة لها.', 'drop'],
    ['الأبواب والتفاصيل', 'العناية بالأبواب والمقابض والحواف والأسطح القابلة للوصول ضمن قائمة الأعمال.', 'building'],
    ['المفروشات عند طلبها', 'الكنب والسجاد والستائر تُراجع بحسب الخامة والحالة، وتُذكر الأعمال المعتمدة بوضوح في العرض.', 'shield'],
  ];
  const questions = [
    ['كيف يُحدد سعر تنظيف الفيلا؟', 'نراجع المساحة التقريبية وعدد الأدوار وحالة الفيلا والخامات والمناطق المطلوب تنظيفها. يُوضح نطاق الأعمال والمواد والموعد وعرض السعر قبل اعتماد الخدمة.'],
    ['هل تشمل الخدمة تنظيف الفلل بعد التشطيب؟', 'يمكن دراسة تنظيف الفيلا بعد التشطيب وفق حالة الموقع وآثار الأعمال ونوع الأسطح. نقل مخلفات البناء أو معالجة بقع خاصة أو أعمال الجلي ليست بنودًا تلقائية؛ يُحدد المطلوب وإمكانية تنفيذه في العرض.'],
    ['هل تنظفون الفيلا مع وجود الأثاث؟', 'نعم، يُرتب نطاق التنظيف حسب توزيع الأثاث واستخدام المكان. أخبرنا مسبقًا بالقطع الحساسة والمفروشات المطلوب تنظيفها لتحديد الطريقة والأعمال المناسبة.'],
    ['هل تنظيف الواجهات الخارجية والمسابح ضمن الطلب؟', 'تُدرس هذه الأعمال بصورة مستقلة حسب المساحة وطريقة الوصول والتجهيزات المطلوبة، وتُضاف إلى العرض إذا اتُفق عليها. طلب تنظيف الفيلا لا يشملها تلقائيًا.'],
    ['ما المعلومات التي أرسلها للحصول على عرض؟', 'الحي داخل الرياض، والمساحة التقريبية، وعدد الأدوار، وحالة الفيلا، والأعمال المطلوبة والموعد المناسب. تساعد صور المناطق المطلوب تنظيفها في فهم النطاق، وقد تُطلب معاينة حسب الحالة.'],
  ];
  const body = `
  <section class="villa-hero">
    <div class="container">
      <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/maintenance/">الصيانة والتشغيل</a><span>/</span><span aria-current="page">تنظيف الفلل</span></nav>
      <div class="villa-hero-grid">
        <div class="villa-hero-copy">
          <span class="eyebrow">تعاود للصيانة والتشغيل · مدينة الرياض</span>
          <h1>شركة تنظيف فلل بالرياض<span>عناية تبدأ من تفاصيل فيلتك.</span></h1>
          <p class="villa-lead">قبل السكن، بعد التشطيب، أو مع وجود الأثاث. تنظيف للفلل بنطاق يراعي المساحة والخامات وحالة المكان.</p>
          <ul class="villa-highlights"><li>${icon('check')} أعمال واضحة قبل التنفيذ</li><li>${icon('check')} عرض حسب المساحة والحالة</li><li>${icon('check')} تنسيق الموعد مع فريق تعاود</li></ul>
          ${actions('تنظيف فيلا')}
          <p class="villa-phone">تواصل مع الفريق مباشرة <a href="tel:${B.international}"><bdi>${B.phone}</bdi></a></p>
        </div>
        <figure class="villa-hero-photo">${image('mirror', 'من صور العمل: عامل تعاود ينظف مرآة داخلية', true)}<figcaption>${icon('sparkles')} من صور فريق تعاود · العناية بالزجاج والمرايا</figcaption></figure>
      </div>
    </div>
  </section>
  <nav class="villa-nav" aria-label="أقسام تنظيف الفلل"><div class="container"><a href="#villa-cases">حالة الفيلا</a><a href="#scope">نطاق التنظيف</a><a href="#villa-quote">طلب العرض</a><a href="#faq">أسئلتك</a></div></nav>
  <section class="section villa-cases" id="villa-cases"><div class="container"><div class="villa-section-head"><span class="eyebrow">ابدأ من حالة المكان</span><h2>تنظيف يناسب المرحلة<br>التي تمر بها فيلتك.</h2><p>اختر الحالة الأقرب لاحتياجك، وشارك التفاصيل لنرتب نطاق الخدمة.</p></div><div class="villa-case-grid">${cases.map(([heading, text, subject], i) => `<article class="villa-case"><span class="villa-index">0${i + 1}</span><h3>${heading}</h3><p>${text}</p><a class="text-link" href="${inquiry(subject)}" target="_blank" rel="noopener" aria-label="طلب ${heading} عبر واتساب">ناقش تفاصيل الخدمة ${icon('arrow')}</a></article>`).join('')}</div></div></section>
  <section class="section villa-scope scope-section" id="scope"><div class="container"><div class="villa-section-head"><span class="eyebrow">ماذا يمكن أن يشمل الطلب؟</span><h2>كل مساحة لها عنايتها.</h2><p>تُختار البنود المناسبة لفيلتك، وتُثبت الأعمال المشمولة والاستثناءات في العرض.</p></div><div class="villa-scope-grid">${scope.map(([heading, text, symbol]) => `<article class="villa-scope-card"><span class="villa-scope-icon">${icon(symbol)}</span><h3>${heading}</h3><p>${text}</p></article>`).join('')}</div><aside class="villa-scope-note">${icon('list')} <p>الخدمة لا تعني تلقائيًا تنظيف جميع المرافق أو نقل الأثاث والمخلفات. نحدد الأجزاء المطلوبة وإمكانية الوصول والأعمال الإضافية قبل اعتماد العرض.</p></aside></div></section>
  <section class="section villa-team"><div class="container villa-team-grid"><figure>${image('bus', 'من صور الفريق: فريق تعاود بالزي الموحد أمام الحافلة')}<figcaption>من صور فريق تعاود للصيانة والتشغيل</figcaption></figure><div><span class="eyebrow">الفريق الذي تتواصل معه</span><h2>نرتب العمل حول<br>احتياج فيلتك.</h2><p>ابدأ بالمساحة وحالة المكان. نراجع الأعمال المطلوبة والخامات والموعد، ثم نوضح لك نطاق الخدمة قبل التنفيذ.</p><ol class="villa-steps"><li><span>01</span><div><h3>نستقبل تفاصيلك</h3><p>الحي، مساحة الفيلا، الأدوار وحالة الأثاث.</p></div></li><li><span>02</span><div><h3>نحدد الأعمال والعرض</h3><p>بنود واضحة، مع معاينة إذا تطلبت الحالة.</p></div></li><li><span>03</span><div><h3>ننسق التنفيذ</h3><p>الموعد والتجهيزات وفق النطاق المعتمد.</p></div></li></ol></div></div></section>
  ${commitmentsBlock('compact', file)}
  <section class="section villa-quote" id="villa-quote"><div class="container villa-quote-grid"><div><span class="eyebrow">عرض يناسب فيلتك</span><h2>أرسل التفاصيل.<br>ونرتب الخطوة التالية.</h2><p>لا يوجد سعر موحد يناسب كل فيلا. تحديد المساحة وحالة المكان يجعل عرض الخدمة أوضح من البداية.</p><ul class="villa-quote-list"><li>${icon('check')} الحي والمساحة التقريبية</li><li>${icon('check')} عدد الأدوار وحالة الفيلا والأثاث</li><li>${icon('check')} الأعمال المطلوبة والموعد المناسب</li></ul></div><aside class="villa-quote-card"><span class="villa-quote-symbol">${icon('sparkles')}</span><h3>طلب تنظيف فيلا بالرياض</h3><p>يفتح واتساب برسالة جاهزة تضيف إليها تفاصيلك وتراجعها قبل إرسالها.</p>${actions('تنظيف فيلا', 'أرسل تفاصيل فيلتك')}<a class="villa-quote-phone" href="tel:${B.international}"><bdi>${B.phone}</bdi></a><small>يُراجع التوفر والموعد والنطاق مع الفريق قبل تأكيد الخدمة.</small></aside></div></section>
  <section class="section faq-section" id="faq"><div class="container faq-layout"><div><span class="eyebrow">قبل أن تطلب الخدمة</span><h2>أسئلة عن<br>تنظيف الفلل.</h2><p>تفاصيل تساعدك على تحديد المطلوب والتوقعات من البداية.</p></div>${faq(questions)}</div></section>
  <section class="villa-last-call"><div class="container"><div><span class="eyebrow">تنظيف فلل داخل الرياض</span><h2>لنتحدث عن فيلتك.</h2><p>تنظيف قبل السكن أو بعد التشطيب أو عناية بفيلا مفروشة، وفق نطاق واضح.</p></div><a class="button" href="${inquiry()}" target="_blank" rel="noopener">اطلب عرض تنظيف ${whatsapp()}</a></div></section>`;
  const graph = [
    { '@type': 'Service', '@id': url + '#service', name: 'تنظيف فلل بالرياض', serviceType: 'تنظيف الفلل', description, url, provider: { '@id': B.url + '#organization' }, areaServed: { '@type': 'City', name: 'الرياض' } },
    faqSchema(questions),
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الصيانة والتشغيل', item: B.url }, { '@type': 'ListItem', position: 2, name: 'تنظيف الفلل', item: url }] },
  ];
  return shell({ title, desc: description, path: file, body, graph, contactInquiry: inquiry(), contactService: 'تنظيف الفلل' })
    .replace('<body class="maintenance-page">', '<body class="maintenance-page villa-cleaning-page">')
    .replace('</head>', `<link rel="stylesheet" href="/maintenance/assets/css/villa-cleaning.css?v=${revision('maintenance/assets/css/villa-cleaning.css')}"></head>`)
    .replace(/href="\/maintenance\/#request"/g, 'href="#villa-quote"')
    .replaceAll('اطلب دراسة احتياجك', 'اطلب عرض تنظيف')
    .replace('نخدم منشأتك داخل مدينة الرياض', 'تنظيف الفلل داخل مدينة الرياض')
    // Keep the previously requested omission of a developer signature on Tawod.
    .replace(/<div class="eslam-credit-slot">[\s\S]*?<\/div>/, '');
}
