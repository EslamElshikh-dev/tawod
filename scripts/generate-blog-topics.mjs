import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { articleRole, blogTopics, legacyTopicHubSlugs, topicForArticle, topicUrl } from "./blog-topic-data.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(rootDir, "blog");
const domain = "https://tawodco.com";
const buildDate = "2026-08-29";
const architectureCss = join(rootDir, "assets/css/tawod-blog-architecture.css");
const architectureVersion = createHash("sha256").update(readFileSync(architectureCss)).digest("hex").slice(0, 12);
const architectureHref = `/assets/css/tawod-blog-architecture.css?v=${architectureVersion}`;

function decodeEntities(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function cleanText(value = "") {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return "";
}

function metaContent(html, attribute, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]]),
    );
    if ((attributes[attribute] || "").toLowerCase() === value.toLowerCase()) return cleanText(attributes.content || "");
  }
  return "";
}

function articleFromDirectory(slug) {
  const html = readFileSync(join(blogDir, slug, "index.html"), "utf8");
  const title = firstMatch(html, [/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, /<title>([\s\S]*?)<\/title>/i]);
  const description = metaContent(html, "name", "description") || metaContent(html, "property", "og:description");
  const image = (metaContent(html, "property", "og:image") || `${domain}/images/blog/construction-building-riyadh.webp`)
    .replace(/^https?:\/\/(?:www\.)?tawodco\.com/i, "");
  const alt = metaContent(html, "property", "og:image:alt")
    || firstMatch(html, [/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/i])
    || title;
  const datePublished = firstMatch(html, [
    /["']datePublished["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/i,
    /["']dateModified["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/i,
  ]) || "2026-07-13";
  if (!title || !description) throw new Error(`Missing title or description for blog/${slug}/`);
  return { slug, title, description, image, alt, datePublished, topic: topicForArticle(slug) };
}

function getArticles() {
  return readdirSync(blogDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !["page", "topics"].includes(entry.name) && !legacyTopicHubSlugs.has(entry.name) && existsSync(join(blogDir, entry.name, "index.html")))
    .map((entry) => articleFromDirectory(entry.name))
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00Z`));
}

function supportingCard(article) {
  return `<article class="topic-article-card">
    <a class="topic-article-media" href="/blog/${article.slug}/"><img src="${escapeHtml(article.image)}" loading="lazy" decoding="async" alt="${escapeHtml(article.alt)}"></a>
    <div class="topic-article-copy"><time datetime="${article.datePublished}"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${formatDate(article.datePublished)}</time><h3><a href="/blog/${article.slug}/">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.description)}</p><a class="topic-article-link" href="/blog/${article.slug}/">اقرأ الدليل <i class="fa-solid fa-arrow-left-long" aria-hidden="true"></i></a></div>
  </article>`;
}

function topicFaq(topic) {
  return topic.faq.map(([question, answer], index) => `<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="topic-${topic.slug}-faq-${index + 1}"><span>${escapeHtml(question)}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="faq-answer" id="topic-${topic.slug}-faq-${index + 1}"><p>${escapeHtml(answer)}</p></div></div>`).join("");
}

function topicMain(topic, articles) {
  const pillar = articles.find((article) => article.slug === topic.pillar);
  if (!pillar) throw new Error(`Missing pillar ${topic.pillar} for ${topic.slug}`);
  const supporting = articles.filter((article) => article.slug !== topic.pillar);
  const secondaryService = topic.secondaryServiceUrl
    ? `<a class="btn btn-outline" href="${topic.secondaryServiceUrl}">${topic.secondaryServiceLabel}</a>`
    : "";
  return `<main id="main">
    <section class="page-hero topic-hub-hero"><div class="container reveal"><nav class="breadcrumb" aria-label="مسار التنقل"><a href="/">الرئيسية</a><i class="fa-solid fa-angle-left" aria-hidden="true"></i><a href="/blog/">المدونة</a><i class="fa-solid fa-angle-left" aria-hidden="true"></i><span aria-current="page">${topic.title}</span></nav><span class="topic-hub-kicker"><i class="fa-solid ${topic.icon}" aria-hidden="true"></i> مركز معرفي متخصص</span><h1>${topic.pageTitle}</h1><p>${topic.description}</p><div class="topic-hub-stats"><span><strong>${articles.length}</strong> دليلًا متخصصًا</span><span><strong>1</strong> دليل محوري</span><span><strong>الرياض</strong> نطاق المحتوى</span></div></div></section>
    <section class="section section-white topic-pillar-section" aria-labelledby="topic-pillar-title"><div class="container"><div class="section-heading"><div class="section-heading-copy"><span class="eyebrow"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ابدأ من هنا</span><h2 id="topic-pillar-title">الدليل المحوري في ${topic.title}</h2><p>ابدأ بهذا الدليل للحصول على الصورة الكاملة، ثم انتقل إلى الأدلة المتخصصة بحسب قرارك الحالي.</p></div></div><article class="topic-pillar-card"><a class="topic-pillar-media" href="/blog/${pillar.slug}/"><img src="${escapeHtml(pillar.image)}" loading="eager" fetchpriority="high" decoding="async" alt="${escapeHtml(pillar.alt)}"><span>الدليل المحوري</span></a><div class="topic-pillar-copy"><time datetime="${pillar.datePublished}">${formatDate(pillar.datePublished)}</time><h3><a href="/blog/${pillar.slug}/">${escapeHtml(pillar.title)}</a></h3><p>${escapeHtml(pillar.description)}</p><a class="btn btn-primary" href="/blog/${pillar.slug}/">ابدأ بالدليل المحوري</a></div></article></div></section>
    <section class="section topic-route-section" aria-labelledby="topic-route-title"><div class="container"><div class="section-heading"><div class="section-heading-copy"><span class="eyebrow"><i class="fa-solid fa-route" aria-hidden="true"></i> مسار القرار</span><h2 id="topic-route-title">كيف تستخدم هذا المركز؟</h2><p>انتقل من فهم النطاق إلى المقارنة ثم إلى صفحة الخدمة عندما تصبح جاهزًا للتنفيذ.</p></div></div><div class="topic-route-grid">${topic.steps.map(([title, text], index) => `<article><span>0${index + 1}</span><h3>${title}</h3><p>${text}</p></article>`).join("")}</div></div></section>
    <section class="section section-white" aria-labelledby="topic-supporting-title"><div class="container"><div class="section-heading"><div class="section-heading-copy"><span class="eyebrow"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> أدلة متخصصة</span><h2 id="topic-supporting-title">تابع حسب السؤال الذي تريد حسمه</h2><p>مقالات تغطي التكلفة والعقود والجودة والمراحل والأخطاء والمقارنات داخل موضوع ${topic.title}.</p></div><span class="archive-status">${supporting.length} مقالًا داعمًا</span></div><div class="topic-articles-grid">${supporting.map(supportingCard).join("")}</div></div></section>
    <section class="section topic-action-section" aria-labelledby="topic-action-title"><div class="container"><div class="topic-action-card"><div><span class="eyebrow">الخطوة التنفيذية</span><h2 id="topic-action-title">${topic.ctaTitle}</h2><p>${topic.ctaText}</p></div><div class="topic-action-buttons"><a class="btn btn-primary" href="${topic.serviceUrl}">${topic.serviceLabel}</a>${secondaryService}<a class="btn btn-outline" href="${topic.projectUrl}">${topic.projectLabel}</a><a class="btn btn-whatsapp" href="https://wa.me/966551128884">ناقش مشروعك</a></div></div></div></section>
    <section id="faq" class="section section-white tawod-faq-section" aria-labelledby="topic-faq-title"><div class="container"><div class="section-heading"><div class="section-heading-copy"><span class="eyebrow">أسئلة شائعة</span><h2 id="topic-faq-title">أسئلة قبل اتخاذ القرار</h2><p>إجابات مختصرة توجهك إلى الدليل أو الخدمة المناسبة دون تكرار المحتوى.</p></div></div><div class="faq-wrap tawod-faq-grid">${topicFaq(topic)}</div></div></section>
  </main>`;
}

function topicSchema(topic, articles) {
  const canonical = `${domain}${topicUrl(topic)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${domain}/#organization`, name: "شركة تعاود للمقاولات العامة", url: `${domain}/`, logo: `${domain}/images/logo/tawod-logo.png`, telephone: "+966551128884" },
      { "@type": "CollectionPage", "@id": `${canonical}#webpage`, url: canonical, name: topic.pageTitle, description: topic.description, inLanguage: "ar-SA", isPartOf: { "@id": `${domain}/blog/#blog` }, breadcrumb: { "@id": `${canonical}#breadcrumb` }, mainEntity: { "@id": `${canonical}#articles` } },
      { "@type": "BreadcrumbList", "@id": `${canonical}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${domain}/` },
        { "@type": "ListItem", position: 2, name: "المدونة", item: `${domain}/blog/` },
        { "@type": "ListItem", position: 3, name: topic.title, item: canonical },
      ] },
      { "@type": "ItemList", "@id": `${canonical}#articles`, name: `أدلة ${topic.title}`, numberOfItems: articles.length, itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, name: article.title, url: `${domain}/blog/${article.slug}/` })) },
      { "@type": "FAQPage", "@id": `${canonical}#faq`, mainEntity: topic.faq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
}

