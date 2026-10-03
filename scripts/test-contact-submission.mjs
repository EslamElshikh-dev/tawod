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

function run({result={success:true},fail=false,pending=false,phoneValue='٠٥٥١١٢٨٨٨٤'}={}) {
  const session = new Map(), local = new Map(), listeners = new Map(), providerRequests = [], firstPartyEvents=[];
  const fields = new Map();
  const phone = new Element('input'); phone.name='رقم_الجوال'; phone.value=phoneValue; phone.parentNode=new Element();
  const service = new Element('select'); service.name='الخدمة_المطلوبة'; service.value='تشطيبات عامة';
  const name = new Element('input'); name.name='الاسم'; name.value='اختبار داخلي';
  const email = new Element('input'); email.name='البريد_الإلكتروني'; email.value='';
  for(const f of [phone,service,name,email]) fields.set(f.name,f);
  fields.set('_next',{value:'https://tawodco.com/thank-you.html'});
  fields.set('_captcha',{value:'true'}); fields.set('_honey',{value:''});
  const submit = new Element('button'); submit.innerHTML='إرسال الطلب'; submit.parentNode=new Element();
  const form = new Element('form'); form.setAttribute('action','https://formsubmit.co/info@tawodco.com');
  form.setAttribute('data-analytics-form','contact_quote_request');
  form.reportValidity=()=>true;
  form.appendChild=(el)=>{el.parentNode=form;form.children.push(el);if(el.name)fields.set(el.name,el);};
  form.querySelector=(sel)=>{
    if(sel==='button[type="submit"]')return submit;
    if(sel==='#privacy-consent')return {};
    const m=sel.match(/\[name="([^"]+)"\]/); return m?fields.get(m[1])||null:null;
  };
  const document={
    readyState:'loading', title:'تواصل مع تعاود', referrer:'', body:null,
    head:{appendChild(){}}, createElement:tag=>new Element(tag),
    getElementById:id=>id==='form'?form:null, querySelector:()=>null,
    addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event);}
  };
  let resolveProvider;
  const storage = map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)});
  const window={
    location:{hostname:'tawodco.com',pathname:'/contact.html',search:'?service=finishing',href:'https://tawodco.com/contact.html?service=finishing'},
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
console.log('Verified provider acceptance, shared request ids, Arabic phones, failure recovery, activation handling, and duplicate prevention without sending real customer requests.');
