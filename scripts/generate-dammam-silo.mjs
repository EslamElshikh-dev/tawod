import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import articles from './dammam-articles-2026-08-13.mjs';

const root = process.cwd();
const check = process.argv.includes('--check');
const domain = 'https://tawodco.com';
const date = '2026-08-13';
const arabicDate = '13 أغسطس 2026';
const changes = [];
const assetRevision = (file) => createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', 'js', file))).digest('hex').slice(0, 12);
const homeJsRevision = assetRevision('tawod-home.js');
const innerJsRevision = assetRevision('tawod-inner.js');
const systemCssRevision = createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', 'css', 'tawod-system.css'))).digest('hex').slice(0, 12);

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const plainText = (value) => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const jsonScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const articleBySlug = new Map(articles.map((article) => [article.slug, article]));

function writeIfChanged(file, content) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const analytics = old.match(/<!-- TAWOD_ANALYTICS_START -->[\s\S]*?<!-- TAWOD_ANALYTICS_END -->/)?.[0] || '';
  let normalized = content.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  if (analytics && !normalized.includes('<!-- TAWOD_ANALYTICS_START -->') && /<\/head>/i.test(normalized)) {
    normalized = normalized.replace(/<\/head>/i, `${analytics}</head>`);
  }
  const comparable = (value) => {
    if (path.basename(file) !== 'sitemap.xml') return value;
    return [...value.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]).sort().join('\n');
  };
  if (comparable(old) === comparable(normalized)) return;
  changes.push(path.relative(root, file).split(path.sep).join('/'));
  if (!check) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, normalized);
  }
}

function socialLinks(className) {
  return `<div class="${className}"><a aria-label="Instagram" href="https://instagram.com/tawodco1" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i></a><a aria-label="TikTok" href="https://tiktok.com/@Tawodco" target="_blank" rel="noopener"><i class="fa-brands fa-tiktok"></i></a><a aria-label="Snapchat" href="https://snapchat.com/add/Tawodco" target="_blank" rel="noopener"><i class="fa-brands fa-snapchat"></i></a><a aria-label="X" href="https://x.com/Tawodco" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i></a></div>`;
}

function navLinks(active = '') {
  const items = [
    ['home', '/dammam/', 'الرئيسية'],
    ['about', '/dammam/about/', 'من نحن'],
    ['services', '/dammam/services/', 'خدماتنا'],
    ['projects', '/dammam/projects/', 'مشاريعنا'],
    ['blog', '/dammam/blog/', 'المقالات'],
    ['contact', '/dammam/contact/', 'تواصل معنا']
  ];
  return items.map(([key, href, label]) => `<li><a${key === active ? ' class="active"' : ''} href="${href}">${label}</a></li>`).join('');
}

function sidebarLinks(active = '') {
  const items = [
    ['home', '/dammam/', 'الرئيسية'],
    ['about', '/dammam/about/', 'من نحن'],
    ['services', '/dammam/services/', 'خدماتنا'],
    ['projects', '/dammam/projects/', 'مشاريعنا'],
    ['blog', '/dammam/blog/', 'المقالات'],
    ['contact', '/dammam/contact/', 'تواصل معنا']
  ];
  return items.map(([key, href, label]) => `<a${key === active ? ' class="active"' : ''} href="${href}">${label} <i class="fa-solid fa-chevron-left"></i></a>`).join('');
}

function header(active = '') {
  return `<a class="skip-link" href="#main">تخطي إلى المحتوى</a>
<div class="sidebar-overlay" id="sidebarOverlay"></div>
<aside class="mobile-sidebar" id="mobileSidebar" aria-label="قائمة الجوال" aria-hidden="true" inert>
<button class="close-sidebar" id="closeSidebar" type="button" aria-label="إغلاق القائمة"></button>
<a class="logo sidebar-logo" href="/dammam/"><img class="logo-img" src="/images/logo/tawod-logo.png" width="917" height="408" alt="شركة تعاود للمقاولات"></a>
${socialLinks('mobile-socials')}
<nav class="sidebar-nav"><h4>روابط الدمام</h4>${sidebarLinks(active)}</nav>
<div class="sidebar-contact"><h4>تواصل معنا</h4><ul class="footer-contact"><li><a href="tel:0551128884"><i class="fa-solid fa-phone"></i><span>0551128884</span></a></li><li><a href="mailto:info@tawodco.com"><i class="fa-solid fa-envelope"></i><span>info@tawodco.com</span></a></li><li><div class="info-only"><i class="fa-solid fa-location-dot"></i><span>مشاريعنا وخدماتنا في الدمام</span></div></li></ul></div>
</aside>
<header class="header" id="header"><div class="container"><a class="logo" href="/dammam/" aria-label="شركة تعاود للمقاولات في الدمام"><img class="logo-img" src="/images/logo/tawod-logo.png" width="917" height="408" alt="شركة تعاود للمقاولات"></a><nav aria-label="القائمة الرئيسية"><ul class="nav-links">${navLinks(active)}</ul></nav><div class="header-actions"><a class="btn btn-primary btn-call-animate" href="tel:0551128884"><span class="text-default">اتصل بنا</span><span class="text-hover" dir="ltr">0551128884</span></a><a class="btn btn-outline-white" href="/dammam/contact/">طلب عرض سعر</a><button class="mobile-menu-btn" id="menuBtn" type="button" aria-label="فتح القائمة" aria-controls="mobileSidebar" aria-expanded="false"></button></div></div></header>`;
}

