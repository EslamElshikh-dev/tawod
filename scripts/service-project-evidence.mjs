import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const domain = 'https://tawodco.com';
const updated = '2026-10-08';
const style = 'assets/css/tawod-service-evidence.css';
const revision = createHash('sha256').update(readFileSync(style)).digest('hex').slice(0, 12);
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const whatsapp = text => `https://wa.me/966551128884?text=${encodeURIComponent(text)}`;
const profiles = {
  'service-turnkey.html': {
    service: 'turnkey',
    description: 'تسليم مفتاح في الرياض للفلل والمشاريع السكنية والتجارية. شاهد مشروع تعاود بحي العروبة، وتعرّف على النطاق والمواصفات والتوريد وخطوات طلب عرض سعر.',
    heading: 'تسليم مفتاح في الرياض يبدأ بنطاق يجمع كل التفاصيل',
    lead: 'من المخططات إلى الجاهزية المتفق عليها: نربط البناء والأعمال الفنية والتشطيب ببرنامج تنفيذ ومسؤوليات واضحة، لتعرف ما يشمله مشروعك وكيف تُراجع كل مرحلة.',
    projectTitle: 'مسجد و٢ فيلا في حي العروبة',
    projectUrl: '/project-arouba-mosque-villas.html',
    projectIntro: 'نفذت تعاود مشروعًا يضم مسجدًا وفيلاين في حي العروبة بالرياض، بنظام تسليم مفتاح كامل، على مساحة 1800 م² خلال 12 شهرًا. تجمع دراسة الحالة نطاق المشروع وبياناته وصورًا من مراحل التنفيذ.',
    stats: [['1800 م²', 'مساحة المشروع'], ['12 شهرًا', 'مدة هذا المشروع'], ['مسجد + ٢ فيلا', 'مكونات النطاق']],
    photos: [
      ['arouba-mosque-villas-01.webp', 420, 560, 'أعمال المباني والهيكل خلال تنفيذ مشروع مسجد وفيلاين بحي العروبة بالرياض', 'مرحلة الأعمال الإنشائية والمباني'],
      ['arouba-mosque-villas-02.webp', 420, 560, 'تقدم أعمال الواجهات في مشروع تعاود بحي العروبة خلال مراحل التنفيذ', 'تقدم أعمال الواجهات بالموقع'],
    ],
    lesson: 'في مشروع يضم أكثر من مبنى، يبدأ وضوح المسؤولية من تحديد البنود والمواصفات ومواعيد اعتماد المواد، ثم ربطها ببرنامج واحد للفحص والتسليم.',
    lessonLink: ['/blog/turnkey-procurement-responsibilities-riyadh/', 'اقرأ دليل توزيع مسؤوليات التوريد في عقد تسليم المفتاح'],
    quoteHeading: 'ماذا ترسل لمناقشة مشروع تسليم مفتاح؟',
    quoteText: 'شاركنا الحي، ونوع المبنى، والمساحة التقريبية، والمخططات المتاحة، والمرحلة الحالية ومستوى التشطيب المطلوب. نراجع المدخلات لتحديد نطاق الدراسة والحاجة إلى معاينة.',
    quoteMessage: 'أرغب في مناقشة مشروع تسليم مفتاح في الرياض. الحي: … نوع المبنى: … المساحة: … المرحلة الحالية: … المخططات ومستوى التشطيب المطلوب: …',
    quoteLabel: 'ناقش مشروع تسليم مفتاح عبر واتساب',
  },
  'service-construction.html': {
    service: 'construction',
    description: 'مقاول بناء عظم في الرياض للفلل والمباني. اطّلع على مشاريع تعاود الإنشائية ونطاقها، وحدد المخططات والكميات ونقاط الفحص قبل طلب عرض البناء.',
    heading: 'بناء العظم في الرياض: نطاق واضح ومراجعة قبل كل مرحلة',
    lead: 'تبدأ أعمال البناء بفهم المخططات وحالة الموقع ونطاق التوريد والتنفيذ. ننسق المراحل والأعمال المرتبطة بها، مع مراجعة البنود قبل تغطيتها أو الانتقال إلى المرحلة التالية.',
    projectTitle: '8 مستودعات في الصناعية الثانية بالرياض',
    projectUrl: '/project-modon-eight-warehouses-riyadh.html',
    projectIntro: 'توضح دراسة مشروع المستودعات أعمال تعاود الإنشائية في المدينة الصناعية الثانية بالرياض: 8 مستودعات على مساحة إجمالية 29,122.40 م² خلال 6 أشهر. وتعرض الصور تجهيز القواعد وتركيب الهياكل المعدنية.',
    stats: [['8 مستودعات', 'مكونات المشروع'], ['29,122.40 م²', 'المساحة الإجمالية'], ['6 أشهر', 'مدة هذا المشروع']],
    photos: [
      ['modon-eight-warehouses-01-v4.webp', 1200, 1596, 'تجهيز وعزل القواعد الخرسانية خلال تنفيذ مستودعات تعاود في الصناعية الثانية بالرياض', 'تجهيز القواعد وأعمال العزل'],
      ['modon-eight-warehouses-02-v3.webp', 480, 640, 'تركيب الهياكل المعدنية لمستودعات تعاود في المدينة الصناعية الثانية بالرياض', 'تركيب الهيكل المعدني للمستودعات'],
    ],
    lesson: 'توضح مراحل المستودعات أهمية ترتيب أعمال القواعد والهيكل ومتابعة تقدم كل وحدة. وفي مشروع بناء فيلا، تُحدد نقاط الفحص وتسلسل العمل بحسب مخططات الفيلا ونطاقها الإنشائي.',
    lessonLink: ['/blog/bone-construction-quality-checklist-riyadh/', 'راجع قائمة فحص جودة بناء العظم قبل الانتقال بين المراحل'],
    extra: {
      title: 'نطاق إنشائي متخصص: حدادة وعزل خزانات',
      text: 'في حديقة الملك سلمان بالرياض، شمل نطاق تعاود أعمال الحدادة والعزل لخزانات بمساحة 119 م² خلال أسبوعين، لمشروع شركة الراجحي للبناء والتعمير.',
      url: '/project-alrajhi-tanks-king-salman-park.html',
      link: 'شاهد نطاق أعمال الخزانات وصورة الموقع',
    },
    quoteHeading: 'ابدأ عرض البناء بمدخلات قابلة للمراجعة',
    quoteText: 'أرسل موقع المشروع ونوع المبنى والمساحة والمخططات المعمارية والإنشائية، وتقرير التربة وجدول الكميات عند توفرهما. وضّح أيضًا هل المطلوب تنفيذ العظم فقط أم استكمال مراحل لاحقة.',
    quoteMessage: 'أرغب في عرض بناء عظم في الرياض. الحي: … نوع المبنى: … المساحة: … المرحلة الحالية: … المخططات وتقرير التربة المتاحان: … نطاق التوريد والتنفيذ المطلوب: …',
    quoteLabel: 'أرسل تفاصيل مشروع البناء عبر واتساب',
    introMessage: 'السلام عليكم، أحتاج بناء عظم في الرياض وأرغب في مناقشة نطاق العمل. حي المشروع: … نوع المبنى: …',
  },
};

