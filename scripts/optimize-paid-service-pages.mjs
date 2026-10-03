import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pages = new Map([
  ['service-construction.html', 'construction'], ['service-turnkey.html', 'turnkey'],
  ['service-restoration.html', 'restoration'], ['service-finishing.html', 'finishing'],
  ['service-decor.html', 'decor'], ['service-mep.html', 'mep'], ['contact.html', null]
]);

export function optimizePaidServicePage(before, file) {
  if (!pages.has(file)) return before;
  const service = pages.get(file);
  // The live light redesign owns hero presentation; remove the superseded
  // background/preload block so these pages do not download an unused image.
  let html = before.replace(/<!-- TAWOD_SERVICE_PERFORMANCE_START -->[\s\S]*?<!-- TAWOD_SERVICE_PERFORMANCE_END -->/g, '');
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
