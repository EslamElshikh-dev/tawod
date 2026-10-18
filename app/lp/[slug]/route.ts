type LandingConfig = {
  slug: string;
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  service: string;
  canonical: string;
  image: string;
  imageAlt: string;
  serviceKey?: string;
  scope?: string[];
  faq?: [string, string][];
  points: [string, string][];
  project: {
    href: string;
    title: string;
    meta: string;
    image: string;
    imageAlt: string;
  };
};

const PHONE_DISPLAY = "0551128884";
const PHONE_HREF = "tel:0551128884";
const WHATSAPP_BASE = "https://wa.me/966551128884";

const landings: Record<string, LandingConfig> = {
  "general-contracting-riyadh": {
    slug: "general-contracting-riyadh",
    title: "شركة مقاولات عامة بالرياض | اتصل بتعاود لمشروعك",
    eyebrow: "شركة تعاود للمقاولات العامة · الرياض",
    heading: "شركة مقاولات عامة بالرياض للبناء والترميم والتشطيب",
    intro: "عندك مشروع بناء أو عقار يحتاج تجديدًا؟ تواصل مع تعاود لتحديد الخدمة والأعمال المطلوبة، واطّلع على صور وبيانات مشاريع الشركة قبل طلب عرض السعر.",
    service: "مقاولات عامة",
    serviceKey: "general_contracting",
    canonical: "https://tawodco.com/",
    image: "/images/projects/arouba-mosque-villas-01.webp",
    imageAlt: "أعمال المباني في مشروع تعاود بحي العروبة بالرياض",
    points: [["بناء وعظم", "تنفيذ الفلل والمباني بحسب المخططات ونوع العقد"], ["ترميم وتشطيب", "مراجعة حالة العقار والأعمال المطلوب تجديدها"], ["تسليم مفتاح", "تنسيق البناء والأعمال الفنية والتشطيب في نطاق واحد"]],
    scope: ["بناء الفلل والعظم والملاحق", "ترميم وتجديد الفلل والمباني", "تشطيب واستكمال الفلل", "مشاريع البناء وتسليم المفتاح"],
    faq: [["كيف أطلب عرض سعر لمشروعي؟", "اتصل على 0551128884 أو أرسل الحي ونوع الخدمة والمرحلة الحالية عبر واتساب. تساعد المساحة والمخططات أو الصور المتاحة على تحديد الخطوة التالية."], ["ما الذي يحدد تكلفة المشروع؟", "نوع الأعمال والمساحة والمواصفات وحالة الموقع ونطاق التوريد والتنفيذ. يُجهز العرض بعد مراجعة التفاصيل والمعاينة عندما تتطلبها طبيعة المشروع."], ["هل أحتاج مخططات قبل التواصل؟", "يمكنك بدء التواصل بالتفاصيل المتاحة. نراجع ما يحتاجه المشروع من مخططات أو صور أو معلومات إضافية بحسب الخدمة المطلوبة."]],
    project: { href: "/project-arouba-mosque-villas.html", title: "مسجد وفيلتان في حي العروبة", meta: "مشروع تسليم مفتاح · 1,800 م² · مدة المشروع الكامل 12 شهرًا", image: "/images/projects/arouba-mosque-villas-01.webp", imageAlt: "مرحلة المباني في مشروع المسجد والفيلتين بحي العروبة" },
  },
  "annex-construction-riyadh": {
    slug: "annex-construction-riyadh",
    title: "مقاول بناء ملاحق بالرياض | اتصل بشركة تعاود",
    eyebrow: "بناء ملاحق للمنازل والفلل · الرياض",
    heading: "مقاول بناء ملاحق بالرياض حسب مساحة موقعك واستخدامه",
    intro: "تحتاج ملحقًا سكنيًا أو خارجيًا؟ اشرح لفريق تعاود المساحة والاستخدام المطلوب، ونراجع أعمال البناء والكهرباء والسباكة والتشطيب التي يحتاجها مشروعك.",
    service: "بناء ملاحق",
    serviceKey: "construction",
    canonical: "https://tawodco.com/service-construction.html",
    image: "/images/services/service-construction-riyadh.webp",
    imageAlt: "أعمال بناء وإنشاءات ضمن خدمات تعاود في الرياض",
    points: [["استخدام واضح", "حدد هل الملحق للسكن أو الضيافة أو استخدام آخر"], ["نطاق البناء", "مراجعة المخططات والأعمال والتوريد المطلوب"], ["تنسيق التشطيب", "تحديد الأعمال الفنية والتشطيبات ضمن العرض"]],
    scope: ["بناء ملاحق للمنازل والفلل", "أعمال الهيكل والمباني وفق المخططات المعتمدة", "الكهرباء والسباكة حسب استخدام الملحق", "التشطيب ضمن البنود المتفق عليها"],
    faq: [["ما المعلومات المطلوبة لبناء ملحق؟", "ابدأ بالحي والمساحة التقريبية والاستخدام المطلوب وصور الموقع إن توفرت. تُراجع المخططات والمتطلبات النظامية بحسب نوع الملحق وموقعه."], ["هل يشمل العرض التشطيب؟", "يمكن مناقشة البناء وحده أو البناء مع الأعمال الفنية والتشطيب. يوضح العرض البنود والخامات ومسؤولية التوريد بحسب احتياجك."], ["كم تكلفة بناء الملحق ومدة تنفيذه؟", "تعتمدان على المساحة والحالة الإنشائية والاستخدام والمواصفات وسهولة الوصول للموقع. تُحدد التكلفة والمدة بعد مراجعة نطاق الأعمال."]],
    project: { href: "/project-arouba-mosque-villas.html", title: "من أعمال تعاود في البناء بحي العروبة", meta: "أعمال مبانٍ ضمن مشروع مسجد وفيلتين. يُحدد نطاق ملحقك بصورة مستقلة حسب موقعه ومخططاته.", image: "/images/projects/arouba-mosque-villas-01.webp", imageAlt: "أعمال مبانٍ في مشروع تعاود بحي العروبة" },
  },
  "facade-renovation-riyadh": {
    slug: "facade-renovation-riyadh",
    title: "مقاول ترميم واجهات بالرياض | تجديد الواجهات مع تعاود",
    eyebrow: "ترميم وتجديد واجهات الفلل والمباني · الرياض",
    heading: "مقاول ترميم واجهات بالرياض يبدأ بتقييم حالة الواجهة",
    intro: "جدّد واجهة عقارك بعد تحديد أسباب التشققات أو تلف اللياسة والدهان. أرسل صور الواجهة وحي المشروع ليراجع فريق تعاود الأعمال المطلوبة والخطوة المناسبة للفحص والتنفيذ.",
    service: "ترميم واجهات",
    serviceKey: "restoration",
    canonical: "https://tawodco.com/service-restoration.html",
    image: "/images/projects/faisaliah-villa-facades-finishing-01-v3.webp",
    imageAlt: "أعمال واجهة فيلا نفذتها تعاود بحي الفيصلية بالرياض",
    points: [["تقييم الحالة", "مراجعة مواضع التشققات والرطوبة والتلف"], ["نطاق المعالجة", "تحديد الإزالة والإصلاح والخامات المناسبة"], ["تجديد الواجهة", "تنسيق اللياسة والدهانات والتشطيبات المطلوبة"]],
    scope: ["تقييم حالة اللياسة والدهانات والعناصر القائمة", "تحديد معالجة الشروخ بعد مراجعة أسبابها", "تجديد اللياسة والدهانات ضمن النطاق المتفق عليه", "تنسيق أعمال الرخام والتشطيبات الخارجية عند الحاجة"],
    faq: [["هل تكفي صور الواجهة لإعداد السعر؟", "تساعد الصور على فهم الطلب مبدئيًا. قد تحتاج حالة الواجهة إلى معاينة وقياسات قبل تحديد سبب التلف ونطاق المعالجة والسعر."], ["هل يشمل ترميم الواجهة معالجة التشققات؟", "تُراجع التشققات وأسبابها أولًا، ويحدد المختص ما يلزم من فحص أو تقييم إنشائي. يُتفق على أعمال المعالجة والتشطيب وفق نتيجة المراجعة."], ["هل يمكن تجديد جزء من الواجهة؟", "يعتمد ذلك على حالة الأجزاء المتبقية وتوافق الخامات وطريقة الوصول للموقع. نناقش الإصلاح الجزئي أو التجديد الأوسع بعد مراجعة الصور والحالة."]],
    project: { href: "/project-faisaliah-villa-facades-finishing.html", title: "واجهات وتشطيبات فيلا بحي الفيصلية", meta: "أعمال لياسة ورخام وسيراميك · 900 م² · مدة هذا المشروع شهران", image: "/images/projects/faisaliah-villa-facades-finishing-01-v3.webp", imageAlt: "أعمال واجهات وتشطيبات فيلا تعاود بحي الفيصلية" },
  },
  "turnkey-riyadh": {
    slug: "turnkey-riyadh",
    title: "تسليم مفتاح في الرياض | اتصل أو واتساب | تعاود",
    eyebrow: "تسليم مفتاح للفلل والمشاريع بالرياض",
    heading: "شركة تسليم مفتاح بالرياض من بداية التنفيذ حتى التسليم",
    intro: "للفلل والمشاريع التي تحتاج جهة واحدة تدير البناء والأعمال الفنية والتشطيبات. تواصل مباشرة عبر الاتصال أو واتساب لمناقشة موقع المشروع ومرحلته ونطاق العمل.",
    service: "تسليم مفتاح",
    serviceKey: "turnkey",
    canonical: "https://tawodco.com/service-turnkey.html",
    image: "/images/services/service-turnkey-riyadh.webp",
    imageAlt: "تنفيذ مشروع تسليم مفتاح في الرياض",
    points: [["نطاق واضح", "تحديد البنود والمسؤوليات قبل التنفيذ"], ["تنسيق متكامل", "ربط البناء والأعمال الفنية والتشطيبات"], ["متابعة مرحلية", "مراجعة الأعمال حتى التسليم"]],
    project: {
      href: "/project-arouba-mosque-villas.html",
      title: "مسجد وفيلتان في حي العروبة",
      meta: "تسليم مفتاح كامل · 1,800 م² · 12 شهرًا",
      image: "/images/projects/arouba-mosque-villas-01.webp",
      imageAlt: "مشروع مسجد وفيلتين تسليم مفتاح في حي العروبة بالرياض",
    },
  },
  "bone-construction-riyadh": {
    slug: "bone-construction-riyadh",
    title: "مقاول بناء عظم بالرياض | اتصل أو واتساب | تعاود",
    eyebrow: "بناء عظم وإنشاءات بالرياض",
    heading: "مقاول بناء عظم بالرياض للفلل والمباني",
    intro: "تنفيذ أعمال العظم والإنشاءات للفلل والملاحق والمباني السكنية والتجارية داخل الرياض. اتصل أو تواصل عبر واتساب لمناقشة المخططات والمساحة ومرحلة المشروع.",
    service: "بناء عظم",
    serviceKey: "construction",
    canonical: "https://tawodco.com/service-construction.html",
    image: "/images/projects/arouba-mosque-villas-01.webp",
    imageAlt: "مرحلة المباني في مشروع مسجد وفيلتين نفذته تعاود بحي العروبة بالرياض",
    points: [["مراجعة المتطلبات", "فهم المخططات ونطاق الأعمال قبل التنفيذ"], ["تسلسل منظم", "تنسيق مراحل الهيكل والأعمال التالية"], ["مشاريع الرياض", "فلل وملاحق ومبانٍ سكنية وتجارية"]],
    project: {
      href: "/project-arouba-mosque-villas.html",
      title: "البناء والمباني في مشروع حي العروبة",
      meta: "مسجد وفيلتان · المشروع الكامل تسليم مفتاح على 1,800 م² خلال 12 شهرًا",
      image: "/images/projects/arouba-mosque-villas-01.webp",
      imageAlt: "مرحلة المباني في مشروع تعاود بحي العروبة بالرياض",
    },
  },
  "villa-renovation-riyadh": {
    slug: "villa-renovation-riyadh",
    title: "ترميم فلل بالرياض | اتصل أو واتساب | تعاود",
    eyebrow: "ترميم وتجديد فلل بالرياض",
    heading: "مقاول ترميم فلل بالرياض يبدأ من حالة المبنى الفعلية",
    intro: "للترميم الشامل أو الجزئي وتجديد الفلل والمباني القائمة. تواصل مباشرة عبر الاتصال أو واتساب لمناقشة حالة المبنى والأعمال المطلوبة وترتيب المعاينة عند الحاجة.",
    service: "ترميم فلل",
    serviceKey: "restoration",
    canonical: "https://tawodco.com/service-restoration.html",
    image: "/images/services/service-restoration-riyadh.webp",
    imageAlt: "ترميم وتجديد فيلا في الرياض",
    points: [["فهم الحالة", "تقييم الأعمال القائمة والاحتياج الفعلي"], ["نطاق ترميم", "فصل الأعمال الضرورية عن التحسينات الاختيارية"], ["تنسيق التنفيذ", "ربط المعالجات بالتشطيبات النهائية"]],
    project: {
      href: "/project-villa-plaster-ceramic-marble-uhud-riyadh.html",
      title: "أعمال فيلا سكنية في حي أحد",
      meta: "لياسة وقروفات وسيراميك ورخام · 700 م² · 3 أشهر",
      image: "/images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp",
      imageAlt: "أعمال لياسة وتشطيبات فيلا بحي أحد في الرياض",
    },
  },
  "villa-finishing-riyadh": {
    slug: "villa-finishing-riyadh",
    title: "تشطيب فلل بالرياض | اتصل أو واتساب | تعاود",
    eyebrow: "تشطيب فلل متكامل بالرياض",
    heading: "مقاول تشطيب فلل بالرياض بتنسيق كامل بين البنود",
    intro: "تنفيذ وتشطيب الفلل مع تنسيق الأرضيات والدهانات والأسقف والأعمال الكهربائية والصحية. اتصل أو تواصل عبر واتساب لمناقشة مستوى التشطيب ومرحلة المشروع.",
    service: "تشطيب فلل",
    serviceKey: "finishing",
    canonical: "https://tawodco.com/service-finishing.html",
    image: "/images/services/service-finishing-riyadh.webp",
    imageAlt: "تشطيب فيلا سكنية في الرياض",
    points: [["مستوى التشطيب", "تحديد المتطلبات والخامات المستهدفة"], ["تنسيق البنود", "ربط التشطيبات بالكهرباء والسباكة"], ["مراجعة مرحلية", "إغلاق الملاحظات قبل التسليم"]],
    project: {
      href: "/project-faisaliah-villa-facades-finishing.html",
      title: "واجهات وتشطيبات فيلا بحي الفيصلية",
      meta: "لياسة ورخام وسيراميك · 900 م² · شهران",
      image: "/images/projects/faisaliah-villa-facades-finishing-01-v3.webp",
      imageAlt: "تنفيذ واجهات وتشطيبات فيلا بحي الفيصلية بالرياض",
    },
  },
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(landings).map((slug) => ({ slug }));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function whatsappHref(service: string) {
  const message = `السلام عليكم، أحتاج ${service} في الرياض.

الحي:
نوع العقار:
المرحلة الحالية:
المساحة أو الصور إن توفرت:`;
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

function contactActions(config: LandingConfig, position = "hero", compact = false) {
  const whatsapp = whatsappHref(config.service);
  const callLabel = compact ? "اتصال" : "اتصل الآن";
  const whatsappLabel = compact ? "واتساب" : "تواصل واتساب";
  return `<div class="ads-hero-actions${compact ? " ads-contact-compact" : ""}">
    <a class="ads-btn ads-btn-primary" href="${PHONE_HREF}" data-contact-channel="phone" data-contact-service="${config.serviceKey || config.slug}" data-contact-position="${position}" aria-label="الاتصال بشركة تعاود على ${PHONE_DISPLAY}">${callLabel}${compact ? "" : ` · <bdi dir="ltr">${PHONE_DISPLAY}</bdi>`}</a>
    <a class="ads-btn ads-btn-whatsapp" href="${whatsapp}" data-contact-channel="whatsapp" data-contact-service="${config.serviceKey || config.slug}" data-contact-position="${position}" aria-label="التواصل مع شركة تعاود عبر واتساب بخصوص ${escapeHtml(config.service)}">${whatsappLabel}</a>
  </div>`;
}

function page(config: LandingConfig) {
  const pointCards = config.points.map(([title, copy], index) => `
    <div class="ads-card"><span class="number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`).join("");
  const scope = config.scope || config.points.map(([title, copy]) => `${title}: ${copy}`);
  const faqs = config.faq || [
    ["كيف أبدأ طلب عرض السعر؟", `اتصل على ${PHONE_DISPLAY} أو أرسل حي المشروع ونوع العقار والمرحلة الحالية عبر واتساب. شارك المساحة والمخططات أو الصور إذا توفرت.`],
    ["كيف تتحدد التكلفة والمدة؟", "تُحددان بعد مراجعة مساحة المشروع وحالته والمخططات والمواصفات ونطاق المواد والتنفيذ. تُرتب المعاينة عندما تتطلبها طبيعة الأعمال."],
    ["هل يمكن التواصل قبل اكتمال تفاصيل المشروع؟", "نعم، ابدأ بالمعلومات المتاحة، ثم نراجع البيانات أو المخططات اللازمة لتحديد الخدمة والخطوة التالية."],
  ];

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1d1e26">
<title>${escapeHtml(config.title)}</title>
<meta name="description" content="${escapeHtml(config.intro)}">
<meta name="robots" content="noindex,follow,max-image-preview:large">
<link rel="canonical" href="${escapeHtml(config.canonical)}">
<link rel="stylesheet" href="/assets/css/tawod-system.css">
<link rel="stylesheet" href="/assets/css/tawod-ads-landing.css?v=20261018-1">
<script src="/assets/js/tawod-analytics.js" defer></script>
<script src="/assets/js/tawod-first-party.js" defer></script>
<script src="/assets/js/tawod-whatsapp-attribution.js" defer></script>
</head>
<body>
<a class="ads-skip" href="#service-content">انتقل إلى تفاصيل الخدمة</a>
<div class="ads-shell">
<header class="ads-topbar"><div class="ads-container"><a class="ads-logo" href="/" aria-label="شركة تعاود للمقاولات"><img src="/images/logo/tawod-logo-180.webp" width="180" height="80" alt="شركة تعاود للمقاولات"></a><div class="ads-top-actions"><a class="ads-btn ads-btn-outline" href="${PHONE_HREF}" data-contact-channel="phone" data-contact-service="${config.serviceKey || config.slug}" data-contact-position="header"><bdi dir="ltr">${PHONE_DISPLAY}</bdi></a><a class="ads-btn ads-btn-whatsapp" href="${whatsappHref(config.service)}" data-contact-channel="whatsapp" data-contact-service="${config.serviceKey || config.slug}" data-contact-position="header">واتساب</a></div></div></header>
<main id="service-content">
<section class="ads-hero"><div class="ads-container ads-hero-grid"><div><span class="ads-eyebrow">${escapeHtml(config.eyebrow)}</span><h1>${escapeHtml(config.heading)}</h1><p>${escapeHtml(config.intro)}</p>${contactActions(config)}<div class="ads-proof"><div><strong>مشاريع موثقة</strong><span>صور وبيانات من أعمال منفذة</span></div><div><strong>داخل الرياض</strong><span>الخدمة مخصصة لمشاريع الرياض</span></div><div><strong>معاينة عند الحاجة</strong><span>وفق نوع المشروع وحالته</span></div></div></div><div class="ads-media"><img src="${escapeHtml(config.image)}" width="1536" height="1024" fetchpriority="high" decoding="async" alt="${escapeHtml(config.imageAlt)}"><div class="ads-media-note">جهز الحي والمساحة ومرحلة المشروع والمخططات أو الصور للحصول على تقييم أولي أدق.</div></div></div></section>
<section class="ads-section ads-section-white"><div class="ads-container"><div class="ads-title"><small>خدمة تناسب مشروعك</small><h2>ماذا تحتاج في أعمال ${escapeHtml(config.service)}؟</h2><p>ابدأ بالحي ونوع العقار والمرحلة الحالية، ونراجع معك الأعمال والخامات والخطوة المناسبة لمشروعك.</p></div><div class="ads-benefits">${pointCards}<div class="ads-card"><span class="number">04</span><h3>تواصل مباشر</h3><p>اتصل لشرح احتياجك، أو أرسل التفاصيل والصور المتاحة عبر واتساب.</p></div></div><ul class="ads-scope">${scope.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul><a class="ads-service-link" href="${escapeHtml(config.canonical)}">اطّلع على تفاصيل خدمات تعاود</a></div></section>
<section class="ads-section ads-project-proof"><div class="ads-container ads-project-grid"><div class="ads-project-copy"><small>من أعمال تعاود</small><h2>${escapeHtml(config.project.title)}</h2><p>${escapeHtml(config.project.meta)}</p><a class="ads-project-link" href="${escapeHtml(config.project.href)}">شاهد تفاصيل المشروع</a></div><a class="ads-project-media" href="${escapeHtml(config.project.href)}" aria-label="عرض ${escapeHtml(config.project.title)}"><img src="${escapeHtml(config.project.image)}" width="1152" height="768" loading="lazy" decoding="async" alt="${escapeHtml(config.project.imageAlt)}"></a></div></section>
<section class="ads-section ads-section-white"><div class="ads-container"><div class="ads-title"><small>قبل طلب العرض</small><h2>أسئلة عن ${escapeHtml(config.service)}</h2></div><div class="ads-faq">${faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</div></div></section>
<section class="ads-form-section" aria-labelledby="direct-contact-title"><div class="ads-container ads-form-grid"><div class="ads-form-copy"><span class="ads-eyebrow" style="color:#805426;border-color:#c9aa85">تواصل مباشر</span><h2 id="direct-contact-title">ابدأ طلب ${escapeHtml(config.service)}</h2><p>اختر الاتصال لشرح احتياجك، أو واتساب لإرسال الموقع والصور والمخططات. شارك ما يتوفر لديك من التفاصيل، ونراجع معك الخطوة التالية.</p><ul class="ads-checks"><li>حي المشروع داخل الرياض</li><li>نوع العقار والمرحلة الحالية</li><li>الأعمال التي تحتاج تنفيذها</li><li>المساحة والمخططات أو الصور إن توفرت</li></ul>${contactActions(config, "contact_section")}</div><div class="ads-card"><span class="number">تعاود</span><h3><bdi dir="ltr">${PHONE_DISPLAY}</bdi></h3><p>ابدأ بالتواصل مع الفريق، واطّلع على أعمال الشركة ونطاق التنفيذ قبل اتخاذ قرارك.</p>${contactActions(config, "contact_card", true)}</div></div></section>
</main>
<footer class="ads-footer"><div class="ads-container">شركة تعاود للمقاولات العامة — الرياض · <a href="/privacy-policy.html">سياسة الخصوصية</a></div></footer>
</div>
<nav class="ads-mobile-bar" aria-label="خيارات التواصل السريع"><a class="ads-btn ads-btn-primary" href="${PHONE_HREF}" data-contact-channel="phone" data-contact-service="${config.serviceKey || config.slug}" data-contact-position="mobile_sticky">اتصل بتعاود</a><a class="ads-btn ads-btn-whatsapp" href="${whatsappHref(config.service)}" data-contact-channel="whatsapp" data-contact-service="${config.serviceKey || config.slug}" data-contact-position="mobile_sticky">واتساب</a></nav>
</body></html>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const config = landings[slug];
  if (!config) return new Response("Not found", { status: 404 });

  return new Response(page(config), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "x-robots-tag": "noindex, follow",
    },
  });
}
