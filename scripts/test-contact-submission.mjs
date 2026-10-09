import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag='div') {
    this.tagName = tag.toUpperCase(); this.attributes = {}; this.children = [];
    this.classList = { add() {}, remove() {} }; this.value = ''; this.innerHTML = ''; this.textContent = '';
  }
  setAttribute(k,v) { this.attributes[k]=v; }
  getAttribute(k) { return this.attributes[k] ?? null; }
  removeAttribute(k) { delete this.attributes[k]; }
  appendChild(el) { el.parentNode=this; this.children.push(el); }
  insertBefore(el) { this.appendChild(el); }
  closest() { return this.parentNode; }
  focus() {}
  addEventListener(k,fn) { (this.listeners ||= {})[k]=fn; }
}

function run({result={success:true},fail=false,pending=false,phoneValue='٠٥٥١١٢٨٨٨٤',home=false,english=false}={}) {
  const session = new Map(), local = new Map(), listeners = new Map(), providerRequests = [], firstPartyEvents=[];
  const fields = new Map();
  const phone = new Element('input'); phone.name='رقم_الجوال'; phone.value=phoneValue; phone.parentNode=new Element();
  const service = new Element('select'); service.name='الخدمة_المطلوبة'; service.value='تشطيبات عامة';
  const name = new Element('input'); name.name='الاسم'; name.value='اختبار داخلي';
  const email = new Element('input'); email.name='البريد_الإلكتروني'; email.value='';
  for(const f of [phone,service,name,email]) fields.set(f.name,f);
  fields.set('_next',{value:'https://tawodco.com/thank-you.html'});
  fields.set('_captcha',{value:'true'}); fields.set('_honey',{value:''});
  fields.set('الموافقة_على_الخصوصية',{value:'موافق'});
  const submit = new Element('button'); submit.innerHTML='إرسال الطلب'; submit.parentNode=new Element();
  const form = new Element('form'); form.setAttribute('action','https://formsubmit.co/info@tawodco.com');
  form.setAttribute('data-analytics-form',english?'en_quote_request':home?'home_quote_request':'contact_quote_request');
  if(english)form.setAttribute('lang','en');
  form.reportValidity=()=>true;
  form.appendChild=(el)=>{el.parentNode=form;form.children.push(el);if(el.name)fields.set(el.name,el);};
  form.querySelector=(sel)=>{
    if(sel==='button[type="submit"]')return submit;
    if(sel==='#privacy-consent')return {};
    const m=sel.match(/\[name="([^"]+)"\]/); return m?fields.get(m[1])||null:null;
  };
  const document={
    readyState:'loading', title:'تواصل مع تعاود', referrer:'', body:null, documentElement:{lang:english?'en-SA':'ar'},
    head:{appendChild(){}}, createElement:tag=>new Element(tag),
    getElementById:id=>!home&&id==='form'?form:null, querySelector:()=>null,
    querySelectorAll:()=>[form],
    addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event);}
  };
  let resolveProvider;
  const storage = map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)});
  const window={
    location:{hostname:'tawodco.com',pathname:english?'/en/contact/':home?'/':'/contact.html',search:'?service=finishing',href:english?'https://tawodco.com/en/contact/?service=finishing':home?'https://tawodco.com/':'https://tawodco.com/contact.html?service=finishing'},
    localStorage:storage(local),sessionStorage:storage(session),screen:{width:390},innerWidth:390,
    addEventListener(){},setTimeout:()=>1,clearTimeout(){},
    CustomEvent:class {constructor(type,{detail}){this.type=type;this.detail=detail;}},
    FormData:class {constructor(){}forEach(fn){for(const [k,v] of fields)fn(v.value,k);}},
    AbortController
  };
  window.fetch=(url,options)=>{
    if(url.includes('formsubmit.co/ajax/')){
      providerRequests.push(JSON.parse(options.body));
      if(pending)return new Promise(resolve=>{resolveProvider=resolve;});
      if(fail)return Promise.reject(new Error('network failure'));
      return Promise.resolve({ok:true,json:async()=>result});
    }
    firstPartyEvents.push(...JSON.parse(options.body).events);
    return Promise.resolve({ok:true});
  };
  const context={window,document,fetch:window.fetch,URL,URLSearchParams,Date,Math,console,Object,encodeURIComponent};
  vm.runInNewContext(fs.readFileSync('assets/js/tawod-analytics.js','utf8'),context);
  vm.runInNewContext(fs.readFileSync('assets/js/tawod-first-party.js','utf8'),context);
  document.readyState='complete';
  vm.runInNewContext(fs.readFileSync('assets/js/contact-conversion.js','utf8'),context);
  const send=()=>{const event={target:form,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};form.listeners.submit(event);return event;};
  return {window,form,fields,phone,name,submit,session,providerRequests,firstPartyEvents,send,
    resolve:()=>resolveProvider({ok:true,json:async()=>result}),
    status:()=>form.children.find(x=>String(x.className).startsWith('form-status'))};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const leads=app=>app.window.dataLayer.filter(item=>item[0]==='event'&&item[1]==='generate_lead');

