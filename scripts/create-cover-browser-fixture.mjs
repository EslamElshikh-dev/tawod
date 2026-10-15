// Browser regression fixture: render the exported article's cover with the
// exported CSS, withhold the photograph, then load it through the test UI.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] || '.');
const output = process.argv[3];
if (!output) throw new Error('Usage: node scripts/create-cover-browser-fixture.mjs SITE_ROOT OUTPUT.html');
const slugs = ['best-contracting-company-team-readiness-riyadh', 'best-contracting-company-riyadh'];
const cases = slugs.map(slug => {
  const html = readFileSync(join(root, 'out/blog', slug, 'index.html'), 'utf8');
  const stylesheet = html.match(/<link\b[^>]*href="([^"]*tawod-contracting-[^"?]+\.css)/)?.[1];
  if (!stylesheet) throw new Error(`Missing compiled CSS for ${slug}`);
  const css = readFileSync(join(root, 'out', stylesheet.replace(/^\//, '')), 'utf8');
  const content = html.match(/<article\b[^>]*class="[^"]*\barticle-content\b[^"<]*"[^>]*>[\s\S]*?<figure class="decision-cover">[\s\S]*?<\/figure>/)?.[0];
  if (!content) throw new Error(`Missing exported decision cover for ${slug}`);
  const pending = content.replace(/<figure class="decision-cover">[\s\S]*?<\/figure>/, figure => figure.replace(/<img\b[^>]*>/, tag => tag
    .replace(/\s(?:srcset|sizes)="[^"]*"/g, '')
    .replace(/\bsrc="([^"]+)"/, 'data-photo-src="$1"')));
  const doc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="https://tawodco.com/"><style>${css}</style><style>body{margin:0;padding:12px;background:white}article.article-content{max-width:840px;margin-inline:auto}</style></head><body class="tawod-contracting">${pending}</article></body></html>`;
  return { slug, doc };
});
const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>Article cover browser regression</title>
<style>body{font:16px system-ui;margin:20px;color:#1c2635}header{display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,select{font:inherit;padding:8px}pre{white-space:pre-wrap;direction:ltr;background:#eef2f5;padding:12px}iframe{display:block;height:770px;border:1px solid #aab4bf;margin-top:12px;max-width:none}</style>
<header><label>المقال <select id="case"><option value="0">دليل جاهزية الفريق</option><option value="1">الدليل المحوري</option></select></label><label>عرض المتصفح <select id="width"><option>390</option><option>768</option><option selected>1280</option></select></label><button id="reset">إعادة حالة ما قبل التحميل</button><button id="load">تحميل صورة الغلاف</button></header><pre id="result">انتظر تهيئة الإطار</pre><iframe id="frame" title="معاينة الغلاف"></iframe>
<script>const cases=${JSON.stringify(cases).replace(/</g, '\\u003c')};const frame=document.querySelector('#frame'),result=document.querySelector('#result');let before=null;
function measure(){const doc=frame.contentDocument,img=doc.querySelector('.decision-cover img'),fig=img.closest('figure'),caption=fig.querySelector('figcaption'),s=frame.contentWindow.getComputedStyle(img);return{viewport:doc.documentElement.clientWidth,loaded:img.naturalWidth>0,width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,captionTop:caption.getBoundingClientRect().top,figureHeight:fig.getBoundingClientRect().height,aspectRatio:s.aspectRatio,loading:img.loading,priority:img.fetchPriority};}
function reset(){before=null;frame.style.width=document.querySelector('#width').value+'px';frame.srcdoc=cases[document.querySelector('#case').value].doc;}
frame.onload=()=>{before=measure();result.textContent=JSON.stringify({before},null,2)};
document.querySelector('#reset').onclick=reset;document.querySelector('#case').onchange=reset;document.querySelector('#width').onchange=reset;
document.querySelector('#load').onclick=()=>{const img=frame.contentDocument.querySelector('.decision-cover img');before=measure();img.onload=()=>{const after=measure();result.textContent=JSON.stringify({before,after,heightShift:after.height-before.height,captionShift:after.captionTop-before.captionTop,pass:before.height>0&&Math.abs(after.height-before.height)<1&&Math.abs(after.captionTop-before.captionTop)<1},null,2)};img.src=new URL(img.dataset.photoSrc,'https://tawodco.com/').href;};reset();</script></html>`;
writeFileSync(output, html);
console.log(`Created two-case browser fixture from exported HTML/CSS: ${output}`);