function replaceHeadTag(html, matcher, replacement) {
  return matcher.test(html) ? html.replace(matcher, replacement) : html.replace("</head>", `${replacement}</head>`);
}

function topicPage(shell, topic, articles) {
  const canonical = `${domain}${topicUrl(topic)}`;
  const pillar = articles.find((article) => article.slug === topic.pillar);
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(topic.pageTitle)} | شركة تعاود</title>`)
    .replace(/<main id="main">[\s\S]*?<\/main>/i, topicMain(topic, articles))
    .replace(/<body\b[^>]*>/i, `<body class="blog-archive-page blog-topic-page" data-topic="${topic.slug}">`)
    .replace(/<script\b[^>]*id=["'](?:blog-archive-schema|blog-topic-schema)["'][^>]*>[\s\S]*?<\/script>/gi, "");
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i, `<meta name="description" content="${escapeHtml(topic.description)}">`);
  html = replaceHeadTag(html, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, `<link rel="canonical" href="${canonical}">`);
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i, `<meta property="og:title" content="${escapeHtml(topic.pageTitle)}">`);
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:description["'])[^>]*>/i, `<meta property="og:description" content="${escapeHtml(topic.description)}">`);
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, `<meta property="og:url" content="${canonical}">`);
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*>/i, `<meta property="og:image" content="${domain}${pillar.image}">`);
  if (!html.includes(architectureHref)) html = html.replace("</head>", `<link href="${architectureHref}" rel="stylesheet"></head>`);
  return html.replace("</head>", `<script id="blog-topic-schema" type="application/ld+json">${JSON.stringify(topicSchema(topic, articles))}</script></head>`);
}

function editorialPolicyMain() {
  return `<main id="main"><section class="page-hero topic-hub-hero"><div class="container reveal"><nav class="breadcrumb" aria-label="مسار التنقل"><a href="/">الرئيسية</a><i class="fa-solid fa-angle-left" aria-hidden="true"></i><a href="/blog/">المدونة</a><i class="fa-solid fa-angle-left" aria-hidden="true"></i><span aria-current="page">السياسة التحريرية</span></nav><span class="topic-hub-kicker"><i class="fa-solid fa-pen-ruler" aria-hidden="true"></i> الشفافية والمراجعة</span><h1>السياسة التحريرية لمدونة تعاود</h1><p>توضح هذه الصفحة كيف نُعد أدلة المقاولات، وكيف نراجع المعلومات الفنية والتواريخ والتصحيحات قبل النشر وبعده.</p></div></section><section class="section section-white editorial-policy" aria-labelledby="editorial-method"><div class="container"><div class="editorial-policy-grid"><article><span>01</span><h2 id="editorial-method">اختيار الموضوع والنية</h2><p>نختار الموضوع وفق الأسئلة الفعلية التي يحتاج المالك إلى حسمها قبل التخطيط أو التعاقد أو التنفيذ، ونفصل المحتوى التفسيري عن صفحات الخدمات التجارية.</p></article><article><span>02</span><h2>إعداد المحتوى</h2><p>يُعد فريق المحتوى المسودة بالاستناد إلى نطاقات الأعمال والممارسات المهنية والمعلومات المتاحة للمشروع، مع تجنب الوعود العامة أو الأسعار غير المرتبطة بمدخلات واضحة.</p></article><article><span>03</span><h2>المراجعة الفنية</h2><p>تُراجع النقاط المرتبطة بالتنفيذ والعقود والفحوصات بواسطة فريق المشاريع أو المختص المناسب داخل الشركة قبل اعتمادها للنشر.</p></article><article><span>04</span><h2>التحديث والتواريخ</h2><p>يبقى تاريخ النشر الأصلي ثابتًا، ولا يتغير تاريخ آخر مراجعة إلا عند إجراء تحديث تحريري فعلي يؤثر في فائدة المحتوى أو دقته.</p></article><article><span>05</span><h2>الأسعار والمعلومات النظامية</h2><p>الأسعار تقديرية عندما تُذكر وتتغير حسب الموقع والمخططات والخامات والنطاق. أما المتطلبات النظامية فتُراجع عند الحاجة ويُشار إلى المصدر الرسمي متى كان ذلك مناسبًا.</p></article><article><span>06</span><h2>التصحيح</h2><p>عند اكتشاف معلومة غير دقيقة، تُراجع وتُصحح داخل الصفحة مع تحديث تاريخ المراجعة إذا كان التصحيح جوهريًا.</p></article></div><div class="editorial-contact"><div><h2>لديك ملاحظة على محتوى منشور؟</h2><p>أرسل رابط الصفحة والملاحظة عبر صفحة التواصل حتى يتم فحصها من الفريق المختص.</p></div><a class="btn btn-primary" href="/contact.html">إرسال ملاحظة</a></div></div></section><section id="faq" class="section tawod-faq-section" aria-labelledby="editorial-faq"><div class="container"><div class="section-heading"><div class="section-heading-copy"><span class="eyebrow">أسئلة شائعة</span><h2 id="editorial-faq">حول إعداد ومراجعة المقالات</h2></div></div><div class="faq-wrap tawod-faq-grid"><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="editorial-faq-1"><span>من يكتب مقالات تعاود؟</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="editorial-faq-1"><p>يُعدها فريق المحتوى في شركة تعاود وتُراجع النقاط الفنية مع فريق المشاريع أو المختص المناسب.</p></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="editorial-faq-2"><span>متى يتم تحديث تاريخ المقال؟</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="editorial-faq-2"><p>عند إجراء تحديث تحريري فعلي، وليس عند تعديل تنسيق أو رابط داخلي بسيط فقط.</p></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="editorial-faq-3"><span>هل الأسعار المنشورة عروض نهائية؟</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="editorial-faq-3"><p>لا؛ أي أرقام توضيحية تتأثر بالمخططات والمساحة والخامات وحالة الموقع ونطاق التوريد والتنفيذ.</p></div></div></div></div></section></main>`;
}

function editorialPolicyPage(shell) {
  const canonical = `${domain}/editorial-policy/`;
  const description = "سياسة إعداد ومراجعة وتحديث وتصحيح محتوى مدونة شركة تعاود للمقاولات العامة.";
  const faq = [
    ["من يكتب مقالات تعاود؟", "يُعدها فريق المحتوى في شركة تعاود وتُراجع النقاط الفنية مع فريق المشاريع أو المختص المناسب."],
    ["متى يتم تحديث تاريخ المقال؟", "عند إجراء تحديث تحريري فعلي، وليس عند تعديل تنسيق أو رابط داخلي بسيط فقط."],
    ["هل الأسعار المنشورة عروض نهائية؟", "لا؛ أي أرقام توضيحية تتأثر بالمخططات والمساحة والخامات وحالة الموقع ونطاق التوريد والتنفيذ."],
  ];
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: "السياسة التحريرية لمدونة تعاود", description, inLanguage: "ar-SA", isPartOf: { "@id": `${domain}/#website` }, publisher: { "@id": `${domain}/#organization` } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "الرئيسية", item: `${domain}/` }, { "@type": "ListItem", position: 2, name: "المدونة", item: `${domain}/blog/` }, { "@type": "ListItem", position: 3, name: "السياسة التحريرية", item: canonical }] },
    { "@type": "FAQPage", mainEntity: faq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ] };
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, "<title>السياسة التحريرية لمدونة تعاود</title>")
    .replace(/<main id="main">[\s\S]*?<\/main>/i, editorialPolicyMain())
    .replace(/<body\b[^>]*>/i, '<body class="blog-archive-page blog-topic-page">')
    .replace(/<script\b[^>]*id=["'](?:blog-archive-schema|blog-topic-schema|editorial-policy-schema)["'][^>]*>[\s\S]*?<\/script>/gi, "");
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i, `<meta name="description" content="${description}">`);
  html = replaceHeadTag(html, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, `<link rel="canonical" href="${canonical}">`);
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i, '<meta property="og:title" content="السياسة التحريرية لمدونة تعاود">');
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:description["'])[^>]*>/i, `<meta property="og:description" content="${description}">`);
  html = replaceHeadTag(html, /<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, `<meta property="og:url" content="${canonical}">`);
  if (!html.includes(architectureHref)) html = html.replace("</head>", `<link href="${architectureHref}" rel="stylesheet"></head>`);
  return html.replace("</head>", `<script id="editorial-policy-schema" type="application/ld+json">${JSON.stringify(schema)}</script></head>`);
}

