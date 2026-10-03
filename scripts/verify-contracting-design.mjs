import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { applyContractingDesign } from '../lib/contracting-design.mjs';
import { pageStyles } from '../lib/contracting-design-assets.mjs';

const matches=(html,pattern)=>[...html.matchAll(pattern)].map(m=>m[0]);
const text=value=>value.replace(/<svg\b[\s\S]*?<\/svg>/gi,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const state=html=>({
  title:matches(html,/<title\b[^>]*>[\s\S]*?<\/title>/gi),
  meta:matches(html,/<meta\b[^>]*>/gi),
  searchLinks:matches(html,/<link\b(?=[^>]*\brel=["'](?:canonical|alternate)["'])[^>]*>/gi),
  headings:matches(html,/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi).map(text),
  schema:matches(html,/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi),
  mainText:text((html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i))[1].replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/gi,'')),
  links:matches(html,/<a\b[^>]*>[\s\S]*?<\/a>/gi).map(a=>[a.match(/href=(["'])(.*?)\1/i)?.[2],text(a).replace(/للمقاولات\s*العامة|General\s*Contracting/g,'').trim()]),
  forms:matches(html,/<form\b[^>]*>|<(?:input|select|textarea)\b[^>]*>/gi),
  scripts:matches(html,/<script\b(?=[^>]*\bsrc=)[^>]*>/gi).filter(t=>!t.includes('/assets/js/tawod-contracting-ui.js')).map(t=>t.replace(/\?v=[^"'\s>]+/g,''))
});
for(const file of Object.keys(pageStyles)) {
  const before=fs.readFileSync(file,'utf8'),after=applyContractingDesign(file,before);
  assert.deepEqual(state(after),state(before),`${file}: original copy, SEO, form or tracking changed`);
  assert.equal(applyContractingDesign(file,after),after,`${file}: rendering is not idempotent`);
  assert.ok(after.includes('data-contracting-design="2026-10"'));
  if(file!=='index.html') {
    assert.equal(matches(after,/<link\b(?=[^>]*rel=["']stylesheet["'])[^>]*>/gi).length,1,`${file}: expected one local stylesheet`);
    assert.ok(!/fonts\.googleapis|cdnjs[^"']*font-awesome/.test(after));
  }
  assert.equal(matches(after,/<i\b[^>]*class=["'][^"']*\bfa-[^"']*["'][^>]*>\s*<\/i>/gi).length,0,`${file}: unresolved icon`);
}
for(const file of ['maintenance/index.html','maintenance/services.html','admin.html']) {
  const before=fs.readFileSync(file,'utf8');assert.equal(applyContractingDesign(file,before),before,`${file}: design leaked outside contracting pages`);
}
if(process.argv.includes('--source-baseline')) {
  const urls=[...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
  for(const pathname of urls) {
    const file=pathname==='/'?'index.html':pathname.endsWith('/')?`${pathname.slice(1)}index.html`:pathname.slice(1);
    const committed=execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'});
    assert.deepEqual(state(fs.readFileSync(file,'utf8')),state(committed),`${file}: generation changed committed copy, SEO, links, forms or tracking`);
  }
  console.log(`Verified generated source semantics against the committed baseline for ${urls.length} public pages; only presentation and cache revisions may differ.`);
}
console.log(`Verified ${Object.keys(pageStyles).length} contracting pages: original content, SEO, link targets, forms and tracking preserved; local CSS/icons; idempotent rendering.`);
