import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import { compileContractingCss, cssVocabulary } from './contracting-css.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const cssSources = [
  'assets/css/tawod-home.css',
  'assets/css/tawod-upgrades.css',
  'assets/css/tawod-system-base.css',
  'assets/css/tawod-premium-2026.css',
  'assets/css/tawod-system.css',
  'assets/css/tawod-home-v2.css',
  'assets/css/tawod-contracting-design.css',
  'assets/css/tawod-contracting-polish.css'
];

const fontAndIconBase = `
.icon-sprite{position:absolute;width:0;height:0;overflow:hidden}
.icon-svg{display:block;width:1em;height:1em;overflow:visible;fill:currentColor}
i[class*='fa-']{display:inline-flex;align-items:center;justify-content:center;font-style:normal;line-height:1}
`;

function withoutImports(css) {
  return css
    .replace(/^\s*@import[^\n]*\n?/gmi, '')
    .trim();
}

const vocabulary = cssVocabulary(
  fs.readFileSync(path.join(root,'index.html'),'utf8')+' tawod-contracting contracting-brand-copy contracting-logo-art contracting-footer-group contracting-contact-space tawod-footer-in-view tawod-input-active contracting-hero-grid contracting-icon contracting-city tawod-entered',
  ['assets/js/tawod-home.js','assets/js/tawod-inner.js','assets/js/tawod-upgrades.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n')
);
const legacySource = cssSources.filter(file=>!file.includes('tawod-contracting-')).map((file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    return `/* Source: ${file} */\n${withoutImports(source)}`;
  }).join('\n');
const bundleSource = [
  fontAndIconBase.trim(),
  compileContractingCss(legacySource,vocabulary,'home-layout.css',true).toString(),
  fs.readFileSync(path.join(root,'assets/css/tawod-contracting-design.css'),'utf8'),
  fs.readFileSync(path.join(root,'assets/css/tawod-contracting-polish.css'),'utf8')
].join('\n\n') + '\n';

const bundlePath = path.join(root, 'assets/css/tawod-home-performance.css');
const bundle = Buffer.concat([
  compileContractingCss(bundleSource,vocabulary,path.basename(bundlePath)),
  Buffer.from('\n')
]);

const start = '<!-- TAWOD_CRITICAL_CSS_START -->';
const end = '<!-- TAWOD_CRITICAL_CSS_END -->';
const indexPath = path.join(root, 'index.html');
const index = fs.readFileSync(indexPath, 'utf8');
const critical = fs.readFileSync(path.join(root, 'assets/css/tawod-home-critical.css'), 'utf8').trim();
const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);

if (!critical.includes('.nav-services-dropdown,') || !critical.includes('.nav-services-toggle { display: none; }')) {
  throw new Error('Critical CSS must hide deferred navigation controls to prevent a header flash.');
}

if (!pattern.test(index)) {
  throw new Error('Critical CSS markers are missing from index.html');
}

let nextIndex = index.replace(pattern, `${start}\n  <style id='tawod-critical-css'>\n${critical}\n  </style>\n  ${end}`);

// Preserve the reciprocal language switch added to the Arabic homepage. It is
// hidden from the desktop action group on compact layouts and remains available
// from the mobile sidebar, so it does not compete with the primary actions.

// Keep a single menu control. The shared JS injects the SVG icon and owns all
// open/close behavior; Font Awesome classes or a second inline icon are not needed.
nextIndex = nextIndex.replace(
  /<button\s+class=['"][^'"]*mobile-menu-btn[^'"]*['"]\s+id=['"]menuBtn['"][\s\S]*?<\/button>/i,
  "<button class='mobile-menu-btn' id='menuBtn' type='button' aria-label='فتح القائمة' aria-controls='mobileSidebar' aria-expanded='false'></button>"
);

function revision(file) {
  const content = file === 'assets/css/tawod-home-performance.css'
    ? bundle
    : fs.readFileSync(path.join(root, file));
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function updateRevision(html, file) {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`${escaped}(?:\\?v=[a-f0-9]+)?`, 'g'), `${file}?v=${revision(file)}`);
}

[
  'assets/css/tawod-home-performance.css',
  'assets/js/tawod-home.js',
  'assets/js/tawod-upgrades.js'
].forEach((file) => {
  nextIndex = updateRevision(nextIndex, file);
});

if (check) {
  const currentBundle = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath) : Buffer.alloc(0);
  const stale = [];
  if (!currentBundle.equals(bundle)) stale.push('assets/css/tawod-home-performance.css');
  if (nextIndex !== index) stale.push('index.html');
  if (stale.length) {
    throw new Error(`Homepage performance assets are out of date: ${stale.join(', ')}. Run npm run build:home.`);
  }
  console.log(`Checked homepage bundle from ${cssSources.length} CSS sources and asset revisions.`);
} else {
  fs.writeFileSync(bundlePath, bundle);
  fs.writeFileSync(indexPath, nextIndex);
  console.log(`Built minified homepage CSS from ${cssSources.length} sources, refreshed critical CSS, preserved language controls, normalized the mobile menu, and revisioned assets.`);
}
