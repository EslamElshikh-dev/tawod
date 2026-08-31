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
const firstPartyVersion = createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'assets/js/tawod-first-party.js')))
  .digest('hex')
  .slice(0, 12);
const contactConversionFile = path.join(root, 'assets/js/contact-conversion.js');
const contactConversionVersion = fs.existsSync(contactConversionFile)
  ? createHash('sha256').update(fs.readFileSync(contactConversionFile)).digest('hex').slice(0, 12)
  : null;
const start = '<!-- TAWOD_ANALYTICS_START -->';
const end = '<!-- TAWOD_ANALYTICS_END -->';
const install = `${start}<script src="/assets/js/tawod-analytics.js?v=${version}" defer></script><script src="/assets/js/tawod-first-party.js?v=${firstPartyVersion}" defer></script>${end}`;
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'out', 'public']);
const ignoredHtmlFiles = new Set(['admin.html']);

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (ignoredDirectories.has(entry.name)) return [];
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const markerPattern = new RegExp(`${start}[\\s\\S]*?${end}\\s*`, 'g');
const analyticsScriptPattern = /\s*<script\b[^>]*\bsrc=["']\/assets\/js\/tawod-analytics\.js(?:\?v=[^"']*)?["'][^>]*><\/script>\s*/gi;
const firstPartyScriptPattern = /\s*<script\b[^>]*\bsrc=["']\/assets\/js\/tawod-first-party\.js(?:\?v=[^"']*)?["'][^>]*><\/script>\s*/gi;
const contactConversionUrlPattern = /assets\/js\/contact-conversion\.js(?:\?v=[^"']*)?/gi;
const legacyHomeTag = /\s*<!-- Google tag: queued immediately,[\s\S]*?-->\s*<script>[\s\S]*?<\/script>\s*/i;
const inlineScript = /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>\s*/gi;
const formName = (file) => {
  if (file === 'index.html') return 'home_quote_request';
  if (file === 'contact.html') return 'contact_quote_request';
  const city = file.match(/^(dammam|khobar|dhahran)\/contact\/index\.html$/)?.[1];
  return city ? `${city}_quote_request` : 'contact_quote_request';
};
const normalizeLeadForms = (html, file) => html.replace(
  /<form\b(?=[^>]*\baction=["']https:\/\/(?:www\.)?formsubmit\.co\/[^"']+["'])[^>]*>[\s\S]*?<\/form>/gi,
  (block) => {
    const analyticsName = formName(file);
    let normalized = block.replace(/^<form\b[^>]*>/i, (tag) => {
      const clean = tag.replace(/\sdata-analytics-form=["'][^"']*["']/i, '');
      return clean.replace(/>$/, ` data-analytics-form="${analyticsName}">`);
    });
    const next = '<input name="_next" type="hidden" value="https://tawodco.com/thank-you.html">';
    if (/<input\b[^>]*\bname=["']_next["'][^>]*>/i.test(normalized)) {
      return normalized.replace(/<input\b[^>]*\bname=["']_next["'][^>]*>/i, next);
    }
    return normalized.replace(/^<form\b[^>]*>/i, (tag) => `${tag}${next}`);
  }
);
const changes = [];
for (const file of walk(root).filter((candidate) => {
  if (!candidate.endsWith('.html')) return false;
  const rel = relative(candidate);
  return !rel.startsWith('assets/project-pages/') && !ignoredHtmlFiles.has(rel);
})) {
  const oldHtml = fs.readFileSync(file, 'utf8');
  let html = oldHtml
    .replace(markerPattern, '')
    .replace(analyticsScriptPattern, '')
    .replace(firstPartyScriptPattern, '')
    .replace(legacyHomeTag, '\n');
  html = html.replace(inlineScript, (block) => (
    block.includes('tawodLeadSubmitted') && block.includes('lead_confirmation') ? '' : block
  ));
  html = html.replace(/<\/head>/i, `${install}</head>`);
  html = normalizeLeadForms(html, relative(file));
  if (contactConversionVersion) {
    html = html.replace(contactConversionUrlPattern, `assets/js/contact-conversion.js?v=${contactConversionVersion}`);
  }
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