function footer(homePage = false) {
  return `<footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-about"><img class="logo-img" src="/images/logo/tawod-logo.png" width="917" height="408" loading="lazy" decoding="async" alt="شركة تعاود"><p>شركة تعاود للمقاولات العامة تقدم خدمات البناء والترميم والتشطيب وتسليم المفتاح للمشاريع السكنية والتجارية في الدمام.</p>${socialLinks('footer-socials')}</div><div class="footer-nav-column footer-quick-links"><h4 class="footer-title">روابط سريعة</h4><ul class="footer-links"><li><a href="/dammam/"><i class="fa-solid fa-angle-left"></i> الرئيسية</a></li><li><a href="/dammam/about/"><i class="fa-solid fa-angle-left"></i> من نحن</a></li><li><a href="/dammam/services/"><i class="fa-solid fa-angle-left"></i> خدماتنا</a></li><li><a href="/dammam/projects/"><i class="fa-solid fa-angle-left"></i> مشاريعنا</a></li><li><a href="/dammam/blog/"><i class="fa-solid fa-angle-left"></i> المقالات</a></li><li><a href="/dammam/contact/"><i class="fa-solid fa-angle-left"></i> تواصل معنا</a></li></ul></div><div class="footer-nav-column footer-service-links"><h4 class="footer-title">خدماتنا في الدمام</h4><ul class="footer-links"><li><a href="/dammam/construction/"><i class="fa-solid fa-angle-left"></i> البناء والإنشاءات</a></li><li><a href="/dammam/turnkey/"><i class="fa-solid fa-angle-left"></i> تسليم مفتاح</a></li><li><a href="/dammam/renovation/"><i class="fa-solid fa-angle-left"></i> الترميم والتجديد</a></li><li><a href="/dammam/finishing/"><i class="fa-solid fa-angle-left"></i> التشطيبات</a></li><li><a href="/dammam/decor/"><i class="fa-solid fa-angle-left"></i> الديكور</a></li><li><a href="/dammam/mep/"><i class="fa-solid fa-angle-left"></i> الكهرباء والسباكة</a></li></ul></div></div><div class="footer-bottom"><p>جميع الحقوق محفوظة &copy; 2026 شركة تعاود للمقاولات العامة</p></div></div></footer>
<div class="float-btns"><a aria-label="واتساب" class="float-btn float-whatsapp" href="https://wa.me/966551128884"><i class="fa-brands fa-whatsapp"></i></a><a aria-label="اتصال" class="float-btn float-call" href="tel:0551128884"><i class="fa-solid fa-phone"></i></a></div>
${homePage ? `<script src="/assets/js/tawod-home.js?v=${homeJsRevision}" defer></script>` : `<script src="/assets/js/tawod-inner.js?v=${innerJsRevision}" defer></script>`}<script src="/assets/js/tawod-upgrades.js" defer></script>`;
}

function trustStrip() {
  return `<section class="tawod-inner-trust" aria-label="منهج شركة تعاود"><div class="container"><div class="tawod-inner-trust-grid"><div><i class="fa-solid fa-list-check"></i><span><strong>نطاق عمل واضح</strong><small>بنود ومسؤوليات قابلة للمتابعة</small></span></div><div><i class="fa-solid fa-compass-drafting"></i><span><strong>تنسيق هندسي</strong><small>ربط التخصصات قبل التعارضات</small></span></div><div><i class="fa-solid fa-magnifying-glass-chart"></i><span><strong>متابعة مرحلية</strong><small>مراجعة الأعمال في توقيتها</small></span></div><div><i class="fa-solid fa-clipboard-check"></i><span><strong>تسليم منظم</strong><small>فحص وإغلاق الملاحظات</small></span></div></div></div></section>`;
}

function styleLinks(article = false) {
  return `<link rel="preload" as="font" href="/assets/fonts/alexandria-arabic-variable.woff2" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
<link href="/assets/css/tawod-home.css" rel="stylesheet">
<link href="/assets/css/tawod-upgrades.css" rel="stylesheet">
<link href="/assets/css/tawod-inner.css" rel="stylesheet">
<link href="/assets/css/tawod-blog.css" rel="stylesheet">
${article ? '<link href="/assets/css/tawod-article.css" rel="stylesheet">\n' : ''}<link href="/assets/css/tawod-system.css?v=${systemCssRevision}" rel="stylesheet">
<link href="/assets/css/tawod-dammam.css" rel="stylesheet">`;
}

function articleSchemas(article, wordCount, minutes) {
  const url = `${domain}/dammam/blog/${article.slug}/`;
  const image = `${domain}/${article.image}`;
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: article.seoTitle,
      description: article.description,
      inLanguage: 'ar-SA',
      isPartOf: {'@id': `${domain}/dammam/blog/#blog`},
      about: {'@type': 'City', name: 'الدمام'},
      primaryImageOfPage: {'@type': 'ImageObject', url: image, width: article.dimensions[0], height: article.dimensions[1]}
    },
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: article.title,
      description: article.description,
      image,
      author: {'@type': 'Organization', name: 'شركة تعاود للمقاولات العامة', url: `${domain}/dammam/`},
      publisher: {'@type': 'Organization', name: 'شركة تعاود للمقاولات العامة', logo: {'@type': 'ImageObject', url: `${domain}/images/logo/tawod-logo.png`}},
      mainEntityOfPage: {'@id': `${url}#webpage`},
      datePublished: date,
      dateModified: date,
      inLanguage: 'ar-SA',
      keywords: article.keywords,
      wordCount,
      timeRequired: `PT${minutes}M`,
      spatialCoverage: {'@type': 'City', name: 'الدمام'}
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        {'@type': 'ListItem', position: 1, name: 'شركة تعاود في الدمام', item: `${domain}/dammam/`},
        {'@type': 'ListItem', position: 2, name: 'مقالات الدمام', item: `${domain}/dammam/blog/`},
        {'@type': 'ListItem', position: 3, name: article.title, item: url}
      ]
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: article.faqs.map(([question, answer]) => ({'@type': 'Question', name: question, acceptedAnswer: {'@type': 'Answer', text: answer}}))
    }
  ];
  return `<script type="application/ld+json">${jsonScript({'@context': 'https://schema.org', '@graph': graph})}</script>`;
}

function articleHead(article, wordCount, minutes) {
  const url = `${domain}/dammam/blog/${article.slug}/`;
  const image = `${domain}/${article.image}`;
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#1D1E26">
<title>${escapeHtml(article.seoTitle)}</title>
<meta name="description" content="${escapeHtml(article.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ar-SA" href="${url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="ar_SA">
<meta property="og:site_name" content="شركة تعاود للمقاولات العامة">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.ogDescription)}">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="${escapeHtml(article.imageAlt)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(article.title)}">
<meta name="twitter:description" content="${escapeHtml(article.ogDescription)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/images/logo/tawod-logo.png" sizes="32x32" type="image/png">
${styleLinks(true)}
${articleSchemas(article, wordCount, minutes)}
</head>`;
}

function articleBodyContent(article) {
  const toc = article.sections.map((section, index) => `<li><a href="#article-section-${index + 1}">${escapeHtml(section.heading)}</a></li>`).join('');
  const sections = article.sections.map((section, index) => `<h2 id="article-section-${index + 1}">${index + 1}. ${escapeHtml(section.heading)}</h2>\n${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n')}`).join('\n');
  return `<nav class="tawod-article-toc" aria-label="فهرس المقال"><div class="tawod-article-toc-head"><span><i class="fa-solid fa-list-ul"></i> محتويات المقال</span><small>انتقل للقسم المطلوب</small></div><ol>${toc}<li><a href="#article-conclusion">الخلاصة</a></li></ol></nav>
<aside class="tawod-key-takeaways"><h2><i class="fa-solid fa-lightbulb"></i> أهم ما ستخرج به</h2><ul>${article.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></aside>
${article.intro.map((paragraph) => `<p>${paragraph}</p>`).join('\n')}
<div class="article-note">${escapeHtml(article.note)}</div>
${sections}
<div class="seo-inline-cta"><h3>هل تريد مناقشة مشروعك في الدمام؟</h3><p>شاركنا موقع المشروع ونوعه ومساحته والمرحلة الحالية والمخططات أو الصور المتاحة لنحدد المعلومات والخطوة المناسبة.</p><a href="/dammam/contact/">طلب معاينة أو عرض سعر</a></div>
<h2 id="article-conclusion">الخلاصة</h2>
<p>${escapeHtml(article.conclusion)}</p>
<div class="tawod-article-tools"><strong>وجدت الدليل مفيدًا؟</strong><div><button type="button" data-share-article><i class="fa-solid fa-share-nodes"></i> مشاركة</button><button type="button" data-print-article><i class="fa-solid fa-print"></i> طباعة</button><a href="https://wa.me/" data-whatsapp-share target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> واتساب</a></div></div>`;
}

