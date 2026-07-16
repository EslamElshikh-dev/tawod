import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function relativePath(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function prefixFor(file) {
  return '../'.repeat(relativePath(file).split('/').length - 1);
}

function normalizeTypographyLink(html, file) {
  const href = `${prefixFor(file)}assets/css/tawod-typography.css`;
  const linkPattern = /<link\b[^>]*href=["'][^"']*tawod-typography\.css["'][^>]*>\s*/gi;
  const withoutDuplicates = html.replace(linkPattern, '');
  return withoutDuplicates.replace(/<\/head>/i, `<link href="${href}" rel="stylesheet"></head>`);
}

function normalizeHomepageHero(html) {
  const badge = '<span class="hero-badge"><i class="fa-solid fa-award"></i> شركة مقاولات عامة في الرياض بإدارة هندسية وتنفيذ متكامل</span>';
  const heading = '<h1>نبني مشروعك على أسس واضحة ونحوّل التفاصيل إلى نتيجة تليق باستثمارك <span>شركة تعاود للمقاولات العامة بالرياض</span></h1>';
  const paragraph = '<p>نقدّم حلول المقاولات العامة للمشاريع السكنية والتجارية في الرياض، من أعمال البناء والعظم والترميم إلى التشطيب والديكور والكهرباء والسباكة وتسليم المفتاح، ضمن نطاق عمل منظم ومتابعة هندسية وتنسيق دقيق بين جميع مراحل التنفيذ.</p>';

  const heroPattern = /(<section\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?<div\b[^>]*class=["'][^"']*\bhero-content\b[^"']*["'][^>]*>)([\s\S]*?)(<div\b[^>]*class=["'][^"']*\bhero-buttons\b[^"']*["'][^>]*>)/i;

  return html.replace(heroPattern, (match, opening, content, buttons) => {
    let updated = content;
    updated = updated.replace(/<span\b[^>]*class=["'][^"']*\bhero-badge\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i, badge);
    updated = updated.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, heading);
    updated = updated.replace(/<p\b[^>]*>[\s\S]*?<\/p>/i, paragraph);
    return `${opening}${updated}${buttons}`;
  });
}

function patchStaticBuilder() {
  const file = path.join(root, 'scripts', 'build-static-pages.mjs');
  if (!fs.existsSync(file)) return false;

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(
    "skip:['privacy-policy.html','404.html']",
    "skip:['privacy-policy.html','404.html','thank-you.html']"
  );

  if (!content.includes('tawod-typography\\.css')) {
    const systemInjection = 'if(!/tawod-system\\.css/.test(h))h=h.replace(/<\\/head>/i,`<link href="${prefix(f)}assets/css/tawod-system.css" rel="stylesheet"></head>`);';
    const typographyInjection = 'if(!/tawod-typography\\.css/.test(h))h=h.replace(/<\\/head>/i,`<link href="${prefix(f)}assets/css/tawod-typography.css" rel="stylesheet"></head>`);';
    content = content.replace(systemInjection, `${systemInjection}${typographyInjection}`);
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    return true;
  }
  return false;
}

const changed = [];

for (const file of walk(root).filter((item) => item.endsWith('.html'))) {
  const original = fs.readFileSync(file, 'utf8');
  let html = normalizeTypographyLink(original, file);

  if (relativePath(file) === 'index.html') {
    html = normalizeHomepageHero(html);
  }

  if (html !== original) {
    fs.writeFileSync(file, html);
    changed.push(relativePath(file));
  }
}

if (patchStaticBuilder()) changed.push('scripts/build-static-pages.mjs');

console.log(`Typography enhancement complete; ${changed.length} file(s) changed.`);
changed.forEach((file) => console.log(` - ${file}`));
