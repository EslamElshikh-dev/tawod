import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { repairContractingSeo } from '../lib/contracting-seo.mjs';
import { company, companySchema, riyadh } from './business-branches.mjs';
import { responsiveImages } from '../lib/contracting-image-assets.mjs';
import { optimizeArticleMarkup } from '../lib/article-presentation.mjs';

const scripts = html => [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .flatMap(m => { const d = JSON.parse(m[1]); return d['@graph'] || [d]; });
const anchors = html => [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1/gi)].map(m => m[2]);

test('main company schema uses verified Riyadh details and assigns serviceType to Service', () => {
  const before = fs.readFileSync('index.html', 'utf8');
  const after = repairContractingSeo('index.html', before);
  const business = scripts(after).find(n => n['@id'] === company.schemaId);
  assert.equal(business['@type'], 'GeneralContractor');
  assert.equal(business.serviceType, undefined);
  assert.deepEqual(business.address, { '@type': 'PostalAddress', ...riyadh.address });
  assert.deepEqual(business.geo, { '@type': 'GeoCoordinates', ...riyadh.geo });
  assert.equal(business.hasMap, riyadh.mapsUrl);
  assert.equal(business.telephone, '+966551128884');
  assert.equal(business.identifier.value, '7033495099');
  assert.equal(business.hasOfferCatalog.itemListElement.length, 6);
  assert.ok(business.hasOfferCatalog.itemListElement.every(o => o.itemOffered.serviceType && o.itemOffered.provider['@id'] === company.schemaId));
  assert.ok(after.includes(riyadh.formattedAddress));
  assert.ok(after.includes('الجمعة مغلق'));
});

test('repairs are idempotent and preserve headings, canonical, lead forms and tracking', () => {
  for (const file of ['index.html', 'contact.html', 'service-finishing.html', 'khobar/index.html', 'dhahran/index.html']) {
    const before = fs.readFileSync(file, 'utf8'), after = repairContractingSeo(file, before);
    assert.equal(repairContractingSeo(file, after), after, file);
    for (const pattern of [/<title>[\s\S]*?<\/title>/gi, /<h1\b[\s\S]*?<\/h1>/gi, /<link\b[^>]*rel=["']canonical["'][^>]*>/gi, /<(?:form|input|select|textarea)\b[^>]*>/gi, /<script\b[^>]*src=["'][^"']*["'][^>]*>/gi]) {
      assert.deepEqual([...after.matchAll(pattern)].map(m => m[0]), [...before.matchAll(pattern)].map(m => m[0]), file);
    }
    assert.deepEqual(anchors(after).filter(a => a !== riyadh.mapsUrl), anchors(before).filter(a => a !== riyadh.mapsUrl), file);
    assert.ok(!/<footer\b[\s\S]*?<h4\b[^>]*footer-title/.test(after), file);
  }
});

test('city silos retain their own navigation and collection items link to their own actual articles', () => {
  for (const city of ['dammam', 'khobar', 'dhahran']) {
    const file = `${city}/blog/index.html`, before = fs.readFileSync(file, 'utf8'), after = repairContractingSeo(file, before);
    assert.deepEqual(anchors(after), anchors(before), city);
    assert.ok(!after.includes('contracting-service-areas'));
    const nodes = scripts(after), list = nodes.find(n => n['@type'] === 'ItemList');
    assert.equal(nodes.some(n => n['@type'] === 'Blog' && n.blogPost), false);
    assert.equal(list.numberOfItems, 10);
    const cards = [...before.matchAll(/<h2>([^<]+)<\/h2>/g)].map(m => m[1]);
    for (const [i, item] of list.itemListElement.entries()) {
      assert.equal(item.position, i + 1);
      assert.ok(cards.includes(item.name), `${city}: title must match a visible card`);
      assert.ok(item.url.startsWith(`https://tawodco.com/${city}/blog/`));
      const article = fs.readFileSync(new URL(item.url).pathname.slice(1) + 'index.html', 'utf8');
      assert.ok(scripts(article).some(n => n['@type'] === 'Article' && n.image && n.author && n.datePublished && n.dateModified));
    }
  }
});

test('responsive sets exist while original source URLs and image alternatives remain available', () => {
  assert.ok(Object.keys(responsiveImages).length > 0);
  for (const [original, variants] of Object.entries(responsiveImages)) {
    assert.ok(fs.existsSync(original));
    assert.equal(variants[0].width, 480);
    assert.ok(fs.statSync(variants[0].url.slice(1)).size < fs.statSync(original).size);
    for (const variant of variants) assert.ok(fs.existsSync(variant.url.slice(1)));
    const input = `<img src="/${original}" width="1200" height="1600" alt="مشروع تعاود" loading="lazy">`;
    const output = repairContractingSeo('blog/example/index.html', input);
    assert.ok(output.includes(`src="/${original}"`));
    assert.ok(output.includes('alt="مشروع تعاود"'));
    assert.ok(output.includes('srcset=') && output.includes('sizes='));
    assert.equal(repairContractingSeo('blog/example/index.html', output), output);
  }
  const hero = '<img src="/images/hero-bg-desktop-optimized.webp" alt="" loading="eager">';
  assert.equal(repairContractingSeo('index.html', hero), hero);
});

test('an English company name keeps the same verified office identity', () => {
  const english = companySchema({ name: 'Tawod General Contracting Company' });
  assert.equal(english.name, 'Tawod General Contracting Company');
  assert.equal(english['@id'], company.schemaId);
  assert.equal(english.address.postalCode, '13313');
});

test('article author and cover render once before scripts, without changing SEO or contact links', () => {
  for (const file of ['blog/best-bone-construction-company-riyadh/index.html', 'khobar/blog/best-general-contracting-company-khobar/index.html', 'dhahran/blog/best-general-contracting-company-dhahran/index.html']) {
    const before = fs.readFileSync(file, 'utf8'), after = optimizeArticleMarkup(file, before);
    assert.equal(optimizeArticleMarkup(file, after), after, file);
    assert.equal((after.match(/class="article-byline"/g) || []).length, 1);
    assert.equal((after.match(/class="article-cover-figure"/g) || []).length, 1);
    assert.deepEqual(anchors(after), anchors(before));
    assert.deepEqual(scripts(after), scripts(before));
    assert.ok(after.includes('/images/logo/tawod-logo-180.webp'));
    assert.ok(!after.includes('src="/images/logo/tawod-logo.png" alt="شركة تعاود للمقاولات"'));
  }
  const collection = fs.readFileSync('khobar/blog/index.html', 'utf8');
  assert.equal(optimizeArticleMarkup('khobar/blog/index.html', collection), collection);
});