function relatedArticleLinks(slugs) {
  return slugs.map((slug) => {
    const related = articleBySlug.get(slug);
    if (!related) throw new Error(`Missing related article ${slug}`);
    return `<a href="/dammam/blog/${slug}/">${escapeHtml(related.title)} <i class="fa-solid fa-arrow-left-long"></i></a>`;
  }).join('');
}

function serviceTitle(url) {
  const labels = {
    '/dammam/': 'شركة تعاود في الدمام',
    '/dammam/construction/': 'البناء والإنشاءات',
    '/dammam/turnkey/': 'تسليم المفتاح',
    '/dammam/renovation/': 'الترميم والتجديد',
    '/dammam/finishing/': 'التشطيبات',
    '/dammam/decor/': 'الديكور والتصميم الداخلي',
    '/dammam/mep/': 'الكهرباء والسباكة',
    '/dammam/projects/': 'مشاريع تعاود',
    '/dammam/contact/': 'طلب معاينة'
  };
  return labels[url] || 'خدمات تعاود في الدمام';
}

function renderFaq(article) {
  const cards = article.faqs.map(([question, answer], index) => `<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-${article.slug}-${index}"><span>${escapeHtml(question)}</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="faq-${article.slug}-${index}"><p>${escapeHtml(answer)}</p></div></div>`).join('');
  return `<section id="faq" class="section-padding bg-light tawod-faq-section"><div class="container"><div class="section-title"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات واضحة حول ${escapeHtml(article.title)}</h2><p>معلومات تساعدك على تجهيز المشروع وفهم القرارات قبل بدء التنفيذ.</p></div><div class="faq-wrap tawod-faq-grid">${cards}</div></div></section>`;
}

