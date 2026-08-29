import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { articleRole, blogTopics, legacyTopicHubSlugs, topicForArticle, topicForService, topicUrl } from "./blog-topic-data.mjs";
import { newArticleSlugs } from "./bone-construction-series-2026-08-29.mjs";

const root = process.cwd();
const blogRoot = join(root, "blog");
const errors = [];
const articleSlugs = readdirSync(blogRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !["page", "topics"].includes(entry.name) && !legacyTopicHubSlugs.has(entry.name) && existsSync(join(blogRoot, entry.name, "index.html")))
  .map((entry) => entry.name)
  .sort();
const articleSet = new Set(articleSlugs);

function schemaCount(value, types) {
  if (!value || typeof value !== "object") return 0;
  let count = types.includes(value["@type"]) ? 1 : 0;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) count += child.reduce((sum, item) => sum + schemaCount(item, types), 0);
    else count += schemaCount(child, types);
  }
  return count;
}

function articleEntityCount(html) {
  let count = 0;
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { count += schemaCount(JSON.parse(match[1]), ["Article", "BlogPosting"]); }
    catch (error) { errors.push(`Invalid JSON-LD: ${error.message}`); }
  }
  return count;
}

const expectedContentUrls = 82 + newArticleSlugs.length;
if (articleSlugs.length + legacyTopicHubSlugs.size !== expectedContentUrls) errors.push(`Expected ${expectedContentUrls} content URLs after the bone-construction series, found ${articleSlugs.length + legacyTopicHubSlugs.size}`);

const blogIndex = readFileSync(join(blogRoot, "index.html"), "utf8");
for (const topic of blogTopics) {
  const assigned = articleSlugs.filter((slug) => topicForArticle(slug).slug === topic.slug);
  const page = join(root, topicUrl(topic).replace(/^\//, ""), "index.html");
  if (!assigned.length) errors.push(`Topic ${topic.slug} has no assigned articles`);
  if (!articleSet.has(topic.pillar)) errors.push(`Topic ${topic.slug} pillar is missing: ${topic.pillar}`);
  if (!existsSync(page)) errors.push(`Missing topic hub ${topic.slug}`);
  else {
    const html = readFileSync(page, "utf8");
    if (!html.includes(`href="/blog/${topic.pillar}/"`)) errors.push(`${topic.slug}: pillar link missing`);
    if (!html.includes(`href="${topic.serviceUrl}"`)) errors.push(`${topic.slug}: service link missing`);
    if (!html.includes('"@type":"CollectionPage"')) errors.push(`${topic.slug}: CollectionPage schema missing`);
  }
  if (!blogIndex.includes(`href="${topicUrl(topic)}"`)) errors.push(`Blog index does not link to ${topic.slug}`);
}

for (const slug of articleSlugs) {
  const html = readFileSync(join(blogRoot, slug, "index.html"), "utf8");
  const topic = topicForArticle(slug);
  const role = articleRole(slug, topic);
  if (!html.includes(`data-article-slug="${slug}"`)) errors.push(`${slug}: analytics slug missing`);
  if (!html.includes(`data-article-topic="${topic.slug}"`)) errors.push(`${slug}: topic data missing`);
  if (!html.includes(`data-article-role="${role}"`)) errors.push(`${slug}: content role missing`);
  if (!html.includes(`href="${topicUrl(topic)}"`)) errors.push(`${slug}: topic hub link missing`);
  if (!html.includes(`href="${topic.serviceUrl}"`)) errors.push(`${slug}: service link missing`);
  if (!html.includes("/editorial-policy/")) errors.push(`${slug}: editorial policy link missing`);
  const entities = articleEntityCount(html);
  if (entities !== 1) errors.push(`${slug}: expected one Article entity, found ${entities}`);
}

for (const service of ["service-construction.html", "service-turnkey.html", "service-restoration.html", "service-finishing.html", "service-decor.html", "service-mep.html"]) {
  const html = readFileSync(join(root, service), "utf8");
  const topic = topicForService(service);
  if (!html.includes("TAWOD_STATIC_GUIDES_START")) errors.push(`${service}: guide section missing`);
  if (!html.includes(`href="${topicUrl(topic)}"`)) errors.push(`${service}: reverse topic link missing`);
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
for (const topic of blogTopics) if (!sitemap.includes(`https://tawodco.com${topicUrl(topic)}`)) errors.push(`Sitemap missing ${topic.slug}`);
if (!sitemap.includes("https://tawodco.com/editorial-policy/")) errors.push("Sitemap missing editorial policy");
for (const entry of readdirSync(join(root, "lp"), { withFileTypes: true }).filter((item) => item.isDirectory())) {
  const file = join(root, "lp", entry.name, "index.html");
  const html = readFileSync(file, "utf8");
  if (!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) errors.push(`lp/${entry.name}: noindex missing`);
  if (sitemap.includes(`https://tawodco.com/lp/${entry.name}/`)) errors.push(`lp/${entry.name}: still present in sitemap`);
}

if (!existsSync(join(root, "editorial-policy", "index.html"))) errors.push("Editorial policy page missing");

if (errors.length) {
  console.error(`Blog architecture validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

const distribution = blogTopics.map((topic) => `${topic.slug}:${articleSlugs.filter((slug) => topicForArticle(slug).slug === topic.slug).length}`).join(", ");
console.log(`Validated ${articleSlugs.length} articles plus ${legacyTopicHubSlugs.size} preserved legacy hub, ${blogTopics.length} topic hubs, service links, LP index controls and schema. ${distribution}`);
