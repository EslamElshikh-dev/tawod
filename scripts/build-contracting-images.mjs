import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const writeChanged = (file, bytes) => {
  if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) fs.writeFileSync(file, bytes);
};
// Restore full-size fallbacks from retained originals, never from thumbnails.
const sourceOriginals = {};
for (const directory of ['images/projects']) {
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.png')) continue;
    const original = path.join(directory, name);
    const fallback = original.replace(/\.png$/, '.webp');
    if (!fs.existsSync(fallback)) continue;
    sourceOriginals[fallback] = original;
    writeChanged(fallback, await sharp(original).webp({ quality: 90, effort: 6 }).toBuffer());
  }
}
// Keep actual field photographs for service presentations. The historical
// service PNGs are earlier illustrations, not masters of the live thumbnails.
const serviceMasters = {
  construction: 'images/projects/construction-01.webp',
  turnkey: 'images/projects/villa-finishing-01.webp',
  restoration: 'images/projects/faisaliah-villa-facades-finishing-01-gbp.jpg',
  finishing: 'images/projects/interior-01.webp',
  decor: 'images/landing/finishing-riyadh.webp',
};
for (const [service, original] of Object.entries(serviceMasters)) {
  const fallback = `images/services/service-${service}-riyadh.webp`;
  sourceOriginals[fallback] = original;
  writeChanged(fallback, await sharp(original).webp({ quality: 90, effort: 6 }).toBuffer());
}
for (const [fallback, original] of [
  ['images/projects/faisaliah-villa-facades-finishing-01-v3.webp', 'images/projects/faisaliah-villa-facades-finishing-01-gbp.jpg'],
  ['images/projects/arouba-mosque-villas-01.webp', 'images/projects/arouba-mosque-villas-01-gbp.jpg'],
]) {
  sourceOriginals[fallback] = original;
  writeChanged(fallback, await sharp(original).webp({ quality: 90, effort: 6 }).toBuffer());
}
// Old URLs contained truncated WebP uploads; keep the matching field-photo
// stage available through the validated, retained replacement.
for (const [fallback, original] of [
  ['images/projects/modon-eight-warehouses-01.webp', 'images/projects/modon-eight-warehouses-01-v4.webp'],
  ['images/projects/modon-eight-warehouses-02.webp', 'images/projects/modon-eight-warehouses-02-v3.webp'],
]) {
  sourceOriginals[fallback] = original;
  writeChanged(fallback, fs.readFileSync(original));
}
const files = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => new URL(m[1]).pathname).filter(p => !p.startsWith('/maintenance/'))
  .map(p => p === '/' ? 'index.html' : p.endsWith('/') ? `${p.slice(1)}index.html` : p.slice(1));
const originals = new Set(files.filter(f => fs.existsSync(f)).flatMap(file =>
  [...fs.readFileSync(file, 'utf8').matchAll(/<img\b[^>]*>/gi)]
    .map(([tag]) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter(Boolean).map(src => src.replace(/^\//, '').replace(/^(?:\.\.\/)+/, '').split('?')[0])));
for (const file of ['images/projects/modon-eight-warehouses-01-v4.webp', 'images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp']) originals.add(file);
const output = 'images/responsive';
fs.mkdirSync(output, { recursive: true });
const profiles = {}, nativePhotos = {}, generated = new Set();
let originalBytes = 0, smallBytes = 0;
for (const file of [...originals].sort()) {
  // Hero art direction and vector credentials retain their existing treatment.
  if (!/^images\//.test(file) || /\/(?:logo|credentials)\/|\/hero-|\/footer-/.test(file) || !fs.existsSync(file)) continue;
  let source = sourceOriginals[file] || file;
  const campaignMaster = file.replace(/-(?:480|960)\.webp$/, '-1200.webp');
  if (campaignMaster !== file && fs.existsSync(campaignMaster)) source = campaignMaster;
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height || meta.pages > 1) continue;
  nativePhotos[file] = { width: meta.width, height: meta.height };
  if (meta.width < 800) continue;
  const widths = [...new Set([480, 768, 1024, 1280, meta.width])].filter(w => w <= meta.width).sort((a,b) => a-b);
  const rows = [];
  for (const width of widths) {
    // One encode from the best retained master, including full density sizes.
    const bytes = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toBuffer();
    const name = `${path.parse(file).name}-${width}-${createHash('sha256').update(bytes).digest('hex').slice(0,12)}.webp`;
    const target = path.join(output, name);
    writeChanged(target, bytes);
    generated.add(name);
    rows.push({ url: `/${target}`, width });
    if (width === 480) smallBytes += bytes.length;
  }
  profiles[file] = rows;
  originalBytes += fs.statSync(source).size;
}
const logoProfiles = [];
for (const width of [180, 360, 540]) {
  const bytes = await sharp('images/logo/tawod-logo.png').resize({ width, withoutEnlargement: true }).webp({ lossless: true, effort: 6 }).toBuffer();
  const name = `tawod-logo-${width}-${createHash('sha256').update(bytes).digest('hex').slice(0,12)}.webp`;
  writeChanged(path.join(output, name), bytes);
  generated.add(name);
  logoProfiles.push({ url: `/${output}/${name}`, width });
}
for (const file of fs.readdirSync(output)) if (!generated.has(file)) fs.unlinkSync(path.join(output, file));
fs.writeFileSync('lib/contracting-image-assets.mjs', `// Generated by build-contracting-images.mjs. Original image URLs remain available.\nexport const responsiveImages=${JSON.stringify(profiles)};\nexport const nativePhotos=${JSON.stringify(nativePhotos)};\nexport const logoProfiles=${JSON.stringify(logoProfiles)};\n`);
console.log(`Prepared ${Object.keys(profiles).length} full-resolution responsive sets (${generated.size} variants); masters ${originalBytes} bytes, 480px variants ${smallBytes} bytes.`);