function evidence(profile) {
  return `<!-- TAWOD_SERVICE_EVIDENCE_START -->
<section class="section-padding tawod-service-evidence" id="project-evidence" aria-labelledby="evidence-title">
  <div class="container">
    <div class="tawod-evidence-heading"><span class="eyebrow">من مشاريع تعاود في الرياض</span><h2 id="evidence-title">${profile.heading}</h2><p>${profile.lead}</p></div>
    <div class="tawod-evidence-layout">
      <div class="tawod-evidence-copy"><span class="tawod-evidence-label">مشروع منفذ</span><h3>${profile.projectTitle}</h3><p>${profile.projectIntro}</p>
        <dl class="tawod-evidence-stats">${profile.stats.map(([value, label]) => `<div><dt>${label}</dt><dd dir="auto">${value}</dd></div>`).join('')}</dl>
        <div class="tawod-evidence-actions"><a class="btn btn-primary" href="${profile.projectUrl}">استعرض تفاصيل المشروع وصور التنفيذ</a><a class="tawod-evidence-text-link" href="#project-brief">ناقش مشروعك مع تعاود <span aria-hidden="true">←</span></a></div>
      </div>
      <div class="tawod-evidence-gallery">${profile.photos.map(([src, width, height, alt, caption]) => `<figure><a href="${profile.projectUrl}" aria-label="${alt} — عرض دراسة المشروع"><img src="/images/projects/${src}" width="${width}" height="${height}" loading="lazy" decoding="async" alt="${alt}"></a><figcaption>${caption}</figcaption></figure>`).join('')}</div>
    </div>
    <div class="tawod-evidence-insight"><strong>ما الذي تستفيد منه عند تخطيط مشروعك؟</strong><p>${profile.lesson}</p><a class="tawod-evidence-text-link" href="${profile.lessonLink[0]}">${profile.lessonLink[1]} <span aria-hidden="true">←</span></a></div>
${profile.extra ? `    <div class="tawod-evidence-extra"><div><span class="eyebrow">أعمال مرتبطة بالبناء</span><h3>${profile.extra.title}</h3><p>${profile.extra.text}</p></div><a class="btn btn-outline" href="${profile.extra.url}">${profile.extra.link}</a></div>` : ''}
    <div class="tawod-evidence-brief" id="project-brief"><div><span class="eyebrow">الخطوة التالية</span><h3>${profile.quoteHeading}</h3><p>${profile.quoteText}</p></div><div class="tawod-evidence-actions"><a class="btn btn-whatsapp" href="${whatsapp(profile.quoteMessage)}">${profile.quoteLabel}</a><a class="tawod-evidence-text-link" href="/contact.html?service=${profile.service}#form">أرسل طلب عرض سعر من الموقع <span aria-hidden="true">←</span></a></div></div>
  </div>
</section>
<!-- TAWOD_SERVICE_EVIDENCE_END -->`;
}

