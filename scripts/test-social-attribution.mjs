import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const tracker=fs.readFileSync('assets/js/tawod-first-party.js','utf8');
const analytics=fs.readFileSync('assets/js/tawod-analytics.js','utf8');
const whatsapp=fs.readFileSync('assets/js/tawod-whatsapp-attribution.js','utf8');
const sessionData=new Map(), localData=new Map();
const storage=map=>({getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)});
let clock=Date.now(); class ClockDate extends Date{static now(){return clock;}}
let sent=[];
function visit(url,referrer='',runDiagnostics=false){
  const listeners=new Map();const location=new URL(url);
  const window={location,crypto:{randomUUID},localStorage:storage(localData),sessionStorage:storage(sessionData),innerWidth:390,screen:{width:390},addEventListener(){},removeEventListener(){},setTimeout(){},clearTimeout(){}};
  const document={referrer,title:'Isolated fixture',readyState:'complete',body:{dataset:{}},head:{appendChild(){}},createElement:()=>({setAttribute(){}}),addEventListener:(name,callback)=>listeners.set(name,callback)};
  const sandbox={window,document,URL,URLSearchParams,Date:ClockDate,console,encodeURIComponent,fetch:async(url,options)=>{assert.match(url,/functions\/v1\/tawod-analytics$/);sent.push(...JSON.parse(options.body).events);return {ok:true};}};
  if(runDiagnostics)vm.runInNewContext(analytics,sandbox);
  vm.runInNewContext(tracker,sandbox);
  return {window,document,click(){const link={getAttribute:key=>key==='href'?'tel:0551128884':null};listeners.get('click')({target:{closest:()=>link}});}};
}
localData.set('tawodAdsAttributionV1',JSON.stringify({gclid:'old-google-click',utm_source:'google',utm_campaign:'old-campaign'}));
let page=visit('https://tawodco.com/?gclid=new-google-click&utm_source=google&utm_medium=cpc');
assert.equal(sent.at(-1).click_id,'new-google-click');const googleSession=sent.at(-1).session_id;
clock+=60000;page=visit('https://tawodco.com/services/','https://tawodco.com/');
assert.equal(sent.at(-1).session_id,googleSession);assert.equal(sent.at(-1).click_id,'new-google-click');
clock+=60000;page=visit('https://tawodco.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=summer&utm_content=reel-01','',true);
const igSession=sent.at(-1).session_id;assert.notEqual(igSession,googleSession);assert.equal(sent.at(-1).click_id,null);assert.equal(sent.at(-1).utm_source,'instagram');
const captured=JSON.parse(localData.get('tawodAdsAttributionV1'));assert.equal(captured.gclid,undefined);assert.equal(captured.utm_campaign,'summer');
clock+=60000;page=visit('https://tawodco.com/contact/','https://tawodco.com/');assert.equal(sent.at(-1).session_id,igSession);assert.equal(sent.at(-1).utm_source,'instagram');
clock+=31*60000;page=visit('https://tawodco.com/');assert.notEqual(sent.at(-1).session_id,igSession);assert.equal(sent.at(-1).utm_source,null);assert.equal(sent.at(-1).click_id,null,'expired Google attribution must not contaminate a direct session');
const direct=sent.at(-1).session_id;clock+=60000;localData.set('tawodAdsAttributionV1',JSON.stringify({gclid:'historical-google'}));page=visit('https://tawodco.com/?ttclid=real-entry','',true);assert.equal(JSON.parse(localData.get('tawodAdsAttributionV1')).gclid,undefined);assert.notEqual(sent.at(-1).session_id,direct,'a new platform click starts its own campaign entry');
const entry=sent.at(-1).session_id;const before=sent.length;clock+=31*60000;page.click();
assert.equal(sent.length,before+2);assert.equal(sent.at(-2).event_name,'page_view');assert.equal(sent.at(-1).event_name,'call_click');assert.equal(sent.at(-2).session_id,sent.at(-1).session_id);assert.notEqual(sent.at(-1).session_id,entry);
page.click();assert.equal(sent.length,before+3,'a second contact does not manufacture another page view');
clock+=60000;page=visit('https://tawodco.com/','https://l.facebook.com/');assert.equal(sent.at(-1).referrer_host,'l.facebook.com');
const count=sent.length;visit('https://isolated.vercel.app/?utm_source=instagram');visit('http://127.0.0.1:3000/?utm_source=tiktok');assert.equal(sent.length,count,'local and preview visits must never pollute production');
function whatsappHref(search,stored,session=null){let href='https://wa.me/966551128884?text=hello';const link={getAttribute:()=>href,setAttribute:(key,value)=>{if(key==='href')href=value;}};vm.runInNewContext(whatsapp,{window:{location:{search,href:'https://tawodco.com/'+search},localStorage:{getItem:()=>JSON.stringify(stored)},sessionStorage:{getItem:()=>JSON.stringify(session)}},document:{readyState:'complete',querySelectorAll:()=>[link]},URL,URLSearchParams,Date:ClockDate});return href;}
assert.equal(new URL(whatsappHref('?utm_source=instagram&utm_campaign=reel',{gclid:'legacy'})).searchParams.get('text'),'hello','new social campaign never gains a historical Google reference');
assert.equal(new URL(whatsappHref('',{gclid:'legacy'})).searchParams.get('text'),'hello','historical storage alone must not identify a direct-session WhatsApp click');
assert.equal(new URL(whatsappHref('?ttclid=current',{gclid:'legacy'})).searchParams.get('text'),'hello');
assert.match(new URL(whatsappHref('?gclid=current',{gclid:'legacy'})).searchParams.get('text'),/GCLID:current/);
assert.match(new URL(whatsappHref('',{}, {click_id:'current-braid',landingPath:'/?gbraid=current-braid',lastSeen:clock-1000})).searchParams.get('text'),/GBRAID:current-braid/,'Google identifier type survives internal navigation');
assert.equal(new URL(whatsappHref('',{gclid:'old'}, {click_id:'old',landingPath:'/?gclid=old',lastSeen:clock-31*60000})).searchParams.get('text'),'hello');
console.log('Verified fresh campaign sessions, same-site continuity, direct expiry, idle-contact page context, platform entry IDs, legacy attribution cleanup, WhatsApp parity and zero preview writes.');
