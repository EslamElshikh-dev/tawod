import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { legacyArchiveCopy, legacyArticleTitles, legacyCardOverrides } from "./blog-archive-content.mjs";
import { blogTopics, legacyTopicHubSlugs, topicForArticle, topicUrl } from "./blog-topic-data.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(rootDir, "blog");
const pageSize = 10;
const buildDate = "2026-08-28";
const assetVersion = (relativePath) => createHash("sha256").update(readFileSync(join(rootDir, relativePath))).digest("hex").slice(0, 12);
const archiveCssVersion = assetVersion("assets/css/blog-archive.css");
const archiveJsVersion = assetVersion("assets/js/blog-archive.js");
const architectureVersion = assetVersion("assets/css/tawod-blog-architecture.css");

const featuredSlugs = [
  "best-contracting-company-riyadh",
  "best-bone-construction-company-riyadh",
  "turnkey-construction-riyadh-guide",
  "finishing-villa-riyadh-guide",
  "saudi-code-compliant-contractor-riyadh"
];

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
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaContent(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]])
    );
    if ((attributes[key] || "").toLowerCase() === value.toLowerCase()) return cleanText(attributes.content || "");
  }
  return "";
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return cleanText(match[1]);
  }
  return "";
}

function categoryFor(slug) {
  const groups = [
    [/turnkey/, ["تسليم مفتاح", "fa-key"]],
    [/(interior-design|decor)/, ["تصميم وديكور", "fa-swatchbook"]],
    [/finishing/, ["تشطيبات", "fa-paint-roller"]],
    [/(restoration|renovation|facade)/, ["ترميم وواجهات", "fa-house-chimney-crack"]],
    [/(electrical|plumbing|mechanical|mep)/, ["أعمال كهروميكانيكية", "fa-gears"]],
    [/(saudi-code|saudi-building-code|quality|inspection)/, ["الكود والجودة", "fa-shield-halved"]],
    [/(robot|drone|digital|bim|smart|future|technolog)/, ["تقنيات البناء", "fa-microchip"]],
    [/bone/, ["بناء عظم", "fa-helmet-safety"]],
    [/engineering/, ["هندسة وإشراف", "fa-compass-drafting"]]
  ];
  return groups.find(([pattern]) => pattern.test(slug))?.[1] || ["مقاولات وبناء", "fa-building"];
}

