import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSitemaps } from './generate-sitemaps.mjs';

const decode = value => value.replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3])]));
export const sharingKeys = ['og:url', 'og:title', 'og:description', 'og:type', 'og:image', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

export function sharingMetadata(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  return [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => attributes(m[0]));
}

export function normalizeSeoSharing(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  if (!head) throw new Error('SEO sharing requires a document head');
  const metadata = sharingMetadata(html);
  if (metadata.some(m => m.name?.toLowerCase() === 'robots' && /\bnoindex\b/i.test(m.content || ''))) return html;
  const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => attributes(m[0])).find(m => m.rel === 'canonical')?.href;
  const title = decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  const description = metadata.find(m => m.name === 'description')?.content;
  const current = key => metadata.find(m => (m.property || m.name) === key)?.content;
  const image = current('og:image');
  if (!canonical || !title || !description || !image) throw new Error('SEO sharing requires canonical, title, description and an existing approved image');
  const language = attributes(html.match(/<html\b[^>]*>/i)?.[0] || '').lang || 'ar';
  const defaults = {
    'og:url': canonical,
    'og:title': title,
    'og:description': description,
    'og:type': /"@type"\s*:\s*"(?:Article|BlogPosting)"/.test(html) ? 'article' : 'website',
    'og:image': image,
    'og:locale': /^en\b/i.test(language) ? 'en_SA' : 'ar_SA',
    'twitter:card': 'summary_large_image',
    'twitter:title': current('og:title') || title,
    'twitter:description': current('og:description') || description,
    'twitter:image': image,
  };
  let result = html;
  // The canonical owns the share URL, including when old metadata has drifted.
  const urls = metadata.filter(m => (m.property || m.name) === 'og:url');
  if (urls.length !== 1 || urls[0]?.content !== canonical) {
    result = result.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, block => block.replace(/<meta\b[^>]*>/gi, tag => {
      const m = attributes(tag);
      return (m.property || m.name) === 'og:url' ? '' : tag;
    }));
  }
  const present = sharingMetadata(result);
  const additions = Object.entries(defaults).filter(([key]) => !present.some(m => (m.property || m.name) === key && m.content)).map(([key, value]) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`);
  return additions.length ? result.replace(/<\/head>/i, `${additions.join('\n')}\n</head>`) : result;
}

export function normalizeSiteSharing({ root = process.cwd(), check = false } = {}) {
  const changes = [];
  for (const page of buildSitemaps({ root }).pages) {
    const file = join(root, page.file);
    const old = readFileSync(file, 'utf8');
    const html = normalizeSeoSharing(old);
    if (old !== html) { changes.push(page.file); if (!check) writeFileSync(file, html); }
  }
  if (check && changes.length) throw new Error(`Missing or stale sharing metadata: ${changes.join(', ')}`);
  return changes;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changes = normalizeSiteSharing({ check: process.argv.includes('--check') });
  console.log(`SEO sharing metadata: ${changes.length} changed pages.`);
}
