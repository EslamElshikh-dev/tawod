import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { legacyHtmlFiles, legacyHtmlHashes } from "@/lib/legacy-html-files";
import { applyContractingDesign } from './contracting-design.mjs';
import { optimizeArticleMarkup } from './article-presentation.mjs';

const siteRoot = process.cwd();
const legacyHtmlFileSet = new Set<string>(legacyHtmlFiles);
const localAssetRevisionCache = new Map<string, string>();
const projectImageReplacements = [
  [
    "images/projects/modon-eight-warehouses-01.webp",
    "images/projects/modon-eight-warehouses-01-v4.webp",
  ],
  [
    "images/projects/modon-eight-warehouses-02.webp",
    "images/projects/modon-eight-warehouses-02-v3.webp",
  ],
] as const;

const projectsShowcaseMarkup = `
<section class="tawod-projects-showcase section-padding" aria-labelledby="projects-showcase-title">
  <div class="container">
    <div class="tawod-projects-heading reveal-up">
      <div>
        <span class="eyebrow">سجل تنفيذ موثّق</span>
        <h2 id="projects-showcase-title">مشاريع حقيقية بتفاصيل واضحة</h2>
      </div>
      <p>استكشف نماذج من مشاريعنا السكنية والصناعية والمتكاملة، مع صور ميدانية ونطاق الأعمال وبيانات كل مشروع المتاحة.</p>
    </div>
    <div class="tawod-projects-grid">
<article class="tawod-project-card tawod-project-card-featured reveal-up" data-project="sahafa-villa-renovation-finishing"><a class="tawod-project-media" href="/project-sahafa-villa-renovation-finishing.html" aria-label="عرض مشروع فيلا حي الصحافة"><img class="" src="/images/projects/sahafa-villa-renovation-finishing.webp" srcset="/images/projects/sahafa-villa-renovation-finishing-768.webp 768w, /images/projects/sahafa-villa-renovation-finishing.webp 1536w" sizes="(max-width: 767px) calc(100vw - 40px), 580px" width="1536" height="1152" loading="lazy" decoding="async" alt="التشطيبات الداخلية لفيلا سكنية بحي الصحافة بالرياض من تنفيذ تعاود"><span class="tawod-project-number">01</span><span class="tawod-project-status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> مضاف حديثًا</span></a><div class="tawod-project-copy"><div class="tawod-project-tags"><span>فيلا سكنية</span><span>ترميم وتشطيب</span></div><h3><a href="/project-sahafa-villa-renovation-finishing.html">ترميم وتشطيب فيلا سكنية بحي الصحافة</a></h3><p>مشروع ترميم وتشطيب فيلا سكنية في حي الصحافة بالرياض، نفذته تعاود خلال شهر واحد. تعكس الصورة الداخلية تنسيق التشطيبات بين الأسقف والجدران والأرضيات.</p><dl class="tawod-project-facts"><div><dt>نطاق التنفيذ</dt><dd>ترميم وتشطيب</dd></div><div><dt>المدة</dt><dd>شهر واحد</dd></div><div><dt>الموقع</dt><dd>حي الصحافة، الرياض</dd></div></dl><a class="tawod-project-link" href="/project-sahafa-villa-renovation-finishing.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long" aria-hidden="true"></i></a></div></article>
<article class="tawod-project-card reveal-up" data-project="wadi-villa-construction-finishing"><a class="tawod-project-media" href="/project-wadi-villa-construction-finishing.html" aria-label="عرض مشروع فيلا حي الوادي"><img class="" src="/images/projects/wadi-villa-construction-finishing.webp" srcset="/images/projects/wadi-villa-construction-finishing-768.webp 768w, /images/projects/wadi-villa-construction-finishing.webp 1152w" sizes="(max-width: 767px) calc(100vw - 40px), 580px" width="1152" height="1536" loading="lazy" decoding="async" alt="واجهة ومدخل فيلا سكنية بحي الوادي بالرياض ضمن مشروع بناء وتشطيب من تنفيذ تعاود"><span class="tawod-project-number">02</span><span class="tawod-project-status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> مضاف حديثًا</span></a><div class="tawod-project-copy"><div class="tawod-project-tags"><span>فيلا سكنية</span><span>بناء وتشطيب</span></div><h3><a href="/project-wadi-villa-construction-finishing.html">بناء وتشطيب فيلا سكنية بحي الوادي</a></h3><p>مشروع بناء وتشطيب فيلا سكنية في حي الوادي بالرياض، من أعمال شركة تعاود للمقاولات العامة. تُظهر الصورة واجهة الفيلا ومدخلها بتفاصيل معمارية كلاسيكية.</p><dl class="tawod-project-facts"><div><dt>نطاق التنفيذ</dt><dd>بناء وتشطيب</dd></div><div><dt>الموقع</dt><dd>حي الوادي، الرياض</dd></div></dl><a class="tawod-project-link" href="/project-wadi-villa-construction-finishing.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long" aria-hidden="true"></i></a></div></article>
      <article class="tawod-project-card reveal-up" data-project="faisaliah-villa-facades-finishing">
        <a class="tawod-project-media" href="project-faisaliah-villa-facades-finishing.html" aria-label="عرض مشروع فيلا حي الفيصلية">
          <img src="images/projects/faisaliah-villa-facades-finishing-01-v3.webp" width="1152" height="1536" loading="lazy" decoding="async" alt="تنفيذ واجهات وتشطيبات فيلا سكنية في حي الفيصلية بالرياض">
          <span class="tawod-project-number">03</span>
        </a>
        <div class="tawod-project-copy">
          <div class="tawod-project-tags"><span>فيلا سكنية</span><span>واجهات وتشطيبات</span></div>
          <h3><a href="project-faisaliah-villa-facades-finishing.html">فيلا سكنية | حي الفيصلية</a></h3>
          <p>تنفيذ الواجهات واللياسة والرخام والسيراميك الداخلي والخارجي ضمن برنامج تنفيذي واضح.</p>
          <dl class="tawod-project-facts"><div><dt>المساحة</dt><dd>900 م²</dd></div><div><dt>المدة</dt><dd>شهران</dd></div><div><dt>الموقع</dt><dd>الرياض</dd></div></dl>
          <a class="tawod-project-link" href="project-faisaliah-villa-facades-finishing.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long"></i></a>
        </div>
      </article>
      <article class="tawod-project-card reveal-up" data-project="villa-plaster-ceramic-marble-uhud-riyadh">
        <a class="tawod-project-media" href="project-villa-plaster-ceramic-marble-uhud-riyadh.html"><img src="images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp" width="480" height="640" loading="lazy" decoding="async" alt="تشطيب فيلا سكنية في حي أحد بالرياض"><span class="tawod-project-number">04</span></a>
        <div class="tawod-project-copy"><div class="tawod-project-tags"><span>فيلا سكنية</span><span>تشطيبات</span></div><h3><a href="project-villa-plaster-ceramic-marble-uhud-riyadh.html">فيلا سكنية | حي أحد</a></h3><p>لياسة داخلية وخارجية وقروفات وسيراميك ورخام لمساحة 700 م².</p><dl class="tawod-project-facts"><div><dt>المساحة</dt><dd>700 م²</dd></div><div><dt>المدة</dt><dd>3 أشهر</dd></div></dl><a class="tawod-project-link" href="project-villa-plaster-ceramic-marble-uhud-riyadh.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>
      </article>
      <article class="tawod-project-card reveal-up delay-100" data-project="alrajhi-tanks-king-salman-park">
        <a class="tawod-project-media" href="project-alrajhi-tanks-king-salman-park.html"><img src="images/projects/alrajhi-tanks-king-salman-park-01.webp" width="480" height="640" loading="lazy" decoding="async" alt="حدادة وعزل خزانات في حديقة الملك سلمان بالرياض"><span class="tawod-project-number">05</span></a>
        <div class="tawod-project-copy"><div class="tawod-project-tags"><span>خزانات</span><span>حدادة وعزل</span></div><h3><a href="project-alrajhi-tanks-king-salman-park.html">خزانات حديقة الملك سلمان</a></h3><p>أعمال حدادة وعزل لخزانات ضمن مشروع شركة الراجحي للبناء والتعمير.</p><dl class="tawod-project-facts"><div><dt>المساحة</dt><dd>119 م²</dd></div><div><dt>المدة</dt><dd>أسبوعان</dd></div></dl><a class="tawod-project-link" href="project-alrajhi-tanks-king-salman-park.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>
      </article>
      <article class="tawod-project-card reveal-up" data-project="modon-eight-warehouses">
        <a class="tawod-project-media" href="project-modon-eight-warehouses-riyadh.html"><img src="images/projects/modon-eight-warehouses-01-v4.webp" width="1200" height="1596" loading="lazy" decoding="async" alt="تنفيذ ثمانية مستودعات في المدينة الصناعية الثانية بالرياض"><span class="tawod-project-number">06</span></a>
        <div class="tawod-project-copy"><div class="tawod-project-tags"><span>مشروع صناعي</span><span>8 مستودعات</span></div><h3><a href="project-modon-eight-warehouses-riyadh.html">مستودعات الصناعية الثانية</a></h3><p>تنفيذ ثمانية مستودعات ضمن موقع صناعي واحد وبرنامج عمل متزامن.</p><dl class="tawod-project-facts"><div><dt>المساحة</dt><dd>29,122 م²</dd></div><div><dt>المدة</dt><dd>6 أشهر</dd></div></dl><a class="tawod-project-link" href="project-modon-eight-warehouses-riyadh.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>
      </article>
      <article class="tawod-project-card reveal-up delay-100" data-project="arouba-mosque-villas">
        <a class="tawod-project-media" href="project-arouba-mosque-villas.html"><img src="images/projects/arouba-mosque-villas-01.webp" width="420" height="560" loading="lazy" decoding="async" alt="مشروع مسجد و٢ فيلا في حي العروبة"><span class="tawod-project-number">07</span></a>
        <div class="tawod-project-copy"><div class="tawod-project-tags"><span>مسجد وفلل</span><span>تسليم مفتاح</span></div><h3><a href="project-arouba-mosque-villas.html">مسجد و ٢ فيلا | حي العروبة</a></h3><p>تنفيذ متكامل بنظام تسليم مفتاح لمسجد و٢ فيلا ضمن نطاق موحد.</p><dl class="tawod-project-facts"><div><dt>المساحة</dt><dd>1,800 م²</dd></div><div><dt>المدة</dt><dd>12 شهرًا</dd></div></dl><a class="tawod-project-link" href="project-arouba-mosque-villas.html">استكشف المشروع <i class="fa-solid fa-arrow-left-long"></i></a></div>
      </article>
    </div>
  </div>
</section>`;

