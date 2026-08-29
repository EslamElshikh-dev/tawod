import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { articles as originalClusterArticles } from "./seo-cluster-2026-08-23.mjs";
import { articles as boneConstructionSeries } from "./bone-construction-series-2026-08-29.mjs";

const root = process.cwd();
const domain = "https://tawodco.com";
const isoDate = "2026-08-23";
const articles = [...originalClusterArticles, ...boneConstructionSeries];
const basePath = path.join(root, "blog", "best-contracting-company-riyadh", "index.html");
const base = fs.readFileSync(basePath, "utf8");

const dimensions = {
  "images/blog/best-contracting-company-riyadh.webp": [1600, 1200],
  "images/blog/bone-construction-riyadh-guide.webp": [1200, 1600],
  "images/blog/construction-building-riyadh.webp": [1600, 1200],
  "images/blog/finishing-interior-design-riyadh.webp": [1200, 1600],
  "images/projects/project-villa-facade-marble-ceramic-manar.webp": [1536, 1024],
  "images/projects/project-luxury-villa-turnkey-alqusur.webp": [1536, 1024],
  "images/projects/construction-01.webp": [1200, 1600],
  "images/projects/arouba-mosque-villas-01.webp": [420, 560],
  "images/projects/arouba-mosque-villas-02.webp": [420, 560],
  "images/projects/modon-eight-warehouses-01-v3.webp": [360, 480]
};

function publishedDate(article) {
  return article.datePublished || isoDate;
}

function modifiedDate(article) {
  return article.dateModified || publishedDate(article);
}

