import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { contractPages } from '../data/maintenance-contracts.mjs';

const formScript = fs.readFileSync('maintenance/assets/js/contracts.js', 'utf8');
function fixture(intent = 'facilities', reference = '') {
  const nodes = new Map();
  const node = (id, value = '') => {
    const item = { id, value, hidden: false, textContent: '', href: 'https://wa.me/966533152133?text=' + encodeURIComponent(reference), listeners: {}, attributes: {}, maxLength: 500,
      addEventListener(type, callback) { this.listeners[type] = callback; },
      getAttribute(name) { return this.attributes[name] ?? null; },
      focus() { this.focused = true; }, scrollIntoView() {},
      dispatchEvent(event) { this.lastEvent = event.type; },
    };
    nodes.set(id, item); return item;
  };
  const form = node('contract-request'); form.attributes['data-contract-intent'] = intent;
  form.elements = Object.fromEntries(['property','district','sites','units','duration','coverage','start','notes','contact_name','contact_phone'].map(name => [name,node(name)]));
  Object.assign(form.elements.property, {value:'شركة أو مكاتب'});
  form.elements.district.value = 'الياسمين'; form.elements.duration.value = 'سنوي'; form.elements.coverage.value = 'زيارات مجدولة';
  form.reportValidity = () => true;
  form.querySelectorAll = () => [{ value:'التكييف' },{ value:'النظافة' }];
  const review = node('contract-review'); review.hidden = true;
  ['contract-error','contract-summary','contract-whatsapp','contract-edit'].forEach(id=>node(id));
  if (reference) nodes.get('contract-whatsapp').attributes['data-ads-attribution-id'] = reference.match(/(GCLID|GBRAID|WBRAID):/)?.[1];
  const events = [];
  vm.runInNewContext(formScript, {
    document: { getElementById:id=>nodes.get(id) },
    window: { location:{ hostname:'tawodco.com',pathname:'/maintenance/facility-management.html',href:'https://tawodco.com/maintenance/facility-management.html' },gtag:(...args)=>events.push(args) }, URL,
  });
  return {form,review,nodes,events,submit:()=>form.listeners.submit({preventDefault(){}})};
}

for (const intent of ['facilities','maintenance-contract','shared-facilities']) {
  const f=fixture(intent); f.submit();
  assert.equal(f.form.hidden,true); assert.equal(f.review.hidden,false);
  const url=new URL(f.nodes.get('contract-whatsapp').href);
  assert.equal(url.origin,'https://wa.me'); assert.equal(url.pathname,'/966533152133');
  assert.match(url.searchParams.get('text'),/الرياض، الياسمين/);
  assert.equal(f.events.length,1); assert.equal(f.events[0][1],'maintenance_contract_request_prepared');
  assert.deepEqual(Object.keys(f.events[0][2]).sort(),['contract_intent','page_path']);
  assert.ok(!JSON.stringify(f.events).includes('الياسمين'),'entered details stay out of analytics');
  assert.ok(!JSON.stringify(f.events).includes('send_to'),'preparation is not an Ads conversion');
  f.nodes.get('contract-edit').listeners.click(); assert.equal(f.form.hidden,false); assert.equal(f.review.hidden,true);
}
for (const [field,value,error] of [['district','   ','الحي'],['sites','٠','رقم موجب'],['sites','3.5','رقم موجب'],['contact_phone','1234','جوال سعودي']]) {
  const f=fixture(); f.form.elements[field].value=value; f.submit();
  assert.match(f.nodes.get('contract-error').textContent,new RegExp(error));
  assert.equal(f.form.hidden,false); assert.equal(f.events.length,0);
}
{
  const f=fixture(); f.form.elements.contact_phone.value='٠٥٣٣١٥٢١٣٣'; f.form.elements.sites.value='٣'; f.form.elements.notes.value='<img src=x onerror=alert(1)>';
  f.submit(); const text=new URL(f.nodes.get('contract-whatsapp').href).searchParams.get('text');
  assert.match(text,/\+966533152133/); assert.match(text,/عدد المواقع: 3/);
  assert.ok(f.nodes.get('contract-summary').textContent.includes('<img src=x'),'notes are plain summary text');
}
for (const type of ['GCLID','GBRAID','WBRAID']) {
  const f=fixture('facilities','طلب أولي\n\nمرجع الإعلان: '+type+':qa-reference');
  f.submit(); f.nodes.get('contract-edit').listeners.click(); f.submit();
  const text=new URL(f.nodes.get('contract-whatsapp').href).searchParams.get('text');
  assert.equal((text.match(/مرجع الإعلان:/g)||[]).length,1);
  assert.ok(text.endsWith(type+':qa-reference'),'typed click reference survives message replacement');
}

