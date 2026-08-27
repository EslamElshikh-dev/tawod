import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const check = process.argv.includes('--check');
const version = createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'assets/js/tawod-analytics.js')))
  .digest('hex')
  .slice(0, 12);
const start = '<!-- TAWOD_ANALYTICS_START -->';
const end = '<!-- TAWOD_ANALYTICS_END -->';
const install = `${start}<script src="/assets/js/tawod-analytics.js?v=${version}" defer></script>${end}`;
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'out', 'public']);

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (ignoredDirectories.has(entry.name)) return [];
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const markerPattern = new RegExp(`${start}[\\s\\S]*?${end}\\s*`, 'g');
const analyticsScriptPattern = /\s*<script\b[^>]*\bsrc=["']\/assets\/js\/tawod-analytics\.js(?:\?v=[^"']*)?["'][^>]*><\/script>\s*/gi;
const legacyHomeTag = /\s*<!-- Google tag: queued immediately,[\s\S]*?-->\s*<script>[\s\S]*?<\/script>\s*/i;
const inlineScript = /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>\s*/gi;
const revision = (file) => createHash('sha256').update(fs.readFileSync(path.join(root, 'assets', 'js', file))).digest('hex').slice(0, 12);
const scriptRevisions = new Map([
  ['tawod-home.js', revision('tawod-home.js')],
  ['tawod-inner.js', revision('tawod-inner.js')],
  ['contact-conversion.js', revision('contact-conversion.js')]
]);

function versionSharedScripts(html) {
  for (const [file, assetRevision] of scriptRevisions) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`((?:\\/|(?:\\.\\.\\/)*)assets\\/js\\/${escaped})(?:\\?v=[^"'\\s>]*)?`, 'g');
    html = html.replace(pattern, `$1?v=${assetRevision}`);
  }
  return html;
}

const changes = [];
for (const file of walk(root).filter((candidate) => candidate.endsWith('.html') && !relative(candidate).startsWith('assets/project-pages/'))) {
  const oldHtml = fs.readFileSync(file, 'utf8');
  let html = oldHtml.replace(markerPattern, '').replace(analyticsScriptPattern, '').replace(legacyHomeTag, '\n');
  html = html.replace(inlineScript, (block) => (
    block.includes('tawodLeadSubmitted') && block.includes('lead_confirmation') ? '' : block
  ));
  html = versionSharedScripts(html);
  html = html.replace(/<\/head>/i, `${install}</head>`);
  html = html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');

  if (html !== oldHtml) {
    changes.push(relative(file));
    if (!check) fs.writeFileSync(file, html);
  }
}

if (check && changes.length) {
  console.error('Site analytics installation is out of date. Run node scripts/install-site-analytics.mjs');
  changes.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log(`${check ? 'Checked' : 'Installed'} site analytics; ${changes.length} file(s) ${check ? 'would change' : 'changed'}.`);
