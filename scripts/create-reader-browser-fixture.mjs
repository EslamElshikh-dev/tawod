// Render every article through the production presentation functions, then
// exercise those pages in real browser frames at explicit CSS viewport sizes.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { optimizeArticleMarkup } from '../lib/article-presentation.mjs';
import { applyContractingDesign } from '../lib/contracting-design.mjs';
const destination=process.argv[2];
if(!destination) throw new Error('Provide a destination HTML filename.');
const files=['blog','dammam/blog','khobar/blog','dhahran/blog'].flatMap(root=>fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&fs.existsSync(`${root}/${d.name}/index.html`)).map(d=>`${root}/${d.name}/index.html`)).filter(file=>/<article\b[^>]*class=["'][^"']*\barticle-content\b/.test(fs.readFileSync(file,'utf8')));
const styles={},fragments=[];
const intern=fragment=>{let i=fragments.indexOf(fragment);if(i<0){i=fragments.length;fragments.push(fragment)}return `<!--READER_SHARED_${i}-->`};
const pages=files.map(file=>{
 let html=applyContractingDesign(file,optimizeArticleMarkup(file,fs.readFileSync(file,'utf8')));
 html=html.replace(/<script\b[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi,'');
 html=html.replace(/<link\b[^>]*>/gi,tag=>{
  const href=tag.match(/href=["']([^"']+)["']/)?.[1];
  if(/rel=["']stylesheet["']/.test(tag)&&href?.startsWith('/assets/css/')){
   styles[href]=fs.readFileSync(href.slice(1).split('?')[0],'utf8');
   return `<style data-fixture-style="${href}"></style>`;
  }
  return tag;
 });
 // Metadata is covered by regression tests; omit it from this visual fixture.
 html=html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i,head=>`<head><meta charset="utf-8"><base href="https://tawodco.com/${path.posix.dirname(file)}/">${[...head.matchAll(/<title\b[\s\S]*?<\/title>|<style\b[\s\S]*?<\/style>|<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi)].map(m=>m[0]).join('')}</head>`);
 html=html.replace(/<header\b[\s\S]*?<\/header>|<footer\b[\s\S]*?<\/footer>|<aside\b(?=[^>]*class=["']mobile-sidebar["'])[\s\S]*?<\/aside>/gi,intern);
 return{file,title:html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g,''),html};
});
const js=['assets/js/tawod-inner.js','assets/js/tawod-contracting-ui.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
const compressed=gzipSync(Buffer.from(JSON.stringify({pages,styles,fragments,js}))).toString('base64');
const html=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>مراجعة قالب المقالات</title>
<style>*{box-sizing:border-box}body{margin:0;font:14px system-ui;background:#edf0e9;color:#20352e}header{padding:12px 18px;background:#fff;display:flex;gap:12px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #cdd7cb;position:sticky;top:0;z-index:9}button,select,input{font:inherit;padding:9px;max-width:430px}button{cursor:pointer;background:#24574c;color:#fff;border:0;border-radius:5px}label{display:flex;gap:7px;align-items:center}#status{padding:9px 18px;direction:ltr;text-align:left;white-space:pre-wrap;font:13px monospace;max-height:170px;overflow:auto}iframe{display:block;background:#fff;height:900px;border:0;margin:0 auto;max-width:none}#summary{font-weight:700;padding:8px 18px}</style>
<header><label>المقال<select id="page" aria-label="المقال"></select></label><label>العرض<select id="width" aria-label="عرض المتصفح"><option>320</option><option>390</option><option>430</option><option>768</option><option>1024</option><option selected>1440</option></select></label><label><input type="checkbox" id="hold">قبل وصول الصورة</label><button id="load">تحميل صورة الغلاف</button><button id="audit">فحص جميع المقالات</button></header><div id="summary">تجهيز المعاينة…</div><pre id="status"></pre><iframe id="reader" title="معاينة المقال"></iframe>
<script>
const packed='${compressed}';
const select=document.querySelector('#page'),width=document.querySelector('#width'),frame=document.querySelector('#reader'),status=document.querySelector('#status'),summary=document.querySelector('#summary');
let bundle,results=[],busy=false;
// Geometry reads below synchronously flush layout. Animation frames in a
// background browser tab can be throttled and do not improve these checks.
const tick=()=>Promise.resolve();
async function mount(index){
 let html=bundle.pages[index].html.replace(/<!--READER_SHARED_(\\d+)-->/g,(_,i)=>bundle.fragments[Number(i)]).replace(/<style data-fixture-style="([^"]+)"><\\/style>/g,(_,key)=>'<style>'+bundle.styles[key]+'</style>');
 if(busy) html=html.replace(/<img\\b[^>]*>/gi,tag=>tag.replace(/\\ssrc=("[^"]*"|'[^']*')/gi,m=>m.replace('src=','data-photo-src=')).replace(/\\s(?:srcset|sizes)=("[^"]*"|'[^']*')/g,''));
 if(document.querySelector('#hold').checked) html=html.replace(/<img\\b(?=[^>]*data-article-cover="true")[^>]*>/,tag=>tag.replace(/\\ssrc="([^"]+)"/,' data-photo-src="$1"').replace(/\\s(?:srcset|sizes)="[^"]*"/g,''));
 html=html.replace(/<\\/body>/i,'<script>'+bundle.js.replace(/<\\/script/gi,'<\\\\/script')+'<\\/script></body>');
 frame.style.width=width.value+'px';
 const done=new Promise(resolve=>frame.onload=resolve); frame.srcdoc=html;await done;await frame.contentDocument.fonts.ready;await tick();
 summary.textContent=bundle.pages[index].title;
 return frame.contentDocument;
}
function color(value){const n=value.match(/[\\d.]+/g)?.map(Number);return n&&n.length>=3?n.slice(0,3):[255,255,255]}
function lum(rgb){return rgb.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0)}
function measure(doc){
 const win=doc.defaultView,vw=doc.documentElement.clientWidth,content=doc.querySelector('.article-content'),cover=doc.querySelector('[data-article-cover]'),figure=cover.closest('figure');
 const errors=[];if(doc.documentElement.scrollWidth>vw+1)errors.push('document overflow '+doc.documentElement.scrollWidth+' > '+vw);
 const bounds=doc.documentElement.getBoundingClientRect();for(const e of [content,figure,doc.querySelector('.article-byline')]){const r=e.getBoundingClientRect();if(r.left<bounds.left-.5||r.right>bounds.right+.5)errors.push('element outside viewport: '+e.className)}
 const controls=[...doc.querySelectorAll('main .btn,.article-sidebar .btn,.tawod-article-tools button,.tawod-article-tools a')];
 for(const e of controls){const r=e.getBoundingClientRect(),s=win.getComputedStyle(e);if(!r.width||!r.height)continue;if(r.height<43.9)errors.push('short target: '+e.textContent.trim());
  let bg=s.backgroundColor,parent=e;while(bg==='rgba(0, 0, 0, 0)'&&parent.parentElement){parent=parent.parentElement;bg=win.getComputedStyle(parent).backgroundColor}
  const a=lum(color(s.color)),b=lum(color(bg)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(ratio<4.49)errors.push('low contrast '+ratio.toFixed(2)+': '+e.textContent.trim());
  if(e.scrollWidth>e.clientWidth+2)errors.push('clipped control: '+e.textContent.trim());
 }
 const cr=cover.getBoundingClientRect();if(cr.height<150||cr.height>380)errors.push('cover height: '+cr.height);
 const by=doc.querySelector('.article-byline-copy strong').getBoundingClientRect(),descriptor=doc.querySelector('.article-byline-copy>span').getBoundingClientRect();if(by.bottom>descriptor.top+.5)errors.push('publisher overlap');
 return{viewport:vw,scrollWidth:doc.documentElement.scrollWidth,coverHeight:cr.height,coverWidth:cr.width,priority:cover.fetchPriority,loading:cover.loading,errors};
}
async function selected(){if(busy)return;const doc=await mount(Number(select.value));status.textContent=JSON.stringify(measure(doc),null,2)}
select.onchange=selected;width.onchange=selected;document.querySelector('#hold').onchange=selected;
document.querySelector('#load').onclick=async()=>{const doc=frame.contentDocument,img=doc.querySelector('[data-article-cover]');const before=measure(doc),caption=img.closest('figure').querySelector('figcaption'),captionBefore=caption.getBoundingClientRect().top;if(img.dataset.photoSrc){img.src=new URL(img.dataset.photoSrc,doc.baseURI).href;await img.decode();await tick()}const after=measure(doc);status.textContent=JSON.stringify({before,after,heightShift:after.coverHeight-before.coverHeight,captionShift:caption.getBoundingClientRect().top-captionBefore},null,2)};
document.querySelector('#audit').onclick=async()=>{if(busy)return;busy=true;results=[];document.querySelector('#hold').checked=false;const errors=[];try{for(let i=0;i<bundle.pages.length;i++){select.value=String(i);const doc=await mount(i);for(const size of [320,390,430,768,1024,1440]){width.value=String(size);frame.style.width=size+'px';await tick();const result=measure(doc);results.push({file:bundle.pages[i].file,width:size,...result});if(result.errors.length)errors.push(results.at(-1));}summary.textContent='تم فحص '+(i+1)+' / '+bundle.pages.length;status.textContent=JSON.stringify({pages:i+1,checks:results.length,failures:errors.length,last:bundle.pages[i].file},null,2)}}catch(error){errors.push({error:String(error)})}busy=false;summary.textContent='انتهى الفحص';status.textContent=JSON.stringify({pages:bundle.pages.length,checks:results.length,failures:errors.length,errors},null,2);window.readerAudit={complete:true,pages:bundle.pages.length,checks:results.length,failures:errors.length,errors,results};};
(async()=>{const bytes=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));bundle=JSON.parse(await new Response(stream).text());select.innerHTML=bundle.pages.map((p,i)=>'<option value="'+i+'">'+p.title+'</option>').join('');await selected()})();
</script></html>`;
fs.writeFileSync(destination,html);
console.log(JSON.stringify({pages:pages.length,bytes:Buffer.byteLength(html),styles:Object.keys(styles).length,destination}));
