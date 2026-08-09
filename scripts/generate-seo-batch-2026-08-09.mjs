import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const domain = 'https://tawodco.com';
const isoDate = '2026-08-09';
const arabicDate = '9 أغسطس 2026';
const dataPath = path.join(root, 'scripts', 'seo-batch-2026-08-09.json');
const basePath = path.join(root, 'blog', 'modern-contracting-company-riyadh', 'index.html');
const articles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const base = fs.readFileSync(basePath, 'utf8');

const dimensions = {
  'images/blog/bone-construction-riyadh-guide.webp': [1200, 1600],
  'images/blog/best-contracting-company-riyadh.webp': [1600, 1200],
  'images/blog/construction-building-riyadh.webp': [1600, 1200],
  'images/blog/finishing-interior-design-riyadh.webp': [1200, 1600],
  'images/projects/project-villa-facade-marble-ceramic-manar.webp': [1536, 1024]
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const plainText = (value) => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const jsonScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function schemas(article, wordCount, minutes) {
  const url = domain + '/blog/' + article.slug + '/';
  const image = domain + '/' + article.image;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image,
    author: {'@type': 'Organization', name: 'شركة تعاود للمقاولات العامة'},
    publisher: {
      '@type': 'Organization',
      name: 'شركة تعاود للمقاولات العامة',
      logo: {'@type': 'ImageObject', url: domain + '/images/logo/tawod-logo.png'}
    },
    mainEntityOfPage: url,
    datePublished: isoDate,
    dateModified: isoDate,
    inLanguage: 'ar-SA',
    keywords: article.keywords,
    wordCount,
    timeRequired: 'PT' + minutes + 'M'
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map((item) => ({
      '@type': 'Question',
      name: item[0],
      acceptedAnswer: {'@type': 'Answer', text: item[1]}
    }))
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'الرئيسية', item: domain + '/'},
      {'@type': 'ListItem', position: 2, name: 'المدونة', item: domain + '/blog/'},
      {'@type': 'ListItem', position: 3, name: article.title, item: url}
    ]
  };
  return [
    '<script type="application/ld+json">' + jsonScript(articleSchema) + '</script>',
    '<script type="application/ld+json">' + jsonScript(faqSchema) + '</script>',
    '<script type="application/ld+json">' + jsonScript(breadcrumbSchema) + '</script>'
  ].join('\n');
}

function renderHead(article, wordCount, minutes) {
  const url = domain + '/blog/' + article.slug + '/';
  const image = domain + '/' + article.image;
  return [
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
    '<meta name="theme-color" content="#1D1E26">',
    '<title>' + escapeHtml(article.seoTitle) + '</title>',
    '<meta name="description" content="' + escapeHtml(article.description) + '">',
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<link rel="canonical" href="' + url + '">',
    '<link rel="alternate" hreflang="ar-SA" href="' + url + '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:locale" content="ar_SA">',
    '<meta property="og:site_name" content="شركة تعاود للمقاولات العامة">',
    '<meta property="og:title" content="' + escapeHtml(article.title) + '">',
    '<meta property="og:description" content="' + escapeHtml(article.ogDescription) + '">',
    '<meta property="og:image" content="' + image + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + escapeHtml(article.title) + '">',
    '<meta name="twitter:description" content="' + escapeHtml(article.ogDescription) + '">',
    '<meta name="twitter:image" content="' + image + '">',
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
    '<link href="../../assets/css/tawod-system.css" rel="stylesheet">',
    schemas(article, wordCount, minutes),
    '</head>'
  ].join('\n');
}

function renderHero(article, minutes) {
  return [
    '<section class="article-hero">',
    '<div class="container reveal-up">',
    '<div class="article-meta-line">',
    '<span><i class="fa-regular fa-calendar"></i> محدث ' + arabicDate + '</span>',
    '<span><i class="fa-solid fa-location-dot"></i> الرياض</span>',
    '<span><i class="fa-solid fa-building"></i> ' + escapeHtml(article.category) + '</span>',
    '<span data-reading-time><i class="fa-regular fa-clock"></i> ' + minutes + ' دقائق قراءة</span>',
    '</div>',
    '<h1>' + escapeHtml(article.title) + '</h1>',
    '<p>' + escapeHtml(article.heroIntro) + '</p>',
    '<div class="hero-actions">',
    '<a class="btn btn-primary" href="../../contact.html">اطلب استشارة</a>',
    '<a class="btn btn-whatsapp" href="https://wa.me/966551128884">واتساب</a>',
    '</div>',
    '</div>',
    '</section>'
  ].join('\n');
}

