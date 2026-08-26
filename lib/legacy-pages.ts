import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix, sep } from "node:path";

const siteRoot = process.cwd();
const excludedDirectories = new Set([
  ".git",
  ".next",
  "app",
  "lib",
  "node_modules",
  "out",
  "public",
]);
const projectImageReplacements = [
  [
    "images/projects/modon-eight-warehouses-01.webp",
    "images/projects/modon-eight-warehouses-01-v3.webp",
  ],
  [
    "images/projects/modon-eight-warehouses-02.webp",
    "images/projects/modon-eight-warehouses-02-v3.webp",
  ],
] as const;

const featuredProjectsMarkup = `
<article class="project-card reveal-up active visible in-view revealed show" data-project="modon-eight-warehouses">
  <div class="card-img-wrap"><img class="card-img" src="images/projects/modon-eight-warehouses-02-v3.webp" width="360" height="480" loading="eager" decoding="async" alt="مشروع تنفيذ 8 مستودعات في المدينة الصناعية الثانية بالرياض - شركة تعاود للمقاولات"></div>
  <div class="card-body">
    <div class="project-meta"><span>مشروع صناعي</span><span>8 مستودعات</span></div>
    <h3>تنفيذ 8 مستودعات – الصناعية الثانية</h3>
    <p>تنفيذ ثمانية مستودعات على مساحة 29,122.40 م² خلال مدة زمنية قدرها 6 أشهر.</p>
    <a class="card-link" href="project-modon-eight-warehouses-riyadh.html">تفاصيل المشروع <i class="fa-solid fa-arrow-left-long"></i></a>
  </div>
</article>
<article class="project-card reveal-up active visible in-view revealed show" data-project="arouba-mosque-villas">
  <div class="card-img-wrap"><img class="card-img" src="images/projects/arouba-mosque-villas-01.webp" width="420" height="560" loading="lazy" decoding="async" alt="مشروع مسجد وفللتين سكنيتين في حي العروبة - شركة تعاود للمقاولات"></div>
  <div class="card-body">
    <div class="project-meta"><span>مسجد + فلل</span><span>تسليم مفتاح</span></div>
    <h3>مسجد وفللتان سكنيتان – حي العروبة</h3>
    <p>تنفيذ متكامل بنظام تسليم مفتاح كامل بمساحة 1800 م² خلال مدة زمنية قدرها 12 شهرًا.</p>
    <a class="card-link" href="project-arouba-mosque-villas.html">تفاصيل المشروع <i class="fa-solid fa-arrow-left-long"></i></a>
  </div>
</article>`;

function toPosixPath(value: string) {
  return value.split(sep).join(posix.sep);
}

function collectHtmlFiles(directory: string, relativeDirectory = ""): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? join(relativeDirectory, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...collectHtmlFiles(join(directory, entry.name), relativePath));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(toPosixPath(relativePath));
    }
  }

  return files.sort((a, b) => a.localeCompare(b, "en"));
}

let cachedHtmlFiles: string[] | undefined;

export function getLegacyHtmlFiles() {
  cachedHtmlFiles ??= collectHtmlFiles(siteRoot);
  return cachedHtmlFiles;
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

function enhanceLegacyHtml(relativePath: string, html: string) {
  let enhancedHtml = html;

  if (
    relativePath === "projects.html" &&
    !enhancedHtml.includes('data-project="modon-eight-warehouses"')
  ) {
    const marker = '<div class="projects-grid">';
    if (enhancedHtml.includes(marker)) {
      enhancedHtml = enhancedHtml.replace(
        marker,
        `${marker}${featuredProjectsMarkup}`,
      );
    }
  }

  return replaceProjectImageUrls(enhancedHtml);
}

export function readLegacyHtml(relativePath: string) {
  if (!getLegacyHtmlFiles().includes(relativePath)) {
    throw new Error(`Unknown legacy HTML route: ${relativePath}`);
  }

  const absolutePath = join(siteRoot, ...relativePath.split("/"));
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing legacy HTML source: ${relativePath}`);
  }

  return enhanceLegacyHtml(relativePath, readFileSync(absolutePath, "utf8"));
}

export function htmlResponse(relativePath: string) {
  return new Response(readLegacyHtml(relativePath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