function renderArticle(article) {
  const body = articleBodyContent(article);
  const wordCount = plainText(body).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(5, Math.ceil(wordCount / 170));
  const services = article.services.map((url) => `<a href="${url}">${serviceTitle(url)} <i class="fa-solid fa-arrow-left-long"></i></a>`).join('');
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar-SA">
${articleHead(article, wordCount, minutes)}
<body class="dammam-page dammam-article">
${header('blog')}
<main id="main">
<section class="article-hero"><div class="container reveal-up"><div class="article-meta-line"><span><i class="fa-regular fa-calendar"></i> محدث ${arabicDate}</span><span><i class="fa-solid fa-location-dot"></i> الدمام</span><span><i class="fa-solid fa-building"></i> ${escapeHtml(article.category)}</span><span data-reading-time><i class="fa-regular fa-clock"></i> ${minutes} دقائق قراءة</span></div><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.heroIntro)}</p><div class="hero-actions"><a class="btn btn-primary" href="/dammam/contact/">اطلب استشارة</a><a class="btn btn-whatsapp" href="https://wa.me/966551128884"><i class="fa-brands fa-whatsapp"></i> واتساب</a></div></div></section>
${trustStrip()}
<section class="section-padding"><div class="container"><div class="article-layout"><article class="article-content"><img src="/${article.image}" width="${article.dimensions[0]}" height="${article.dimensions[1]}" loading="lazy" fetchpriority="low" decoding="async" alt="${escapeHtml(article.imageAlt)}">${body}</article><aside class="article-sidebar"><div class="article-cta"><h3>تحتاج مقاول لمشروعك؟</h3><p>أرسل موقع المشروع ومرحلته والمخططات أو الصور المتاحة لمناقشة الخطوة المناسبة.</p><a class="btn btn-primary" href="/dammam/contact/">طلب عرض سعر</a></div><div class="article-box"><h3>خدمات مرتبطة</h3><div class="article-links">${services}</div></div><div class="article-box"><h3>مقالات مهمة</h3><div class="article-links">${relatedArticleLinks(article.related)}</div></div></aside></div></div></section>
${renderFaq(article)}
</main>
${footer()}
</body>
</html>`;
}

function articleCard(article, index = 1) {
  return `<article class="article-card"><div class="article-thumb"><img src="/${article.image}" width="${article.dimensions[0]}" height="${article.dimensions[1]}" alt="${escapeHtml(article.imageAlt)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"></div><div class="article-body"><div class="article-meta"><span>${escapeHtml(article.category)}</span><span>الدمام</span></div><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.ogDescription)}</p><a class="article-link" href="/dammam/blog/${article.slug}/">اقرأ المقال <i class="fa-solid fa-arrow-left-long"></i></a></div></article>`;
}

function blogSchemas() {
  const url = `${domain}/dammam/blog/`;
  return `<script type="application/ld+json">${jsonScript({'@context': 'https://schema.org', '@graph': [
    {'@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: 'مقالات تعاود للمقاولات في الدمام', description: 'أدلة عملية عن البناء والترميم والتشطيب وإدارة المشاريع في الدمام.', inLanguage: 'ar-SA', about: {'@type': 'City', name: 'الدمام'}},
    {'@type': 'Blog', '@id': `${url}#blog`, url, name: 'مدونة تعاود للمقاولات في الدمام', inLanguage: 'ar-SA', publisher: {'@type': 'Organization', name: 'شركة تعاود للمقاولات العامة', url: `${domain}/dammam/`}, blogPost: articles.map((article) => ({'@type': 'BlogPosting', headline: article.title, url: `${url}${article.slug}/`}))},
    {'@type': 'BreadcrumbList', itemListElement: [{'@type': 'ListItem', position: 1, name: 'شركة تعاود في الدمام', item: `${domain}/dammam/`}, {'@type': 'ListItem', position: 2, name: 'المقالات', item: url}]},
    {'@type': 'FAQPage', mainEntity: [
      {'@type': 'Question', name: 'ما موضوعات مقالات تعاود في الدمام؟', acceptedAnswer: {'@type': 'Answer', text: 'تغطي المقالات اختيار شركة المقاولات وبناء الفلل والعظم وتسليم المفتاح والترميم والتشطيبات والواجهات والأعمال الفنية والكود السعودي والمشاريع التجارية في الدمام.'}},
      {'@type': 'Question', name: 'هل المقالات بديل عن المعاينة أو الاستشارة الهندسية؟', acceptedAnswer: {'@type': 'Answer', text: 'لا، تقدم المقالات معلومات توعوية، بينما يحتاج القرار التنفيذي إلى مراجعة مستندات وحالة كل مشروع بواسطة المختصين.'}},
      {'@type': 'Question', name: 'كيف أطلب مناقشة مشروع في الدمام؟', acceptedAnswer: {'@type': 'Answer', text: 'أرسل موقع المشروع ونوعه ومساحته ومرحلته الحالية والصور أو المخططات المتاحة عبر صفحة التواصل أو واتساب.'}}
    ]}
  ]})}</script>`;
}

function renderBlogIndex() {
  const title = 'مقالات تعاود للمقاولات في الدمام | أدلة البناء والتشطيب';
  const description = 'مقالات تعاود للمقاولات في الدمام تقدم أدلة عملية عن بناء الفلل والعظم وتسليم المفتاح والترميم والتشطيبات والواجهات والكهرباء والسباكة والكود السعودي.';
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar-SA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#1D1E26">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${domain}/dammam/blog/">
<link rel="alternate" hreflang="ar-SA" href="${domain}/dammam/blog/">
<meta property="og:type" content="website">
<meta property="og:locale" content="ar_SA">
<meta property="og:site_name" content="شركة تعاود للمقاولات العامة">
<meta property="og:title" content="مقالات تعاود للمقاولات في الدمام">
<meta property="og:description" content="أدلة عملية تساعد ملاك المشاريع في الدمام على فهم البناء والترميم والتشطيب قبل اتخاذ القرار.">
<meta property="og:image" content="${domain}/images/blog/best-contracting-company-riyadh.webp">
<meta property="og:url" content="${domain}/dammam/blog/">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="مقالات تعاود للمقاولات في الدمام">
<meta name="twitter:description" content="أدلة عملية للبناء والترميم والتشطيب وإدارة المشاريع في الدمام.">
<meta name="twitter:image" content="${domain}/images/blog/best-contracting-company-riyadh.webp">
<link rel="icon" href="/images/logo/tawod-logo.png" sizes="32x32" type="image/png">
${styleLinks(false)}
${blogSchemas()}
</head>
<body class="dammam-page dammam-blog-index">
${header('blog')}
<main id="main">
<section class="blog-hero"><div class="container reveal-up"><div class="breadcrumbs"><a href="/dammam/">الرئيسية</a><i class="fa-solid fa-chevron-left"></i><span>المقالات</span></div><h1>مقالات تعاود للمقاولات في الدمام</h1><p>أدلة عملية تساعدك على فهم مراحل البناء والعظم والترميم والتشطيب والأعمال الفنية، واتخاذ قرارات أوضح قبل بدء مشروعك في الدمام.</p><div class="hero-actions"><a class="btn btn-primary" href="/dammam/contact/">ناقش مشروعك</a><a class="btn btn-whatsapp" href="https://wa.me/966551128884"><i class="fa-brands fa-whatsapp"></i> واتساب</a></div></div></section>
${trustStrip()}
<section class="section-padding blog-lead"><div class="container"><div class="section-title"><span class="eyebrow">10 أدلة متخصصة</span><h2>محتوى محلي لمشاريع البناء والتجديد في الدمام</h2><p>كل مقال يعالج قرارًا محددًا ويربطه بالخدمة المناسبة والمقالات المكملة داخل صفحات الدمام.</p></div><div class="articles-grid">${articles.map(articleCard).join('')}</div></div></section>
<section class="section-padding bg-light"><div class="container"><div class="section-title"><span class="eyebrow">خدمات تعاود</span><h2>انتقل من الدليل إلى خدمة مشروعك</h2><p>استعرض تفاصيل الخدمات المتاحة للمشاريع السكنية والتجارية في الدمام.</p></div><div class="tawod-context-grid"><a href="/dammam/construction/"><i class="fa-solid fa-trowel-bricks"></i><span>البناء والإنشاءات</span><i class="fa-solid fa-arrow-left"></i></a><a href="/dammam/turnkey/"><i class="fa-solid fa-key"></i><span>تسليم المفتاح</span><i class="fa-solid fa-arrow-left"></i></a><a href="/dammam/renovation/"><i class="fa-solid fa-house-chimney-crack"></i><span>الترميم والتجديد</span><i class="fa-solid fa-arrow-left"></i></a><a href="/dammam/finishing/"><i class="fa-solid fa-paint-roller"></i><span>التشطيبات</span><i class="fa-solid fa-arrow-left"></i></a><a href="/dammam/decor/"><i class="fa-solid fa-couch"></i><span>الديكور</span><i class="fa-solid fa-arrow-left"></i></a><a href="/dammam/mep/"><i class="fa-solid fa-screwdriver-wrench"></i><span>الكهرباء والسباكة</span><i class="fa-solid fa-arrow-left"></i></a></div></div></section>
<section id="faq" class="section-padding tawod-faq-section"><div class="container"><div class="section-title"><span class="eyebrow">أسئلة شائعة</span><h2>عن مقالات تعاود في الدمام</h2></div><div class="faq-wrap tawod-faq-grid"><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="blog-faq-1"><span>ما موضوعات مقالات تعاود في الدمام؟</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="blog-faq-1"><p>تغطي اختيار شركة المقاولات وبناء الفلل والعظم وتسليم المفتاح والترميم والتشطيبات والواجهات والأعمال الفنية والكود السعودي والمشاريع التجارية.</p></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="blog-faq-2"><span>هل المقالات بديل عن المعاينة أو الاستشارة الهندسية؟</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="blog-faq-2"><p>لا، تقدم المقالات معلومات توعوية، بينما يحتاج القرار التنفيذي إلى مراجعة مستندات وحالة كل مشروع بواسطة المختصين.</p></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="blog-faq-3"><span>كيف أطلب مناقشة مشروع في الدمام؟</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="blog-faq-3"><p>أرسل موقع المشروع ونوعه ومساحته ومرحلته الحالية والصور أو المخططات المتاحة عبر صفحة التواصل أو واتساب.</p></div></div></div></div></section>
</main>
${footer()}
</body>
</html>`;
}

