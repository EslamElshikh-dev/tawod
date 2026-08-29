import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { articles, newArticleSlugs, refreshedArticleSlugs } from "./bone-construction-decision-guides-2026-08-29.mjs";

const root = process.cwd();
const domain = "https://tawodco.com";
const pillarSlug = "bone-construction-riyadh-guide";
const errors = [];
const expectedIntents = new Map([
  ["bone-construction-cost-riyadh", "تكلفة بناء العظم"],
  ["bone-construction-duration-riyadh", "مدة بناء العظم"],
  ["bone-construction-mistakes-riyadh", "أخطاء بناء العظم"],
  ["bone-construction-handover-riyadh", "استلام بناء العظم"],
  ["bone-construction-quality-checklist-riyadh", "جودة بناء العظم"],
  ["bone-construction-concrete-quality-riyadh", "خرسانة بناء العظم"],
  ["bone-construction-payment-schedule-riyadh", "جدول دفعات بناء العظم"],
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
      const schema = JSON.parse(match[1]);
      count += schemaCount(schema, "Article") + schemaCount(schema, "BlogPosting");
    } catch (error) {
      errors.push(`Invalid JSON-LD: ${error.message}`);
    }
  }
  return count;
}

function tokenSet(article) {
  const text = plainText(JSON.stringify({ title: article.title, intro: article.intro, sections: article.sections, conclusion: article.conclusion }))
    .replace(/[،؛:؟.!«»()]/g, " ");
  return new Set(text.split(/\s+/).filter((word) => word.length > 3));
}

function jaccard(a, b) {
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}

if (articles.length !== 7) errors.push(`Expected seven decision guides, found ${articles.length}`);
if (newArticleSlugs.length !== 6) errors.push(`Expected six new articles, found ${newArticleSlugs.length}`);
if (refreshedArticleSlugs.length !== 1 || refreshedArticleSlugs[0] !== "bone-construction-quality-checklist-riyadh") errors.push("Expected the quality checklist to be the only refreshed article");
if (new Set(articles.map((article) => article.slug)).size !== articles.length) errors.push("Duplicate batch slugs");
if (new Set(articles.map((article) => article.title)).size !== articles.length) errors.push("Duplicate batch H1 titles");
if (new Set(articles.map((article) => article.description)).size !== articles.length) errors.push("Duplicate batch descriptions");
if (new Set(articles.map((article) => article.image)).size !== articles.length) errors.push("Each decision guide must have a distinct featured image");

for (const article of articles) {
  const intent = expectedIntents.get(article.slug);
  if (!intent || !`${article.title} ${article.keywords.join(" ")}`.includes(intent)) errors.push(`${article.slug}: assigned intent missing (${intent || "unknown"})`);
  if (article.sections.length < 7) errors.push(`${article.slug}: fewer than seven sections`);
  if (article.faqs.length !== 6) errors.push(`${article.slug}: expected exactly six authored FAQs`);
  if (plainText(article.description).length < 120 || plainText(article.description).length > 160) errors.push(`${article.slug}: meta description length is ${plainText(article.description).length}`);
  if (plainText(article.seoTitle).length > 60) errors.push(`${article.slug}: SEO title exceeds 60 characters`);
  if (/عضم|\bافضل\b/.test(`${article.title} ${article.seoTitle} ${article.description}`)) errors.push(`${article.slug}: typo variant leaked into a primary SEO field`);
}

for (let index = 0; index < articles.length; index += 1) {
  for (let other = index + 1; other < articles.length; other += 1) {
    const similarity = jaccard(tokenSet(articles[index]), tokenSet(articles[other]));
    if (similarity > 0.48) errors.push(`${articles[index].slug} and ${articles[other].slug}: excessive source similarity ${similarity.toFixed(3)}`);
  }
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const hub = readFileSync(join(root, "blog", "topics", "bone-construction", "index.html"), "utf8");
const service = readFileSync(join(root, "service-construction.html"), "utf8");
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
  const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
  const articleBody = html.match(/<article[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  const wordCount = plainText(articleBody).split(/\s+/).filter(Boolean).length;
  const faqCount = (html.match(/class=["'][^"']*faq-item[^"']*["']/g) || []).length;

  if (title !== article.seoTitle) errors.push(`${article.slug}: SEO title drifted`);
  if (h1 !== article.title) errors.push(`${article.slug}: H1 drifted`);
  if (metaContent(head, "description") !== article.description) errors.push(`${article.slug}: meta description drifted`);
  if (canonical !== `${domain}/blog/${article.slug}/`) errors.push(`${article.slug}: canonical mismatch`);
  if (wordCount < 900) errors.push(`${article.slug}: article body is thin at ${wordCount} words`);
  if (faqCount !== 6) errors.push(`${article.slug}: expected six visible FAQs, found ${faqCount}`);
  if (articleEntityCount(html) !== 1) errors.push(`${article.slug}: expected exactly one Article entity`);
  if (!html.includes('data-article-topic="bone-construction"')) errors.push(`${article.slug}: analytics topic missing`);
  if (!html.includes('href="/blog/topics/bone-construction/"')) errors.push(`${article.slug}: hub link missing`);
  if (!html.includes('href="/service-construction.html"')) errors.push(`${article.slug}: service link missing`);
  if (!html.includes('href="/project-arouba-mosque-villas.html"')) errors.push(`${article.slug}: project evidence link missing`);
  if (!html.includes('/contact.html')) errors.push(`${article.slug}: conversion link missing`);
  if (!html.includes(`/blog/${pillarSlug}/`) && !html.includes(`../${pillarSlug}/`)) errors.push(`${article.slug}: pillar link missing`);
  if (!head.includes('property="og:image:width"') || !head.includes('property="og:image:height"')) errors.push(`${article.slug}: OG image dimensions missing`);
  for (const [question, answer] of article.faqs) {
    if (!html.includes(question) || !html.includes(answer)) errors.push(`${article.slug}: authored FAQ content missing (${question})`);
  }
  const sitemapCount = (sitemap.match(new RegExp(`<loc>${escapeRegExp(domain)}/blog/${escapeRegExp(article.slug)}/</loc>`, "g")) || []).length;
  if (sitemapCount !== 1) errors.push(`${article.slug}: expected one sitemap entry, found ${sitemapCount}`);
  if (!hub.includes(`/blog/${article.slug}/`)) errors.push(`${article.slug}: missing from topic hub`);
  if (!archive.includes(`/blog/${article.slug}/`)) errors.push(`${article.slug}: missing from archive`);
}

const qualityHtml = readFileSync(join(root, "blog", "bone-construction-quality-checklist-riyadh", "index.html"), "utf8");
if (!qualityHtml.includes('"datePublished":"2026-08-09"')) errors.push("Quality checklist lost its original publication date");
if (!qualityHtml.includes('"dateModified":"2026-08-29"')) errors.push("Quality checklist modified date was not updated");

for (const slug of ["bone-construction-cost-riyadh", "bone-construction-duration-riyadh", "bone-construction-quality-checklist-riyadh", "bone-construction-handover-riyadh"]) {
  if (!service.includes(`/blog/${slug}/`)) errors.push(`service-construction.html: curated link missing for ${slug}`);
}

if (errors.length) {
  console.error(`Bone-construction decision guide validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("Validated 7 bone-construction decision guides: 6 new articles plus 1 expanded quality guide, distinct intent, 900+ words, schema, internal links, archive, hub, service and sitemap.");