function articleFromDirectory(slug) {
  const filePath = join(blogDir, slug, "index.html");
  const html = readFileSync(filePath, "utf8");
  const [inferredCategory, icon] = categoryFor(slug);
  const original = legacyCardOverrides[slug] || {};
  const title = original.title
    || legacyArticleTitles[slug]
    || firstMatch(html, [/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, /<title>([\s\S]*?)<\/title>/i]);
  const description = original.description
    || metaContent(html, "name", "description")
    || metaContent(html, "property", "og:description");
  const imageUrl = metaContent(html, "property", "og:image") || "/images/blog/construction-building-riyadh.webp";
  const image = original.image
    || imageUrl.replace(/^https?:\/\/(?:www\.)?tawodco\.com/i, "")
    || "/images/blog/construction-building-riyadh.webp";
  const alt = original.alt
    || metaContent(html, "property", "og:image:alt")
    || firstMatch(html, [/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/i])
    || title;
  const datePublished = firstMatch(html, [
    /["']datePublished["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/i,
    /["']dateModified["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/i
  ]) || "1970-01-01";

  if (!title || !description) throw new Error(`Missing title or description in blog/${slug}/index.html`);
  return {
    slug,
    title,
    description,
    image,
    alt,
    datePublished,
    category: original.category || inferredCategory,
    location: original.location || "الرياض",
    icon
  };
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

function articleCard(article, { featured = false, eager = false } = {}) {
  const url = `/blog/${article.slug}/`;
  const badge = featured
    ? '<span class="editor-pick"><i aria-hidden="true" class="fa-solid fa-star"></i> اختيار تعاود</span>'
    : "";
  return `<article class="article-card${featured ? "" : " reveal"}">
    <div class="card-media">${badge}<a href="${url}" aria-label="${escapeHtml(article.title)}"><img alt="${escapeHtml(article.alt)}" decoding="async" loading="${eager ? "eager" : "lazy"}" src="${escapeHtml(article.image)}"></a></div>
    <div class="card-body">
      <div class="card-meta"><time datetime="${article.datePublished}"><i aria-hidden="true" class="fa-regular fa-calendar"></i> ${formatDate(article.datePublished)}</time><span><i aria-hidden="true" class="fa-solid ${article.icon}"></i> ${article.category}</span></div>
      <h3><a href="${url}">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.description)}</p>
      <div class="card-tags"><span>${article.category}</span><span>${article.location}</span></div>
      <a class="card-link" href="${url}">اقرأ المقال كاملًا <i aria-hidden="true" class="fa-solid fa-arrow-left-long"></i></a>
    </div>
  </article>`;
}

function pageUrl(page) {
  return page === 1 ? "/blog/" : `/blog/page/${page}/`;
}

function pagination(page, totalPages) {
  const numbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((number) => number === page
      ? `<a aria-current="page" class="page-link active" href="${pageUrl(number)}">${number}</a>`
      : `<a class="page-link" href="${pageUrl(number)}">${number}</a>`)
    .join("\n");
  const previous = page === 1
    ? '<span aria-disabled="true" class="page-link page-direction disabled"><i aria-hidden="true" class="fa-solid fa-arrow-right"></i> السابق</span>'
    : `<a class="page-link page-direction" href="${pageUrl(page - 1)}"><i aria-hidden="true" class="fa-solid fa-arrow-right"></i> السابق</a>`;
  const next = page === totalPages
    ? '<span aria-disabled="true" class="page-link page-direction disabled">التالي <i aria-hidden="true" class="fa-solid fa-arrow-left"></i></span>'
    : `<a class="page-link page-direction" href="${pageUrl(page + 1)}">التالي <i aria-hidden="true" class="fa-solid fa-arrow-left"></i></a>`;
  return `<nav aria-label="صفحات المدونة" class="pagination-wrap">
    <p class="pagination-label">الصفحة ${page} من ${totalPages}</p>
    <div class="pagination">${previous}${numbers}${next}</div>
    <p class="archive-note">استخدم أرقام الصفحات للوصول إلى جميع المقالات؛ تعرض كل صفحة حتى 10 مقالات للمحافظة على سرعة التحميل وسهولة التصفح.</p>
  </nav>`;
}

function featuredSection(featuredArticles) {
  const slides = featuredArticles
    .map((article, index) => `<div class="featured-slide">${articleCard(article, { featured: true, eager: index === 0 })}</div>`)
    .join("\n");
  return `<section aria-labelledby="featured-title" class="section section-white">
    <div class="container">
      <div class="section-heading reveal">
        <div class="section-heading-copy"><span class="eyebrow"><i aria-hidden="true" class="fa-solid fa-star"></i> مختارات تعاود</span><h2 id="featured-title">أفضل 5 أدلة للبدء قبل مشروعك</h2><p>مقالات محورية تغطي أهم القرارات في سوق المقاولات بالرياض: اختيار الشركة، بناء العظم، تسليم المفتاح، التشطيبات، ومتطلبات الكود السعودي.</p></div>
        <div aria-label="التحكم في المقالات المختارة" class="carousel-controls"><button aria-label="المقالات السابقة" class="carousel-button" data-carousel-prev type="button"><i aria-hidden="true" class="fa-solid fa-arrow-right"></i></button><button aria-label="المقالات التالية" class="carousel-button" data-carousel-next type="button"><i aria-hidden="true" class="fa-solid fa-arrow-left"></i></button></div>
      </div>
      <div aria-label="أفضل خمسة مقالات" aria-roledescription="عارض متحرك" class="featured-carousel reveal" data-featured-carousel role="region" tabindex="0">
        <div class="featured-viewport"><div class="featured-track">${slides}</div></div>
        <div aria-label="مؤشرات المقالات المختارة" class="carousel-dots" data-carousel-dots></div>
        <p aria-live="polite" class="visually-hidden" data-carousel-status></p>
      </div>
    </div>
  </section>`;
}

function topicExplorerSection(articles) {
  const cards = blogTopics.map((topic) => {
    const count = articles.filter((article) => topicForArticle(article.slug).slug === topic.slug).length;
    return `<a class="topic-explorer-card reveal" href="${topicUrl(topic)}">
      <span class="topic-explorer-card-head"><span class="topic-explorer-icon"><i class="fa-solid ${topic.icon}" aria-hidden="true"></i></span><span class="topic-explorer-count">${count} مقالًا</span></span>
      <h3>${topic.title}</h3><p>${topic.description}</p><span class="topic-explorer-link">استكشف المركز <i class="fa-solid fa-arrow-left-long" aria-hidden="true"></i></span>
    </a>`;
  }).join("\n");
  return `<section class="section topic-explorer" aria-labelledby="topic-explorer-title"><div class="container"><div class="section-heading reveal"><div class="section-heading-copy"><span class="eyebrow"><i class="fa-solid fa-diagram-project" aria-hidden="true"></i> بنية معرفية واضحة</span><h2 id="topic-explorer-title">استكشف المدونة حسب موضوع مشروعك</h2><p>انتقل مباشرة إلى المركز المناسب، وابدأ بالدليل المحوري ثم الأدلة المتخصصة والخدمة المرتبطة.</p></div></div><div class="topic-explorer-grid">${cards}</div></div></section>`;
}

function archiveContent(page, totalPages, articles, featuredArticles) {
  const start = (page - 1) * pageSize;
  const pageArticles = articles.slice(start, start + pageSize);
  const end = start + pageArticles.length;
  const pageLabel = page === 1 ? "المدونة" : `الصفحة ${page}`;
  const heading = page === 1 ? legacyArchiveCopy.latest.title : `مقالات المدونة — الصفحة ${page}`;
  const eyebrow = page === 1 ? legacyArchiveCopy.latest.eyebrow : "الأحدث أولًا";
  const sectionDescription = page === 1
    ? legacyArchiveCopy.latest.description
    : "تابع تصفح مكتبة تعاود بترتيب زمني واضح، مع عرض بيانات كل مقال كاملًا داخل البطاقة.";
  const intro = page === 1
    ? legacyArchiveCopy.hero.description
    : `تابع تصفح مقالات تعاود المرتبة من الأحدث إلى الأقدم. تعرض هذه الصفحة المقالات من ${start + 1} إلى ${end}.`;
  const featured = page === 1 ? featuredSection(featuredArticles) : "";
  const topics = page === 1 ? topicExplorerSection(articles) : "";
  const cards = pageArticles.map((article, index) => articleCard(article, { eager: index < 2 })).join("\n");

  return `<!-- BLOG_ARCHIVE_CONTENT_START -->
  <section class="page-hero">
    <div class="container reveal"><nav aria-label="مسار التنقل" class="breadcrumb"><a href="/">الرئيسية</a><i aria-hidden="true" class="fa-solid fa-angle-left"></i>${page === 1 ? "" : '<a href="/blog/">المدونة</a><i aria-hidden="true" class="fa-solid fa-angle-left"></i>'}<span aria-current="page">${pageLabel}</span></nav><h1>${page === 1 ? legacyArchiveCopy.hero.title : `مدونة تعاود — الصفحة ${page}`}</h1><p>${intro}</p></div>
  </section>
  ${topics ? `${topics}\n  ` : ""}${featured ? `${featured}\n  ` : ""}<section aria-labelledby="latest-title" class="section">
    <div class="container">
      <div class="section-heading reveal"><div class="section-heading-copy"><span class="eyebrow"><i aria-hidden="true" class="fa-solid fa-clock-rotate-left"></i> ${eyebrow}</span><h2 id="latest-title">${heading}</h2><p>${sectionDescription}</p></div><span class="archive-status"><i aria-hidden="true" class="fa-regular fa-file-lines"></i> المقالات ${start + 1}–${end} من ${articles.length}</span></div>
      <div class="latest-grid">${cards}</div>
      ${pagination(page, totalPages)}
    </div>
  </section>
  <!-- BLOG_ARCHIVE_CONTENT_END -->`;
}

function normalizeShell(html) {
  const cssHref = `/assets/css/blog-archive.css?v=${archiveCssVersion}`;
  const jsSrc = `/assets/js/blog-archive.js?v=${archiveJsVersion}`;
  const architectureHref = `/assets/css/tawod-blog-architecture.css?v=${architectureVersion}`;
  let output = html
    .replace(/<style>\.blog-lead[\s\S]*?<\/style>/i, "")
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!-- TAWOD_STATIC_SCHEMA_START -->[\s\S]*?<!-- TAWOD_STATIC_SCHEMA_END -->/i, "")
    .replace(/((?:href|src)=["'])\.\.\//g, "$1/")
    .replace(/href=(["'])\.\/\1/g, 'href="/blog/"')
    .replace(/<script\s+src=["']\/assets\/js\/tawod-inner\.js["']\s+defer><\/script>/i, "")
    .replace(/\/assets\/css\/blog-archive\.css(?:\?v=[^"']*)?/g, cssHref)
    .replace(/\/assets\/js\/blog-archive\.js(?:\?v=[^"']*)?/g, jsSrc)
    .replace(/\/assets\/css\/tawod-blog-architecture\.css(?:\?v=[^"']*)?/g, architectureHref)
    .replace(/<body>/i, '<body class="blog-archive-page">');

  if (!output.includes(cssHref)) {
    output = output.replace("</head>", `<link href="${cssHref}" rel="stylesheet"></head>`);
  }
  if (!output.includes(architectureHref)) {
    output = output.replace("</head>", `<link href="${architectureHref}" rel="stylesheet"></head>`);
  }
  if (!output.includes(jsSrc)) {
    output = output.replace("</body>", `<script defer src="${jsSrc}"></script></body>`);
  }
  return output;
}

function replaceArchiveContent(html, content) {
  const generated = /<!-- BLOG_ARCHIVE_CONTENT_START -->[\s\S]*?<!-- BLOG_ARCHIVE_CONTENT_END -->/i;
  if (generated.test(html)) return html.replace(generated, content);
  const start = html.indexOf('<section class="blog-hero">');
  const end = html.indexOf("<!-- TAWOD_STATIC_CONTEXT_START -->");
  if (start === -1 || end === -1 || end <= start) throw new Error("Could not locate the current blog archive content region");
  return `${html.slice(0, start)}${content}${html.slice(end)}`;
}

function replaceHeadTag(html, matcher, replacement) {
  return matcher.test(html) ? html.replace(matcher, replacement) : html.replace("</head>", `${replacement}</head>`);
}

function updateHead(html, page, totalPages, pageArticles, articleCount) {
  const canonicalPath = pageUrl(page);
  const canonical = `https://tawodco.com${canonicalPath}`;
  const title = page === 1
    ? legacyArchiveCopy.head.title
    : `مقالات المقاولات والبناء — الصفحة ${page} | شركة تعاود بالرياض`;
  const description = page === 1
    ? legacyArchiveCopy.head.description
    : `الصفحة ${page} من مدونة تعاود للمقاولات: مقالات مرتبة من الأحدث إلى الأقدم عن البناء والتشطيب والترميم وتسليم المفتاح في الرياض.`;
  const ogTitle = page === 1 ? legacyArchiveCopy.head.ogTitle : title;
  const ogDescription = page === 1 ? legacyArchiveCopy.head.ogDescription : description;
  const faqItems = page === 1
    ? [...html.matchAll(/<div class="faq-item">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div class="faq-answer"[^>]*>\s*<p>([\s\S]*?)<\/p>/gi)]
      .map((match) => ({ "@type": "Question", name: cleanText(match[1]), acceptedAnswer: { "@type": "Answer", text: cleanText(match[2]) } }))
      .filter((item) => item.name && item.acceptedAnswer.text)
    : [];
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://tawodco.com/#organization", name: "شركة تعاود للمقاولات العامة", url: "https://tawodco.com/", logo: "https://tawodco.com/images/logo/tawod-logo.png", telephone: "+966551128884" },
      { "@type": "Blog", "@id": "https://tawodco.com/blog/#blog", name: "مدونة شركة تعاود للمقاولات بالرياض", url: "https://tawodco.com/blog/", inLanguage: "ar-SA", publisher: { "@id": "https://tawodco.com/#organization" } },
      { "@type": "CollectionPage", "@id": `${canonical}#page`, name: title, url: canonical, inLanguage: "ar-SA", isPartOf: { "@id": "https://tawodco.com/blog/#blog" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://tawodco.com/" },
        { "@type": "ListItem", position: 2, name: "المدونة", item: "https://tawodco.com/blog/" },
        ...(page === 1 ? [] : [{ "@type": "ListItem", position: 3, name: `الصفحة ${page}`, item: canonical }])
      ] },
      { "@type": "ItemList", name: `مقالات مدونة تعاود — الصفحة ${page}`, numberOfItems: pageArticles.length, itemListOrder: "https://schema.org/ItemListOrderDescending", itemListElement: pageArticles.map((article, index) => ({ "@type": "ListItem", position: ((page - 1) * pageSize) + index + 1, url: `https://tawodco.com/blog/${article.slug}/`, name: article.title })) },
      ...(faqItems.length ? [{ "@type": "FAQPage", mainEntity: faqItems }] : [])
    ]
  };

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<link\b(?=[^>]*\brel=["'](?:prev|next)["'])[^>]*>/gi, "")
    .replace(/<script\b[^>]*id=["']blog-archive-schema["'][^>]*>[\s\S]*?<\/script>/gi, "");
  output = replaceHeadTag(output, /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  output = replaceHeadTag(output, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, `<link rel="canonical" href="${canonical}">`);
  output = replaceHeadTag(output, /<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/i, `<meta property="og:title" content="${escapeHtml(ogTitle)}">`);
  output = replaceHeadTag(output, /<meta\b(?=[^>]*\bproperty=["']og:description["'])[^>]*>/i, `<meta property="og:description" content="${escapeHtml(ogDescription)}">`);
  output = replaceHeadTag(output, /<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/i, `<meta property="og:url" content="${canonical}">`);
  const navigation = [
    page > 1 ? `<link rel="prev" href="https://tawodco.com${pageUrl(page - 1)}">` : "",
    page < totalPages ? `<link rel="next" href="https://tawodco.com${pageUrl(page + 1)}">` : ""
  ].filter(Boolean).join("");
  return output.replace("</head>", `${navigation}<script id="blog-archive-schema" type="application/ld+json">${JSON.stringify(graph)}</script></head>`);
}

function updateSitemap(totalPages) {
  const sitemapPath = join(rootDir, "sitemap.xml");
  let xml = readFileSync(sitemapPath, "utf8")
    .replace(/\s*<url><loc>https:\/\/tawodco\.com\/blog\/page\/\d+\/<\/loc>[\s\S]*?<\/url>/g, "")
    .replace(/(<url><loc>https:\/\/tawodco\.com\/blog\/<\/loc><lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>)/, `$1${buildDate}$2`);
  const entries = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2)
    .map((page) => `  <url><loc>https://tawodco.com/blog/page/${page}/</loc><lastmod>${buildDate}</lastmod><changefreq>weekly</changefreq><priority>0.65</priority></url>`)
    .join("\n");
  xml = xml.replace("</urlset>", `${entries ? `\n${entries}\n` : ""}</urlset>`);
  writeFileSync(sitemapPath, xml);
}

const articles = getArticles();
const totalPages = Math.ceil(articles.length / pageSize);
const featuredArticles = featuredSlugs.map((slug) => articles.find((article) => article.slug === slug)).filter(Boolean);
if (featuredArticles.length !== 5) throw new Error(`Expected 5 featured articles, found ${featuredArticles.length}`);

let shell = normalizeShell(readFileSync(join(blogDir, "index.html"), "utf8"));
shell = replaceArchiveContent(shell, archiveContent(1, totalPages, articles, featuredArticles));

const generatedPageRoot = join(blogDir, "page");

for (let page = 1; page <= totalPages; page += 1) {
  const start = (page - 1) * pageSize;
  const pageArticles = articles.slice(start, start + pageSize);
  let pageHtml = replaceArchiveContent(shell, archiveContent(page, totalPages, articles, featuredArticles));
  if (page > 1) pageHtml = pageHtml.replace(/<!-- TAWOD_STATIC_CONTEXT_START -->[\s\S]*?<!-- TAWOD_STATIC_FAQ_END -->/i, "");
  pageHtml = updateHead(pageHtml, page, totalPages, pageArticles, articles.length);
  const outputPath = page === 1 ? join(blogDir, "index.html") : join(generatedPageRoot, String(page), "index.html");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, pageHtml);
}

updateSitemap(totalPages);
console.log(`Generated ${totalPages} blog archive pages for ${articles.length} articles (${pageSize} per page).`);