function renderArticleBody(article) {
  const tocItems = article.sections
    .map((section, index) => '<li><a href="#article-section-' + (index + 1) + '">' + escapeHtml(section.heading) + '</a></li>')
    .concat('<li><a href="#article-section-' + (article.sections.length + 1) + '">الخلاصة</a></li>')
    .join('');
  const takeaways = article.takeaways.map((item) => '<li>' + escapeHtml(item) + '</li>').join('');
  const intro = article.intro.map((paragraph) => '<p>' + paragraph + '</p>').join('\n');
  const sections = article.sections.map((section, index) => {
    const paragraphs = section.paragraphs.map((paragraph) => '<p>' + paragraph + '</p>').join('\n');
    return '<h2 id="article-section-' + (index + 1) + '">' + (index + 1) + '. ' + escapeHtml(section.heading) + '</h2>\n' + paragraphs;
  }).join('\n');
  return [
    '<nav class="tawod-article-toc" aria-label="فهرس المقال">',
    '<div class="tawod-article-toc-head"><span><i class="fa-solid fa-list-ul"></i> محتويات المقال</span><small>انتقل للقسم المطلوب</small></div>',
    '<ol>' + tocItems + '</ol>',
    '</nav>',
    '<aside class="tawod-key-takeaways">',
    '<h2><i class="fa-solid fa-lightbulb"></i> أهم ما ستخرج به</h2>',
    '<ul>' + takeaways + '</ul>',
    '</aside>',
    intro,
    '<div class="article-note">' + escapeHtml(article.note) + '</div>',
    sections,
    '<div class="seo-inline-cta"><h3>هل تريد مناقشة مشروعك في الرياض؟</h3><p>شاركنا نوع المشروع وموقعه والمرحلة الحالية والمخططات أو الصور المتاحة لنساعدك في تحديد نطاق العمل المناسب.</p><a href="../../contact.html">طلب استشارة أو عرض سعر</a></div>',
    '<h2 id="article-section-' + (article.sections.length + 1) + '">الخلاصة</h2>',
    '<p>' + escapeHtml(article.conclusion) + '</p>',
    '<div class="tawod-article-tools"><strong>وجدت الدليل مفيدًا؟</strong><div><button type="button" data-share-article><i class="fa-solid fa-share-nodes"></i> مشاركة</button><button type="button" data-print-article><i class="fa-solid fa-print"></i> طباعة</button><a href="https://wa.me/" data-whatsapp-share target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> واتساب</a></div></div>'
  ].join('\n');
}

function renderContentSection(article, body) {
  const dims = dimensions[article.image];
  if (!dims) throw new Error('Missing image dimensions for ' + article.image);
  const related = article.related.map((item) => '<a href="../' + item[0] + '/">' + escapeHtml(item[1]) + ' <i class="fa-solid fa-arrow-left-long"></i></a>').join('');
  return [
    '<section class="section-padding">',
    '<div class="container">',
    '<div class="article-layout">',
    '<article class="article-content reveal-up">',
    '<img src="../../' + article.image + '" width="' + dims[0] + '" height="' + dims[1] + '" loading="eager" fetchpriority="high" alt="' + escapeHtml(article.imageAlt) + '">',
    body,
    '</article>',
    '<aside class="article-sidebar">',
    '<div class="article-cta"><h3>تحتاج مقاول لمشروعك؟</h3><p>تواصل معنا لمناقشة البناء أو الترميم أو التشطيب داخل الرياض.</p><a class="btn btn-primary" href="../../contact.html">طلب عرض سعر</a></div>',
    '<div class="article-box"><h3>خدمات مرتبطة</h3><div class="article-links">',
    '<a href="../../service-construction.html">البناء والإنشاءات <i class="fa-solid fa-arrow-left-long"></i></a>',
    '<a href="../../service-restoration.html">الترميم والواجهات <i class="fa-solid fa-arrow-left-long"></i></a>',
    '<a href="../../service-finishing.html">التشطيبات <i class="fa-solid fa-arrow-left-long"></i></a>',
    '<a href="../../service-decor.html">التصميم والديكور <i class="fa-solid fa-arrow-left-long"></i></a>',
    '</div></div>',
    '<div class="article-box"><h3>مقالات مهمة</h3><div class="article-links">' + related + '</div></div>',
    '</aside>',
    '</div>',
    '</div>',
    '</section>'
  ].join('\n');
}