function formatArabicDate(value) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${value}T12:00:00Z`));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainText(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function jsonScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderSchema(article, wordCount, minutes) {
  const url = `${domain}/blog/${article.slug}/`;
  const image = `${domain}/${article.image}`;
  const organizationId = `${domain}/#organization`;
  const articleId = `${url}#article`;
  const pageId = `${url}#webpage`;
  const faqId = `${url}#faq`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "شركة تعاود للمقاولات العامة",
        url: `${domain}/`,
        logo: { "@type": "ImageObject", url: `${domain}/images/logo/tawod-logo.png` },
        telephone: "+966551128884"
      },
      {
        "@type": "WebPage",
        "@id": pageId,
        url,
        name: article.seoTitle,
        description: article.description,
        inLanguage: "ar-SA",
        datePublished: publishedDate(article),
        dateModified: modifiedDate(article),
        isPartOf: { "@id": `${domain}/#website` },
        mainEntity: { "@id": articleId },
        breadcrumb: { "@id": `${url}#breadcrumb` }
      },
      {
        "@type": "Article",
        "@id": articleId,
        headline: article.title,
        description: article.description,
        image: { "@type": "ImageObject", url: image, caption: article.imageAlt },
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
        mainEntityOfPage: { "@id": pageId },
        datePublished: publishedDate(article),
        dateModified: modifiedDate(article),
        inLanguage: "ar-SA",
        articleSection: article.category,
        keywords: article.keywords.join(", "),
        wordCount,
        timeRequired: `PT${minutes}M`,
        about: article.keywords.slice(0, 4).map((name) => ({ "@type": "Thing", name }))
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${domain}/` },
          { "@type": "ListItem", position: 2, name: "المدونة", item: `${domain}/blog/` },
          { "@type": "ListItem", position: 3, name: article.title, item: url }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": faqId,
        mainEntity: article.faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer }
        }))
      }
    ]
  };

  return `<script id="seo-cluster-schema" type="application/ld+json">${jsonScript(graph)}</script>`;
}

function renderHead(article, wordCount, minutes) {
  const url = `${domain}/blog/${article.slug}/`;
  const image = `${domain}/${article.image}`;
  const [imageWidth, imageHeight] = dimensions[article.image] || [];
  if (!imageWidth || !imageHeight) throw new Error(`Missing image dimensions for ${article.image}`);

  return [
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
    '<meta name="theme-color" content="#1D1E26">',
    `<title>${escapeHtml(article.seoTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(article.description)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="ar-SA" href="${url}">`,
    `<link rel="alternate" hreflang="x-default" href="${url}">`,
    '<meta property="og:type" content="article">',
    '<meta property="og:locale" content="ar_SA">',
    '<meta property="og:site_name" content="شركة تعاود للمقاولات العامة">',
    `<meta property="og:title" content="${escapeHtml(article.title)}">`,
    `<meta property="og:description" content="${escapeHtml(article.ogDescription)}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:alt" content="${escapeHtml(article.imageAlt)}">`,
    `<meta property="og:image:width" content="${imageWidth}">`,
    `<meta property="og:image:height" content="${imageHeight}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="article:published_time" content="${publishedDate(article)}T12:00:00+03:00">`,
    `<meta property="article:modified_time" content="${modifiedDate(article)}T12:00:00+03:00">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(article.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(article.ogDescription)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(article.imageAlt)}">`,
    '<link rel="icon" href="../../images/logo/tawod-logo.png" sizes="32x32" type="image/png">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">',
    '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">',
    '<link href="../../assets/css/tawod-home.css" rel="stylesheet">',
    '<link href="../../assets/css/tawod-upgrades.css" rel="stylesheet">',
    '<link href="../../assets/css/tawod-inner.css" rel="stylesheet">',
    '<link href="../../assets/css/tawod-blog.css" rel="stylesheet">',
    '<link href="../../assets/css/tawod-article.css" rel="stylesheet">',
    '<link href="../../assets/css/tawod-system.css?v=c44028090c45" rel="stylesheet">',
    renderSchema(article, wordCount, minutes),
    '<!-- TAWOD_ANALYTICS_START --><script src="/assets/js/tawod-analytics.js?v=20260823-1" defer></script><!-- TAWOD_ANALYTICS_END -->',
    "</head>"
  ].join("\n");
}

function renderHero(article, minutes) {
  return [
    '<section class="article-hero">',
    '<div class="container reveal-up">',
    '<div class="article-meta-line">',
    `<span><i class="fa-regular fa-calendar"></i> محدث ${formatArabicDate(modifiedDate(article))}</span>`,
    '<span><i class="fa-solid fa-location-dot"></i> الرياض</span>',
    `<span><i class="fa-solid fa-building"></i> ${escapeHtml(article.category)}</span>`,
    `<span data-reading-time><i class="fa-regular fa-clock"></i> ${minutes} دقائق قراءة</span>`,
    "</div>",
    `<h1>${escapeHtml(article.title)}</h1>`,
    `<p>${escapeHtml(article.heroIntro)}</p>`,
    '<div class="hero-actions">',
    '<a class="btn btn-primary" href="../../contact.html">اطلب استشارة</a>',
    '<a class="btn btn-whatsapp" href="https://wa.me/966551128884">واتساب</a>',
    "</div>",
    "</div>",
    "</section>"
  ].join("\n");
}

function renderSectionExtras(section) {
  const chunks = [];
  if (section.bullets?.length) {
    chunks.push(`<ul>${section.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
  }
  if (section.checklist?.length) {
    chunks.push(`<div class="seo-check-table">${section.checklist.map(([title, copy]) => `<div><strong>${escapeHtml(title)}</strong><span>${copy}</span></div>`).join("")}</div>`);
  }
  if (section.cards?.length) {
    chunks.push(`<div class="seo-info-grid">${section.cards.map(([title, copy]) => `<div class="seo-info-card"><h3>${escapeHtml(title)}</h3><p>${copy}</p></div>`).join("")}</div>`);
  }
  return chunks.join("\n");
}

function renderArticleBody(article) {
  const tocItems = article.sections
    .map((section, index) => `<li><a href="#article-section-${index + 1}">${escapeHtml(section.heading)}</a></li>`)
    .concat(`<li><a href="#article-section-${article.sections.length + 1}">الخلاصة</a></li>`)
    .join("");
  const takeaways = article.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const intro = article.intro.map((paragraph) => `<p>${paragraph}</p>`).join("\n");
  const sections = article.sections.map((section, index) => {
    const paragraphs = section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n");
    return `<h2 id="article-section-${index + 1}">${index + 1}. ${escapeHtml(section.heading)}</h2>\n${paragraphs}\n${renderSectionExtras(section)}`;
  }).join("\n");

  return [
    '<nav class="tawod-article-toc" aria-label="فهرس المقال">',
    '<div class="tawod-article-toc-head"><span><i class="fa-solid fa-list-ul"></i> محتويات المقال</span><small>انتقل للقسم المطلوب</small></div>',
    `<ol>${tocItems}</ol>`,
    "</nav>",
    '<aside class="tawod-key-takeaways">',
    '<h2><i class="fa-solid fa-lightbulb"></i> أهم ما ستخرج به</h2>',
    `<ul>${takeaways}</ul>`,
    "</aside>",
    intro,
    `<div class="article-note">${escapeHtml(article.note)}</div>`,
    sections,
    `<div class="seo-inline-cta"><h3>${escapeHtml(article.ctaTitle || "هل تريد مناقشة مشروعك في الرياض؟")}</h3><p>${escapeHtml(article.ctaText || "أرسل نوع المشروع وموقعه والمرحلة الحالية والمخططات أو الصور المتاحة لنحدد معك نطاق المعاينة والعمل بوضوح.")}</p><a href="../../contact.html">طلب استشارة أو عرض سعر</a></div>`,
    `<h2 id="article-section-${article.sections.length + 1}">الخلاصة</h2>`,
    `<p>${article.conclusion}</p>`,
    '<!-- TAWOD_STATIC_TOOLS_START --><div class="tawod-article-tools"><strong>وجدت الدليل مفيدًا؟</strong><div><button type="button" data-share-article><i class="fa-solid fa-share-nodes"></i> مشاركة</button><button type="button" data-print-article><i class="fa-solid fa-print"></i> طباعة</button><a href="https://wa.me/" data-whatsapp-share target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> واتساب</a></div></div><!-- TAWOD_STATIC_TOOLS_END -->'
  ].join("\n");
}

function renderContent(article, body) {
  const dims = dimensions[article.image];
  if (!dims) throw new Error(`Missing image dimensions for ${article.image}`);
  const related = article.related
    .map(([slug, title]) => `<a href="../${slug}/">${escapeHtml(title)} <i class="fa-solid fa-arrow-left-long"></i></a>`)
    .join("");

  return [
    '<section class="section-padding">',
    '<div class="container">',
    '<div class="article-layout">',
    '<article class="article-content reveal-up">',
    `<img src="../../${article.image}" width="${dims[0]}" height="${dims[1]}" loading="eager" fetchpriority="high" alt="${escapeHtml(article.imageAlt)}">`,
    body,
    "</article>",
    '<aside class="article-sidebar">',
    `<div class="article-cta"><h3>${escapeHtml(article.ctaTitle || "تحتاج مقاول لمشروعك؟")}</h3><p>${escapeHtml(article.ctaText || "تواصل معنا لمناقشة البناء أو الترميم أو التشطيب داخل الرياض.")}</p><a class="btn btn-primary" href="../../contact.html">طلب عرض سعر</a></div>`,
    '<div class="article-box"><h3>خدمات مرتبطة</h3><div class="article-links">',
    '<a href="../../service-construction.html">البناء والإنشاءات <i class="fa-solid fa-arrow-left-long"></i></a>',
    '<a href="../../service-turnkey.html">تسليم مفتاح <i class="fa-solid fa-arrow-left-long"></i></a>',
    '<a href="../../service-restoration.html">الترميم والواجهات <i class="fa-solid fa-arrow-left-long"></i></a>',
    '<a href="../../service-finishing.html">التشطيبات <i class="fa-solid fa-arrow-left-long"></i></a>',
    "</div></div>",
    `<div class="article-box"><h3>أدلة مرتبطة</h3><div class="article-links">${related}</div></div>`,
    "</aside>",
    "</div>",
    "</div>",
    "</section>"
  ].join("\n");
}

function renderFaq(article) {
  const cards = article.faqs.map(([question, answer], index) => {
    const id = `faq-${article.slug}-${index}`;
    return `<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="${id}"><span>${escapeHtml(question)}</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="${id}"><p>${escapeHtml(answer)}</p></div></div>`;
  }).join("");

  return [
    '<!-- TAWOD_AUTHORED_FAQ_START --><section id="faq" class="section-padding bg-light tawod-faq-section">',
    '<div class="container">',
    `<div class="section-title"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات واضحة حول ${escapeHtml(article.title)}</h2><p>معلومات عملية تساعدك على فهم النطاق والجودة والتكلفة والتنفيذ قبل اتخاذ القرار.</p></div>`,
    `<div class="faq-wrap tawod-faq-grid">${cards}</div>`,
    "</div>",
    "</section><!-- TAWOD_AUTHORED_FAQ_END -->"
  ].join("\n");
}

function renderPage(article) {
  const provisionalBody = renderArticleBody(article);
  const wordCount = plainText(`${provisionalBody} ${article.faqs.flat().join(" ")}`).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(6, Math.ceil(wordCount / 180));
  const head = renderHead(article, wordCount, minutes);
  const hero = renderHero(article, minutes);
  const content = renderContent(article, provisionalBody);
  const faq = renderFaq(article);

  let html = base.replace(/<head>[\s\S]*?<\/head>/i, head);
  html = html.replace(/<section class="article-hero">[\s\S]*?(?=<!-- TAWOD_STATIC_TRUST_START -->|<section class="tawod-inner-trust")/i, `${hero}\n`);

  const contentStart = html.indexOf('<section class="section-padding"><div class="container"><div class="article-layout">');
  const faqStart = html.indexOf('<!-- TAWOD_STATIC_FAQ_START -->', contentStart);
  if (contentStart < 0 || faqStart < 0) throw new Error(`Could not locate content markers for ${article.slug}`);
  html = `${html.slice(0, contentStart)}${content}\n${html.slice(faqStart)}`;

  const currentFaqStart = html.indexOf('<!-- TAWOD_STATIC_FAQ_START -->');
  const mainEnd = html.indexOf("</main>", currentFaqStart);
  if (currentFaqStart < 0 || mainEnd < 0) throw new Error(`Could not locate FAQ markers for ${article.slug}`);
  html = `${html.slice(0, currentFaqStart)}${faq}\n${html.slice(mainEnd)}`;
  html = html.replace("متاحون للرد على استفساراتكم ومناقشة المشاريع", "متاحون على مدار الساعة للرد على استفساراتكم");
  return html.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
}

function updateSitemap() {
  const sitemapPath = path.join(root, "sitemap.xml");
  let xml = fs.readFileSync(sitemapPath, "utf8");

  for (const article of articles) {
    const escapedSlug = article.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    xml = xml.replace(new RegExp(`\\s*<url><loc>${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/blog\\/${escapedSlug}\\/<\\/loc>[\\s\\S]*?<\\/url>`, "g"), "");
  }

  const latestModified = articles.map(modifiedDate).sort().at(-1) || isoDate;
  xml = xml
    .replace(/(<loc>https:\/\/tawodco\.com\/<\/loc><lastmod>)[^<]+/, `$1${latestModified}`)
    .replace(/(<loc>https:\/\/tawodco\.com\/blog\/<\/loc><lastmod>)[^<]+/, `$1${latestModified}`);

  const entries = articles.map((article) => `  <url><loc>${domain}/blog/${article.slug}/</loc><lastmod>${modifiedDate(article)}</lastmod><changefreq>monthly</changefreq><priority>${article.slug === "bone-construction-riyadh-guide" ? "0.82" : "0.75"}</priority></url>`).join("\n");
  xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
  fs.writeFileSync(sitemapPath, `${xml.trim()}\n`);
}

const slugs = new Set();
for (const article of articles) {
  if (slugs.has(article.slug)) throw new Error(`Duplicate slug: ${article.slug}`);
  slugs.add(article.slug);
  if (article.faqs.length < 6) throw new Error(`Article ${article.slug} needs at least 6 FAQs`);
  if (article.sections.length < 7) throw new Error(`Article ${article.slug} needs at least 7 sections`);

  const directory = path.join(root, "blog", article.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), renderPage(article));
}

updateSitemap();
console.log(`Generated ${articles.length} Riyadh SEO cluster articles and updated sitemap.xml.`);
