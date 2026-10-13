import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { englishPairs } from './build-english-site.mjs';
import { localizeArabicMarkup } from './english-shared-layout.mjs';
const read = file => fs.readFileSync(file, 'utf8');
const main = html => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1];
const sources = html => [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1].replace(/^\//, ''));
const sections = html => [...html.matchAll(/<section\b[^>]*>/gi)].map(m => m[0].match(/\bid=["']([^"']*)["']/)?.[1] ?? '');
const visible = html => html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, '');
test('English home preserves every Arabic section and source image, with matching FAQ schema', () => {
 const ar = main(read('index.html')), en = main(read('en/index.html'));
 assert.deepEqual(sections(en), sections(ar));
 assert.deepEqual(sources(en), sources(ar));
 assert.equal((en.match(/class=["']faq-question["']/g) ?? []).length, 10);
 assert.match(en, /contracting-hero-grid/);
 assert.match(en, /hero-bg-desktop-optimized\.webp/);
 const graph = JSON.parse(read('en/index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const faq = graph.find(entity => entity['@type'] === 'FAQPage');
 assert.equal(faq.mainEntity.length, 10);
 for (const question of faq.mainEntity) assert.ok(visible(en).replace(/\s+/g, ' ').includes(question.name));
});
test('English pages keep their language, shared design, paired navigation and request flow', () => {
 for (const pair of englishPairs) {
  const file = pair.en.endsWith('/') ? `${pair.en.slice(1)}index.html` : pair.en.slice(1), html = read(file);
  assert.match(html, /lang="en-SA" dir="ltr"/);
  assert.match(html, /tawod-contracting tawod-english/);
  assert.ok(html.includes(`href="${pair.ar}" lang="ar"`), `${file}: Arabic switch`);
  assert.ok(html.includes(`href="${pair.en}" lang="en"`), `${file}: English switch`);
  assert.ok(html.includes(`href='https://tawodco.com${pair.ar}'`));
  assert.ok(html.includes(`href='https://tawodco.com${pair.en}'`));
  assert.doesNotMatch(visible(html), /[\u0600-\u06ff]/, file);
  assert.match(html, /tawod-(?:home-performance|contracting-[\da-f]+)\.css/);
 }
 for (const file of ['en/index.html', 'en/contact/index.html']) {
  const html = read(file);
  assert.match(html, /<form\b[^>]*lang="en"/);
  assert.match(html, /name=["']_next["'][^>]*value="https:\/\/tawodco\.com\/en\/thank-you\.html"/);
  assert.equal((html.match(/src="\/assets\/js\/contact-conversion\.js/g) ?? []).length, 1);
 }
 assert.match(read('en/index.html'), /data-analytics-form="en_home_quote_request"/);
});
test('the English catalogue reuses the Arabic featured-card template and all five records', () => {
 const en = main(read('en/projects/index.html'));
 const template = read('lib/legacy-pages.ts').match(/const projectsShowcaseMarkup = `([\s\S]*?)`;/)[1];
 assert.deepEqual(sources(en), sources(template));
 assert.equal((en.match(/data-project=/g) ?? []).length, 5);
 assert.equal((en.match(/tawod-project-card-featured/g) ?? []).length, 1);
 assert.match(en, /29,122 m²/);
});
test('new Arabic copy requires a reviewed translation while backend field names remain intact', () => {
 assert.throws(() => localizeArabicMarkup('<p>نص جديد يحتاج ترجمة</p>', new Map()), /English translation required/);
 assert.equal(localizeArabicMarkup('<input name="رقم_الجوال" value=""><p>رقم الجوال</p>', new Map()), '<input name="رقم_الجوال" value=""><p>Mobile number</p>');
});
