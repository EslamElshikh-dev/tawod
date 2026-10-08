import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from './riyadh-articles-2026-10-08.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const domain = 'https://tawodco.com';
const date = '2026-10-08';
const base = readFileSync(join(root, 'blog/general-contracting-project-management-riyadh/index.html'), 'utf8');
const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const article of articles) {
  const url = `${domain}/blog/${article.slug}/`;
  const image = `${domain}/images/blog/${article.image}-1200.webp`;
  const text = article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const minutes = Math.ceil(text.split(/\s+/).length / 180);
  const headings = [...article.content.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  const whatsapp = `https://wa.me/966551128884?text=${encodeURIComponent(`السلام عليكم، قرأت مقال «${article.title}» على موقع تعاود، وأرغب في مناقشة مشروع بالرياض. الحي: … نوع المشروع: … المساحة: … المرحلة الحالية: …`)}`;
  const schema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title, description: article.description, url, image, datePublished: date, dateModified: date, keywords: article.keyword, author: { '@id': `${domain}/#organization` }, publisher: { '@id': `${domain}/#organization` }, inLanguage: 'ar-SA' };
  const css = ['tawod-home', 'tawod-upgrades', 'tawod-inner', 'tawod-blog', 'tawod-article', 'tawod-system', 'tawod-blog-architecture'];
  const head = `<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><meta name="theme-color" content="#1D1E26">
    <title>${escape(article.seoTitle)}</title><meta name="description" content="${escape(article.description)}"><meta name="author" content="شركة تعاود للمقاولات العامة">
    <meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${url}"><link rel="alternate" hreflang="ar-SA" href="${url}"><link rel="alternate" hreflang="x-default" href="${url}">
    <meta property="og:type" content="article"><meta property="og:locale" content="ar_SA"><meta property="og:site_name" content="شركة تعاود للمقاولات العامة"><meta property="og:title" content="${escape(article.title)}"><meta property="og:description" content="${escape(article.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:alt" content="${escape(article.imageAlt)}"><meta property="og:image:width" content="1122"><meta property="og:image:height" content="1402"><meta property="article:published_time" content="${date}"><meta property="article:modified_time" content="${date}">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(article.title)}"><meta name="twitter:description" content="${escape(article.description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${escape(article.imageAlt)}">
    <link rel="icon" href="/images/logo/tawod-logo.png" sizes="32x32" type="image/png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&amp;display=swap" rel="stylesheet"><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    ${css.map(name => `<link href="/assets/css/${name}.css" rel="stylesheet">`).join('\n')}
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
  </head>`;
  const toc = `<nav class="tawod-article-toc" aria-label="فهرس المقال"><div class="tawod-article-toc-head"><span>محتويات المقال</span><small>انتقل إلى القسم المطلوب</small></div><ol>${headings.map(match => `<li><a href="#${match[1]}">${escape(match[2])}</a></li>`).join('')}</ol></nav>`;
  const main = `<main id="main">
    <section class="article-hero"><div class="container reveal-up"><div class="article-meta-line"><time datetime="${date}">8 أكتوبر 2026</time><span>الرياض</span><span data-reading-time>${minutes} دقائق قراءة</span></div><h1>${escape(article.title)}</h1><p>${escape(article.hero)}</p><div class="hero-actions"><a class="btn btn-primary" href="${article.service}">${escape(article.serviceLabel)}</a><a class="btn btn-whatsapp" href="${whatsapp}" data-contact-position="article-hero">ناقش مشروعك</a></div></div></section>
    <section class="section-padding"><div class="container"><div class="article-layout"><article class="article-content reveal-up tawod-campaign-article">
      <img class="tawod-campaign-cover" src="/images/blog/${article.image}-960.webp" srcset="/images/blog/${article.image}-480.webp 480w, /images/blog/${article.image}-960.webp 960w, /images/blog/${article.image}-1200.webp 1122w" sizes="(max-width: 767px) calc(100vw - 40px), 640px" width="1122" height="1402" loading="eager" fetchpriority="high" decoding="async" alt="${escape(article.imageAlt)}">
      <p class="tawod-campaign-caption">تصميم توضيحي لخدمات تعاود في الرياض من سلسلة أخبار الملف التجاري؛ لا يُنسب إلى مشروع فعلي بعينه.</p>
      ${toc}<aside class="tawod-key-takeaways"><h2>ما الذي يساعدك على اتخاذ القرار؟</h2><ul>${article.takeaways.map(item => `<li>${escape(item)}</li>`).join('')}</ul></aside>
      ${article.content}
      <div class="seo-inline-cta"><h2>${escape(article.ctaTitle)}</h2><p>${escape(article.ctaText)}</p><a href="${whatsapp}" data-contact-position="article-contextual">${escape(article.ctaLabel)}</a></div>
    </article><aside class="article-sidebar"><div class="article-cta"><h3>ابدأ من تفاصيل مشروعك</h3><p>الحي، المساحة، المرحلة الحالية، والصور أو المخططات المتاحة تساعد على تحديد الخطوة التالية.</p><a class="btn btn-primary" href="/contact.html">أرسل تفاصيل المشروع</a><a class="btn btn-whatsapp" href="${whatsapp}" data-contact-position="article-sidebar">تواصل عبر واتساب</a></div></aside></div></div></section>
    <!-- TAWOD_AUTHORED_FAQ_START --><section id="faq" class="section-padding bg-light tawod-faq-section"><div class="container"><div class="section-title"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات عن هذا الموضوع</h2></div><div class="faq-wrap tawod-faq-grid">${article.faq.map(([question, answer], index) => `<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${index}"><span>${escape(question)}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="faq-answer" id="faq-answer-${index}"><p>${escape(answer)}</p></div></div>`).join('')}</div></div></section><!-- TAWOD_AUTHORED_FAQ_END -->
  </main>`;
  const output = join(root, 'blog', article.slug, 'index.html');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, base.replace(/<head>[\s\S]*?<\/head>/i, head).replace(/<body\b[^>]*>/i, '<body>').replace(/<main id="main">[\s\S]*?<\/main>/i, main));
}

const sitemapPath = join(root, 'sitemap.xml');
let sitemap = readFileSync(sitemapPath, 'utf8');
for (const article of articles) {
  const url = `${domain}/blog/${article.slug}/`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>`);
}
writeFileSync(sitemapPath, sitemap);
console.log(`Generated ${articles.length} original Riyadh articles and sitemap entries.`);
