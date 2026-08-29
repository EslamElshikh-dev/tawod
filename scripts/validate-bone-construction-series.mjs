import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { articles, newArticleSlugs } from "./bone-construction-series-2026-08-29.mjs";

const root = process.cwd();
const errors = [];
const domain = "https://tawodco.com";
const pillarSlug = "bone-construction-riyadh-guide";
const hubUrl = "/blog/topics/bone-construction/";
const serviceUrl = "/service-construction.html";
const projectUrl = "/project-arouba-mosque-villas.html";
const expectedIntents = new Map([
  [pillarSlug, "بناء عظم بالرياض"],
  ["bone-construction-company-vs-contractor-riyadh", "شركة بناء عظم أم مقاول بناء عظم"],
  ["bone-construction-contract-riyadh", "عقد بناء عظم"],
  ["bone-construction-quote-request-riyadh", "طلب عرض سعر بناء عظم"],
  ["bone-construction-execution-plan-riyadh", "خطة تنفيذ بناء العظم"],
]);

function plainText(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function metaContent(html, name, attribute = "name") {
  return html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(name)}["'])[^>]*\\bcontent=["']([^"']+)["'][^>]*>`, "i"))?.[1] || "";
}

function schemaCount(value, type) {
  if (!value || typeof value !== "object") return 0;
  let count = value["@type"] === type ? 1 : 0;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) count += child.reduce((sum, item) => sum + schemaCount(item, type), 0);
    else count += schemaCount(child, type);
  }
  return count;
}

function articleEntityCount(html) {
  let count = 0;
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      count += schemaCount(JSON.parse(match[1]), "Article") + schemaCount(JSON.parse(match[1]), "BlogPosting");
    } catch (error) {
      errors.push(`Invalid JSON-LD in bone series: ${error.message}`);
    }
  }
  return count;
}

const dataSlugs = articles.map((article) => article.slug);
if (articles.length !== 5) errors.push(`Expected five series pages including the refreshed pillar, found ${articles.length}`);
if (newArticleSlugs.length !== 4) errors.push(`Expected four new supporting articles, found ${newArticleSlugs.length}`);
if (new Set(dataSlugs).size !== dataSlugs.length) errors.push("Series data contains duplicate slugs");
if (new Set(articles.map((article) => article.title)).size !== articles.length) errors.push("Series data contains duplicate H1 titles");
if (new Set(articles.map((article) => article.seoTitle)).size !== articles.length) errors.push("Series data contains duplicate SEO titles");
for (const article of articles) {
  const expectedIntent = expectedIntents.get(article.slug);
  if (!expectedIntent || !article.title.includes(expectedIntent)) errors.push(`${article.slug}: title does not express its assigned intent (${expectedIntent || "missing"})`);
  if (/عضم|\bافضل\b/.test(`${article.title} ${article.seoTitle} ${article.description}`)) errors.push(`${article.slug}: typo variant leaked into title or description`);
  if (article.sections.length < 7) errors.push(`${article.slug}: fewer than seven authored sections`);
  if (article.faqs.length < 6) errors.push(`${article.slug}: fewer than six authored FAQs`);
}

const typoArticles = articles.filter((article) => plainText(JSON.stringify(article)).includes("شركة بناء عضم"));
if (typoArticles.length !== 1 || typoArticles[0]?.slug !== pillarSlug) errors.push("The عضم typo must be explained only on the pillar, never targeted with a separate page");

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const hub = readFileSync(join(root, "blog", "topics", "bone-construction", "index.html"), "utf8");
const service = readFileSync(join(root, "service-construction.html"), "utf8");
const project = readFileSync(join(root, "project-arouba-mosque-villas.html"), "utf8");
const archiveFiles = [join(root, "blog", "index.html")];
const pagesRoot = join(root, "blog", "page");
if (existsSync(pagesRoot)) {
  for (const entry of readdirSync(pagesRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(join(pagesRoot, entry.name, "index.html"))) archiveFiles.push(join(pagesRoot, entry.name, "index.html"));
  }
}
const archive = archiveFiles.map((file) => readFileSync(file, "utf8")).join("\n");

