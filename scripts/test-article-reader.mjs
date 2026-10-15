import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { optimizeArticleMarkup } from '../lib/article-presentation.mjs';
import { applyContractingImagePresentation } from '../lib/contracting-image-presentation.mjs';

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
  const final = applyContractingImagePresentation(file, html);
  const finalCover = final.match(/<img\b(?=[^>]*data-article-cover="true")[^>]*>/)[0];
  assert.ok(finalCover.includes(`aspect-ratio:auto ${attr(finalCover, 'width')} / ${attr(finalCover, 'height')} !important`));
});

test('article system leaves archives, service pages and nonarticle pages untouched', () => {
  for (const file of ['blog/index.html','blog/topics/finishing-interior/index.html','service-construction.html']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(optimizeArticleMarkup(file, source), source);
  }
  assert.ok(articleFiles.length >= 140);
});
