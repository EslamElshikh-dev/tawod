import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ownerGuides, published } from './owner-project-guides-2026-10-15.mjs';
import { topicForArticle, topicUrl } from './blog-topic-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const domain = 'https://tawodco.com';
const template = readFileSync(join(root, 'blog/turnkey-commercial-fitout-riyadh/index.html'), 'utf8');
const analytics = template.match(/<!-- TAWOD_ANALYTICS_START -->[\s\S]*?<!-- TAWOD_ANALYTICS_END -->/)?.[0];
if (!analytics) throw new Error('Missing analytics installation in article template');
const faqs = JSON.parse(readFileSync(join(root, 'content/owner-project-guides/faqs.json'), 'utf8'));
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const stylesheetNames = ['tawod-home', 'tawod-upgrades', 'tawod-inner', 'tawod-blog', 'tawod-article', 'tawod-system', 'tawod-blog-architecture', 'tawod-decision-guides'];
const sources = {
  1: [['منصة مقاول: البحث عن منشآت المقاولات المسجلة', 'https://www.muqawil.org/ar/contractors/info'], ['وزارة البلديات والإسكان: إصدار رخصة بناء', 'https://momah.gov.sa/ar/e-services/issuance-building-license']],
  2: [['وزارة الموارد البشرية: دليل استخدام السقالات', 'https://www.hrsd.gov.sa/knowledge-centre/articles/دليل-استرشادي-حول-استخدام-السقالات'], ['المركز السعودي لكود البناء', 'https://www.sbc.gov.sa/ar/Pages/default.aspx']],
  3: [['وزارة البلديات والإسكان: إصدار رخصة بناء', 'https://momah.gov.sa/ar/e-services/issuance-building-license']],
  4: [['وزارة البلديات والإسكان: إصدار شهادة إشغال', 'https://momah.gov.sa/ar/e-services/issuing-occupancy-certificate']],
  5: [['المجلس الوطني للسلامة والصحة المهنية: الأدلة واللوائح', 'https://www.ncosh.gov.sa/ar/knowledge-center/rules-regulations/administrative-systems/']],
};

