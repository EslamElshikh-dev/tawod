import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd(),domain='https://tawodco.com',errors=[],warnings=[];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>['.git','node_modules'].includes(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const rel=f=>path.relative(root,f).split(path.sep).join('/');
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const all=(h,re)=>[...h.matchAll(re)];
const pagePath=r=>r==='index.html'?'/':r.endsWith('/index.html')?'/'+r.slice(0,-10):'/'+r;
const htmlFiles=walk(root).filter(f=>f.endsWith('.html'));
const pages=new Map(htmlFiles.map(f=>[rel(f),fs.readFileSync(f,'utf8')]));
const titles=new Map(),canonicals=new Map(),indexable=new Set();

function schemaHas(node,type){if(!node||typeof node!=='object')return false;if(node['@type']===type||(Array.isArray(node['@type'])&&node['@type'].includes(type)))return true;return Object.values(node).some(v=>Array.isArray(v)?v.some(x=>schemaHas(x,type)):schemaHas(v,type))}
function localTarget(from,value){if(!value||/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(value))return null;if(value.startsWith('#'))return{file:from,anchor:value.slice(1)};const clean=value.split('?')[0],[pathname,anchor='']=clean.split('#');let out=pathname.startsWith('/')?pathname.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(from),pathname));if(out.endsWith('/'))out+='index.html';if(!path.posix.extname(out)&&fs.existsSync(path.join(root,out,'index.html')))out=path.posix.join(out,'index.html');return{file:out,anchor}}

for(const [r,h] of pages){
  const ts=all(h,/<title[^>]*>([\s\S]*?)<\/title>/gi);if(ts.length!==1)errors.push(`${r}: expected one title, found ${ts.length}`);const title=ts[0]?text(ts[0][1]):'';if(title){if(titles.has(title))errors.push(`${r}: duplicate title with ${titles.get(title)}`);else titles.set(title,r);if(title.length<15||title.length>75)warnings.push(`${r}: title length ${title.length}`)}
  const ds=all(h,/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/gi);if(ds.length!==1)errors.push(`${r}: expected one meta description, found ${ds.length}`);const d=ds[0]?(ds[0][1]||ds[0][2]||''):'';if(d&&(d.length<70||d.length>180))warnings.push(`${r}: description length ${d.length}`);
  const cs=all(h,/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>|<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/gi);if(cs.length!==1)errors.push(`${r}: expected one canonical, found ${cs.length}`);const c=cs[0]?(cs[0][1]||cs[0][2]):'';if(c){if(canonicals.has(c))errors.push(`${r}: duplicate canonical with ${canonicals.get(c)}`);else canonicals.set(c,r);if(r!=='404.html'&&c!==domain+pagePath(r))errors.push(`${r}: canonical mismatch ${c}`)}
  const h1=all(h,/<h1\b[^>]*>/gi).length;if(h1!==1)errors.push(`${r}: expected one H1, found ${h1}`);
  const ids=all(h,/\bid=["']([^"']+)["']/gi).map(m=>m[1]);[...new Set(ids.filter((x,i,a)=>a.indexOf(x)!==i))].forEach(id=>errors.push(`${r}: duplicate id ${id}`));
  const schemas=[];all(h,/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi).forEach((m,i)=>{try{schemas.push(JSON.parse(m[1].trim()))}catch(e){errors.push(`${r}: invalid JSON-LD block ${i+1}: ${e.message}`)}});
  const excluded=r==='index.html'||r==='privacy-policy.html'||r==='404.html'||/noindex/i.test(h);if(!excluded){indexable.add(pagePath(r));if(!h.includes('tawod-system.css'))errors.push(`${r}: missing tawod-system.css`);if(!h.includes('TAWOD_STATIC_FAQ_START'))errors.push(`${r}: missing static FAQ`);if(!schemas.some(x=>schemaHas(x,'FAQPage')))errors.push(`${r}: missing FAQPage schema`);if(!schemas.some(x=>schemaHas(x,'BreadcrumbList')))errors.push(`${r}: missing BreadcrumbList schema`);const type=r.startsWith('blog/')&&r!=='blog/index.html'?'Article':'WebPage';if(!schemas.some(x=>schemaHas(x,type)))errors.push(`${r}: missing ${type} schema`)}
  all(h,/<(?:a|link|script|img|source|iframe)\b[^>]*(?:href|src|srcset)=["']([^"']+)["'][^>]*>/gi).forEach(m=>m[1].split(',').map(x=>x.trim().split(/\s+/)[0]).filter(Boolean).forEach(v=>{const t=localTarget(r,v);if(!t)return;const full=path.join(root,t.file);if(!fs.existsSync(full)){errors.push(`${r}: broken reference ${v} -> ${t.file}`);return}if(t.anchor&&t.file.endsWith('.html')){const target=pages.get(t.file)||fs.readFileSync(full,'utf8');const safe=t.anchor.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(!new RegExp(`\\bid=["']${safe}["']`).test(target))errors.push(`${r}: missing anchor #${t.anchor} in ${t.file}`)}}));
}

if(!fs.existsSync('sitemap.xml'))errors.push('sitemap.xml missing');else{const s=fs.readFileSync('sitemap.xml','utf8'),urls=new Set(all(s,/<loc>([^<]+)<\/loc>/gi).map(m=>new URL(m[1]).pathname));for(const p of indexable)if(!urls.has(p))errors.push(`sitemap.xml missing ${p}`);for(const p of urls){let r=p==='/'?'index.html':p.slice(1);if(r.endsWith('/'))r+='index.html';if(!pages.has(r))errors.push(`sitemap URL does not resolve: ${p}`)}}
if(!fs.existsSync('robots.txt'))errors.push('robots.txt missing');else if(!fs.readFileSync('robots.txt','utf8').includes('Sitemap: https://tawodco.com/sitemap.xml'))errors.push('robots.txt sitemap line missing');
if(!fs.existsSync('assets/js/tawod-inner.js'))errors.push('tawod-inner.js missing');else{const js=fs.readFileSync('assets/js/tawod-inner.js','utf8');['injectComprehensiveFaq','addFaqSchema','applyServiceProfile','injectTrustStrip','addPageSchema'].forEach(x=>{if(js.includes(x))errors.push(`tawod-inner.js still contains runtime generator ${x}`)})}
warnings.forEach(x=>console.warn('WARNING: '+x));if(errors.length){console.error(`Site validation failed with ${errors.length} error(s):`);errors.forEach(x=>console.error(' - '+x));process.exit(1)}console.log(`Validated ${htmlFiles.length} HTML files, ${indexable.size} indexable URLs, links, sitemap, metadata and JSON-LD.`);
