import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { buildSitemaps, generateSitemaps } from './generate-sitemaps.mjs';

const origin = 'https://tawodco.com';
const today = '2026-10-08';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'tawod-sitemap-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (file, content) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), content); };
  const html = (url, body, extra = '', robots = 'index,follow') => `<!doctype html><html lang="ar"><head><title>دليل مشروع تعاود بالرياض</title><meta name="description" content="محتوى عملي عن المشروع"><meta name="robots" content="${robots}"><link rel="canonical" href="${url}">${extra}</head><body><main><h1>مشروع تعاود</h1>${body}</main><footer>حقوق النشر 2026</footer></body></html>`;
  return { root, put, html };
}

test('includes every canonical page once, excludes utility pages, and partitions the index without overlap', t => {
  const { root, put, html } = fixture(t);
  put('index.html', html(origin + '/', '<p>الرئيسية</p>'));
  put('blog/new-guide/index.html', html(origin + '/blog/new-guide/', '<p>مقال جديد</p>'));
  put('maintenance/index.html', html(origin + '/maintenance/', '<p>الصيانة</p>'));
  put('lp/test/index.html', html(origin + '/lp/test/', '<p>إعلان</p>', '', 'noindex,follow'));
  put('thank-you.html', html(origin + '/thank-you.html', '<p>شكرًا</p>', '', 'noindex,follow'));
  const result = buildSitemaps({ root, today });
  assert.equal(result.pages.length, 3);
  assert.equal(Object.values(result.groups).reduce((sum, n) => sum + n, 0), 3);
  assert.equal(result.groups.blog, 1);
  assert.equal(result.groups.maintenance, 1);
  assert.doesNotMatch(result.outputs['sitemap.xml'], /thank-you|\/lp\//);
  assert.doesNotMatch(result.outputs['sitemap-index.xml'], /sitemap-turnkey/);
  assert.match(result.outputs['robots.txt'], /Sitemap: https:\/\/tawodco.com\/sitemap-index.xml/);
});

test('preserves lastmod across later builds and template revisions; changes only the changed page', t => {
  const { root, put, html } = fixture(t);
  const url = origin + '/';
  put('index.html', html(url, '<p>نطاق المشروع الأول</p>', '<link rel="stylesheet" href="/assets/a.css?v=one">'));
  put('about.html', html(origin + '/about.html', '<p>فريق تعاود</p>'));
  put('sitemap.xml', `<?xml version="1.0"?><urlset><url><loc>${url}</loc><lastmod>2026-08-20</lastmod></url></urlset>`);
  const first = generateSitemaps({ root, today });
  assert.equal(first.pages.find(p => p.url === url).lastmod, '2026-08-20');
  put('index.html', html(url, '<p>نطاق المشروع الأول</p>', '<link rel="stylesheet" href="/assets/a.css?v=two">').replace('حقوق النشر 2026', 'حقوق النشر 2027'));
  const repeat = generateSitemaps({ root, today: '2026-10-09', check: true });
  assert.deepEqual(repeat.outputs, first.outputs);
  put('index.html', html(url, '<p>نطاق المشروع الثاني بعد مراجعة المخططات</p>'));
  assert.throws(() => generateSitemaps({ root, today: '2026-10-09', check: true }), /stale/);
  const updated = generateSitemaps({ root, today: '2026-10-09' });
  assert.equal(updated.pages.find(p => p.url === url).lastmod, '2026-10-09');
  assert.equal(updated.pages.find(p => p.url.endsWith('/about.html')).lastmod, today);
});

test('indexes real page images, ignores branding, and detects changed image bytes at the same URL', t => {
  const { root, put, html } = fixture(t);
  put('images/project.jpg', 'first photo');
  put('images/project&detail.jpg', 'detail photo');
  put('images/logo/brand.png', 'logo');
  put('index.html', html(origin + '/', '<img src="images/project.jpg" alt="مشروع"><img src="images/project.jpg" alt="نفس المشروع"><img src="images/project&amp;detail.jpg" alt="تفاصيل المشروع"><img src="images/logo/brand.png" alt="تعاود">'));
  const first = generateSitemaps({ root, today });
  assert.equal(first.uniqueImages, 2);
  assert.equal(first.imageReferences, 2);
  assert.match(first.outputs['sitemap.xml'], /<image:loc>https:\/\/tawodco.com\/images\/project.jpg<\/image:loc>/);
  assert.match(first.outputs['sitemap.xml'], /<image:loc>https:\/\/tawodco.com\/images\/project&amp;detail.jpg<\/image:loc>/);
  assert.doesNotMatch(first.outputs['sitemap.xml'], /brand.png|image:title|image:caption/);
  put('images/project.jpg', 'new photo');
  assert.equal(buildSitemaps({ root, today: '2026-10-09' }).pages[0].lastmod, '2026-10-09');
});

test('requires reciprocal language annotations', t => {
  const { root, put, html } = fixture(t);
  const links = `<link rel="alternate" hreflang="ar-SA" href="${origin}/"><link rel="alternate" hreflang="en-SA" href="${origin}/en/"><link rel="alternate" hreflang="x-default" href="${origin}/">`;
  put('index.html', html(origin + '/', '<p>العربية</p>', links));
  put('en/index.html', html(origin + '/en/', '<p>English</p>'));
  assert.throws(() => buildSitemaps({ root, today }), /hreflang is not reciprocal/);
  put('en/index.html', html(origin + '/en/', '<p>English</p>', links));
  const result = buildSitemaps({ root, today });
  assert.equal((result.outputs['sitemap.xml'].match(/xhtml:link/g) || []).length, 6);
});

test('rejects conflicting canonicals, missing images, future dates, and indexable advertising pages', t => {
  const { root, put, html } = fixture(t);
  put('index.html', html(origin + '/wrong/', '<p>نص</p>'));
  assert.throws(() => buildSitemaps({ root, today }), /canonical must be/);
  put('index.html', html(origin + '/', '<img src="images/missing.jpg" alt="مشروع">'));
  assert.throws(() => buildSitemaps({ root, today }), /missing sitemap image/);
  put('index.html', html(origin + '/', '<p>نص</p>', '<script type="application/ld+json">{"@type":"Article","dateModified":"2027-01-01"}</script>'));
  assert.throws(() => buildSitemaps({ root, today }), /future lastmod/);
  put('index.html', html(origin + '/', '<p>نص</p>'));
  put('lp/test/index.html', html(origin + '/lp/test/', '<p>إعلان</p>'));
  assert.throws(() => buildSitemaps({ root, today }), /must declare noindex/);
});
