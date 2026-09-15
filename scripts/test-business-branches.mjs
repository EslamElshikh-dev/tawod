import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { branchSchema, company, dammam, enhanceBranchHtml, stripBranchMarkup, workingHours } from './business-branches.mjs';

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);
const nodes = html => [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .flatMap(([, value]) => { const parsed = JSON.parse(value); return parsed['@graph'] || [parsed]; });
const visible = html => html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const pages = walk('dammam');
for (const file of [...pages, 'contact.html']) {
  const html = fs.readFileSync(file, 'utf8');
  const graph = nodes(html);
  const branch = graph.filter(node => node['@id'] === dammam.schemaId);
  assert.equal(branch.length, 1, `${file}: branch entity must occur once`);
  assert.deepEqual(branch[0], branchSchema(), `${file}: branch data drift`);
  const content = visible(html);
  for (const value of [dammam.formattedAddress, company.displayTelephone, company.email, workingHours.label, workingHours.closedLabel]) {
    assert.ok(content.includes(value), `${file}: schema information is missing from visible content: ${value}`);
  }
  assert.equal(enhanceBranchHtml(html, file), html, `${file}: synchronization must be idempotent`);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${file}: exactly one H1`);
  assert.ok(!html.includes('"locationId"') && !html.includes('"placeId"'), `${file}: internal GBP state must not be published`);
  if (file.startsWith('dammam/')) {
    for (const service of graph.filter(node => node['@type'] === 'Service')) {
      assert.equal(service.provider?.['@id'], dammam.schemaId, `${file}: wrong service provider`);
    }
    const template = stripBranchMarkup(html);
    for (const value of [dammam.formattedAddress, dammam.schemaId, dammam.mapsUrl, String(dammam.geo.latitude), 'tawod-branches.css', 'TAWOD_BRANCH_']) {
      assert.ok(!template.includes(value), `${file}: branch data would leak to a derived city: ${value}`);
    }
  }
}

for (const city of ['khobar', 'dhahran']) {
  for (const file of walk(city)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const value of [dammam.address.streetAddress, dammam.mapsUrl, String(dammam.geo.latitude), 'TAWOD_BRANCH_']) {
      assert.ok(!html.includes(value), `${file}: unconfirmed branch information`);
    }
  }
}

const main = nodes(fs.readFileSync('contact.html', 'utf8')).find(node => node['@id'] === company.schemaId);
assert.equal(main.address.addressLocality, 'Riyadh', 'Dammam must not overwrite the main office address');
assert.equal(dammam.googleBusinessProfile.locationId, null, 'Do not invent a Google location ID before creation');
assert.equal(workingHours.days.length, 6);
assert.ok(!workingHours.days.includes('Friday'));
assert.deepEqual(workingHours.closedDays, ['Friday']);
for (const file of ['sitemap.xml', 'sitemap-dammam.xml']) {
  const sitemap = fs.readFileSync(file, 'utf8');
  for (const url of [dammam.url, dammam.contactUrl, `${dammam.url}about/`]) {
    assert.ok(sitemap.includes(`<loc>${url}</loc><lastmod>${dammam.updatedAt}</lastmod>`), `${file}: stale branch page date`);
  }
}
console.log(`Branch checks passed: ${pages.length} Dammam pages, main contact page, provider links, visible details, hours, sitemap dates, and city isolation.`);
