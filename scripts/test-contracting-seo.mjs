import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { repairContractingSeo } from '../lib/contracting-seo.mjs';
import { company, companySchema, riyadh } from './business-branches.mjs';
import { responsiveImages } from '../lib/contracting-image-assets.mjs';
import { optimizeArticleMarkup } from '../lib/article-presentation.mjs';
import sharp from 'sharp';
import { applyContractingImagePresentation } from '../lib/contracting-image-presentation.mjs';

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
    assert.deepEqual(anchors(after).filter(a => a !== riyadh.mapsUrl), anchors(before).filter(a => a !== riyadh.mapsUrl).map(a => a === 'tel:0551128884' ? 'tel:+966551128884' : a), file);
    assert.ok(!/<footer\b[\s\S]*?<h4\b[^>]*footer-title/.test(after), file);
  }
});

test('city silos retain their own navigation and collection items link to their own actual articles', () => {
  for (const city of ['dammam', 'khobar', 'dhahran']) {
    const file = `${city}/blog/index.html`, before = fs.readFileSync(file, 'utf8'), after = repairContractingSeo(file, before);
    assert.deepEqual(anchors(after), anchors(before).map(a => a === 'tel:0551128884' ? 'tel:+966551128884' : a), city);
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
    assert.ok(fs.statSync(variants[0].url.slice(1)).size < 150 * 1024, `${original}: card variant is too large`);
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

test('service images retain the native original detail instead of enlarged thumbnails', async () => {
  const photographs = {
    construction: 'images/projects/construction-01.webp',
    turnkey: 'images/projects/villa-finishing-01.webp',
    restoration: 'images/projects/faisaliah-villa-facades-finishing-01-gbp.jpg',
    finishing: 'images/projects/interior-01.webp',
    decor: 'images/landing/finishing-riyadh.webp',
  };
  for (const service of ['construction', 'turnkey', 'restoration', 'finishing', 'decor']) {
    const stem = `images/services/service-${service}-riyadh`;
    const source = await sharp(photographs[service]).metadata();
    const fallback = await sharp(`${stem}.webp`).metadata();
    assert.deepEqual([fallback.width, fallback.height], [source.width, source.height], service);
    const variants = responsiveImages[`${stem}.webp`];
    assert.equal(variants.at(-1).width, source.width, `${service}: full-density variant is missing`);
    for (const variant of variants) {
      const actual = await sharp(variant.url.slice(1)).metadata();
      assert.equal(actual.width, variant.width, `${service}: incorrect srcset width`);
      assert.ok(actual.width <= source.width, `${service}: original was upscaled`);
    }
    const originalPixels = await sharp(photographs[service]).removeAlpha().raw().toBuffer();
    const restoredPixels = await sharp(`${stem}.webp`).removeAlpha().raw().toBuffer();
    assert.equal(restoredPixels.length, originalPixels.length);
    let squaredError = 0;
    for (let i = 0; i < originalPixels.length; i++) squaredError += (originalPixels[i] - restoredPixels[i]) ** 2;
    const psnr = 10 * Math.log10(255 ** 2 / (squaredError / originalPixels.length));
    assert.ok(psnr > 35, `${service}: excessive compression (${psnr.toFixed(1)} dB)`);
  }
});

test('existing campaign srcsets, English photos and small field photos use the correct master', () => {
  const campaign = '<div class="card-media"><img src="/images/blog/tawod-gbp-floor-alignment-480.webp" srcset="/images/blog/tawod-gbp-floor-alignment-480.webp 480w, /images/blog/tawod-gbp-floor-alignment-960.webp 960w" alt="تفاصيل الأرضيات" loading="lazy"></div>';
  const rendered = applyContractingImagePresentation('blog/index.html', campaign);
  assert.ok(rendered.includes('1122w'), 'retained campaign master must be available on dense screens');
  assert.equal(applyContractingImagePresentation('blog/index.html', rendered), rendered);
  const small = '<img src="/images/projects/arouba-mosque-villas-01.webp" alt="صورة ميدانية">';
  const smallRendered = applyContractingImagePresentation('en/projects/arouba-mosque-villas/index.html', small);
  assert.ok(smallRendered.includes('--photo-native-width:420px;'));
  assert.ok(smallRendered.includes('tawod-native-photo'));
  assert.equal(applyContractingImagePresentation('en/projects/arouba-mosque-villas/index.html', smallRendered), smallRendered);
  assert.equal(applyContractingImagePresentation('maintenance/index.html', campaign), campaign);
});

test('large featured projects and two-column campaign cards select enough source pixels', () => {
  const featured = '<article class="tawod-project-card tawod-project-card-featured"><a class="tawod-project-media"><img src="/images/projects/faisaliah-villa-facades-finishing-01-v3.webp" alt="فيلا حي الفيصلية"></a></article>';
  const rendered = applyContractingImagePresentation('projects.html', featured);
  assert.ok(rendered.includes('data-image-slot="featured-project"'));
  assert.ok(rendered.includes('85vw, 860px'), 'the 741px-wide featured photo must not use a 440px slot');
  assert.equal(applyContractingImagePresentation('projects.html', rendered), rendered);
  const campaign = '<article class="article-card"><div class="card-media card-media--campaign"><a><img src="/images/blog/tawod-gbp-floor-alignment-480.webp" alt="تفاصيل الأرضيات"></a></div></article>';
  const campaignRendered = applyContractingImagePresentation('blog/index.html', campaign);
  assert.ok(campaignRendered.includes('data-image-slot="campaign-card"'));
  assert.ok(campaignRendered.includes('60vw, 620px'), 'the 542px-wide campaign card must not use a 480px slot');
  assert.equal(applyContractingImagePresentation('blog/index.html', campaignRendered), campaignRendered);
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
