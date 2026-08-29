import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const outputDirectory = join(root, "out");
const vercelConfig = JSON.parse(
  readFileSync(join(root, "vercel.json"), "utf8"),
);
const excludedDirectories = new Set([
  ".git",
  ".next",
  "app",
  "lib",
  "node_modules",
  "out",
  "project-pages",
  "public",
]);
const intentionalHtmlTransforms = new Map([
  ["index.html", [">فيلا سكنية | حي الفيصلية<"]],
  [
    "projects.html",
    [
      'href="assets/css/tawod-projects-showcase.css?v=',
      'data-project="faisaliah-villa-facades-finishing"',
      'data-project="villa-plaster-ceramic-marble-uhud-riyadh"',
      'data-project="alrajhi-tanks-king-salman-park"',
      'data-project="modon-eight-warehouses"',
      'data-project="arouba-mosque-villas"',
      'href="project-faisaliah-villa-facades-finishing.html"',
      'href="project-villa-plaster-ceramic-marble-uhud-riyadh.html"',
      'href="project-alrajhi-tanks-king-salman-park.html"',
      'href="project-modon-eight-warehouses-riyadh.html"',
      'href="project-arouba-mosque-villas.html"',
      'src="images/projects/faisaliah-villa-facades-finishing-01-v3.webp"',
      'src="images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp"',
      'src="images/projects/alrajhi-tanks-king-salman-park-01.webp"',
      'src="images/projects/modon-eight-warehouses-02-v3.webp"',
      "فيلا سكنية | حي الفيصلية",
      "فيلا سكنية | حي أحد",
      "مسجد و ٢ فيلا | حي العروبة",
    ],
  ],
  ["project-faisaliah-villa-facades-finishing.html", ["فيلا سكنية | حي الفيصلية"]],
  ["project-villa-plaster-ceramic-marble-uhud-riyadh.html", ["فيلا سكنية | حي أحد"]],
  ["project-arouba-mosque-villas.html", ["حي العروبة", "مسجد و ٢ فيلا"]],
  [
    "project-modon-eight-warehouses-riyadh.html",
    [
      "images/projects/modon-eight-warehouses-01-v3.webp",
      "images/projects/modon-eight-warehouses-02-v3.webp",
    ],
  ],
]);

function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...collectHtmlFiles(join(directory, entry.name)));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

function normalizeInternalHomepageLinks(html) {
  return html
    .replace(/href="(?:\.\.\/)*index\.html(?=[#"])/gi, 'href="/')
    .replace(/href='(?:\.\.\/)*index\.html(?=[#'])/gi, "href='/");
}

const localAssetRevisionCache = new Map();

