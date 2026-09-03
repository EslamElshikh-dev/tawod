import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const size = (file) => fs.statSync(path.join(root, file)).size;
const failures = [];

function requireText(source, expected, message) {
  if (!source.includes(expected)) failures.push(message);
}

const index = read('index.html');
const homeScript = read('assets/js/tawod-home.js');
const homeCss = read('assets/css/tawod-home-v2.css');
const criticalCss = read('assets/css/tawod-home-critical.css');

requireText(index, "media='(max-width: 767px)'", 'Homepage must serve the dedicated mobile hero source.');
requireText(index, "href='images/hero-bg-mobile-optimized.webp'", 'Mobile hero must be preloaded.');
requireText(index, "fetchpriority='high' loading='eager' decoding='async'", 'Hero image must remain high priority with asynchronous decoding.');
requireText(index, "fetchpriority='low' decoding='async'", 'Secondary hero credentials must not compete with the LCP image.');
requireText(index, "rel='preload' as='style' href='assets/css/tawod-home-performance.css", 'Non-critical homepage CSS must load asynchronously.');

requireText(homeScript, 'if (activeNavigationId === activeId) return;', 'Scroll navigation must skip duplicate DOM updates.');
requireText(homeScript, "window.matchMedia('(hover: none) and (pointer: coarse)').matches", 'Touch devices must skip reveal observers.');
requireText(homeCss, '@media (hover: none) and (pointer: coarse)', 'Touch-specific paint controls are missing.');
requireText(homeCss, 'background-attachment: scroll !important;', 'Fixed mobile background must stay disabled.');
requireText(homeCss, 'backdrop-filter: none !important;', 'Mobile fixed-header blur must stay disabled.');

if (size('images/hero-bg-mobile-optimized.webp') > 60 * 1024) failures.push('Mobile hero exceeds the 60 KiB budget.');
if (size('images/hero-bg-desktop-optimized.webp') > 120 * 1024) failures.push('Desktop hero exceeds the 120 KiB budget.');
if (size('assets/js/tawod-home.js') > 24 * 1024) failures.push('Homepage interaction script exceeds the 24 KiB budget.');
if (Buffer.byteLength(criticalCss) > 16 * 1024) failures.push('Inline critical CSS exceeds the 16 KiB budget.');

if (failures.length) {
  console.error(`Mobile performance guard failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`Checked mobile budgets: hero ${Math.round(size('images/hero-bg-mobile-optimized.webp') / 1024)} KiB, home JS ${Math.round(size('assets/js/tawod-home.js') / 1024)} KiB, critical CSS ${Math.round(Buffer.byteLength(criticalCss) / 1024)} KiB.`);

