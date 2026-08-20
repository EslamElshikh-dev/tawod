import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const pageSize = 10;
const blogRoot = "blog";
const firstPage = join(blogRoot, "index.html");

function schemaFrom(html) {
  const match = html.match(/<script id="blog-archive-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Missing blog archive schema");
  return JSON.parse(match[1]);
}

function publishedDate(slug) {
  const html = readFileSync(join(blogRoot, slug, "index.html"), "utf8");
  return html.match(/["']datePublished["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/)?.[1]
    || html.match(/["']dateModified["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/)?.[1]
    || "1970-01-01";
}

const firstHtml = readFileSync(firstPage, "utf8");
const firstGraph = schemaFrom(firstHtml)["@graph"];
const blogNode = firstGraph.find((node) => node["@type"] === "Blog");
if (!blogNode) throw new Error("Missing Blog schema");

const description = firstHtml.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
const totalArticles = Number(description.match(/(\d+) مقال/)?.[1]);
if (!Number.isInteger(totalArticles) || totalArticles < 1) throw new Error("Could not determine article count");
const totalPages = Math.ceil(totalArticles / pageSize);

const archiveUrls = [];
let previousDate = "9999-99-99";

for (let page = 1; page <= totalPages; page += 1) {
  const file = page === 1 ? firstPage : join(blogRoot, "page", String(page), "index.html");
  if (!existsSync(file)) throw new Error(`Missing archive page ${page}`);
  const html = readFileSync(file, "utf8");
  const graph = schemaFrom(html)["@graph"];
  const collection = graph.find((node) => node["@type"] === "CollectionPage");
  const list = graph.find((node) => node["@type"] === "ItemList");
  if (!collection || !list) throw new Error(`Missing collection schema on page ${page}`);

  const expectedCount = Math.min(pageSize, totalArticles - ((page - 1) * pageSize));
  if (list.itemListElement.length !== expectedCount) throw new Error(`Page ${page} has ${list.itemListElement.length} items; expected ${expectedCount}`);
  const featuredCount = (html.match(/class="featured-slide"/g) || []).length;
  if (featuredCount !== (page === 1 ? 5 : 0)) throw new Error(`Unexpected featured-card count on page ${page}`);

  for (const item of list.itemListElement) {
    const slug = new URL(item.url).pathname.split("/").filter(Boolean).at(-1);
    const date = publishedDate(slug);
    if (date > previousDate) throw new Error(`Archive order is not newest-first at ${slug}`);
    if (!html.includes(`/blog/${slug}/`)) throw new Error(`Visible card missing for ${slug}`);
    previousDate = date;
    archiveUrls.push(item.url);
  }
}

if (archiveUrls.length !== totalArticles) throw new Error(`Archive covers ${archiveUrls.length} of ${totalArticles} articles`);
if (new Set(archiveUrls).size !== totalArticles) throw new Error("Archive contains duplicate articles");

const homeHtml = readFileSync("index.html", "utf8");
const homeIds = new Set([...homeHtml.matchAll(/\bid=['"]([^'"]+)['"]/g)].map((match) => match[1]));
const homeAnchors = [...homeHtml.matchAll(/<a\b[^>]*href=['"]#([^'"]+)['"]/g)].map((match) => match[1]);
const missingAnchors = [...new Set(homeAnchors.filter((anchor) => !homeIds.has(anchor)))];
if (missingAnchors.length) throw new Error(`Homepage navigation has missing anchors: ${missingAnchors.join(", ")}`);

console.log(`Verified ${totalArticles} unique articles across ${totalPages} pages, newest-to-oldest, with 5 featured cards and valid homepage anchors.`);