function versionLocalAssets(html) {
  return html.replace(
    /((?:(?:\.\.\/)*|\/)assets\/(css|js)\/([a-zA-Z0-9._-]+\.(?:css|js)))(?:\?v=[^"'\s>]*)?/g,
    (match, url, assetType, fileName) => {
      const relativeAssetPath = `assets/${assetType}/${fileName}`;
      const absoluteAssetPath = join(root, relativeAssetPath);
      if (!existsSync(absoluteAssetPath)) return match;
      let revision = localAssetRevisionCache.get(relativeAssetPath);
      if (!revision) {
        revision = createHash("sha256").update(readFileSync(absoluteAssetPath)).digest("hex").slice(0, 12);
        localAssetRevisionCache.set(relativeAssetPath, revision);
      }
      return `${url}?v=${revision}`;
    },
  );
}

function optimizeFontLoading(html) {
  if (!/assets\/css\/(?:tawod-system|tawod-home-performance)\.css/i.test(html)) return html;
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

function isBlogArticle(relativePath) {
  return /(?:^|\/)blog\/(?!page\/|topics\/)[^/]+\/index\.html$/.test(relativePath);
}

function optimizeArticleMarkup(relativePath, html) {
  if (!isBlogArticle(relativePath)) return html;
  let optimizedHtml = html.replace(
    /(<article\b[^>]*\bclass=(["']))([^"']*\barticle-content\b[^"']*)(\2[^>]*>)/i,
    (match, start, quote, classes, end) => `${start}${classes.split(/\s+/).filter((name) => name && name !== "reveal-up").join(" ")}${end}`,
  );
  optimizedHtml = optimizedHtml.replace(
    /(<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>[\s\S]*?<img\b)([^>]*)(>)/i,
    (match, start, attributes, end) => {
      const optimizedAttributes = attributes
        .replace(/\s+loading=["'][^"']*["']/i, "")
        .replace(/\s+fetchpriority=["'][^"']*["']/i, "")
        .replace(/\s+decoding=["'][^"']*["']/i, "");
      return `${start}${optimizedAttributes} loading="lazy" decoding="async" fetchpriority="low"${end}`;
    },
  );
  return optimizedHtml;
}

function expectedExportHtml(relativePath, html) {
  if (relativePath === "404.html") return normalizeInternalHomepageLinks(html);
  return versionLocalAssets(
    optimizeFontLoading(
      optimizeArticleMarkup(relativePath, normalizeInternalHomepageLinks(html)),
    ),
  );
}

if (!existsSync(outputDirectory)) {
  throw new Error("Run npm run build before verifying the export.");
}

const sourceFiles = collectHtmlFiles(root);
const mismatches = [];

if (vercelConfig.buildCommand !== "npm run build") {
  mismatches.push("vercel.json: buildCommand must run the verified Next.js build");
}
if (vercelConfig.outputDirectory !== "out") {
  mismatches.push("vercel.json: outputDirectory must publish the verified out directory");
}

for (const sourceFile of sourceFiles) {
  const relativePath = relative(root, sourceFile).split(sep).join("/");
  const outputFile = join(outputDirectory, ...relativePath.split("/"));

  if (!existsSync(outputFile)) {
    mismatches.push(`${relativePath}: missing from out`);
    continue;
  }

  const sourceHtml = expectedExportHtml(relativePath, readFileSync(sourceFile, "utf8"));
  const outputHtml = readFileSync(outputFile, "utf8");

  if (/href=["'](?:\.\.\/)*index\.html(?:[#?][^"']*)?["']/i.test(outputHtml)) {
    mismatches.push(`${relativePath}: exported HTML still links to index.html`);
  }

  if (isBlogArticle(relativePath)) {
    if (/<article\b[^>]*class=["'][^"']*\barticle-content\b[^"']*\breveal-up\b/i.test(outputHtml)) {
      mismatches.push(`${relativePath}: article content can still be hidden by reveal animation`);
    }
    const cover = outputHtml.match(/<article\b[^>]*class=["'][^"']*\barticle-content\b[^"']*["'][^>]*>[\s\S]*?<img\b([^>]*)>/i)?.[1] || "";
    if (cover && (!/loading=["']lazy["']/i.test(cover) || !/fetchpriority=["']low["']/i.test(cover))) {
      mismatches.push(`${relativePath}: article cover does not use low-priority lazy loading`);
    }
  }

  if (sourceHtml === outputHtml) continue;

  const expectedMarkers = intentionalHtmlTransforms.get(relativePath);
  if (expectedMarkers) {
    for (const marker of expectedMarkers) {
      if (!outputHtml.includes(marker)) {
        mismatches.push(`${relativePath}: expected generated marker missing: ${marker}`);
      }
    }
    continue;
  }

  mismatches.push(`${relativePath}: exported bytes differ from source`);
}

for (const relativePath of [
  "assets/css/tawod-system.css",
  "assets/css/tawod-project-case.css",
  "assets/css/tawod-projects-showcase.css",
  "assets/js/tawod-analytics.js",
  "images/logo/tawod-logo.png",
  "images/projects/faisaliah-villa-facades-finishing-01-v3.webp",
  "images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp",
  "images/projects/alrajhi-tanks-king-salman-park-01.webp",
  "images/projects/modon-eight-warehouses-01-v3.webp",
  "images/projects/modon-eight-warehouses-02-v3.webp",
  "maintenance/assets/css/maintenance.css",
  "robots.txt",
  "sitemap.xml",
  "sitemap-projects.xml",
]) {
  const sourceFile = join(root, relativePath);
  const outputFile = join(outputDirectory, relativePath);
  if (!existsSync(outputFile)) {
    mismatches.push(`${relativePath}: static asset missing from out`);
    continue;
  }
  if (!readFileSync(sourceFile).equals(readFileSync(outputFile))) {
    mismatches.push(`${relativePath}: exported asset differs from source`);
  }
}

if (mismatches.length) {
  throw new Error(`Next.js export parity failed:\n${mismatches.join("\n")}`);
}

console.log(`Verified ${sourceFiles.length} HTML pages, intentional project-image/title transforms, and critical static assets.`);