function marked(name, html) {
  return `<!-- DAMMAM_${name}_START -->${html}<!-- DAMMAM_${name}_END -->`;
}

function upsertBefore(html, name, content, beforePattern) {
  const block = marked(name, content);
  const current = new RegExp(`<!-- DAMMAM_${name}_START -->[\\s\\S]*?<!-- DAMMAM_${name}_END -->`, 'i');
  if (current.test(html)) return html.replace(current, block);
  return html.replace(beforePattern, `${block}\n$&`);
}

function homeArticlesSection() {
  return `<section class="section-padding bg-light dammam-related-guides" id="articles"><div class="container"><div class="section-title reveal-up"><span class="eyebrow">أدلة تعاود في الدمام</span><h2>مقالات تساعدك قبل بدء المشروع</h2><p>محتوى عملي عن اختيار المقاول وبناء الفلل والعظم وتسليم المفتاح والترميم والتشطيبات في الدمام.</p></div><div class="dammam-articles-grid">${articles.slice(0, 6).map(articleCard).join('')}</div><div class="dammam-articles-footer"><a class="btn btn-dark" href="/dammam/blog/">عرض جميع مقالات الدمام</a></div></div></section>`;
}

const guideMap = {
  about: ['best-general-contracting-company-dammam', 'villa-construction-stages-dammam', 'saudi-building-code-owner-guide-dammam'],
  services: ['best-general-contracting-company-dammam', 'turnkey-villa-construction-dammam', 'villa-renovation-guide-dammam'],
  construction: ['villa-construction-stages-dammam', 'bone-construction-quality-checklist-dammam', 'saudi-building-code-owner-guide-dammam'],
  turnkey: ['turnkey-villa-construction-dammam', 'villa-construction-stages-dammam', 'interior-exterior-finishing-dammam'],
  renovation: ['villa-renovation-guide-dammam', 'building-facade-moisture-insulation-dammam', 'interior-exterior-finishing-dammam'],
  finishing: ['interior-exterior-finishing-dammam', 'building-facade-moisture-insulation-dammam', 'mep-coordination-electrical-plumbing-dammam'],
  decor: ['interior-exterior-finishing-dammam', 'commercial-fitout-dammam', 'turnkey-villa-construction-dammam'],
  mep: ['mep-coordination-electrical-plumbing-dammam', 'villa-construction-stages-dammam', 'commercial-fitout-dammam'],
  projects: ['best-general-contracting-company-dammam', 'villa-construction-stages-dammam', 'saudi-building-code-owner-guide-dammam'],
  contact: ['best-general-contracting-company-dammam', 'turnkey-villa-construction-dammam', 'villa-renovation-guide-dammam']
};