function updateSitemap() {
  const sitemapPath = join(rootDir, "sitemap.xml");
  let xml = readFileSync(sitemapPath, "utf8")
    .replace(/\s*<url><loc>https:\/\/tawodco\.com\/lp\/[^<]+<\/loc>[\s\S]*?<\/url>/g, "")
    .replace(/\s*<url><loc>https:\/\/tawodco\.com\/blog\/topics\/[^<]+<\/loc>[\s\S]*?<\/url>/g, "")
    .replace(/\s*<url><loc>https:\/\/tawodco\.com\/blog\/turnkey-riyadh\/<\/loc>[\s\S]*?<\/url>/g, "")
    .replace(/\s*<url><loc>https:\/\/tawodco\.com\/editorial-policy\/<\/loc>[\s\S]*?<\/url>/g, "")
    .replace(/\s*<url><loc>https:\/\/tawodco\.com\/project-[^<]+<\/loc>[\s\S]*?<\/url>/g, "");
  const topicEntries = blogTopics.map((topic) => `  <url><loc>${domain}${topicUrl(topic)}</loc><lastmod>${buildDate}</lastmod><changefreq>weekly</changefreq><priority>0.78</priority></url>`);
  const projectEntries = [
    "project-faisaliah-villa-facades-finishing.html",
    "project-villa-plaster-ceramic-marble-uhud-riyadh.html",
    "project-alrajhi-tanks-king-salman-park.html",
    "project-modon-eight-warehouses-riyadh.html",
    "project-arouba-mosque-villas.html",
  ].map((project) => `  <url><loc>${domain}/${project}</loc><lastmod>${buildDate}</lastmod><changefreq>monthly</changefreq><priority>0.72</priority></url>`);
  const entries = [...topicEntries, `  <url><loc>${domain}/editorial-policy/</loc><lastmod>${buildDate}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`, ...projectEntries].join("\n");
  xml = xml.replace("</urlset>", `\n${entries}\n</urlset>`).replace(/\n{3,}/g, "\n\n");
  writeFileSync(sitemapPath, xml);
}

const articles = getArticles();
const shell = readFileSync(join(blogDir, "index.html"), "utf8");

for (const topic of blogTopics) {
  const topicArticles = articles.filter((article) => article.topic.slug === topic.slug)
    .sort((a, b) => Number(articleRole(a.slug, topic) !== "pillar") - Number(articleRole(b.slug, topic) !== "pillar") || b.datePublished.localeCompare(a.datePublished));
  if (!topicArticles.length) throw new Error(`Topic ${topic.slug} has no articles`);
  const output = join(rootDir, topicUrl(topic).replace(/^\//, ""), "index.html");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, topicPage(shell, topic, topicArticles));
}

const editorialOutput = join(rootDir, "editorial-policy", "index.html");
mkdirSync(dirname(editorialOutput), { recursive: true });
writeFileSync(editorialOutput, editorialPolicyPage(shell));
updateSitemap();
console.log(`Generated ${blogTopics.length} topic hubs and the editorial policy for ${articles.length} articles.`);