const success=run();success.send();await settle();
assert.equal(success.providerRequests.length,1);
assert.equal(success.providerRequests[0]['رقم_الجوال'],'0551128884','Arabic numerals must be accepted and normalized');
assert.equal(leads(success).length,1);
const leadId=leads(success)[0][2].submission_id;
assert.equal(success.providerRequests[0].tawod_request_id,leadId,'Email and GA4 must share the request id');
assert.equal(success.firstPartyEvents.filter(x=>x.event_name==='generate_lead').length,1);
assert.equal(success.firstPartyEvents.find(x=>x.event_name==='generate_lead').metadata.submission_id,leadId);
assert.equal(JSON.stringify(leads(success)).includes('0551128884'),false,'Personal form fields must stay out of Analytics');
assert.match(success.status().textContent,/تم إرسال طلبك بنجاح/);
success.send();await settle();assert.equal(success.providerRequests.length,1,'completed forms must not be sent twice');
assert.equal(success.window.TawodAnalytics.confirmFormSubmission(leadId),false);

const failure=run({fail:true});failure.send();await settle();
assert.equal(leads(failure).length,0);assert.equal(failure.submit.disabled,false);
assert.equal(failure.name.value,'اختبار داخلي');assert.match(failure.status().textContent,/تعذر تأكيد/);
assert.equal(failure.firstPartyEvents.some(x=>x.event_name==='generate_lead'),false);

const activation=run({result:{success:true,message:'An activation email has been sent.'}});
activation.send();await settle();assert.equal(leads(activation).length,0,'pending activation is not acceptance');
assert.equal(activation.submit.disabled,false);

const invalid=run({phoneValue:'123'});invalid.send();await settle();
assert.equal(invalid.providerRequests.length,0);assert.equal(leads(invalid).length,0);

const double=run({pending:true});double.send();double.send();
assert.equal(double.providerRequests.length,1,'in-flight double clicks must send one request');
double.resolve();await settle();assert.equal(leads(double).length,1);

const home=run({home:true});home.send();await settle();
assert.equal(home.providerRequests.length,1,'Homepage must share the AJAX confirmation path');
assert.equal(leads(home)[0][2].form_name,'home_quote_request');
assert.equal(home.firstPartyEvents.find(x=>x.event_name==='generate_lead').form_source_path,'/');
assert.equal(home.submit.disabled,true);

const homeFailure=run({home:true,fail:true});homeFailure.send();await settle();
assert.equal(leads(homeFailure).length,0);assert.equal(homeFailure.submit.disabled,false);
assert.equal(homeFailure.name.value,'اختبار داخلي');
const bot=run();bot.fields.get('_honey').value='spam';bot.send();await settle();
assert.equal(bot.providerRequests.length,0);
const english=run({english:true});english.send();await settle();
assert.equal(leads(english).length,1);
assert.equal(leads(english)[0][2].form_name,'en_quote_request');
assert.equal(english.firstPartyEvents.find(x=>x.event_name==='generate_lead').form_source_path,'/en/contact/');
assert.equal(english.fields.get('_next').value,'https://tawodco.com/en/thank-you.html');
assert.match(english.status().textContent,/Your request was accepted/);
const englishFailure=run({english:true,fail:true});englishFailure.send();await settle();
assert.equal(leads(englishFailure).length,0);assert.equal(englishFailure.submit.disabled,false);
assert.match(englishFailure.status().textContent,/Your details remain in the form/);
const englishInvalid=run({english:true,phoneValue:'123'});englishInvalid.send();await settle();
assert.equal(englishInvalid.providerRequests.length,0);
assert.match(englishInvalid.status().textContent,/Check your mobile number/);
console.log('Verified Arabic and English contact and homepage provider acceptance, shared request ids, Arabic phones, failure recovery, activation handling, honeypots and duplicate prevention without sending real customer requests.');
