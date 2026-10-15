import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { optimizeArticleMarkup } from '../lib/article-presentation.mjs';

const cases = ['best-contracting-company-team-readiness-riyadh', 'best-contracting-company-riyadh', 'turnkey-commercial-fitout-riyadh'];
const images = html => [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);

test('decision covers load eagerly, reserve their own ratio and remain stable when reprocessed', () => {
  for (const slug of cases) {
    const input = readFileSync(`blog/${slug}/index.html`, 'utf8');
    const output = optimizeArticleMarkup(`blog/${slug}/index.html`, input);
    const cover = images(output).find(tag => tag.includes('data-article-cover="true"'));
    assert.ok(cover, slug);
    assert.ok(cover.includes('loading="eager"') && cover.includes('fetchpriority="high"'), slug);
    const width = cover.match(/\bwidth="(\d+)"/)[1], height = cover.match(/\bheight="(\d+)"/)[1];
    assert.ok(cover.includes(`aspect-ratio:auto ${width} / ${height} !important`), slug);
    assert.equal(optimizeArticleMarkup(`blog/${slug}/index.html`, output), output, slug);
    const bylineLogo = images(output).find(tag => tag.includes('tawod-logo-180.webp'));
    assert.ok(!bylineLogo.includes('data-article-cover='), 'publisher logo must not become the article cover');
  }
});

test('body photographs retain lazy loading while the cover is prioritized', () => {
  const input = '<article class="article-content"><img src="/cover.webp" width="420" height="560" loading="lazy"><p>المحتوى</p><img src="/gallery.webp" width="900" height="600" loading="lazy" fetchpriority="low"></article>';
  const output = optimizeArticleMarkup('blog/example/index.html', input);
  const gallery = images(output).find(tag => tag.includes('/gallery.webp'));
  assert.ok(gallery.includes('loading="lazy"') && gallery.includes('fetchpriority="low"'));
  assert.ok(!gallery.includes('data-article-cover='));
});

test('portrait share images use the existing landscape brand card without changing Article evidence or canonical', () => {
  const input = readFileSync('blog/best-contracting-company-team-readiness-riyadh/index.html', 'utf8');
  const output = optimizeArticleMarkup('blog/best-contracting-company-team-readiness-riyadh/index.html', input);
  assert.ok(output.includes('property="og:image:width" content="1200"'));
  assert.ok(output.includes('property="og:image:height" content="630"'));
  assert.ok(output.includes('name="twitter:image" content="https://tawodco.com/images/social/tawod-og-1200x630.png"'));
  for (const pattern of [/<link rel="canonical"[^>]*>/g, /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g]) {
    assert.deepEqual([...output.matchAll(pattern)].map(m => m[0]), [...input.matchAll(pattern)].map(m => m[0]));
  }
});
