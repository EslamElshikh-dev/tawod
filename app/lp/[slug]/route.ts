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
  "turnkey-riyadh": {
    slug: "turnkey-riyadh",
    title: "تسليم مفتاح في الرياض | اتصل أو واتساب | تعاود",
    eyebrow: "تسليم مفتاح للفلل والمشاريع بالرياض",
    heading: "شركة تسليم مفتاح بالرياض من بداية التنفيذ حتى التسليم",
    intro: "للفلل والمشاريع التي تحتاج جهة واحدة تدير البناء والأعمال الفنية والتشطيبات. تواصل مباشرة عبر الاتصال أو واتساب لمناقشة موقع المشروع ومرحلته ونطاق العمل.",
    service: "تسليم مفتاح",
    canonical: "https://tawodco.com/service-turnkey.html",
    image: "/images/services/service-turnkey-riyadh.webp",
    imageAlt: "تنفيذ مشروع تسليم مفتاح في الرياض",
    points: [["نطاق واضح", "تحديد البنود والمسؤوليات قبل التنفيذ"], ["تنسيق متكامل", "ربط البناء والأعمال الفنية والتشطيبات"], ["متابعة مرحلية", "مراجعة الأعمال حتى التسليم"]],
    project: {
      href: "/project-arouba-mosque-villas.html",
      title: "مسجد وفلّتان في حي العروبة",
      meta: "تسليم مفتاح كامل · 1,800 م² · 12 شهرًا",
      image: "/images/projects/arouba-mosque-villas-01.webp",
      imageAlt: "مشروع مسجد وفلّتين تسليم مفتاح في حي العروبة بالرياض",
    },
  },
  "bone-construction-riyadh": {
    slug: "bone-construction-riyadh",
    title: "مقاول بناء عظم بالرياض | اتصل أو واتساب | تعاود",
    eyebrow: "بناء عظم وإنشاءات بالرياض",
    heading: "مقاول بناء عظم بالرياض للفلل والمباني",
    intro: "تنفيذ أعمال العظم والإنشاءات للفلل والملاحق والمباني السكنية والتجارية داخل الرياض. اتصل أو تواصل عبر واتساب لمناقشة المخططات والمساحة ومرحلة المشروع.",
    service: "بناء عظم",
    canonical: "https://tawodco.com/service-construction.html",
    image: "/images/services/service-construction-riyadh.webp",
    imageAlt: "أعمال بناء عظم وإنشاءات في الرياض",
    points: [["مراجعة المتطلبات", "فهم المخططات ونطاق الأعمال قبل التنفيذ"], ["تسلسل منظم", "تنسيق مراحل الهيكل والأعمال التالية"], ["مشاريع الرياض", "فلل وملاحق ومبانٍ سكنية وتجارية"]],
    project: {
      href: "/project-modon-eight-warehouses-riyadh.html",
      title: "تنفيذ 8 مستودعات في الرياض",
      meta: "29,122.40 م² · المدينة الصناعية الثانية · 6 أشهر",
      image: "/images/projects/modon-eight-warehouses-01.webp",
      imageAlt: "تنفيذ مستودعات في المدينة الصناعية الثانية بالرياض",
    },
  },
  "villa-renovation-riyadh": {
    slug: "villa-renovation-riyadh",
    title: "ترميم فلل بالرياض | اتصل أو واتساب | تعاود",
    eyebrow: "ترميم وتجديد فلل بالرياض",
    heading: "مقاول ترميم فلل بالرياض يبدأ من حالة المبنى الفعلية",
    intro: "للترميم الشامل أو الجزئي وتجديد الفلل والمباني القائمة. تواصل مباشرة عبر الاتصال أو واتساب لمناقشة حالة المبنى والأعمال المطلوبة وترتيب المعاينة عند الحاجة.",
    service: "ترميم فلل",
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
  const message = `السلام عليكم، لدي طلب ${service} في الرياض وأرغب في تقييم المشروع وعرض سعر.

الحي:
نوع العقار:
المساحة التقريبية:
مرحلة المشروع الحالية:
موعد البدء المتوقع:
الميزانية التقريبية:
المخططات أو الصور: متوفرة / غير متوفرة`;
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

function contactActions(config: LandingConfig, compact = false) {
  const whatsapp = whatsappHref(config.service);
  const callLabel = compact ? "اتصال" : "اتصل الآن";
  const whatsappLabel = compact ? "واتساب" : "تواصل واتساب";
  return `<div class="ads-hero-actions${compact ? " ads-contact-compact" : ""}">
    <a class="ads-btn ads-btn-primary" href="${PHONE_HREF}" data-contact-channel="phone" aria-label="الاتصال بشركة تعاود على ${PHONE_DISPLAY}">${callLabel}</a>
    <a class="ads-btn ads-btn-whatsapp" href="${whatsapp}" data-contact-channel="whatsapp" data-contact-service="${escapeHtml(config.service)}" aria-label="التواصل مع شركة تعاود عبر واتساب بخصوص ${escapeHtml(config.service)}">${whatsappLabel}</a>
  </div>`;
}

function page(config: LandingConfig) {
  const pointCards = config.points.map(([title, copy], index) => `
    <div class="ads-card"><span class="number">0${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`).join("");

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
<link rel="stylesheet" href="/assets/css/tawod-ads-landing.css">
<script src="/assets/js/tawod-analytics.js" defer></script>
<script src="/assets/js/tawod-first-party.js" defer></script>
<script src="/assets/js/tawod-whatsapp-attribution.js" defer></script>
</head>
<body>
<div class="ads-shell">
<header class="ads-topbar"><div class="ads-container"><a class="ads-logo" href="/" aria-label="شركة تعاود للمقاولات"><img src="/images/logo/tawod-logo.png" width="917" height="408" alt="شركة تعاود للمقاولات"></a><div class="ads-top-actions"><a class="ads-btn ads-btn-outline" href="${PHONE_HREF}" data-contact-channel="phone">${PHONE_DISPLAY}</a><a class="ads-btn ads-btn-whatsapp" href="${whatsappHref(config.service)}" data-contact-channel="whatsapp" data-contact-service="${escapeHtml(config.service)}">واتساب</a></div></div></header>
<main>
<section class="ads-hero"><div class="ads-container ads-hero-grid"><div><span class="ads-eyebrow">${escapeHtml(config.eyebrow)}</span><h1>${escapeHtml(config.heading)}</h1><p>${escapeHtml(config.intro)}</p>${contactActions(config)}<div class="ads-proof"><div><strong>مشاريع موثقة</strong><span>صور وبيانات من أعمال منفذة</span></div><div><strong>داخل الرياض</strong><span>الخدمة مخصصة لمشاريع الرياض</span></div><div><strong>معاينة عند الحاجة</strong><span>وفق نوع المشروع وحالته</span></div></div></div><div class="ads-media"><img src="${escapeHtml(config.image)}" width="1536" height="1024" fetchpriority="high" decoding="async" alt="${escapeHtml(config.imageAlt)}"><div class="ads-media-note">جهز الحي والمساحة ومرحلة المشروع والمخططات أو الصور للحصول على تقييم أولي أدق.</div></div></div></section>
<section class="ads-section ads-section-white"><div class="ads-container"><div class="ads-title"><small>قبل التنفيذ</small><h2>مناقشة مباشرة مع فريق تعاود</h2><p>هدف الصفحة هو الوصول السريع إلى تواصل حقيقي. عند الاتصال أو واتساب اذكر الحي والمساحة والمرحلة الحالية وأي مخططات أو صور متاحة.</p></div><div class="ads-benefits">${pointCards}<div class="ads-card"><span class="number">04</span><h3>مخططات وصور</h3><p>أرسل الملفات والصور مباشرة عبر واتساب عندما تساعد على فهم نطاق العمل.</p></div></div></div></section>
<section class="ads-section ads-project-proof"><div class="ads-container ads-project-grid"><div class="ads-project-copy"><small>من أعمال تعاود</small><h2>${escapeHtml(config.project.title)}</h2><p>${escapeHtml(config.project.meta)}</p><a class="ads-project-link" href="${escapeHtml(config.project.href)}">شاهد تفاصيل المشروع</a></div><a class="ads-project-media" href="${escapeHtml(config.project.href)}" aria-label="عرض ${escapeHtml(config.project.title)}"><img src="${escapeHtml(config.project.image)}" width="1152" height="768" loading="lazy" decoding="async" alt="${escapeHtml(config.project.imageAlt)}"></a></div></section>
<section class="ads-form-section" aria-labelledby="direct-contact-title"><div class="ads-container ads-form-grid"><div class="ads-form-copy"><span class="ads-eyebrow" style="color:#805426;border-color:#c9aa85">تواصل مباشر</span><h2 id="direct-contact-title">جاهز لمناقشة ${escapeHtml(config.service)}؟</h2><p>اختر الاتصال لشرح الطلب مباشرة، أو واتساب لإرسال الموقع والصور والمخططات. رسالة واتساب جاهزة بأسئلة قصيرة تساعد الفريق على تقييم جدية المشروع.</p><ul class="ads-checks"><li>حدد موقع المشروع داخل الرياض</li><li>اذكر المساحة والمرحلة الحالية</li><li>وضح الميزانية وموعد البدء المتوقع</li><li>أرسل المخططات أو الصور إن توفرت</li></ul>${contactActions(config)}</div><div class="ads-card"><span class="number">ابدأ</span><h3>${PHONE_DISPLAY}</h3><p>كلما كانت بيانات الحي والمساحة والمرحلة والميزانية أوضح، كانت مراجعة الطلب وتجهيز الخطوة التالية أسرع.</p>${contactActions(config, true)}</div></div></section>
</main>
<footer class="ads-footer"><div class="ads-container">شركة تعاود للمقاولات العامة — الرياض · <a href="/privacy-policy.html">سياسة الخصوصية</a></div></footer>
</div>
<div class="ads-mobile-bar" aria-label="خيارات التواصل السريع"><a class="ads-btn ads-btn-primary" href="${PHONE_HREF}" data-contact-channel="phone">اتصال</a><a class="ads-btn ads-btn-whatsapp" href="${whatsappHref(config.service)}" data-contact-channel="whatsapp" data-contact-service="${escapeHtml(config.service)}">واتساب</a></div>
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
