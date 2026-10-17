import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { optimizeArticleMarkup } from '../lib/article-presentation.mjs';
import { applyContractingImagePresentation } from '../lib/contracting-image-presentation.mjs';
import { applyContractingDesign } from '../lib/contracting-design.mjs';
import { pageStyles, readerRevision } from '../lib/contracting-design-assets.mjs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

export const articleFiles = ['blog', 'dammam/blog', 'khobar/blog', 'dhahran/blog'].flatMap(root => fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory() && fs.existsSync(`${root}/${item.name}/index.html`)).map(item => `${root}/${item.name}/index.html`)).filter(file => /<article\b[^>]*class=["'][^"']*\barticle-content\b/.test(fs.readFileSync(file, 'utf8')));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];
const nodes = html => [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => { const value = JSON.parse(m[1]); return value['@graph'] || [value]; });

for (const file of articleFiles) test(`reader contract: ${file}`, () => {
  const source = fs.readFileSync(file, 'utf8');
  const html = optimizeArticleMarkup(file, source);
  assert.equal(optimizeArticleMarkup(file, html), html, 'rendering twice must not duplicate components');
  assert.match(html, /<body[^>]*\btawod-reader\b/);
  assert.equal((html.match(/class="article-byline"/g) || []).length, 1, 'one readable publisher line');
  assert.equal((html.match(/<figure[^>]*\breader-cover\b/g) || []).length, 1, 'one normalized cover');
  assert.equal((html.match(/class="reader-toc"/g) || []).length, 1, 'one native contents control');
  assert.ok(!/class="decision-publisher"/.test(html), 'the redundant publisher row must be gone');
  assert.ok(!/<button[^>]*class="faq-question"/.test(html), 'FAQ interaction must not depend on JS');
  for (const pattern of [/<title>[\s\S]*?<\/title>/g, /<h1\b[^>]*>[\s\S]*?<\/h1>/g, /<link\b[^>]*rel="canonical"[^>]*>/g, /<meta\b[^>]*name="description"[^>]*>/g]) {
    assert.deepEqual([...html.matchAll(pattern)].map(m => m[0]), [...source.matchAll(pattern)].map(m => m[0]), 'search metadata and title stay intact');
  }
  assert.deepEqual(nodes(html).filter(n => n['@type'] === 'FAQPage'), nodes(source).filter(n => n['@type'] === 'FAQPage'), 'FAQ answers and schema stay synchronized');
  const beforeLinks = [...source.matchAll(/<a\b[^>]*href="((?:tel:|https:\/\/wa\.me\/966)[^"]*)"/g)].map(m => m[1]);
  beforeLinks.forEach(href => assert.ok(html.includes(`href="${href}"`), `contact destination changed: ${href}`));
  const cover = html.match(/<img\b(?=[^>]*data-article-cover="true")[^>]*>/)?.[0];
  assert.ok(cover && attr(cover, 'loading') === 'eager' && attr(cover, 'fetchpriority') === 'high');
  const imagePath = attr(cover, 'src').replace(/^\//, '').replace(/^(?:\.\.\/)+/, '');
  assert.ok(fs.existsSync(imagePath), 'the selected photograph must exist');
  assert.ok(Number(attr(cover, 'width')) > 0 && Number(attr(cover, 'height')) > 0);
  const toc = html.match(/<details class="reader-toc">[\s\S]*?<\/details>/)[0];
  for (const match of toc.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${match[1]}"`), `broken contents target ${match[1]}`);
  assert.equal((html.match(/<table\b/g) || []).length, (html.match(/class="reader-table"/g) || []).length, 'every table gets an independent scroll region');
  assert.ok(html.includes('data-share-fallback hidden') && html.includes('data-share-status'), 'sharing must include an accessible fallback');
  assert.ok(html.includes('class="reader-skip"'), 'keyboard readers can skip navigation');
  assert.ok(!/class=["']seo-faq-item["']/.test(html), 'old FAQs use native disclosure');
  for (const faq of html.matchAll(/<details class="reader-faq">([\s\S]*?)<\/details>/g)) assert.match(faq[1], /^<summary><span>/, 'the question label, not the arrow, must receive the flexible width');
  const rendered = applyContractingDesign(file, html);
  assert.equal((rendered.match(/src="[^"']*\/tawod-reader\.js\?/g) || []).length, 1, 'one article interaction bundle');
  assert.ok(!/src="[^"']*\/(?:tawod-inner|tawod-contracting-ui)\.js/.test(rendered), 'general page scripts must not run again on articles');
  const tracking = value => [...value.matchAll(/<script\b[^>]*src=["']([^"']*(?:tawod-analytics|tawod-first-party|tawod-whatsapp-attribution)[^"']*)["']/g)].map(m => m[1]);
  assert.deepEqual(tracking(rendered), tracking(source), 'lead attribution stays intact');
  const final = applyContractingImagePresentation(file, html);
  const finalCover = final.match(/<img\b(?=[^>]*data-article-cover="true")[^>]*>/)[0];
  assert.ok(finalCover.includes(`aspect-ratio:auto ${attr(finalCover, 'width')} / ${attr(finalCover, 'height')} !important`));
});

test('immutable compiled styles match their content and obsolete profiles are absent', () => {
  const current = new Set(Object.values(pageStyles).map(p => p.split('/').at(-1)));
  for (const file of fs.readdirSync('assets/css').filter(f => /^tawod-contracting-[a-f0-9]{10}\.css$/.test(f))) {
    assert.ok(current.has(file), `obsolete stylesheet shipped: ${file}`);
    assert.ok(file.includes(createHash('sha256').update(fs.readFileSync(`assets/css/${file}`)).digest('hex').slice(0,10)), `stale immutable URL: ${file}`);
  }
  assert.equal(readerRevision, createHash('sha256').update(fs.readFileSync('assets/js/tawod-reader.js')).digest('hex').slice(0,12));
});

test('article interaction and style payloads stay within their budgets', () => {
  const js = fs.readFileSync('assets/js/tawod-reader.js');
  assert.ok(js.length < 6 * 1024 && gzipSync(js).length < 2 * 1024, 'article interaction budget exceeded');
  const oldBytes = fs.statSync('assets/js/tawod-inner.js').size + fs.statSync('assets/js/tawod-contracting-ui.js').size;
  assert.ok(js.length < oldBytes * .25, 'articles must shed at least 75% of the general interaction payload');
  for (const css of new Set(articleFiles.map(file => pageStyles[file]))) assert.ok(gzipSync(fs.readFileSync(css.slice(1))).length < 16 * 1024, `article CSS exceeds 16 KiB gzip: ${css}`);
});

test('article system leaves archives, service pages and nonarticle pages untouched', () => {
  for (const file of ['blog/index.html','blog/topics/finishing-interior/index.html','service-construction.html']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(optimizeArticleMarkup(file, source), source);
  }
  assert.ok(articleFiles.length >= 140);
});
