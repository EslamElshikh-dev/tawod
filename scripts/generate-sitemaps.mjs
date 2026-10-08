import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const domain = 'https://tawodco.com';
const ignored = new Set(['.git', '.next', 'node_modules', 'out', 'public', 'project-pages', 'assets', 'images', 'app', 'lib']);
const hash = value => createHash('sha256').update(value).digest('hex');
const decode = value => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3])]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => attributes(m[0]));
const pagePath = file => file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -10)}` : `/${file}`;
const sectionNames = ['pages', 'blog', 'projects', 'maintenance', 'dammam', 'khobar', 'dhahran'];
export const sitemapFiles = ['sitemap.xml', ...sectionNames.map(name => `sitemap-${name}.xml`), 'sitemap-turnkey.xml', 'sitemap-index.xml'];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? ignored.has(entry.name) ? [] : walk(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  // Generated update timestamps must not themselves cause another update.
  return Object.fromEntries(Object.keys(value).filter(key => key !== 'dateModified').sort().map(key => [key, stable(value[key])]));
}

function datesInSchema(value) {
  if (!value || typeof value !== 'object') return [];
  const types = [value['@type']].flat();
  const own = types.some(t => t === 'Article' || t === 'BlogPosting') ? [value.dateModified, value.datePublished].filter(Boolean).map(d => d.slice(0, 10)) : [];
  return [...own, ...Object.values(value).flatMap(datesInSchema)];
}

function dateValid(value, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today;
}

function seedDates(root, today) {
  const dates = new Map();
  for (const file of readdirSync(root).filter(name => /^sitemap(?:-[\w-]+)?\.xml$/.test(name))) {
    const xml = readFileSync(join(root, file), 'utf8');
    for (const match of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/g)) {
      const url = match[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
      const date = match[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.slice(0, 10);
      if (url && dateValid(date, today) && date > (dates.get(url) || '')) dates.set(decode(url), date);
    }
  }
  return dates;
}

function imageUrls(main, url, root, imageHashes) {
  const result = new Set();
  for (const img of tags(main, 'img')) {
    if (!img.src || img['aria-hidden'] === 'true' || img.role === 'presentation') continue;
    const image = new URL(img.src, url);
    if (image.origin !== domain || !/\.(?:avif|webp|png|jpe?g|gif|svg)$/i.test(image.pathname) || /\/(?:logo|credentials|icons|social)\//i.test(image.pathname)) continue;
    image.search = ''; image.hash = '';
    const file = resolve(root, decodeURIComponent(image.pathname.slice(1)));
    if (!file.startsWith(`${resolve(root)}/`)) throw new Error(`${url}: sitemap image escapes the site root`);
    if (!existsSync(file)) throw new Error(`${url}: missing sitemap image ${image.href}`);
    if (!imageHashes.has(image.href)) imageHashes.set(image.href, hash(readFileSync(file)));
    result.add(image.href);
  }
  if (result.size > 1000) throw new Error(`${url}: exceeds 1,000 sitemap images`);
  return [...result].sort();
}

export function buildSitemaps({ root = process.cwd(), today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Riyadh' }) } = {}) {
  if (!dateValid(today, today)) throw new Error(`Invalid sitemap build date: ${today}`);
  const stateFile = join(root, 'data', 'sitemap-state.json');
  const previous = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { pages: {}, files: {} };
  const seeds = seedDates(root, today), imageHashes = new Map(), pages = [];
  for (const absolute of walk(root).sort()) {
    const file = relative(root, absolute).split('\\').join('/');
    const html = readFileSync(absolute, 'utf8');
    const meta = Object.fromEntries(tags(html, 'meta').map(m => [m.name || m.property, m.content]));
    const excluded = file === 'admin.html' || file === '404.html' || file === 'thank-you.html' || file.startsWith('lp/');
    const noindex = /\bnoindex\b/i.test(meta.robots || '');
    if (excluded && !noindex) throw new Error(`${file}: utility/advertising page must declare noindex`);
    if (noindex) continue;
    const links = tags(html, 'link'), canonicals = links.filter(link => link.rel === 'canonical');
    const url = domain + pagePath(file);
    if (canonicals.length !== 1 || canonicals[0].href !== url) throw new Error(`${file}: canonical must be ${url}`);
    const alternates = links.filter(link => link.rel === 'alternate' && link.hreflang).map(link => ({ lang: link.hreflang, url: link.href }));
    const schemas = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => JSON.parse(m[1]));
    const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    if (!main) throw new Error(`${file}: missing main content`);
    const images = imageUrls(main, url, root, imageHashes);
    const text = decode(main.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const refs = [...tags(main, 'a').map(a => a.href || '')].filter(Boolean).map(href => href.replace(/\?v=[^#&]*/g, ''));
    const fingerprint = hash(JSON.stringify({ title: decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''), description: meta.description, alternates, text, refs, images: images.map(image => [image, imageHashes.get(image)]), schemas: stable(schemas) }));
    const old = previous.pages[url];
    const hints = [...schemas.flatMap(datesInSchema), seeds.get(url)].filter(Boolean);
    for (const date of hints) if (!dateValid(date, today)) throw new Error(`${file}: invalid/future lastmod ${date}`);
    const initialDate = hints.sort().at(-1) || today;
    const lastmod = old ? old.fingerprint === fingerprint ? old.lastmod : today : initialDate;
    if (!dateValid(lastmod, today)) throw new Error(`${file}: invalid stored lastmod ${lastmod}`);
    const group = ['dammam', 'khobar', 'dhahran', 'maintenance', 'blog'].find(name => file.startsWith(`${name}/`)) || (file === 'projects.html' || file.startsWith('project-') ? 'projects' : 'pages');
    pages.push({ file, url, lastmod, fingerprint, images, alternates, group });
  }
  pages.sort((a, b) => a.url.localeCompare(b.url, 'en'));
  const byUrl = new Map(pages.map(page => [page.url, page]));
  if (byUrl.size !== pages.length) throw new Error('Duplicate canonical URLs');
  for (const page of pages) {
    const languages = page.alternates.filter(a => a.lang !== 'x-default');
    if (new Set(languages.map(a => a.url)).size < 2) continue;
    const signature = JSON.stringify([...page.alternates].sort((a, b) => a.lang.localeCompare(b.lang)));
    for (const alternate of page.alternates) {
      const other = byUrl.get(alternate.url);
      if (!other || JSON.stringify([...other.alternates].sort((a, b) => a.lang.localeCompare(b.lang))) !== signature) throw new Error(`${page.url}: hreflang is not reciprocal for ${alternate.url}`);
    }
  }
  const render = rows => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.map(page => {
    const languages = new Set(page.alternates.filter(a => a.lang !== 'x-default').map(a => a.url));
    const alternatives = languages.size > 1 ? page.alternates.map(a => `<xhtml:link rel="alternate" hreflang="${escape(a.lang)}" href="${escape(a.url)}"/>`).join('') : '';
    return `  <url><loc>${escape(page.url)}</loc><lastmod>${page.lastmod}</lastmod>${alternatives}${page.images.map(image => `<image:image><image:loc>${escape(image)}</image:loc></image:image>`).join('')}</url>`;
  }).join('\n')}\n</urlset>\n`;
  const outputs = { 'sitemap.xml': render(pages) };
  for (const name of sectionNames) outputs[`sitemap-${name}.xml`] = render(pages.filter(page => page.group === name));
  outputs['sitemap-turnkey.xml'] = render(pages.filter(page => page.file === 'service-turnkey.html' || page.group === 'blog' && page.file.includes('turnkey')));
  const fileState = {};
  for (const [file, xml] of Object.entries(outputs)) {
    const fingerprint = hash(xml), old = previous.files[file];
    fileState[file] = { fingerprint, lastmod: old?.fingerprint === fingerprint ? old.lastmod : today };
  }
  outputs['sitemap-index.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sectionNames.map(name => {
    const file = `sitemap-${name}.xml`;
    return `  <sitemap><loc>${domain}/${file}</loc><lastmod>${fileState[file].lastmod}</lastmod></sitemap>`;
  }).join('\n')}\n</sitemapindex>\n`;
  // The complete sitemap.xml remains at its existing URL for Search Console compatibility.
  outputs['robots.txt'] = `User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap-index.xml\n`;
  outputs['data/sitemap-state.json'] = JSON.stringify({ version: 1, pages: Object.fromEntries(pages.map(page => [page.url, { fingerprint: page.fingerprint, lastmod: page.lastmod }])), files: fileState }, null, 2) + '\n';
  return { outputs, pages, groups: Object.fromEntries(sectionNames.map(name => [name, pages.filter(page => page.group === name).length])), imageReferences: pages.reduce((sum, page) => sum + page.images.length, 0), uniqueImages: imageHashes.size };
}

export function generateSitemaps({ root = process.cwd(), check = false, today } = {}) {
  const result = buildSitemaps({ root, today });
  const changes = Object.entries(result.outputs).filter(([file, content]) => !existsSync(join(root, file)) || readFileSync(join(root, file), 'utf8') !== content);
  if (check && changes.length) throw new Error(`Sitemaps are stale: ${changes.map(([file]) => file).join(', ')}. Run npm run generate:sitemaps.`);
  if (!check) for (const [file, content] of changes) { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), content); }
  console.log(`${check ? 'Checked' : 'Generated'} ${result.pages.length} canonical indexable URLs, ${sectionNames.length} disjoint section maps, ${result.uniqueImages} images (${result.imageReferences} page associations); ${changes.length} files changed.`);
  console.log(JSON.stringify(result.groups));
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) generateSitemaps({ check: process.argv.includes('--check') });
