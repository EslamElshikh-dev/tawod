import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve('maintenance');
const read=file=>readFileSync(`${root}/${file}`,'utf8');
const decode=value=>value.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const required=[
 'خدمة طوارئ على مدار الساعة داخل الرياض',
 'سعر ثابت يُعتمد قبل بدء العمل ولا يتغير بعده',
 'ضمان ما بعد العمل',
 'مرخّصون في الصيانة والتشغيل وإدارة المرافق',
];
const emergency=['drain-unblocking','electrical-services','plumbing-services','ac-maintenance'];
const files=readdirSync(root).filter(file=>file.endsWith('.html')&&file!=='privacy.html');

for(const file of files){
 const source=read(file),body=source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)[1];
 const text=decode(body);
 assert.equal([...source.matchAll(/<h1\b/g)].length,1,`${file}: one H1`);
 const graphs=[...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match=>JSON.parse(match[1])['@graph']);
 assert.equal(graphs.filter(node=>node['@type']==='LocalBusiness').length,1,`${file}: one business entity`);
 assert(!/(?:أفضل شركة|أرخص شركة|معتمدون لدى شركة المياه الوطنية|كشف إلكتروني|أجهزة ألمانية|معتمدون من البلدية|بدون تكسير)/u.test(text),`${file}: forbidden claim`);
 assert(!/[0-9٠-٩]+\s*(?:ريال|ر\.س|SAR|%)/u.test(text),`${file}: price or discount`);
 assert(!/ضمان.{0,20}(?:سنة|سنت|سنوات|شهر|شهور|أشهر|يوم|أيام)/u.test(text),`${file}: warranty period`);
 for(const match of source.matchAll(/<img\b[^>]*>/g))assert(/\bsrc="[^"]+"/.test(match[0]),`${file}: empty image`);
 for(const match of source.matchAll(/href="(tel:[^"]+)"/g))assert.equal(match[1],'tel:+966533152133',`${file}: phone`);
 for(const match of source.matchAll(/href="(https:\/\/wa\.me\/[^\"]+)"/g)){
  const url=new URL(match[1]);assert.equal(url.pathname,'/966533152133',`${file}: WhatsApp number`);
  if(url.searchParams.has('text'))assert(url.searchParams.get('text').startsWith('السلام عليكم'),`${file}: WhatsApp greeting`);
 }
 for(const area of ['header','footer']){
  const part=source.match(new RegExp(`<${area}\\b[^>]*>[\\s\\S]*?</${area}>`))[0];
  assert.equal([...part.matchAll(/<img\b/g)].length,1,`${file}: single ${area} logo`);
 }
 const questions=[...source.matchAll(/<details><summary>([\s\S]*?)<span aria-hidden="true">\+<\/span><\/summary><div class="faq-answer"><p>([\s\S]*?)<\/p><\/div><\/details>/g)].map(match=>[decode(match[1]),decode(match[2])]);
 if(questions.length){
  const faq=graphs.find(node=>node['@type']==='FAQPage');assert(faq,`${file}: FAQPage`);
  assert.deepEqual(faq.mainEntity.map(q=>[q.name,q.acceptedAnswer.text]),questions,`${file}: FAQ JSON-LD matches visible answers`);
 }
 if(file!=='services.html'){
  const block=source.match(/<section class="[^"]*\bcommitments\b[^\"]*"[\s\S]*?<\/section>/)?.[0];assert(block,`${file}: commitments`);
  for(const line of required)assert(block.includes(line),`${file}: approved commitment`);
  assert.equal([...block.matchAll(/<p>/g)].length,4,`${file}: four commitments`);
  for(const p of block.matchAll(/<p>(.*?)<\/p>/g))assert(decode(p[1]).split(/\s+/).length<=12,`${file}: commitment description length`);
 }
 for(const match of source.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)){
  const path=resolve('.'+decodeURIComponent(match[1]));
  assert(existsSync(path),`${file}: missing local target ${match[1]}`);
 }
}

for(const slug of [...emergency,'waterproofing-leak-detection']){
 const source=read(slug+'.html');
 const choices=source.match(/<section class="section service-request-options"[\s\S]*?<\/section>/)[0];
 const cards=[...choices.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(match=>match[0]);assert.equal(cards.length,3,`${slug}: three cases`);
 const messages=[];
 for(const card of cards){
  assert(card.includes('href="tel:+966533152133"'),`${slug}: case call button`);
  const href=card.match(/href="(https:\/\/wa.me\/[^\"]+)"/)[1];
  const message=new URL(href).searchParams.get('text');assert(message.includes('\nالحي:'),`${slug}: district field`);messages.push(message);
 }
 assert.equal(new Set(messages).size,3,`${slug}: distinct WhatsApp messages`);
 if(emergency.includes(slug)){
  const hero=source.match(/<section class="service-hero"[\s\S]*?<\/section>/)[0];
  assert(hero.includes('طوارئ على مدار الساعة داخل الرياض'),`${slug}: emergency badge`);
  assert(/class="button service-call-primary"[^>]*>[\s\S]*?اتصل الآن<\/a>/.test(hero),`${slug}: prominent immediate call`);
 }
}

const home=read('index.html'),leak=read('waterproofing-leak-detection.html'),restaurant=read('restaurant-services.html');
const options=[...home.match(/<select id="property"[\s\S]*?<\/select>/)[0].matchAll(/<option(?:\s[^>]*)?>(.*?)<\/option>/g)].map(match=>match[1]).slice(1);
assert.equal(options[0],'فيلا أو منزل');assert(options.indexOf('مطعم')<5);
assert(home.includes('عمال وعاملات مدربون بزيّ موحّد ومظهر احترافي'));
assert(!home.includes('صحتهم حلوة'));
for(const phrase of ['كشف تسربات المياه بالرياض','فاتورة مياه مرتفعة فجأة؟','حل ارتفاع فاتورة المياه','سعر ثابت قبل بدء العمل','ضمان بعد العمل'])assert(leak.includes(phrase),`leak: ${phrase}`);
assert.equal([...restaurant.matchAll(/<details>/g)].length,4);
for(const label of ['تنظيف مصائد الدهون','تسليك صرف المطاعم','مكافحة الحشرات','النظافة والتعقيم','برنامج متابعة دورية بعقد واحد','برنامج يساعدك على الالتزام باشتراطات البلدية'])assert(restaurant.includes(label),`restaurant: ${label}`);
for(const file of files)assert(read(file).includes('href="/maintenance/restaurant-services.html"'),`${file}: restaurant footer link`);
for(const file of ['sitemap.xml','sitemap-maintenance.xml'])assert(readFileSync(file,'utf8').includes('<loc>https://tawodco.com/maintenance/restaurant-services.html</loc>'),`${file}: restaurant URL`);
console.log(`Passed message-match, contact, schema, claim and local-link checks on ${files.length} pages.`);