for (const [slug,p] of Object.entries(contractPages)) {
  const html=fs.readFileSync('maintenance/'+slug+'.html','utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
  assert.ok(html.includes(p.heading));
  assert.match(html,/contracts\.js\?v=[a-f0-9]+/);
  assert.match(html,/ads-contact-clicks\.js\?v=[a-f0-9]+/);
  assert.match(html,/tawod-whatsapp-attribution\.js\?v=[a-f0-9]+/);
  assert.ok(!/كشف تسرب|كشف تسريب|waterproofing-leak-detection/.test(html),'paid contract journey excludes leak detection');
  assert.ok(!html.includes('0551128884'),'contracting phone does not leak into maintenance');
  assert.ok(html.includes('tel:+966533152133'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'no duplicate IDs');
  for(const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]),'valid section target '+m[1]);
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
}

const home=fs.readFileSync('maintenance/index.html','utf8');
assert.ok(!/كشف تسرب|كشف التسربات|كشف تسريب/.test(home),'general paid maintenance landing stops promoting leak detection');
assert.ok(home.includes('/maintenance/restaurant-services.html'),'drainage requests lead to restaurant services');
const fitScript=fs.readFileSync('assets/js/tawod-lead-fit.js','utf8');
function fitFixture(note='') {
  const nodes={};
  for (const id of ['pipelineMisfitPreset','pipelineNotes','pipelineError','pipelineStage','pipelineFit','pipelineLostReason','pipelineContactResult']) {
    nodes[id]={value:'',maxLength:500,textContent:'',addEventListener(type,callback){this[type]=callback;},focus(){},dispatchEvent(event){this.changed=event.type;}};
  }
  nodes.pipelineNotes.value=note;nodes.pipelineContactResult.value='not_contacted';
  vm.runInNewContext(fitScript,{document:{getElementById:id=>nodes[id]},Event:class{constructor(type){this.type=type;}}});
  return nodes;
}
for (const preset of ['other_company','service_not_offered','automotive','television','outside_area']) {
  const nodes=fitFixture('ملاحظة الفريق');nodes.pipelineMisfitPreset.value=preset;nodes.pipelineMisfitPreset.change();
  assert.equal(nodes.pipelineStage.value,'lost');assert.equal(nodes.pipelineFit.value,'unsuitable');
  assert.equal(nodes.pipelineContactResult.value,'not_contacted','shortcut never invents reviewed contact');
  assert.ok(nodes.pipelineNotes.value.endsWith('ملاحظة الفريق'));
  assert.equal(nodes.pipelineMisfitPreset.value,'');
}
{
  const notes='أ'.repeat(500),nodes=fitFixture(notes);nodes.pipelineMisfitPreset.value='other_company';nodes.pipelineMisfitPreset.change();
  assert.equal(nodes.pipelineNotes.value,notes);assert.equal(nodes.pipelineStage.value,'');assert.ok(nodes.pipelineError.textContent);
}
console.log('Verified 3 contract journeys, required fields and Arabic digits, safe summaries, typed ad attribution, unchanged phone/click tags and 6 staff classification cases; no external messages or writes.');