for (const article of articles) {
  const file = join(root, "blog", article.slug, "index.html");
  if (!existsSync(file)) {
    errors.push(`${article.slug}: generated page missing`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const head = html.split("</head>", 1)[0];
  const title = plainText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const h1 = plainText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const description = metaContent(head, "description");
  const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
  const articleBody = html.match(/<article[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  const wordCount = plainText(articleBody).split(/\s+/).filter(Boolean).length;
  const faqCount = (html.match(/class=["'][^"']*faq-item[^"']*["']/g) || []).length;

  if (title !== article.seoTitle) errors.push(`${article.slug}: unexpected SEO title (${title})`);
  if (h1 !== article.title) errors.push(`${article.slug}: unexpected H1 (${h1})`);
  if (description !== article.description) errors.push(`${article.slug}: meta description drifted from source data`);
  if (canonical !== `${domain}/blog/${article.slug}/`) errors.push(`${article.slug}: canonical mismatch (${canonical})`);
  if (!/name=["']robots["'][^>]*content=["'][^"']*index/i.test(head)) errors.push(`${article.slug}: indexable robots directive missing`);
  if (/عضم|\bافضل\b/.test(`${title} ${h1} ${description}`)) errors.push(`${article.slug}: typo variant appears in a primary SEO field`);
  if (wordCount < 900) errors.push(`${article.slug}: article body is thin at ${wordCount} words`);
  if (faqCount !== article.faqs.length) errors.push(`${article.slug}: expected ${article.faqs.length} authored FAQs, found ${faqCount}`);
  if (!html.includes("TAWOD_AUTHORED_FAQ_START")) errors.push(`${article.slug}: authored FAQ marker missing`);
  for (const [question, answer] of article.faqs) {
    if (!html.includes(question)) errors.push(`${article.slug}: authored FAQ question missing (${question})`);
    if (!html.includes(answer)) errors.push(`${article.slug}: authored FAQ answer missing (${question})`);
  }
  if (!html.includes(`href="${hubUrl}"`)) errors.push(`${article.slug}: topic hub link missing`);
  if (!html.includes(`href="${serviceUrl}"`)) errors.push(`${article.slug}: service link missing`);
  if (!html.includes(`href="${projectUrl}"`)) errors.push(`${article.slug}: project evidence link missing`);
  if (!html.includes('/contact.html')) errors.push(`${article.slug}: conversion link missing`);
  if (article.slug !== pillarSlug && !html.includes(`/blog/${pillarSlug}/`)) errors.push(`${article.slug}: pillar link missing`);
  if (!html.includes(`data-article-topic="bone-construction"`)) errors.push(`${article.slug}: bone-construction analytics topic missing`);
  if (articleEntityCount(html) !== 1) errors.push(`${article.slug}: expected exactly one Article entity`);
  if (!head.includes(`property="og:image:width"`) || !head.includes(`property="og:image:height"`)) errors.push(`${article.slug}: explicit OG image dimensions missing`);
  const sitemapCount = (sitemap.match(new RegExp(`<loc>${escapeRegExp(domain)}/blog/${escapeRegExp(article.slug)}/</loc>`, "g")) || []).length;
  if (sitemapCount !== 1) errors.push(`${article.slug}: expected one sitemap entry, found ${sitemapCount}`);
  if (!hub.includes(`/blog/${article.slug}/`)) errors.push(`${article.slug}: missing from bone-construction hub`);
  if (!archive.includes(`/blog/${article.slug}/`)) errors.push(`${article.slug}: missing from paginated archive`);
}

for (const slug of [pillarSlug, "bone-construction-quote-request-riyadh", "bone-construction-contract-riyadh", "bone-construction-execution-plan-riyadh"]) {
  if (!service.includes(`/blog/${slug}/`)) errors.push(`service-construction.html: curated link missing for ${slug}`);
}
for (const slug of [pillarSlug, "bone-construction-execution-plan-riyadh"]) {
  if (!project.includes(`blog/${slug}/`)) errors.push(`project-arouba-mosque-villas.html: reverse article link missing for ${slug}`);
}

if (errors.length) {
  console.error(`Bone-construction series validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`Validated one refreshed pillar and ${newArticleSlugs.length} new bone-construction articles: unique intent, 900+ words, internal links, schema, OG images, archive, hub, service, project and sitemap.`);