function renderFaq(article) {
  const cards = article.faqs.map((item, index) => {
    const id = 'faq-' + article.slug + '-' + index;
    return [
      '<div class="faq-item">',
      '<button class="faq-question" type="button" aria-expanded="false" aria-controls="' + id + '"><span>' + escapeHtml(item[0]) + '</span><i class="fa-solid fa-chevron-down"></i></button>',
      '<div class="faq-answer" id="' + id + '"><p>' + escapeHtml(item[1]) + '</p></div>',
      '</div>'
    ].join('');
  }).join('');
  return [
    '<section id="faq" class="section-padding bg-light tawod-faq-section">',
    '<div class="container">',
    '<div class="section-title"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات واضحة حول ' + escapeHtml(article.title) + '</h2><p>معلومات عملية تساعدك على فهم النطاق والجودة والتكلفة والتنفيذ قبل اتخاذ القرار.</p></div>',
    '<div class="faq-wrap tawod-faq-grid">' + cards + '</div>',
    '</div>',
    '</section>'
  ].join('\n');
}

function renderPage(article) {
  const body = renderArticleBody(article);
  const wordCount = plainText(body).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(6, Math.ceil(wordCount / 170));
  const content = renderContentSection(article, body);
  const faq = renderFaq(article);
  let html = base.replace(/<head>[\s\S]*?<\/head>/i, renderHead(article, wordCount, minutes));
  html = html.replace(/<section class="article-hero">[\s\S]*?(?=<section class="tawod-inner-trust")/i, renderHero(article, minutes) + '\n');
  const contentStart = html.indexOf('<section class="section-padding"><div class="container"><div class="article-layout">');
  const faqStart = html.indexOf('<section id="faq"', contentStart);
  if (contentStart < 0 || faqStart < 0) throw new Error('Could not locate article content markers');
  html = html.slice(0, contentStart) + content + '\n' + html.slice(faqStart);
  const currentFaqStart = html.indexOf('<section id="faq"');
  const currentFaqEnd = html.indexOf('</main>', currentFaqStart);
  if (currentFaqStart < 0 || currentFaqEnd < 0) throw new Error('Could not locate FAQ markers');
  html = html.slice(0, currentFaqStart) + faq + '\n' + html.slice(currentFaqEnd);
  html = html.replace('متاحون للرد على استفساراتكم ومناقشة المشاريع', 'متاحون على مدار الساعة للرد على استفساراتكم');
  return html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

function renderBlogCard(article, index) {
  return [
    '<article class="article-card">',
    '<div class="article-thumb"><img src="../' + article.image + '" alt="' + escapeHtml(article.imageAlt) + '" loading="' + (index === 0 ? 'eager' : 'lazy') + '"></div>',
    '<div class="article-body">',
    '<div class="article-meta"><span>' + escapeHtml(article.category) + '</span><span>الرياض</span></div>',
    '<h2>' + escapeHtml(article.title) + '</h2>',
    '<p>' + escapeHtml(article.ogDescription) + '</p>',
    '<a class="article-link" href="' + article.slug + '/">اقرأ المقال ←</a>',
    '</div>',
    '</article>'
  ].join('');
}

function updateBlogIndex() {
  const file = path.join(root, 'blog', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf('<section class="blog-lead">');
  const end = html.indexOf('<section class="all-guides">', start);
  if (start < 0 || end < 0) throw new Error('Could not locate blog lead section');
  const lead = [
    '<section class="blog-lead">',
    '<div class="container">',
    '<div class="section-copy">',
    '<span>أحدث المقالات</span>',
    '<h2>أدلة عملية للبناء والعظم والترميم والتصميم الداخلي</h2>',
    '<p>محتوى احترافي يساعدك على مقارنة شركات المقاولات وفهم متطلبات التنفيذ والجودة والكود السعودي قبل اتخاذ القرار.</p>',
    '</div>',
    '<div class="articles-grid">' + articles.map(renderBlogCard).join('') + '</div>',
    '</div>',
    '</section>'
  ].join('');
  html = html.slice(0, start) + lead + html.slice(end);
  for (const article of articles) {
    html = html.replace(new RegExp('<a href="' + article.slug + '/">[^<]*</a>', 'g'), '');
  }
  const guidesStart = html.indexOf('<div class="guides-links">');
  if (guidesStart < 0) throw new Error('Could not locate guides links');
  const insertAt = guidesStart + '<div class="guides-links">'.length;
  const links = articles.map((article) => '<a href="' + article.slug + '/">' + escapeHtml(article.title) + '</a>').join('');
  html = html.slice(0, insertAt) + links + html.slice(insertAt);
  fs.writeFileSync(file, html);
}

function renderHomeCard(article, index) {
  const dims = dimensions[article.image];
  const delay = index % 3 === 1 ? ' delay-100' : index % 3 === 2 ? ' delay-200' : '';
  return [
    "<article class='blog-card reveal-up" + delay + "'>",
    "<div class='card-img-wrap'><img class='card-img' src='" + article.image + "' width='" + dims[0] + "' height='" + dims[1] + "' loading='lazy' decoding='async' alt='" + escapeHtml(article.imageAlt) + "'></div>",
    "<div class='blog-card-body'><span class='blog-meta'><i class='fa-regular fa-clock'><svg class='icon-svg' aria-hidden='true' focusable='false'><use href='#icon-regular-clock'></use></svg></i> " + escapeHtml(article.category) + '</span>',
    '<h3>' + escapeHtml(article.title) + '</h3>',
    '<p>' + escapeHtml(article.ogDescription) + '</p>',
    "<a class='card-link' href='blog/" + article.slug + "/'>اقرأ المقال <i class='fa-solid fa-arrow-left-long'><svg class='icon-svg' aria-hidden='true' focusable='false'><use href='#icon-solid-arrow-left-long'></use></svg></i></a></div>",
    '</article>'
  ].join('');
}

function updateHomepage() {
  const file = path.join(root, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf("<section class='section-padding bg-light' id='blog'>");
  const end = html.indexOf("<section class='section-padding' id='faq'>", start);
  if (start < 0 || end < 0) throw new Error('Could not locate homepage blog section');
  const section = [
    "<section class='section-padding bg-light' id='blog'>",
    "<div class='container'>",
    "<div class='section-title reveal-up'>",
    "<span class='eyebrow'>المدونة</span>",
    '<h2>أحدث أدلة المقاولات والبناء في الرياض</h2>',
    '<p>مقالات تساعدك على اختيار المقاول وفهم الجودة والتكلفة ومراحل التنفيذ قبل بدء مشروعك.</p>',
    '</div>',
    "<div class='grid-3'>" + articles.slice(0, 6).map(renderHomeCard).join('') + '</div>',
    "<div class='blog-section-footer'><a class='btn btn-dark blog-all-link' href='blog/'>كل المقالات</a></div>",
    '</div>',
    '</section>'
  ].join('\n');
  html = html.slice(0, start) + section + '\n\n    ' + html.slice(end);
  fs.writeFileSync(file, html);
}

function updateSitemap() {
  const file = path.join(root, 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  xml = xml.replace(/(<loc>https:\/\/tawodco\.com\/<\/loc><lastmod>)[^<]+/g, '$1' + isoDate);
  xml = xml.replace(/(<loc>https:\/\/tawodco\.com\/blog\/<\/loc><lastmod>)[^<]+/g, '$1' + isoDate);
  const entries = articles
    .filter((article) => !xml.includes('/blog/' + article.slug + '/'))
    .map((article) => '  <url><loc>' + domain + '/blog/' + article.slug + '/</loc><lastmod>' + isoDate + '</lastmod></url>')
    .join('\n');
  if (entries) {
    const marker = '  <url><loc>' + domain + '/lp/';
    const index = xml.indexOf(marker);
    if (index < 0) throw new Error('Could not locate sitemap landing page marker');
    xml = xml.slice(0, index) + entries + '\n' + xml.slice(index);
  }
  fs.writeFileSync(file, xml);
}

for (const article of articles) {
  const directory = path.join(root, 'blog', article.slug);
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(path.join(directory, 'index.html'), renderPage(article));
}

updateBlogIndex();
updateHomepage();
updateSitemap();
console.log('Generated ' + articles.length + ' SEO articles and updated blog, homepage, and sitemap.');