function meta(html, key, value) {
  return html.replace(/<meta\b[^>]*>/gi, tag => {
    const name = tag.match(/\b(?:name|property)=["']([^"']+)["']/i)?.[1];
    return name === key ? tag.replace(/\bcontent=(["'])([\s\S]*?)\1/i, `content="${escape(value)}"`) : tag;
  });
}

export function enhanceServiceEvidence(html, file) {
  const profile = profiles[file];
  if (!profile) return html;
  html = html.replace(/\s*<!-- TAWOD_SERVICE_EVIDENCE_START -->[\s\S]*?<!-- TAWOD_SERVICE_EVIDENCE_END -->\s*/g, '');
  html = html.replace(/<link\b[^>]*href=["'][^"']*tawod-service-evidence\.css[^"']*["'][^>]*>\s*/gi, '');
  const stylesheet = `<link rel="stylesheet" href="/${style}?v=${revision}">\n`;
  html = html.includes('<!-- TAWOD_ANALYTICS_START -->') ? html.replace('<!-- TAWOD_ANALYTICS_START -->', stylesheet + '<!-- TAWOD_ANALYTICS_START -->') : html.replace(/<\/head>/i, stylesheet + '</head>');
  html = html.replace(/<section\b[^>]*class=["'][^"']*page-hero[^"']*["'][^>]*>[\s\S]*?<\/section>/i, hero => {
    hero = hero.replace(/<a\b[^>]*class=["'][^"']*tawod-evidence-hero-link[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
    hero = hero.replace(/<a\b[^>]*class=["'][^"']*btn-whatsapp[^"']*["'][^>]*>/gi, tag => tag.replace(/href=["'][^"']*["']/i, `href="${whatsapp(profile.introMessage || profile.quoteMessage)}"`));
    return hero.replace(/(<div\b[^>]*class=["'][^"']*hero-actions[^"']*["'][^>]*>[\s\S]*?)(<\/div>)/i, `$1<a class="btn btn-outline tawod-evidence-hero-link" href="#project-evidence">شاهد مشروعًا منفذًا</a>$2`);
  });
  const block = evidence(profile);
  const trust = '<!-- TAWOD_STATIC_TRUST_END -->';
  if (html.includes(trust)) html = html.replace(trust, `${trust}\n${block}\n`);
  else html = html.replace(/(<section\b[^>]*class=["'][^"']*page-hero[^"']*["'][^>]*>[\s\S]*?<\/section>)/i, `$1\n${block}\n`);
  for (const key of ['description', 'og:description', 'twitter:description']) html = meta(html, key, profile.description);
  html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (script, raw) => {
    const schema = JSON.parse(raw);
    if (schema['@type'] === 'Service') {
      schema.description = profile.description;
      schema.image = profile.photos.map(p => `${domain}/images/projects/${p[0]}`);
      schema.subjectOf = [{ '@type': 'WebPage', name: profile.projectTitle, url: domain + profile.projectUrl }, ...(profile.extra ? [{ '@type': 'WebPage', name: profile.extra.title, url: domain + profile.extra.url }] : [])];
    }
    if (schema['@type'] === 'WebPage') {
      schema.description = profile.description;
      schema.dateModified = updated;
      schema.relatedLink = [domain + profile.projectUrl, ...(profile.extra ? [domain + profile.extra.url] : [])];
    }
    return script.replace(raw, JSON.stringify(schema));
  });
  return html;
}

export const articleProjectExamples = {
  'turnkey-construction-riyadh-guide': ['في مشروع يجمع عدة مبانٍ، تصبح وحدة البرنامج ومسؤوليات التوريد مهمة للمالك. يعرض', '/project-arouba-mosque-villas.html', 'مشروع تعاود بحي العروبة', 'نطاق تسليم مفتاح لمسجد وفيلاين؛ راجع المكونات وصور المراحل، ثم حدد نطاقًا مستقلًا لمشروعك.'],
  'turnkey-villa-riyadh': ['للاطلاع على نطاق تنفيذ يشمل وحدات سكنية، شاهد', '/project-arouba-mosque-villas.html', 'دراسة مشروع المسجد والفيلاين في حي العروبة', 'واستخدم تفاصيلها لفهم ما يجب توضيحه في عقد تسليم المفتاح الخاص بفيلتك.'],
  'turnkey-procurement-responsibilities-riyadh': ['عند توزيع مسؤوليات التوريد لمشروع متعدد المكونات، يفيد الرجوع إلى نطاق منشور مثل', '/project-arouba-mosque-villas.html', 'مشروع تسليم المفتاح بحي العروبة', 'لفهم مكونات العمل. ثم تُكتب مصفوفة التوريد حسب مخططات مشروعك واختياراته الفعلية.'],
  'turnkey-phased-handover-riyadh': ['لرؤية مثال على مشروع يضم أكثر من مبنى، راجع', '/project-arouba-mosque-villas.html', 'مشروع مسجد وفيلاين بحي العروبة', 'وتأمل صور مراحل تنفيذه. خطة تسليم مشروعك تُحدد بصورة مستقلة بحسب الجاهزية المطلوبة والبنود المتعاقد عليها.'],
  'bone-construction-execution-plan-riyadh': ['توضح صور', '/project-modon-eight-warehouses-riyadh.html', 'مشروع المستودعات في الصناعية الثانية بالرياض', 'الانتقال من أعمال القواعد إلى تركيب الهيكل المعدني. هذا مثال لتتابع مراحل مشروع صناعي؛ برنامج عظم الفيلا يُبنى وفق نظامها الإنشائي ومخططاتها.'],
  'bone-construction-quality-checklist-riyadh': ['ضمن الأعمال الإنشائية المتخصصة، يعرض', '/project-alrajhi-tanks-king-salman-park.html', 'مشروع حدادة وعزل الخزانات بحديقة الملك سلمان', 'نطاقًا يربط تجهيز التسليح بالعزل. تُختار نقاط فحص مشروعك وفق المخططات ونظام العزل ونوع العنصر المنفذ.'],
};

export function articleProjectExample(slug) {
  const item = articleProjectExamples[slug];
  return item ? `<!-- TAWOD_STATIC_FIELD_START --><aside class="tawod-key-takeaways" aria-label="مثال من مشروع منفذ"><p><strong>من مشاريع تعاود:</strong> ${item[0]} <a href="${item[1]}">${item[2]}</a> ${item[3]}</p></aside><!-- TAWOD_STATIC_FIELD_END -->` : '';
}

export function enhanceProjectGuideLinks(html, file) {
  const replacements = file === 'project-arouba-mosque-villas.html' ? [
    ['blog/bone-construction-riyadh-guide/', '/blog/turnkey-construction-riyadh-guide/', 'دليل تخطيط مشروع تسليم مفتاح بالرياض'],
    ['blog/bone-construction-execution-plan-riyadh/', '/blog/turnkey-phased-handover-riyadh/', 'دليل التسليم المرحلي لمشروع تسليم مفتاح'],
  ] : [];
  for (const [old, href, label] of replacements) html = html.replace(new RegExp(`<a\\b[^>]*href=["']${old}["'][^>]*>[\\s\\S]*?<\\/a>`, 'g'), `<a href="${href}">${label}</a>`);
  if (replacements.length) html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (script, raw) => {
    const schema = JSON.parse(raw);
    if (schema['@type'] === 'WebPage') schema.dateModified = updated;
    return script.replace(raw, JSON.stringify(schema));
  });
  return html;
}
