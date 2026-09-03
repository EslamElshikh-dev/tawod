import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const redirects = Array.isArray(config.redirects) ? config.redirects : [];

const expected = new Map([
  ['/2026/06/blog-post_25.html', '/blog/general-contracting-project-management-riyadh/'],
  ['/2026/06/blog-post_739.html', '/blog/mechanical-mep-works-riyadh/'],
  ['/2026/06/blog-post_13.html', '/blog/electrical-installation-maintenance-riyadh/'],
  ['/2026/06/blog-post.html', '/blog/plumbing-installation-riyadh/'],
  ['/2026/05/blog-post_299.html', '/blog/facades-interior-decor-insulation-riyadh/'],
  ['/2026/05/blog-post_20.html', '/blog/bone-contractor-turnkey-riyadh/'],
  ['/2026/05/blog-post_18.html', '/blog/finishing-facades-restoration-riyadh/'],
  ['/2026/05/blog-post.html', '/blog/contracting-riyadh-project-guide/']
]);

function isBloggerHostRule(rule) {
  return rule.has?.some((condition) => condition.type === 'host' && condition.value === 'blog.tawodco.com');
}

for (const [source, destinationPath] of expected) {
  const destination = `https://tawodco.com${destinationPath}`;
  const rule = redirects.find((candidate) => candidate.source === source && isBloggerHostRule(candidate));
  if (!rule) throw new Error(`Missing Blogger redirect for ${source}`);
  if (rule.destination !== destination || rule.statusCode !== 301) {
    throw new Error(`Invalid Blogger redirect for ${source}`);
  }

  const localTarget = path.join(root, destinationPath.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(localTarget)) throw new Error(`Missing local redirect target: ${destinationPath}`);
}

const fallback = redirects.find((rule) => rule.source === '/:path*' && isBloggerHostRule(rule));
if (!fallback || fallback.destination !== 'https://tawodco.com/blog/' || fallback.statusCode !== 301) {
  throw new Error('Missing Blogger host fallback redirect');
}

console.log(`Validated ${expected.size} Blogger post redirects and the host fallback.`);