const localPlans = {
  home: {
    title: 'ما الذي تحدده معاينة المشروع في الدمام؟',
    intro: 'نحوّل نوع الموقع وحركة التوريد وحالة المبنى إلى بنود ومسؤوليات واختبارات واضحة قبل التسعير النهائي.',
    items: [
      ['fa-road', 'حركة الموقع والجوار', 'نحدد مداخل المعدات ومساحة التخزين ومسار المخلفات وحماية المباني أو الأنشطة المجاورة. ثم يُرتب البرنامج والدفعات بما يناسب الموقع الفعلي، سواء كان مشروعًا سكنيًا هادئًا أو مبنى يعمل أثناء التنفيذ.'],
      ['fa-cloud-sun', 'حرارة وغبار وغلاف', 'تُراجع الأسطح والواجهات والنوافذ والمثبتات والعزل مع اتجاهات التعرض وطريقة الصيانة. كما تدخل أوقات الصب والمعالجة والتخزين وحماية المواد في الخطة حتى لا تُترك الظروف الجوية كتعليق عام بلا إجراء.'],
      ['fa-list-check', 'استلام كل مرحلة', 'تُربط الصبات والعزل والتمديدات والتشطيبات بقوائم فحص وصور ونتائج اختبار. لا تنتقل الفرق إلى التغطية أو الإغلاق قبل معالجة الملاحظة وتوثيقها، خصوصًا في العناصر التي لن تكون مرئية عند التسليم.']
    ]
  },
  services: {
    title: 'خدمة الدمام تُبنى حول نوع المشروع',
    intro: 'الفيلا والمبنى التجاري والمستودع أو الموقع القائم تختلف في الأحمال والحركة والحماية وموعد التشغيل.',
    items: [
      ['fa-house', 'فيلا سكنية', 'نربط احتياج الأسرة بالمخططات والعظم والعزل والتكييف والتشطيب، ونحدد القرارات التي يجب اعتمادها مبكرًا مثل الفتحات والواجهات والمطابخ والنجارة حتى لا تتغير المسارات بعد التنفيذ.'],
      ['fa-building', 'مبنى تجاري أو متعدد الاستخدام', 'تُراجع الحركة والمواقف والخدمات المشتركة والأحمال والسلامة والتسليم المرحلي بين المساحات. ويظهر في النطاق ما يخص المناطق العامة وما يخص كل مستأجر أو نشاط بدل تداخل المسؤوليات.'],
      ['fa-warehouse', 'مستودع أو موقع تشغيلي', 'تبدأ الدراسة من المعدات والحركة والارتفاعات والأرضيات والطاقة والتهوية والحماية من الحريق، ثم تُنسق الأعمال مع استمرار التشغيل إن وجد. موعد الجاهزية يُثبت بعد التجارب لا بعد انتهاء التشطيب المرئي فقط.']
    ]
  },
  construction: {
    title: 'خطة بناء مرتبطة بأرض وموقع الدمام',
    intro: 'نتعامل مع التقرير الجيوتقني والخرسانة والتوريد والخدمات كمسار واحد قبل الصبات المتتابعة.',
    items: [
      ['fa-mound', 'حل الأرض من التقرير', 'تُربط نتائج التربة والمياه والمناسيب بتصميم القواعد والردم والعزل والخدمات المدفونة. وإذا اختلف الواقع أثناء الحفر، يُوثق التغير ويعود القرار للمصمم بدل تعديل العمق أو الإحلال شفهيًا في الموقع.'],
      ['fa-temperature-high', 'صب ومعالجة في التوقيت المناسب', 'تتضمن خطة الخرسانة زمن التوريد ودرجة الحرارة والفحوص والدمك والمعالجة والحماية، مع استعداد مسبق للعمال والمعدات. الهدف تقليل الانتظار وضمان بدء المعالجة فورًا وفق المواصفة المعتمدة.'],
      ['fa-truck-ramp-box', 'توريد لا يعطل الصبة', 'نحدد طريق الشاحنات وموقع المضخة والتخزين المؤقت ومناطق الرفع قبل الموعد، ثم ننسق السليفات والفتحات مع MEP. هذه التفاصيل تمنع تعارض الحركة أو وصول مادة قبل جاهزية الاستلام.']
    ]
  },
  turnkey: {
    title: 'تسليم مفتاح منظم لمشاريع الدمام',
    intro: 'نجمع القرار والتوريد والتنفيذ والتجارب في برنامج واحد يمكن للمالك متابعة نقاطه الحرجة.',
    items: [
      ['fa-table-list', 'مصفوفة مسؤوليات', 'يوضح العقد من يصمم ويعتمد ويورد ويفحص لكل بند، وما الذي يقدمه المالك أو الجهة المشغلة. بهذه المصفوفة لا تضيع قرارات الواجهات والمعدات والخدمات المشتركة بين أكثر من طرف.'],
      ['fa-box-open', 'توريد متدرج حسب الموقع', 'تُقسم المواد إلى طويلة التوريد ومتكررة وسريعة، وتُحدد دفعاتها وفق مساحة التخزين وحماية الموقع. لا نكدس الخامات قبل الحاجة ولا نؤخر قرارًا يؤثر في عدة تخصصات لاحقة.'],
      ['fa-circle-check', 'تجربة استخدام نهائية', 'نختبر الأبواب والإنارة والتكييف والمياه والصرف والمعدات ومسارات المستخدمين في سيناريو تشغيل فعلي، ثم نغلق الملاحظات ونسلم الضمانات والجداول والمخططات المحدثة.']
    ]
  },
  renovation: {
    title: 'ترميم الدمام بين التشخيص واستمرار الاستخدام',
    intro: 'نحدد ما يجب إصلاحه وما يمكن الحفاظ عليه وكيف سيستمر المبنى بأمان أثناء الأعمال.',
    items: [
      ['fa-file-medical', 'سجل حالة قبل الإزالة', 'نصور التشققات والرطوبة والتمديدات والتعديلات السابقة ونربطها بتوقيت الظهور والاستخدام. السجل يمنع خلط السبب بالأثر ويحدد أين يلزم كشف إضافي أو رأي إنشائي قبل التكسير.'],
      ['fa-people-roof', 'تقسيم مبنى مأهول', 'تُحدد مناطق العمل ومسارات العمال والمخلفات وفترات فصل الخدمات وحواجز الغبار والضوضاء. ثم يُسلّم كل نطاق ويعاد تشغيله قبل الانتقال عندما يتطلب استخدام المبنى ذلك.'],
      ['fa-vial-circle-check', 'إثبات نجاح المعالجة', 'نعيد اختبار الضغط أو الغمر أو الرش أو العزل الكهربائي بحسب المشكلة، ونراقب الجفاف قبل إعادة الطلاء أو الأسقف. إغلاق السطح بعد تحسن بصري مؤقت لا يعد استلامًا فنيًا.']
    ]
  },
  finishing: {
    title: 'تشطيبات الدمام من السطح إلى الصيانة',
    intro: 'الخامة النهائية تُعتمد مع طريقة التحضير والفاصل والحماية والتنظيف، لا باللون والمقاس فقط.',
    items: [
      ['fa-ruler', 'استواء ورطوبة موثقة', 'تُفحص اللياسة والسكريد ومناسيب الأبواب والمصارف وتُقاس الرطوبة قبل دخول الدهانات والخشب والأرضيات. تعالج المشكلة في طبقتها الأصلية بدل محاولة إخفائها بسماكة لاصق أو معجون.'],
      ['fa-swatchbook', 'لوحة مواد كاملة', 'نسجل الخامة والكود والمقاس والحافة والفاصل واللاصق ومكان الاستخدام وطريقة التنظيف، ثم ننفذ نموذجًا يجمع أكثر من مادة. النموذج يحسم الانتقالات قبل تعميمها على الغرف أو الواجهات.'],
      ['fa-shield-heart', 'حماية حتى آخر فريق', 'يُحدد مسؤول حماية الأرضيات والنجارة والدهانات ومتى تزال الحماية وكيف ينفذ التنظيف النهائي. كما تُحفظ الكميات الاحتياطية المتفق عليها وأكوادها لتسهيل الإصلاح بعد الاستخدام.']
    ]
  },
  decor: {
    title: 'ديكور يخدم نمط الاستخدام في الدمام',
    intro: 'نحوّل الحركة والهوية والإضاءة والأثاث والأنظمة إلى تفاصيل قابلة للتنفيذ والتغيير والصيانة.',
    items: [
      ['fa-route', 'حركة واضحة قبل الشكل', 'نرسم مسارات الدخول والجلوس والخدمة والتخزين وفتح الأبواب قبل توزيع الكسوات والأسقف. هذا يمنع جمالًا بصريًا يضيق الممر أو يعطل الاستخدام اليومي أو يصعب الوصول إلى نقطة صيانة.'],
      ['fa-lightbulb', 'إنارة مرتبطة بالمهمة', 'تُراجع الإضاءة الطبيعية والعامة والموجهة مع ألوان الخامات ومواقع الأثاث والشاشات، ثم تنسق المفاتيح والتحكم مع الكهرباء. الاختبار بالنموذج يكشف الوهج والظلال قبل تكرار الوحدات.'],
      ['fa-layer-group', 'سقف منسق لا مزدحم', 'نجمع مخارج الهواء والإنارة والرشاشات والحساسات والسماعات وفتحات الصيانة في لوحة واحدة. بذلك تُحفظ المحاور والارتفاعات ولا تضاف الخدمات بعد إقفال الجبس أو النجارة.']
    ]
  },
  mep: {
    title: 'MEP في الدمام حسب الحمل والاستخدام',
    intro: 'المعدات ومسارات الصيانة ونمط الإشغال تحدد الأحجام والحماية والاختبارات قبل التمديد.',
    items: [
      ['fa-bolt', 'أحمال قابلة للتوسع', 'نجمع قدرات التكييف والمضخات والمصاعد والمطابخ والمعدات الخاصة ونحدد دوائرها وطلبها المتزامن، مع احتياطي مدروس عند الحاجة. لا تُستنتج سعة اللوحة من عدد المخارج وحده.'],
      ['fa-faucet', 'مياه وصرف بحسب التشغيل', 'تُراجع الضغوط والميول وأقطار الخطوط ونقاط التنظيف وفترات الذروة، ثم تُختبر الشبكات قبل الإغلاق. للمباني التجارية أو التشغيلية تُربط الخطة بعدد المستخدمين والمعدات لا بمساحة المبنى فقط.'],
      ['fa-screwdriver-wrench', 'عزل وصيانة آمنة', 'تُرقم اللوحات والدوائر والمحابس والمعدات وتبقى نقاط الفصل وفتحات الصيانة متاحة بعد التشطيب. عند التسليم ترتبط نتائج الاختبار بالمخطط المحدث لتسهيل العزل والتشخيص دون تخمين.']
    ]
  }
};

