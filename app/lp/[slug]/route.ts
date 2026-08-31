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
};

const landings: Record<string, LandingConfig> = {
  "turnkey-riyadh": {
    slug: "turnkey-riyadh",
    title: "تسليم مفتاح في الرياض | طلب معاينة وعرض سعر | تعاود",
    eyebrow: "تسليم مفتاح للفلل والمشاريع بالرياض",
    heading: "جهة واحدة تدير مشروعك حتى التسليم",
    intro: "أرسل بيانات المشروع لنراجع نطاق البناء والتشطيبات والأعمال الفنية ونرتب الخطوة المناسبة للمعاينة وعرض السعر.",
    service: "تسليم مفتاح",
    canonical: "https://tawodco.com/service-turnkey.html",
    image: "/images/services/service-turnkey-riyadh.webp",
    imageAlt: "تنفيذ مشروع تسليم مفتاح في الرياض",
    points: [["نطاق واضح", "تحديد البنود والمسؤوليات قبل التنفيذ"], ["تنسيق متكامل", "ربط البناء وMEP والتشطيبات"], ["متابعة مرحلية", "مراجعة الأعمال حتى التسليم"]],
  },
  "bone-construction-riyadh": {
    slug: "bone-construction-riyadh",
    title: "مقاول بناء عظم في الرياض | طلب معاينة وعرض سعر | تعاود",
    eyebrow: "بناء عظم وإنشاءات بالرياض",
    heading: "تنفيذ بناء العظم بنطاق ومراحل واضحة",
    intro: "للـفلل والملاحق والمباني السكنية والتجارية داخل الرياض. شاركنا المخططات والمساحة ومرحلة المشروع لتقييم الطلب بدقة.",
    service: "البناء والإنشاءات",
    canonical: "https://tawodco.com/service-construction.html",
    image: "/images/services/service-construction-riyadh.webp",
    imageAlt: "أعمال بناء عظم وإنشاءات في الرياض",
    points: [["قراءة المتطلبات", "مراجعة المخططات ونطاق الأعمال"], ["تسلسل منظم", "تنسيق مراحل الهيكل والأعمال التالية"], ["مشاريع الرياض", "فلل وملاحق ومبانٍ سكنية وتجارية"]],
  },
  "villa-renovation-riyadh": {
    slug: "villa-renovation-riyadh",
    title: "ترميم فلل في الرياض | طلب معاينة وعرض سعر | تعاود",
    eyebrow: "ترميم وتجديد فلل بالرياض",
    heading: "ابدأ الترميم بعد فهم حالة المبنى فعليًا",
    intro: "أرسل موقع الفيلا وعمر المبنى والأعمال المطلوبة والصور المتاحة لنحدد احتياج المعاينة ونطاق الترميم والتجديد المناسب.",
    service: "ترميم مباني",
    canonical: "https://tawodco.com/service-restoration.html",
    image: "/images/services/service-restoration-riyadh.webp",
    imageAlt: "ترميم وتجديد فيلا في الرياض",
    points: [["فهم الحالة", "تقييم الضرر والأعمال القائمة"], ["نطاق ترميم", "فصل الضروري عن التحسينات الاختيارية"], ["تنسيق التنفيذ", "ربط المعالجات بالتشطيبات النهائية"]],
  },
  "villa-finishing-riyadh": {
    slug: "villa-finishing-riyadh",
    title: "تشطيب فلل في الرياض | طلب معاينة وعرض سعر | تعاود",
    eyebrow: "تشطيب فلل متكامل بالرياض",
    heading: "تشطيبات مترابطة بدل قرارات متفرقة",
    intro: "شاركنا مساحة الفيلا ومرحلتها ومستوى التشطيب المطلوب لنراجع نطاق الأرضيات والدهانات والأسقف والأعمال الفنية قبل عرض السعر.",
    service: "تشطيبات عامة",
    canonical: "https://tawodco.com/service-finishing.html",
    image: "/images/services/service-finishing-riyadh.webp",
    imageAlt: "تشطيب فيلا سكنية في الرياض",
    points: [["مستوى التشطيب", "تحديد المتطلبات والخامات المستهدفة"], ["تنسيق البنود", "ربط التشطيبات بالكهرباء والسباكة"], ["إغلاق الملاحظات", "مراجعة المراحل قبل التسليم"]],
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

function option(value: string) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
}

function page(config: LandingConfig) {
  const service = escapeHtml(config.service);
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
<link rel="preconnect" href="https://formsubmit.co">
<link rel="stylesheet" href="/assets/css/tawod-system.css">
<link rel="stylesheet" href="/assets/css/tawod-ads-landing.css">
<script src="/assets/js/tawod-analytics.js?v=3dc2f867690b" defer></script>
<script src="/assets/js/tawod-ads-rescue.js" defer></script>
<script src="/assets/js/contact-conversion.js" defer></script>
</head>
<body>
<div class="ads-shell">
<header class="ads-topbar"><div class="ads-container"><a class="ads-logo" href="/" aria-label="شركة تعاود للمقاولات"><img src="/images/logo/tawod-logo.png" width="917" height="408" alt="شركة تعاود للمقاولات"></a><div class="ads-top-actions"><a class="ads-btn ads-btn-outline" href="tel:0551128884">0551128884</a><a class="ads-btn ads-btn-primary" href="#quote">اطلب عرض سعر</a></div></div></header>
<main>
<section class="ads-hero"><div class="ads-container ads-hero-grid"><div><span class="ads-eyebrow">${escapeHtml(config.eyebrow)}</span><h1>${escapeHtml(config.heading)}</h1><p>${escapeHtml(config.intro)}</p><div class="ads-hero-actions"><a class="ads-btn ads-btn-primary" href="#quote">ابدأ بطلب المشروع</a><a class="ads-btn ads-btn-whatsapp" href="https://wa.me/966551128884?text=${encodeURIComponent(`السلام عليكم، لدي طلب ${config.service} في الرياض`)}">واتساب مباشر</a></div><div class="ads-proof"><div><strong>داخل الرياض</strong><span>نراجع موقع المشروع ونطاقه</span></div><div><strong>طلب مؤهل</strong><span>المساحة والمرحلة والميزانية</span></div><div><strong>معاينة عند الحاجة</strong><span>بحسب نوع وحالة المشروع</span></div></div></div><div class="ads-media"><img src="${escapeHtml(config.image)}" width="1536" height="1024" fetchpriority="high" decoding="async" alt="${escapeHtml(config.imageAlt)}"><div class="ads-media-note">كلما كانت بيانات المشروع أوضح، كانت مراجعة الطلب والخطوة التالية أدق.</div></div></div></section>
<section class="ads-section ads-section-white"><div class="ads-container"><div class="ads-title"><small>كيف نبدأ</small><h2>معلومات واضحة قبل عرض السعر</h2><p>هذه الصفحة مخصصة لطلبات المشاريع الجادة داخل الرياض، وتساعدنا على فهم الاحتياج قبل الاتصال أو ترتيب المعاينة.</p></div><div class="ads-benefits">${pointCards}<div class="ads-card"><span class="number">04</span><h3>مخططات وصور</h3><p>يمكن إرسال الملفات والصور عبر واتساب بعد تسجيل الطلب.</p></div></div></div></section>
<section class="ads-form-section" id="quote"><div class="ads-container ads-form-grid"><div class="ads-form-copy"><span class="ads-eyebrow" style="color:#805426;border-color:#c9aa85">طلب مشروع</span><h2>أرسل بيانات ${service}</h2><p>نستخدم هذه المعلومات لفهم حجم الطلب ونوعه، وليس لتقديم سعر آلي غير دقيق.</p><ul class="ads-checks"><li>المشروع داخل الرياض أو نطاقها القريب</li><li>حدد المساحة والمرحلة الحالية</li><li>اختر موعد البدء ونطاق الميزانية</li><li>أرسل المخططات أو الصور لاحقًا عبر واتساب</li></ul></div>
<form id="form" class="ads-form" action="https://formsubmit.co/info@tawodco.com" method="POST" data-analytics-form="contact_quote_request">
<h2>طلب معاينة أو عرض سعر</h2><p>الحقول التالية تساعد فريق تعاود على مراجعة طلبك بصورة عملية.</p>
<input type="hidden" name="_subject" value="طلب ${service} من صفحة Google Ads">
<input type="hidden" name="_captcha" value="true"><input type="hidden" name="_template" value="table"><input type="hidden" name="_next" value="https://tawodco.com/thank-you.html"><input type="hidden" name="الخدمة_المطلوبة" value="${service}">
<div class="ads-form-fields">
<div><label for="lead-name">الاسم</label><input id="lead-name" name="الاسم" autocomplete="name" required placeholder="الاسم الكريم"></div>
<div><label for="lead-phone">رقم الجوال</label><input id="lead-phone" name="رقم_الجوال" type="tel" inputmode="tel" autocomplete="tel" required maxlength="16" placeholder="05xxxxxxxx"></div>
<div><label for="lead-location">الحي أو موقع المشروع</label><input id="lead-location" name="الحي_او_الموقع" required placeholder="مثال: النرجس - الرياض"></div>
<div><label for="lead-area">المساحة التقريبية</label><input id="lead-area" name="المساحة" required placeholder="مثال: 650 م²"></div>
<div><label for="lead-stage">مرحلة المشروع</label><select id="lead-stage" name="مرحلة_المشروع" required><option value="">اختر المرحلة</option>${option("فكرة أو تخطيط")}${option("لدي مخططات")}${option("قائم ويحتاج تنفيذ")}${option("قائم ويحتاج ترميم")}${option("مرحلة التشطيب")}</select></div>
<div><label for="lead-plans">حالة المخططات</label><select id="lead-plans" name="حالة_المخططات" required><option value="">اختر الحالة</option>${option("مخططات جاهزة")}${option("مخططات قيد الإعداد")}${option("لا توجد مخططات حاليًا")}${option("غير مطلوب")}</select></div>
<div><label for="lead-start">موعد البدء المتوقع</label><select id="lead-start" name="موعد_البدء" required><option value="">اختر الموعد</option>${option("خلال أسبوعين")}${option("خلال شهر")}${option("خلال 1-3 أشهر")}${option("بعد 3 أشهر")}${option("أحتاج تقييمًا أولًا")}</select></div>
<div><label for="lead-budget">نطاق الميزانية التقريبي</label><select id="lead-budget" name="نطاق_الميزانية" required><option value="">اختر النطاق</option>${option("أقل من 100 ألف ريال")}${option("100 - 250 ألف ريال")}${option("250 - 500 ألف ريال")}${option("500 ألف - مليون ريال")}${option("أكثر من مليون ريال")}${option("لم تُحدد بعد")}</select></div>
<div class="ads-field-full"><label for="lead-decision">صفة مقدم الطلب</label><select id="lead-decision" name="صاحب_القرار" required><option value="">اختر الصفة</option>${option("مالك المشروع / صاحب القرار")}${option("ممثل المالك")}${option("مهندس أو استشاري")}${option("مقاول / طلب مقاولة باطن")}${option("استفسار مبدئي")}</select></div>
<div class="ads-field-full"><label for="lead-details">تفاصيل إضافية</label><textarea id="lead-details" name="التفاصيل" required maxlength="1200" placeholder="اذكر نوع المبنى، الأعمال المطلوبة، المرحلة الحالية وأي معلومات تساعد على تقييم الطلب"></textarea></div>
</div>
<div class="ads-privacy"><input id="privacy-consent" name="الموافقة_على_الخصوصية" type="checkbox" value="موافق" required><label for="privacy-consent">أوافق على استخدام بياناتي للتواصل بخصوص هذا الطلب وفق <a href="/privacy-policy.html">سياسة الخصوصية</a>.</label></div>
<button class="ads-btn ads-btn-primary ads-submit" type="submit">إرسال طلب المشروع</button><div class="ads-form-note">لن يُحسب فتح الصفحة أو الضغط على واتساب كطلب عرض سعر مكتمل.</div>
</form></div></section>
</main>
<footer class="ads-footer"><div class="ads-container">شركة تعاود للمقاولات العامة — الرياض · <a href="/privacy-policy.html">سياسة الخصوصية</a></div></footer>
</div>
<div class="ads-mobile-bar"><a class="ads-btn ads-btn-whatsapp" href="https://wa.me/966551128884">واتساب</a><a class="ads-btn ads-btn-primary" href="#quote">طلب عرض سعر</a></div>
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