export function getLegacyHtmlFiles() {
  return legacyHtmlFiles;
}

export function getRoutedLegacyHtmlFiles() {
  return getLegacyHtmlFiles().filter(
    (file) => file !== "index.html" && file !== "404.html",
  );
}

function replaceProjectImageUrls(html: string) {
  return projectImageReplacements.reduce(
    (result, [source, target]) => result.replaceAll(source, target),
    html,
  );
}

function normalizeInternalHomepageLinks(html: string) {
  return html
    .replace(/href="(?:\.\.\/)*index\.html(?=[#"])/gi, 'href="/')
    .replace(/href='(?:\.\.\/)*index\.html(?=[#'])/gi, "href='/");
}

function versionLocalAssets(html: string) {
  return html.replace(
    /((?:(?:\.\.\/)*|\/)assets\/(css|js)\/([a-zA-Z0-9._-]+\.(?:css|js)))(?:\?v=[^"'\s>]*)?/g,
    (match, url: string, assetType: string, fileName: string) => {
      const relativeAssetPath = `assets/${assetType}/${fileName}`;
      const absoluteAssetPath = join(siteRoot, ...relativeAssetPath.split("/"));
      if (!existsSync(absoluteAssetPath)) return match;
      let revision = localAssetRevisionCache.get(relativeAssetPath);
      if (!revision) {
        revision = createHash("sha256")
          .update(readFileSync(absoluteAssetPath))
          .digest("hex")
          .slice(0, 12);
        localAssetRevisionCache.set(relativeAssetPath, revision);
      }
      return `${url}?v=${revision}`;
    },
  );
}

function optimizeFontLoading(html: string) {
  if (!/assets\/css\/(?:tawod-system|tawod-home-performance)\.css/i.test(html)) {
    return html;
  }
  let optimizedHtml = html
    .replace(/\s*<link\b[^>]*href=["']https:\/\/fonts\.googleapis\.com[^"']*["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<link\b[^>]*href=["']https:\/\/fonts\.gstatic\.com[^"']*["'][^>]*>\s*/gi, "\n");
  if (!/rel=["']preload["'][^>]*alexandria-arabic-variable\.woff2/i.test(optimizedHtml)) {
    optimizedHtml = optimizedHtml.replace(
      /(<link\b[^>]*rel=["']stylesheet["'][^>]*>)/i,
      '<link rel="preload" href="/assets/fonts/alexandria-arabic-variable.woff2" as="font" type="font/woff2" crossorigin>\n$1',
    );
  }
  return optimizedHtml;
}

function isBlogArticle(relativePath: string) {
  return /(?:^|\/)blog\/(?!page\/|topics\/)[^/]+\/index\.html$/.test(relativePath);
}


function normalizeProjectPresentation(relativePath: string, html: string) {
  if (relativePath === "project-modon-eight-warehouses-riyadh.html") {
    // Lead with the large retained photograph; keep the small steel-frame
    // photograph in the gallery at its native size.
    html = html.replace(/<img\b(?=[^>]*\bsrc="images\/projects\/modon-eight-warehouses-02-v3\.webp")(?=[^>]*\bloading="eager")[^>]*>/i,
      tag => tag.replace("modon-eight-warehouses-02-v3.webp", "modon-eight-warehouses-01-v4.webp")
        .replace(/\balt="[^"]*"/i, 'alt="تجهيز وعزل القواعد الخرسانية لمشروع 8 مستودعات في المدينة الصناعية الثانية بالرياض"'));
  }
  if (relativePath === "index.html") {
    return html.replaceAll(
      ">فيلا حي الفيصلية<",
      ">فيلا سكنية | حي الفيصلية<",
    );
  }

  let normalizedHtml = html
    .replaceAll("فيلا سكنية – حي الفيصلية", "فيلا سكنية | حي الفيصلية")
    .replaceAll("فيلا سكنية – حي أحد", "فيلا سكنية | حي أحد")
    .replaceAll(
      "خزان مياه وأعمال عزل – حديقة الملك سلمان",
      "خزان مياه وأعمال عزل | حديقة الملك سلمان",
    )
    .replaceAll(
      "٨ مستودعات – المدينة الصناعية الثانية بالرياض",
      "٨ مستودعات | المدينة الصناعية الثانية بالرياض",
    )
    .replaceAll(
      "٨ مستودعات – المدينة الصناعية الثانية",
      "٨ مستودعات | المدينة الصناعية الثانية",
    )
    .replaceAll("مسجد وفللتان – حي العروبة", "مسجد و ٢ فيلا | حي العروبة");

  if (relativePath === "project-arouba-mosque-villas.html") {
    normalizedHtml = normalizedHtml
      .replaceAll("مسجد وفللتين سكنيتين", "مسجد و ٢ فيلا سكنية")
      .replaceAll("مسجد وفللتين", "مسجد و ٢ فيلا")
      .replaceAll("مسجد وفللتان", "مسجد و ٢ فيلا");
  }

  return normalizedHtml;
}

function enhanceLegacyHtml(relativePath: string, html: string) {
  let enhancedHtml = html;

  if (relativePath === "projects.html") {
    enhancedHtml = enhancedHtml
      .replace(
        /(<link href="assets\/css\/tawod-system\.css(?:\?[^\"]*)?" rel="stylesheet">)/,
        '$1<link href="assets/css/tawod-projects-showcase.css?v=20260827-1" rel="stylesheet">',
      )
      .replace("<body>", '<body class="projects-page">')
      .replace(
        /<section class="page-hero">[\s\S]*?<\/section>/,
        `<section class="page-hero tawod-projects-hero"><div class="container"><div class="tawod-projects-hero-copy reveal-up"><div class="breadcrumbs"><a href="index.html">الرئيسية</a><i class="fa-solid fa-chevron-left"></i><span>مشاريعنا</span></div><span class="tawod-projects-kicker"><i class="fa-solid fa-helmet-safety"></i> سجل تنفيذ حقيقي</span><h1>مشاريع تتحدث بلغة الإنجاز</h1><p>نماذج موثقة من أعمال شركة تعاود للمقاولات في المشاريع السكنية والصناعية والمتكاملة داخل الرياض.</p><div class="hero-actions"><a class="btn btn-primary" href="#projects-showcase-title">استكشف المشاريع</a><a class="btn btn-outline-white" href="contact.html">ناقش مشروعك</a></div><div class="tawod-projects-proof" aria-label="مزايا عرض المشاريع"><span><i class="fa-solid fa-camera"></i> صور ميدانية</span><span><i class="fa-solid fa-list-check"></i> نطاق واضح</span><span><i class="fa-regular fa-clock"></i> مدة تنفيذ</span></div></div></div></section>`,
      )
      .replace(
        /<section class="section-padding"><div class="container"><div class="projects-grid">[\s\S]*?<\/section>/,
        projectsShowcaseMarkup,
      );
  }

  return versionLocalAssets(
    applyContractingDesign(relativePath, optimizeFontLoading(
      optimizeArticleMarkup(
        relativePath,
        normalizeInternalHomepageLinks(
          normalizeProjectPresentation(
            relativePath,
            replaceProjectImageUrls(enhancedHtml),
          ),
        ),
      ),
    )),
  );
}

export function readLegacyHtml(relativePath: string) {
  if (!legacyHtmlFileSet.has(relativePath)) {
    throw new Error(`Unknown legacy HTML route: ${relativePath}`);
  }

  const absolutePath = join(siteRoot, ...relativePath.split("/"));
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing legacy HTML source: ${relativePath}`);
  }
  const source = readFileSync(absolutePath, "utf8");
  const actualHash = createHash("sha256").update(source).digest("hex");
  const expectedHash = legacyHtmlHashes[relativePath as keyof typeof legacyHtmlHashes];
  if (actualHash !== expectedHash) {
    throw new Error(`Stale legacy HTML manifest entry: ${relativePath}`);
  }
  return enhanceLegacyHtml(relativePath, source);
}

export function htmlResponse(relativePath: string) {
  return new Response(readLegacyHtml(relativePath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