function localPlanSection(page) {
  const config = localPlans[page];
  if (!config) return '';
  const cards = config.items.map(([icon, title, text]) => `<article class="feature-card"><i class="fa-solid ${icon}"></i><h3>${title}</h3><p>${text}</p></article>`).join('');
  return `<section class="section-padding tawod-city-local-plan"><div class="container"><div class="section-title"><span class="eyebrow">خطة مرتبطة بالمشروع</span><h2>${config.title}</h2><p>${config.intro}</p></div><div class="feature-grid">${cards}</div></div></section>`;
}

function guidesSection(page) {
  const cards = guideMap[page].map((slug) => {
    const article = articleBySlug.get(slug);
    return `<a class="dammam-guide-link" href="/dammam/blog/${slug}/"><span>${escapeHtml(article.title)}</span><i class="fa-solid fa-arrow-left-long"></i></a>`;
  }).join('');
  return `<section class="section-padding dammam-related-guides"><div class="container"><div class="section-title"><span class="eyebrow">من دليل تعاود</span><h2>مقالات مرتبطة تساعدك قبل التنفيذ</h2><p>اقرأ الأدلة الأقرب إلى هذه الصفحة ثم انتقل إلى مناقشة تفاصيل مشروعك.</p></div><div class="dammam-guides-grid">${cards}</div><div class="dammam-articles-footer"><a class="btn btn-dark" href="/dammam/blog/">كل مقالات الدمام</a></div></div></section>`;
}

function addNavItemToBlock(block, item, contactPattern) {
  if (block.includes('/dammam/blog/')) return block;
  return block.replace(contactPattern, `${item}$&`);
}

function cleanCustomerWording(html) {
  const replacements = [
    [/تعرف على منهج تعاود في خدمة مشاريع الدمام داخل مدينة الدمام\./g, 'تعرف على منهج تعاود في إدارة وتنفيذ مشاريع المقاولات بمدينة الدمام.'],
    [/هل صفحة الدمام تمثل فرعًا مستقلًا؟/g, 'ما نوع المشاريع التي تناقشها تعاود في الدمام؟'],
    [/توضح الصفحة خدمات تعاود للمشاريع التي يمكن خدمتها داخل مدينة الدمام داخل مدينة الدمام\./g, 'توضح الصفحة خدمات تعاود للمشاريع السكنية والتجارية وأعمال البناء والترميم والتشطيب في الدمام.'],
    [/توضح الصفحة خدمات تعاود للمشاريع التي يمكن خدمتها داخل مدينة الدمام\./g, 'توضح الصفحة خدمات تعاود للمشاريع السكنية والتجارية وأعمال البناء والترميم والتشطيب في الدمام.'],
    [/هل يوجد عنوان استقبال عملاء في الدمام؟/g, 'كيف يتم تنسيق معاينة المشروع في الدمام؟'],
    [/هذه الصفحة مخصصة لنطاق الخدمة في الدمام ولا تعرض عنوان فرع مستقل ويتم تنسيق المعاينة في موقع المشروع عند مناسبة الخدمة\./g, 'بعد مراجعة موقع المشروع ونوعه ومرحلته والمعلومات المتاحة يتم تحديد الحاجة إلى المعاينة وتنسيق الموعد في موقع المشروع.'],
    [/هذه الصفحة مخصصة لمشاريع الدمام في الدمام ولا تعرض عنوان فرع مستقل ويتم تنسيق المعاينة في موقع المشروع عند مناسبة الخدمة\./g, 'بعد مراجعة موقع المشروع ونوعه ومرحلته والمعلومات المتاحة يتم تحديد الحاجة إلى المعاينة وتنسيق الموعد في موقع المشروع.'],
    [/<h3>نطاق الخدمة<\/h3><p>مدينة الدمام — بدون عرض عنوان فرع مستقل<\/p>/g, '<h3>مشاريع الدمام</h3><p>نناقش تفاصيل المشروع وننسق المعاينة في موقعه عند الحاجة.</p>'],
    [/داخل مدينة الدمام داخل مدينة الدمام/g, 'داخل مدينة الدمام'],
    [/الدمام — نطاق خدمة/g, 'مشاريعنا وخدماتنا في الدمام'],
    [/داخل نطاق خدمة الدمام/g, 'داخل مدينة الدمام'],
    [/ضمن نطاق خدمة الدمام/g, 'في مدينة الدمام'],
    [/في نطاق خدمة الدمام/g, 'في الدمام'],
    [/نطاق خدمة الدمام/g, 'مدينة الدمام'],
    [/داخل الدمام كنطاق خدمة/g, 'داخل مدينة الدمام'],
    [/في الدمام نقدم خدماتنا كنطاق خدمة/g, 'في الدمام نقدم خدماتنا للمشاريع السكنية والتجارية'],
    [/خدمات تعاود للمشاريع التي يمكن خدمتها داخل مدينة الدمام كخدمات المقاولات/g, 'خدمات تعاود للمشاريع السكنية والتجارية داخل مدينة الدمام'],
    [/لا تعرض الصفحة عنوان فرع مستقل بل توضح /g, 'توضح الصفحة '],
    [/نطاق الخدمة/g, 'مشاريع الدمام'],
    [/ كنطاق خدمة/g, ' داخل مدينة الدمام'],
    [/نطاق خدمة/g, 'خدمات المقاولات']
  ];
  for (const [pattern, value] of replacements) html = html.replace(pattern, value);
  return html;
}

