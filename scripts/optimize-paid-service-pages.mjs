import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pages = new Map([
  ['service-construction.html', 'construction'], ['service-turnkey.html', 'turnkey'],
  ['service-restoration.html', 'restoration'], ['service-finishing.html', 'finishing'],
  ['service-decor.html', 'decor'], ['service-mep.html', 'mep'], ['contact.html', null]
]);
const start = '<!-- TAWOD_SERVICE_PERFORMANCE_START -->';
const end = '<!-- TAWOD_SERVICE_PERFORMANCE_END -->';
const critical = start +
  '<link rel="preload" as="image" href="/images/hero-bg-mobile-optimized.webp" media="(max-width: 767px)" fetchpriority="high">' +
  '<link rel="preload" as="image" href="/images/hero-bg-desktop-optimized.webp" media="(min-width: 768px)" fetchpriority="high">' +
  '<style id="tawod-service-hero-performance">body .page-hero{background-image:linear-gradient(rgba(29,30,38,.82),rgba(29,30,38,.88)),url("/images/hero-bg-desktop-optimized.webp")!important}' +
  '@media(max-width:767px){body .page-hero{background-image:linear-gradient(rgba(29,30,38,.82),rgba(29,30,38,.88)),url("/images/hero-bg-mobile-optimized.webp")!important}}</style>' + end;

export function optimizePaidServicePage(before, file) {
  if (!pages.has(file)) return before;
  const service = pages.get(file);
  let html = before.replace(/<!-- TAWOD_SERVICE_PERFORMANCE_START -->[\s\S]*?<!-- TAWOD_SERVICE_PERFORMANCE_END -->/g, '');
  html = /<meta\b[^>]*charset[^>]*>/i.test(html)
    ? html.replace(/(<meta\b[^>]*charset[^>]*>)/i, '$1' + critical)
    : html.replace(/(<head\b[^>]*>)/i, '$1' + critical);
  html = html.replace(/<img\b[^>]*\bsrc=["'](?:\/)?images\/logo\/tawod-logo\.png["'][^>]*>/gi, tag =>
    tag.replace(/src=["'][^"']*["']/i, 'src="/images/logo/tawod-logo-180.webp"')
      .replace(/\swidth=["'][^"']*["']/i, '').replace(/\sheight=["'][^"']*["']/i, '')
      .replace(/>$/, ' width="180" height="80">'));
  if (service) html = html.replace(/href=["']contact\.html(?:#form)?["']/g, 'href="contact.html?service=' + service + '#form"');
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let changed = 0;
  for (const file of pages.keys()) {
    const before = fs.readFileSync(file, 'utf8');
    const html = optimizePaidServicePage(before, file);
    if (html !== before) { fs.writeFileSync(file, html); changed++; }
  }
  console.log('Updated service performance and request context on ' + changed + ' pages.');
}
