import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSeoSharing, sharingMetadata, sharingKeys } from './normalize-seo-sharing.mjs';

const page = extra => `<!doctype html><html lang="ar"><head><title>تعاود &amp; المشروع</title><meta name="description" content="نطاق &quot;المشروع&quot;"><link href="https://tawodco.com/test/" rel="canonical"><meta property="og:title" content="العنوان المعتمد"><meta property="og:image" content="https://tawodco.com/images/project.webp">${extra || ''}</head><body><script type="application/ld+json">{"@type":"Article"}</script></body></html>`;

test('fills legacy sharing fields with approved copy and image, without changing the article', () => {
  const old = page();
  const html = normalizeSeoSharing(old);
  const metadata = sharingMetadata(html);
  for (const key of sharingKeys) assert.equal(metadata.filter(m => (m.property || m.name) === key).length, 1, key);
  const value = key => metadata.find(m => (m.property || m.name) === key).content;
  assert.equal(value('og:title'), 'العنوان المعتمد');
  assert.equal(value('twitter:title'), 'العنوان المعتمد');
  assert.equal(value('og:description'), 'نطاق "المشروع"');
  assert.equal(value('og:type'), 'article');
  assert.equal(value('twitter:image'), value('og:image'));
  assert.equal(html.split('<body>')[1], old.split('<body>')[1]);
  assert.equal(normalizeSeoSharing(html), html);
});

test('repairs a duplicate share URL to the single canonical URL', () => {
  const html = normalizeSeoSharing(page('<meta property="og:url" content="https://old.example"><meta name="og:url" content="https://other.example">'));
  const urls = sharingMetadata(html).filter(m => (m.property || m.name) === 'og:url');
  assert.equal(urls.length, 1);
  assert.equal(urls[0].content, 'https://tawodco.com/test/');
});

test('preserves noindex utility pages and requires an existing approved image', () => {
  const old = page('<meta name="robots" content="noindex,follow">');
  assert.equal(normalizeSeoSharing(old), old);
  assert.throws(() => normalizeSeoSharing(page().replace(/<meta property="og:image"[^>]*>/, '')), /approved image/);
  const english = normalizeSeoSharing(page().replace('lang="ar"', 'lang="en"'));
  assert.equal(sharingMetadata(english).find(m => m.property === 'og:locale').content, 'en_SA');
});
