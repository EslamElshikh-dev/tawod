import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pages = new Map([
  ['service-construction.html', 'construction'], ['service-turnkey.html', 'turnkey'],
  ['service-restoration.html', 'restoration'], ['service-finishing.html', 'finishing'],
  ['service-decor.html', 'decor'], ['service-mep.html', 'mep'], ['contact.html', null]
]);

const buildServices = new Map([
  ['construction', {
    heading: 'بناء العظم والإنشاءات في الرياض',
    breadcrumb: 'البناء والإنشاءات',
    intro: 'تعاود للمقاولات تنفذ بناء العظم للفلل والملاحق والمباني السكنية والتجارية في الرياض. ناقش نطاق البناء والمواد والمصنعية ومراحل التنفيذ قبل طلب العرض.',
    scope: ['بناء عظم', 'فلل وملاحق', 'مشاريع سكنية وتجارية'],
    message: 'السلام عليكم، أريد مناقشة مشروع بناء عظم في الرياض. الحي: …، نوع المشروع: …، المساحة التقريبية: …، حالة المخططات: …',
    alternative: 'تحتاج البناء مع التشطيب؟ تعرف على تسليم المفتاح',
    alternativeUrl: 'service-turnkey.html',
    callLabel: 'اتصل لمناقشة البناء',
  }],
  ['turnkey', {
    heading: 'تسليم مفتاح للمشاريع السكنية والتجارية في الرياض',
    breadcrumb: 'تسليم مفتاح',
    intro: 'جهة واحدة لتنسيق البناء والتشطيب والتجهيزات في مشروعك بالرياض، وفق البنود المتفق عليها. أرسل تفاصيل المشروع ومستوى التشطيب المطلوب لتحديد النطاق والمشمول والمستثنى.',
    scope: ['بناء وتشطيب', 'فلل وملاحق', 'محلات ومكاتب'],
    message: 'السلام عليكم، أريد مناقشة مشروع تسليم مفتاح في الرياض. الحي: …، نوع المشروع: …، المساحة التقريبية: …، مستوى التشطيب المطلوب: …',
    alternative: 'تحتاج الهيكل الإنشائي فقط؟ تعرف على بناء العظم',
    alternativeUrl: 'service-construction.html',
    callLabel: 'اتصل لمناقشة تسليم المفتاح',
  }],
]);

function improveBuildContact(html, service) {
  const copy = buildServices.get(service);
  if (!copy) return html;
  html = html.replace(/<body\b[^>]*>/i, tag => {
    if (/\btawod-paid-build\b/.test(tag)) return tag;
    return /\bclass=["']/.test(tag)
      ? tag.replace(/\bclass=(["'])([^"']*)\1/, (_, quote, classes) => `class=${quote}${classes} tawod-paid-build${quote}`)
      : tag.replace(/>$/, ' class="tawod-paid-build">');
  });
  html = html.replace(/<link\b[^>]*href=["'][^"']*tawod-paid-build\.css[^"']*["'][^>]*>\s*/gi, '');
  html = html.replace(/<!-- TAWOD_ANALYTICS_START -->|<\/head>/i, marker => '<link rel="stylesheet" href="/assets/css/tawod-paid-build.css?v=20261004-1">' + marker);
  const hero = `<section class="page-hero"><div class="container reveal-up"><div class="breadcrumbs"><a href="index.html">الرئيسية</a><i class="fa-solid fa-chevron-left"></i><span>${copy.breadcrumb}</span></div><h1>${copy.heading}</h1><p>${copy.intro}</p><ul class="tawod-build-scope" aria-label="نطاق الخدمة">${copy.scope.map(item => `<li>${item}</li>`).join('')}</ul><div class="hero-actions"><a class="btn btn-primary" href="tel:0551128884">${copy.callLabel} <span dir="ltr">0551128884</span></a><a class="btn btn-whatsapp" href="https://wa.me/966551128884?text=${encodeURIComponent(copy.message)}">أرسل تفاصيلك واتساب</a><a class="btn btn-outline tawod-build-request" href="contact.html?service=${service}#form">طلب عرض للمشروع</a></div><p class="tawod-build-contact-note">يساعدنا اسم الحي ونوع المشروع والمساحة التقريبية على فهم طلبك. أرسل المخططات إن توفرت؛ أو تواصل لمناقشة المرحلة الحالية.</p><a class="tawod-build-alternative" href="${copy.alternativeUrl}">${copy.alternative}</a></div></section>`;
  return html.replace(/<section\b[^>]*class=["'][^"']*\bpage-hero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i, hero);
}

export function optimizePaidServicePage(before, file) {
  if (!pages.has(file)) return before;
  const service = pages.get(file);
  // The live light redesign owns hero presentation; remove the superseded
  // background/preload block so these pages do not download an unused image.
  let html = before.replace(/<!-- TAWOD_SERVICE_PERFORMANCE_START -->[\s\S]*?<!-- TAWOD_SERVICE_PERFORMANCE_END -->/g, '');
  html = html.replace(/<img\b[^>]*\bsrc=["'](?:\/)?images\/logo\/tawod-logo\.png["'][^>]*>/gi, tag =>
    tag.replace(/src=["'][^"']*["']/i, 'src="/images/logo/tawod-logo-180.webp"')
      .replace(/\swidth=["'][^"']*["']/i, '').replace(/\sheight=["'][^"']*["']/i, '')
      .replace(/>$/, ' width="180" height="80">'));
  if (service) html = html.replace(/href=["']contact\.html(?:#form)?["']/g, 'href="contact.html?service=' + service + '#form"');
  return improveBuildContact(html, service);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let changed = 0;
  for (const file of pages.keys()) {
    const before = fs.readFileSync(file, 'utf8');
    const html = optimizePaidServicePage(before, file);
    if (html !== before) { fs.writeFileSync(file, html); changed++; }
  }
  console.log('Updated service performance and request context on ' + changed + ' pages.');
}
