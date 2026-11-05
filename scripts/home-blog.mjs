import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clean = value => String(value || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];

export async function syncHomepageLatest({ check = false } = {}) {
  const articles = [];
  for (const entry of fs.readdirSync(path.join(root, 'blog'), { withFileTypes: true })) {
    const file = path.join(root, 'blog', entry.name, 'index.html');
    if (!entry.isDirectory() || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const nodes = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .flatMap(([, json]) => { const data = JSON.parse(json); return data['@graph'] || [data]; });
    const article = nodes.find(node => ['Article', 'BlogPosting'].includes(node['@type']) && node.datePublished);
    if (!article || !/^\d{4}-\d{2}-\d{2}/.test(article.datePublished)) continue;
    const meta = name => clean((html.match(/<meta\b[^>]*>/gi) || []).find(tag => attribute(tag, 'name') === name || attribute(tag, 'property') === name)?.match(/\bcontent=["']([^"']*)["']/i)?.[1]);
    const image = meta('og:image').replace(/^https:\/\/(?:www\.)?tawodco\.com\//, '');
    const category = clean(html.match(/class=["']article-meta-line["'][^>]*>[\s\S]*?<span>[^<]*<\/span>\s*<span>([^<]+)<\/span>/i)?.[1]) || 'المقاولات والبناء';
    articles.push({ slug: entry.name, date: article.datePublished, title: clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]), description: meta('description'), image, alt: meta('og:image:alt') || clean(article.headline), position: meta('tawod:image-position'), category });
  }
  articles.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const latest = articles.slice(0, 6);
  if (latest.length !== 6) throw new Error('Six published articles are required for the homepage.');
  const cards = [];
  for (const [index, article] of latest.entries()) {
    if (!article.image || !fs.existsSync(path.join(root, article.image))) throw new Error(`Homepage article image missing: ${article.slug}`);
    const dimensions = await sharp(path.join(root, article.image)).metadata();
    const delay = ['', ' delay-100', ' delay-200'][index % 3];
    const url = `blog/${article.slug}/`;
    const style = article.position ? ` style='object-position:${escape(article.position)}'` : '';
    cards.push(`<article class='blog-card reveal-up${delay}' data-published='${escape(article.date)}'><div class='card-img-wrap'><a href='${url}' aria-label='${escape(article.title)}'><img class='card-img' src='${escape(article.image)}' width='${dimensions.width}' height='${dimensions.height}'${style} loading='lazy' decoding='async' alt='${escape(article.alt)}'></a></div><div class='blog-card-body'><span class='blog-meta'>${escape(article.category)}</span><h3>${escape(article.title)}</h3><p>${escape(article.description)}</p><a class='card-link' href='${url}'>اقرأ المقال <i class='fa-solid fa-arrow-left-long' aria-hidden='true'></i></a></div></article>`);
  }
  const file = path.join(root, 'index.html');
  const current = fs.readFileSync(file, 'utf8');
  const section = /(<section\b[^>]*\bid=["']blog["'][^>]*>[\s\S]*?<div class=["']grid-3["']>)[\s\S]*?(<\/div>\s*<div class=["']blog-section-footer)/;
  if (!section.test(current)) throw new Error('Homepage blog grid could not be located.');
  const updated = current.replace(section, (_, before, after) => before + cards.join('') + after);
  if (check && updated !== current) throw new Error('Homepage latest articles are stale. Run npm run build:home.');
  if (!check && updated !== current) fs.writeFileSync(file, updated);
  return latest;
}
