import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { htmlReferences, homepageSchemaErrors, srcsetUrls } from './site-validation-helpers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const inlineImage = 'data:image/webp;base64,UklGRngMAABXRUJQVlA4WAoAAAA=';

test('single-URL attributes retain embedded data, commas and spaces', () => {
  assert.deepEqual(htmlReferences(`<img src="${inlineImage}"><a href="/files/one,two.html">link</a>
    <iframe src="/files/with space.html"></iframe>`), [inlineImage, '/files/one,two.html', '/files/with space.html']);
});

test('srcset preserves data URLs and every local density/width candidate', () => {
  assert.deepEqual(srcsetUrls(`${inlineImage} 1x, /images/large.webp 2x`), [inlineImage, '/images/large.webp']);
  assert.deepEqual(srcsetUrls(`/images/small.webp 480w, ${inlineImage} 960w, /images/large.webp 1440w`),
    ['/images/small.webp', inlineImage, '/images/large.webp']);
  assert.deepEqual(srcsetUrls(`${inlineImage}, /images/large.webp`), [inlineImage, '/images/large.webp']);
});

test('srcset handles ASCII whitespace, URL commas and future descriptor parentheses', () => {
  assert.deepEqual(srcsetUrls('\t/images/a,b.webp\n480w,\r/images/large.webp 960w,\f'),
    ['/images/a,b.webp', '/images/large.webp']);
  assert.deepEqual(srcsetUrls('/images/a.webp future(a,b), /images/b.webp 2x'),
    ['/images/a.webp', '/images/b.webp']);
  assert.deepEqual(srcsetUrls(''), []);
});

test('checks src and srcset together, plus preload imagesrcset and unquoted attributes', () => {
  assert.deepEqual(htmlReferences(`<IMG SRC=/images/fallback.webp SRCSET="${inlineImage} 1x, /images/retina.webp 2x">
    <source srcset='/images/source.webp 480w, /images/source-large.webp 960w'>
    <link href=/images/preload.webp imagesrcset="/images/preload-large.webp 2x">
    <script src="/assets/app.js"></script>`),
  ['/images/fallback.webp', inlineImage, '/images/retina.webp', '/images/source.webp',
    '/images/source-large.webp', '/images/preload.webp', '/images/preload-large.webp', '/assets/app.js']);
});

test('reads actual attribute names and skips comments, raw text and quoted markup', () => {
  assert.deepEqual(htmlReferences(`<img data-src="/not-loaded.webp" src="/real.webp" src="/duplicate.webp">
    <!-- <img src="/comment.webp"> -->
    <script src="/real.js">const template = '<img src="/template.webp">';</script>
    <style>.x::before { content: '<img src="/style.webp">'; }</style>
    <textarea><img src="/textarea.webp"></textarea>
    <iframe srcdoc='<img src="/srcdoc.webp">'></iframe>`), ['/real.webp', '/real.js']);
});

test('decodes HTML character references before resolving URL attributes', () => {
  assert.deepEqual(htmlReferences('<a href="/files/a&amp;b.html">x</a><img src="&#x2f;images/a&#44;b.webp">'),
    ['/files/a&b.html', '/images/a,b.webp']);
});

function companySchema() {
  return { '@context': 'https://schema.org', '@graph': [{
    '@type': 'GeneralContractor', '@id': 'https://tawodco.com/#organization',
    identifier: { '@type': 'PropertyValue', value: '7033495099' },
    hasOfferCatalog: { '@type': 'OfferCatalog', itemListElement: [{ '@type': 'Offer' }] },
  }] };
}

test('homepage entity validation is independent of JSON whitespace and property order', () => {
  const schema = companySchema();
  for (const whitespace of [undefined, 2, '\t']) {
    assert.deepEqual(homepageSchemaErrors([JSON.parse(JSON.stringify(schema, null, whitespace))]), []);
  }
  const company = schema['@graph'][0];
  company['@type'] = ['Organization', 'GeneralContractor'];
  company.identifier = [company.identifier];
  schema['@graph'][0] = Object.fromEntries(Object.entries(company).reverse());
  assert.deepEqual(homepageSchemaErrors([schema]), []);
});

test('homepage required values must belong to the actual contractor entity', () => {
  const schema = companySchema(), company = schema['@graph'][0];
  company.identifier.value = 'wrong';
  delete company.hasOfferCatalog;
  schema['@graph'].push({ '@type': 'Person', identifier: { value: '7033495099' }, hasOfferCatalog: {} });
  assert.deepEqual(homepageSchemaErrors([schema]), [
    'index.html organization missing identifier 7033495099',
    'index.html organization missing hasOfferCatalog',
  ]);
  company['@type'] = 'Organization';
  assert.ok(homepageSchemaErrors([schema]).some(error => error.includes('GeneralContractor organization')));
});