for (const article of ownerGuides) {
  const url = `${domain}/blog/${article.slug}/`;
  const topic = topicForArticle(article.slug);
  const image = `/images/projects/${article.cover}`;
  const { width, height } = await sharp(join(root, image)).metadata();
  const questions = faqs[article.number];
  const contentFile = `${String(article.number).padStart(2, '0')}.html.inc`;
  let content = readFileSync(join(root, 'content/owner-project-guides', contentFile), 'utf8');
  const whatsapp = `https://wa.me/966551128884?text=${encodeURIComponent(`السلام عليكم، قرأت مقال «${article.title}» وأرغب في مناقشة مشروع مع تعاود. نوع المشروع: … الحي في الرياض: … المساحة التقريبية: … المرحلة الحالية: … الموعد المستهدف: …`)}`;
  const cta = (heading, paragraph, position) => `<aside class="decision-cta" aria-label="${esc(heading)}"><h2>${esc(heading)}</h2><p>${esc(paragraph)}</p><div class="decision-actions"><a class="btn btn-whatsapp" href="${whatsapp}" data-contact-position="owner-guide-${position}" target="_blank" rel="noopener">ناقش مشروعك عبر واتساب</a><a class="btn btn-outline" href="/contact.html?service=${article.service}#form">أرسل تفاصيل المشروع</a><a class="decision-phone" href="tel:+966551128884" dir="ltr">0551128884</a></div></aside>`;
  if (!content.includes('<!-- OWNER_CONTEXT_CTA -->')) throw new Error(`Missing contextual CTA in ${article.slug}`);
  content = content.replace('<!-- OWNER_CONTEXT_CTA -->', cta(article.ctaTitle, article.ctaText, 'context'));
  content = content.replace(/<div class="decision-table">/g, '<div class="decision-table" tabindex="0" role="region" aria-label="جدول توضيحي قابل للتمرير أفقيًا">');
  const headings = [...content.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  const words = text(content + questions.flat().join(' ')).split(/\s+/).length;
  const minutes = Math.ceil(words / 180);
  const faq = `<section class="decision-faq" id="faq"><h2>الأسئلة الشائعة</h2><div class="faq-wrap">${questions.map(([question, answer], index) => `<div class="faq-item"><h3><button class="faq-question" type="button" aria-expanded="false" aria-controls="owner-answer-${index}"><span>${esc(question)}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button></h3><div class="faq-answer" id="owner-answer-${index}"><p>${esc(answer)}</p></div></div>`).join('')}</div></section>`;
  const toc = `<nav class="tawod-article-toc" aria-label="محتويات المقال"><h2>محتويات الدليل</h2><ol>${headings.map(([, id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('')}<li><a href="#faq">الأسئلة الشائعة</a></li></ol></nav>`;
  const sourceList = `<section class="decision-sources" aria-labelledby="owner-sources"><h2 id="owner-sources">مراجع رسمية للمتابعة</h2><ul>${sources[article.number].map(([label, href]) => `<li><a href="${href}" target="_blank" rel="noopener">${esc(label)}</a></li>`).join('')}</ul><p>إعداد الدليل: 15 أكتوبر 2026. تُراجع المتطلبات والإجراءات التي تنطبق على المشروع مع الجهات والمختصين قبل التنفيذ.</p></section>`;
  const related = `<nav class="decision-series" aria-label="أدلة المالك الجديدة"><h2>أدلة من قرار المقاول إلى التسليم</h2><ol>${ownerGuides.map(item => `<li${item.slug === article.slug ? ' class="is-current"' : ''}><a href="/blog/${item.slug}/"${item.slug === article.slug ? ' aria-current="page"' : ''}>${esc(item.title)}</a></li>`).join('')}</ol></nav>`;
  const main = `<main id="main">
<section class="page-hero decision-hero"><div class="container"><nav class="breadcrumb" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span aria-hidden="true">/</span><a href="/blog/">المدونة</a><span aria-hidden="true">/</span><a href="${topicUrl(topic)}">${esc(topic.title)}</a></nav><span class="eyebrow">أدلة المالك • ${article.number} / 5</span><h1>${esc(article.title)}</h1><p>${esc(article.description)}</p><div class="decision-dates"><span>نُشر <time datetime="${published}">15 أكتوبر 2026</time></span><span>${minutes} دقائق قراءة تقريبًا</span></div></div></section>
<section class="section-padding"><div class="container"><div class="article-layout decision-layout"><article class="article-content tawod-field-article decision-article"><div class="decision-publisher"><strong>شركة تعاود للمقاولات العامة</strong><span>دليل إرشادي للمالك • <a href="/editorial-policy/">السياسة التحريرية</a></span></div>
<figure class="decision-cover"><a href="${image}" target="_blank" rel="noopener" aria-label="تكبير صورة المشروع"><img src="${image}" width="${width}" height="${height}" loading="lazy" decoding="async" alt="${esc(article.caption)}"></a><figcaption>${esc(article.caption)} <a href="${article.project}">تفاصيل المشروع</a></figcaption></figure>
${toc}<aside class="tawod-key-takeaways"><h2>ثلاث نقاط تبدأ منها</h2><ul>${article.takeaways.map(item => `<li>${esc(item)}</li>`).join('')}</ul></aside>
${content}${faq}${cta('هل لديك سؤال عن حالة مشروعك؟', 'أرسل السؤال مع المخطط أو الصور المتاحة ووضح المرحلة الحالية. تساعد هذه المعلومات على مناقشة نطاق يخص موقعك بدل افتراض سعر أو مدة موحدة.', 'faq')}${sourceList}
<section class="decision-next"><h2>خطوتك التالية</h2><p>راجع <a href="${topic.serviceUrl}">${esc(topic.serviceLabel)}</a> و<a href="${article.project}">نموذج العمل المنشور</a>، ثم اجمع المدخلات التي تخص مشروعك وحدد ما تريد تنفيذه الآن.</p>${cta('ابدأ بمعلومات واضحة عن مشروعك', article.ctaText, 'final')}</section>
</article><aside class="article-sidebar">${related}<div class="article-cta"><h2>تابع الموضوع</h2><p>ابدأ بالدليل المناسب لمرحلة مشروعك، ثم ناقش نطاق التنفيذ عندما تكتمل المدخلات.</p><a href="${topicUrl(topic)}">كل أدلة ${esc(topic.title)}</a><a class="btn btn-primary" href="${topic.serviceUrl}">${esc(topic.serviceLabel)}</a><a href="/blog/#owner-project-guides">المقالات الخمسة الجديدة</a></div></aside></div></div></section></main>`;
  const graph = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': `${domain}/#organization`, name: 'شركة تعاود للمقاولات العامة', url: `${domain}/`, logo: `${domain}/images/logo/tawod-logo.png`, telephone: '+966551128884' },
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: article.title, description: article.description, inLanguage: 'ar-SA', mainEntity: { '@id': `${url}#article` }, breadcrumb: { '@id': `${url}#breadcrumb` } },
      { '@type': 'Article', '@id': `${url}#article`, url, headline: article.title, description: article.description, datePublished: published, dateModified: published, inLanguage: 'ar-SA', author: { '@id': `${domain}/#organization` }, publisher: { '@id': `${domain}/#organization` }, image: { '@type': 'ImageObject', url: `${domain}${image}`, width, height, caption: article.caption }, mainEntityOfPage: { '@id': `${url}#webpage` }, articleSection: topic.title, keywords: article.keyword, wordCount: words, timeRequired: `PT${minutes}M` },
      { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
        ['الرئيسية', `${domain}/`], ['المدونة', `${domain}/blog/`], [topic.title, `${domain}${topicUrl(topic)}`], [article.title, url],
      ].map(([name, item], index) => ({ '@type': 'ListItem', position: index + 1, name, item })) },
      { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: questions.map(([name, answer]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    ],
  };
  const head = `<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><meta name="theme-color" content="#1D1E26">
<title>${esc(article.seoTitle)}</title><meta name="description" content="${esc(article.description)}"><meta name="author" content="شركة تعاود للمقاولات العامة"><meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}"><link rel="alternate" hreflang="ar-SA" href="${url}"><link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="ar_SA"><meta property="og:site_name" content="شركة تعاود للمقاولات العامة"><meta property="og:title" content="${esc(article.title)}"><meta property="og:description" content="${esc(article.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${domain}${image}"><meta property="og:image:alt" content="${esc(article.caption)}"><meta property="og:image:width" content="${width}"><meta property="og:image:height" content="${height}"><meta property="article:published_time" content="${published}"><meta property="article:modified_time" content="${published}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(article.title)}"><meta name="twitter:description" content="${esc(article.description)}"><meta name="twitter:image" content="${domain}${image}"><meta name="twitter:image:alt" content="${esc(article.caption)}">
<link rel="icon" href="/images/logo/tawod-logo.png" sizes="32x32" type="image/png"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&amp;display=swap"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
${stylesheetNames.map(name => { const version = createHash('sha256').update(readFileSync(join(root, `assets/css/${name}.css`))).digest('hex').slice(0, 12); return `<link href="/assets/css/${name}.css?v=${version}" rel="stylesheet">`; }).join('\n')}
<script id="tawod-article-graph" type="application/ld+json">${JSON.stringify(graph)}</script>
${analytics}
</head>`;
  const html = template.replace(/<head>[\s\S]*?<\/head>/i, head)
    .replace(/<body\b[^>]*>/i, `<body data-article-slug="${article.slug}" data-article-topic="${topic.slug}" data-article-role="supporting" data-owner-guides="${published}">`)
    .replace(/<main id="main">[\s\S]*?<\/main>/i, main)
    .replace(/\s*<script src="\/assets\/js\/tawod-project-brief\.js" defer><\/script>/, '');
  const file = join(root, 'blog', article.slug, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`${article.slug}: ${words} authored words, ${questions.length} FAQs`);
}