function enhanceExistingPage(file, page) {
  let html = fs.readFileSync(file, 'utf8');
  html = cleanCustomerWording(html)
    .replace(/https:\/\/instagram\.com\/tawodco\b/gi, 'https://instagram.com/tawodco1')
    .replace(/https:\/\/tiktok\.com\/@tawodco\b/gi, 'https://tiktok.com/@Tawodco')
    .replace(/https:\/\/snapchat\.com\/add\/tawodco\b/gi, 'https://snapchat.com/add/Tawodco')
    .replace(/https:\/\/(?:twitter|x)\.com\/tawodco\b/gi, 'https://x.com/Tawodco');

  html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/gi, '')
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/gi, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Tajawal:[^"]+" rel="stylesheet">/gi, '');

  if (!html.includes('alexandria-arabic-variable.woff2')) {
    html = html.replace(/<link rel="preconnect" href="https:\/\/cdnjs\.cloudflare\.com" crossorigin>/i, '<link rel="preload" as="font" href="/assets/fonts/alexandria-arabic-variable.woff2" type="font/woff2" crossorigin><link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>');
  }
  if (!html.includes('tawod-dammam.css')) {
    html = html.replace(/(<link href="\/assets\/css\/tawod-system\.css" rel="stylesheet">)/i, '$1<link href="/assets/css/tawod-dammam.css" rel="stylesheet">');
  }

  html = html.replace(/<body(?: class="([^"]*)")?>/i, (_, classes = '') => {
    const list = new Set(classes.split(/\s+/).filter(Boolean));
    list.add('dammam-page');
    return `<body class="${[...list].join(' ')}">`;
  });

  const active = page === 'home' ? 'home' : ['construction', 'turnkey', 'renovation', 'finishing', 'decor', 'mep'].includes(page) ? 'services' : page;
  html = html.replace(/<a class="skip-link"[\s\S]*?<\/header>/i, header(active));
  html = html.replace(/<footer class="footer">[\s\S]*?(?=<\/body>)/i, `${footer(page === 'home')}\n`);

  html = html.replace(/<ul class="nav-links">[\s\S]*?<\/ul>/i, (block) => addNavItemToBlock(block, '<li><a href="/dammam/blog/">المقالات</a></li>', /<li><a[^>]*href="\/dammam\/contact\/"/i));
  html = html.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/i, (block) => addNavItemToBlock(block, '<a href="/dammam/blog/">المقالات <i class="fa-solid fa-chevron-left"></i></a>', /<a[^>]*href="\/dammam\/contact\/"/i));
  html = html.replace(/<div class="footer-nav-column(?: footer-quick-links)?">[\s\S]*?<ul class="footer-links">[\s\S]*?<\/ul>[\s\S]*?<\/div>/i, (block) => addNavItemToBlock(block, '<li><a href="/dammam/blog/"><i class="fa-solid fa-angle-left"></i> المقالات</a></li>', /<li><a[^>]*href="\/dammam\/contact\/"/i));

  if (!html.includes('property="og:site_name"')) {
    html = html.replace(/(<meta property="og:locale"[^>]*>)/i, '$1<meta property="og:site_name" content="شركة تعاود للمقاولات العامة">');
  }
  if (!html.includes('name="twitter:card"')) {
    const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'شركة تعاود للمقاولات في الدمام');
    const description = html.match(/<meta name="description" content="([^"]*)"/i)?.[1] || '';
    const image = html.match(/<meta property="og:image" content="([^"]*)"/i)?.[1] || `${domain}/images/projects/project-commercial-residential-building-dammam.webp`;
    const twitter = `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${image}">`;
    html = html.replace(/<link rel="icon"/i, `${twitter}<link rel="icon"`);
  }

  if (page === 'home') html = upsertBefore(html, 'ARTICLES', homeArticlesSection(), /<section id="faq"/i);
  else html = upsertBefore(html, 'RELATED_GUIDES', guidesSection(page), /<section id="faq"/i);

  const localPlan = localPlanSection(page);
  if (localPlan) {
    const anchor = page === 'home' ? /<!-- DAMMAM_ARTICLES_START -->/i : /<!-- DAMMAM_RELATED_GUIDES_START -->/i;
    html = upsertBefore(html, 'LOCAL_PLAN', localPlan, anchor);
  }

  writeIfChanged(file, html);
}

function updateSitemaps() {
  const paths = [
    '/dammam/', '/dammam/services/', '/dammam/construction/', '/dammam/turnkey/', '/dammam/renovation/',
    '/dammam/finishing/', '/dammam/decor/', '/dammam/mep/', '/dammam/about/', '/dammam/projects/', '/dammam/contact/',
    '/dammam/blog/', ...articles.map((article) => `/dammam/blog/${article.slug}/`)
  ];
  const mainFile = path.join(root, 'sitemap.xml');
  let main = fs.readFileSync(mainFile, 'utf8').replace(/\s*<url><loc>https:\/\/tawodco\.com\/dammam\/[\s\S]*?<\/url>/g, '');
  const entries = paths.map((pathname) => `  <url><loc>${domain}${pathname}</loc><lastmod>${date}</lastmod></url>`).join('\n');
  main = main.replace(/\s*<\/urlset>/, `\n${entries}\n</urlset>`);
  writeIfChanged(mainFile, main);

  const local = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((pathname) => `  <url><loc>${domain}${pathname}</loc><lastmod>${date}</lastmod></url>`).join('\n')}\n</urlset>`;
  writeIfChanged(path.join(root, 'sitemap-dammam.xml'), local);
}

for (const article of articles) {
  writeIfChanged(path.join(root, 'dammam', 'blog', article.slug, 'index.html'), renderArticle(article));
}
writeIfChanged(path.join(root, 'dammam', 'blog', 'index.html'), renderBlogIndex());

const existing = ['home', 'about', 'services', 'projects', 'contact', 'construction', 'turnkey', 'renovation', 'finishing', 'decor', 'mep'];
for (const page of existing) {
  const file = page === 'home' ? path.join(root, 'dammam', 'index.html') : path.join(root, 'dammam', page, 'index.html');
  enhanceExistingPage(file, page);
}

updateSitemaps();

if (check && changes.length) {
  console.error('Dammam silo is out of date. Run npm run generate:dammam');
  for (const file of changes) console.error(` - ${file}`);
  process.exit(1);
}

console.log(`${check ? 'Checked' : 'Generated'} the Dammam silo: ${articles.length} articles; ${changes.length} file(s) ${check ? 'would change' : 'changed'}.`);