test('homepage rejects obsolete schema entities and priceRange', () => {
  const schema = companySchema();
  schema['@graph'][0].priceRange = '$';
  schema['@graph'].push({ '@id': 'https://tawodco.com/#localbusiness' });
  assert.deepEqual(homepageSchemaErrors([schema]), [
    'index.html entity graph still contains #localbusiness',
    'index.html entity graph still contains priceRange',
  ]);
});

test('full validator accepts embedded images and still rejects real broken resources and schema', t => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'tawod-site-validation-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const excluded = new Set(['.git', '.next', 'node_modules', 'out', 'public']);
  cpSync(root, fixture, { recursive: true, filter: source => !excluded.has(path.relative(root, source).split(path.sep)[0]) });
  const file = path.join(fixture, '404.html'), original = readFileSync(file, 'utf8');
  const validate = () => spawnSync(process.execPath, [path.join(root, 'scripts/validate-site.mjs')], {
    cwd: fixture, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
  });
  const put = markup => writeFileSync(file, original.replace('</body>', `${markup}</body>`));
  put(`<img src="${inlineImage}" srcset="${inlineImage} 1x, /images/hero-bg-mobile-optimized.webp 2x" alt="">`);
  const valid = validate();
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  assert.match(valid.stdout, /Validated \d+ HTML files/);

  put(`<img src="/__missing-original.webp" srcset="${inlineImage} 1x, /__missing-responsive.webp 2x" alt="">
    <img src="UklGR-real-missing.webp" alt="">
    <a href="/__missing-page.html">page</a><a href="/index.html#__missing-anchor">anchor</a>
    <link rel="preload" href="/images/hero-bg-mobile-optimized.webp" imagesrcset="/__missing-preload.webp 1x">
    <script src="/__missing-script.js"></script><script type="application/ld+json">{broken}</script>`);
  const broken = validate(), output = broken.stdout + broken.stderr;
  assert.equal(broken.status, 1, output);
  for (const marker of ['__missing-original.webp', '__missing-responsive.webp', 'UklGR-real-missing.webp',
    '__missing-page.html', 'missing anchor #__missing-anchor', '__missing-preload.webp', '__missing-script.js', 'invalid JSON-LD block']) {
    assert.ok(output.includes(marker), marker);
  }
  assert.doesNotMatch(output, /broken reference UklGRngMAAB/);

  writeFileSync(file, original);
  const homeFile = path.join(fixture, 'index.html');
  const home = readFileSync(homeFile, 'utf8').replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (all, start, raw, end) => {
      const schema = JSON.parse(raw);
      const company = schema['@graph']?.find(entity => entity['@id'] === 'https://tawodco.com/#organization');
      if (!company) return all;
      delete company.identifier;
      schema['@graph'].push({ '@type': 'Person', identifier: { value: '7033495099' } });
      return start + JSON.stringify(schema) + end;
    });
  writeFileSync(homeFile, home);
  const invalidCompany = validate();
  assert.equal(invalidCompany.status, 1, invalidCompany.stdout + invalidCompany.stderr);
  assert.match(invalidCompany.stderr, /organization missing identifier 7033495099/);
});

test('static generation preserves developer schema across analytics reinstallation', t => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'tawod-generation-validation-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const excluded = new Set(['.git', '.next', 'node_modules', 'out', 'public']);
  cpSync(root, fixture, { recursive: true, filter: source => !excluded.has(path.relative(root, source).split(path.sep)[0]) });
  const article = path.join(fixture, 'blog/best-construction-company-riyadh/index.html');
  const developerGraph = html => html.match(/<script\b[^>]*id="eslam-developer-credit-schema"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const before = developerGraph(readFileSync(article, 'utf8'));
  assert.ok(before, 'The source article must retain its developer graph.');
  for (const args of [['scripts/run-static-pages.mjs'], ['scripts/install-site-analytics.mjs'],
    ['scripts/run-static-pages.mjs', '--check'], ['scripts/generate-dammam-silo.mjs', '--check']]) {
    const result = spawnSync(process.execPath, args, { cwd: fixture, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  assert.deepEqual(JSON.parse(developerGraph(readFileSync(article, 'utf8'))), JSON.parse(before));
});
