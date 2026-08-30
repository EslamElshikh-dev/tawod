import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const root=process.cwd(),domain='https://tawodco.com',errors=[],warnings=[];
const assetRevision=file=>createHash('sha256').update(fs.readFileSync(path.join(root,'assets','js',file))).digest('hex').slice(0,12);
const analyticsSrc=`/assets/js/tawod-analytics.js?v=${assetRevision('tawod-analytics.js')}`;
const typographyFile='assets/css/tawod-typography.css';
const typographyRevision=createHash('sha256').update(fs.readFileSync(path.join(root,typographyFile))).digest('hex').slice(0,12);
const typographyHref=`/${typographyFile}?v=${typographyRevision}`;
const ignoredDirectories=new Set(['.git','.next','node_modules','out','project-pages','public']);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>ignoredDirectories.has(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const rel=f=>path.relative(root,f).split(path.sep).join('/');
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const all=(h,re)=>[...h.matchAll(re)];
const pagePath=r=>r==='index.html'?'/':r.endsWith('/index.html')?'/'+r.slice(0,-10):'/'+r;
const htmlFiles=walk(root).filter(f=>f.endsWith('.html'));
const pages=new Map(htmlFiles.map(f=>[rel(f),fs.readFileSync(f,'utf8')]));
const titles=new Map(),canonicals=new Map(),indexable=new Set();

function schemaHas(node,type){if(!node||typeof node!=='object')return false;if(node['@type']===type||(Array.isArray(node['@type'])&&node['@type'].includes(type)))return true;return Object.values(node).some(v=>Array.isArray(v)?v.some(x=>schemaHas(x,type)):schemaHas(v,type))}
function schemaCount(node,type){if(!node||typeof node!=='object')return 0;let count=node['@type']===type||(Array.isArray(node['@type'])&&node['@type'].includes(type))?1:0;for(const value of Object.values(node))count+=Array.isArray(value)?value.reduce((sum,item)=>sum+schemaCount(item,type),0):schemaCount(value,type);return count}
function localTarget(from,value){if(!value||/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(value))return null;if(value.startsWith('#'))return{file:from,anchor:value.slice(1)};const clean=value.split('?')[0],[pathname,anchor='']=clean.split('#');let out=pathname.startsWith('/')?pathname.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(from),pathname));if(out.endsWith('/'))out+='index.html';if(!path.posix.extname(out)&&fs.existsSync(path.join(root,out,'index.html')))out=path.posix.join(out,'index.html');return{file:out,anchor}}
function articleTokens(r){const h=pages.get(r)||'',match=h.match(/<article[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/article>/i);if(!match)return new Set();return new Set(text(match[1]).replace(/الدمام|الخبر|الظهران/g,'المدينة').replace(/[^\p{L}\p{N}]+/gu,' ').toLowerCase().split(/\s+/).filter(word=>word.length>2))}
function jaccard(a,b){let intersection=0;for(const value of a)if(b.has(value))intersection+=1;return intersection/(a.size+b.size-intersection||1)}

for(const [r,h] of pages){
  const analyticsCount=h.split(analyticsSrc).length-1;if(analyticsCount!==1)errors.push(`${r}: expected one versioned analytics script, found ${analyticsCount}`);if(h.includes('Google tag: queued immediately'))errors.push(`${r}: legacy inline Google tag remains`);
  const typographyCount=h.split(typographyHref).length-1;if(typographyCount!==1)errors.push(`${r}: expected one versioned typography stylesheet, found ${typographyCount}`);if(/fonts\.(?:googleapis|gstatic)\.com/i.test(h))errors.push(`${r}: external font dependency remains`);
  for(const font of ['alexandria-arabic-variable.woff2','ibm-plex-sans-arabic-regular.woff2']){const preloadCount=all(h,new RegExp(`<link\\b(?=[^>]*\\brel=["']preload["'])(?=[^>]*\\bas=["']font["'])[^>]*${font.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[^>]*>`,'gi')).length;if(preloadCount!==1)errors.push(`${r}: expected one preload for ${font}, found ${preloadCount}`)}
  if(h.includes('blog-archive.js')&&!h.includes(`blog-archive.js?v=${assetRevision('blog-archive.js')}`))errors.push(`${r}: blog-archive.js has a stale revision`);
  if(/^service-(?:construction|turnkey|restoration|finishing|decor|mep)\.html$/.test(r)){if(!h.includes('assets/css/tawod-service-decisions.css?v=20260823-1'))errors.push(`${r}: missing versioned decision-support styles`);const cards=all(h,/class=["'][^"']*tawod-decision-card[^"']*["']/gi).length;if(cards!==3)errors.push(`${r}: expected three decision-support cards, found ${cards}`);if((h.match(/TAWOD_STATIC_DECISION_START/g)||[]).length!==1)errors.push(`${r}: decision-support block is missing or duplicated`)}
  const ts=all(h,/<title[^>]*>([\s\S]*?)<\/title>/gi);if(ts.length!==1)errors.push(`${r}: expected one title, found ${ts.length}`);const title=ts[0]?text(ts[0][1]):'';if(title){if(titles.has(title))errors.push(`${r}: duplicate title with ${titles.get(title)}`);else titles.set(title,r);if(title.length<15||title.length>75)warnings.push(`${r}: title length ${title.length}`)}
  const ds=all(h,/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/gi);if(ds.length!==1)errors.push(`${r}: expected one meta description, found ${ds.length}`);const d=ds[0]?(ds[0][1]||ds[0][2]||''):'';if(d&&(d.length<70||d.length>180))warnings.push(`${r}: description length ${d.length}`);
  const cs=all(h,/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>|<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/gi);if(cs.length!==1)errors.push(`${r}: expected one canonical, found ${cs.length}`);const c=cs[0]?(cs[0][1]||cs[0][2]):'';if(c){if(canonicals.has(c))errors.push(`${r}: duplicate canonical with ${canonicals.get(c)}`);else canonicals.set(c,r);if(r!=='404.html'&&c!==domain+pagePath(r))errors.push(`${r}: canonical mismatch ${c}`)}
  const h1=all(h,/<h1\b[^>]*>/gi).length;if(h1!==1)errors.push(`${r}: expected one H1, found ${h1}`);
  const ids=all(h,/\bid=["']([^"']+)["']/gi).map(m=>m[1]);[...new Set(ids.filter((x,i,a)=>a.indexOf(x)!==i))].forEach(id=>errors.push(`${r}: duplicate id ${id}`));
  const schemas=[];all(h,/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi).forEach((m,i)=>{try{schemas.push(JSON.parse(m[1].trim()))}catch(e){errors.push(`${r}: invalid JSON-LD block ${i+1}: ${e.message}`)}});
  if(r.startsWith('lp/')&&!/<meta\b(?=[^>]*name=["']robots["'])[^>]*content=["'][^"']*noindex/i.test(h))errors.push(`${r}: ads-only landing page must be noindex,follow`);
  const excluded=r==='index.html'||r==='privacy-policy.html'||r==='404.html'||r.startsWith('en/')||/noindex/i.test(h);
  const localMatch=r.match(/^(dammam|khobar|dhahran)\//),localCity=localMatch?.[1]||'',localSilo=Boolean(localCity),localArticle=localCity&&new RegExp(`^${localCity}/blog/[^/]+/index\\.html$`).test(r);
  const maintenanceSilo=r.startsWith('maintenance/'),maintenanceHub=r==='maintenance/index.html';
  const blogArchivePage=r==='blog/index.html'||/^blog\/page\/\d+\/index\.html$/.test(r),blogTopicPage=/^blog\/topics\/[^/]+\/index\.html$/.test(r)||r==='blog/turnkey-riyadh/index.html',blogArticle=/^blog\/[^/]+\/index\.html$/.test(r)&&r!=='blog/turnkey-riyadh/index.html';
  if(!excluded){
    indexable.add(pagePath(r));
    if(maintenanceSilo){
      if(!h.includes('assets/css/maintenance.css'))errors.push(`${r}: missing maintenance.css`);
      if(!h.includes('assets/js/maintenance.js'))errors.push(`${r}: missing maintenance.js`);
      all(h,/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi).map(m=>m[1]).forEach(v=>{const t=localTarget(r,v);if(t&&!t.file.startsWith('maintenance/'))errors.push(`${r}: maintenance silo link escapes to ${v}`)});
    }else if(!h.includes('tawod-system.css'))errors.push(`${r}: missing tawod-system.css`);
    if(!localSilo&&!blogArchivePage){
      if(!/<section[^>]*(?:id=["']faq["']|class=["'][^"']*(?:seo-faq|tawod-faq-section)[^"']*["'])/i.test(h))errors.push(`${r}: missing visible FAQ section`);
      if(!schemas.some(x=>schemaHas(x,'FAQPage')))errors.push(`${r}: missing FAQPage schema`);
    }
    if(localCity){
      if(!h.includes(`tawod-${localCity}.css`))errors.push(`${r}: missing tawod-${localCity}.css`);
      if(/نطاق(?:\s+ال)?خدمة|عنوان فرع|فرعًا مستقلًا/.test(h))errors.push(`${r}: contains customer-facing service-area wording`);
      if(!/<section[^>]*(?:id=["']faq["']|class=["'][^"']*tawod-faq-section[^"']*["'])/i.test(h))errors.push(`${r}: missing visible ${localCity} FAQ section`);
      if(!schemas.some(x=>schemaHas(x,'FAQPage')))errors.push(`${r}: missing ${localCity} FAQPage schema`);
      if(localArticle&&!schemas.some(x=>schemaHas(x,'Article')))errors.push(`${r}: missing ${localCity} Article schema`);
      all(h,/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi).map(m=>m[1]).filter(v=>v.startsWith('/')&&!v.startsWith(`/${localCity}/`)).forEach(v=>errors.push(`${r}: ${localCity} silo link escapes to ${v}`));
      if(r==='khobar/index.html'&&title!=='شركة مقاولات بالخبر | تعاود للمقاولات العامة')errors.push(`${r}: homepage title must match the approved Khobar title`);
      if(r==='dhahran/index.html'&&title!=='شركة مقاولات بالظهران | تعاود للمقاولات العامة')errors.push(`${r}: homepage title must match the approved Dhahran title`);
    }
    if(!maintenanceHub&&!schemas.some(x=>schemaHas(x,'BreadcrumbList')))errors.push(`${r}: missing BreadcrumbList schema`);
    if(blogArchivePage||blogTopicPage){
      if(!schemas.some(x=>schemaHas(x,'CollectionPage')))errors.push(`${r}: missing CollectionPage schema`);
    }else if(blogArticle){
      if(!schemas.some(x=>schemaHas(x,'Article')))errors.push(`${r}: missing Article schema`);
      const articleEntities=schemas.reduce((sum,node)=>sum+schemaCount(node,'Article')+schemaCount(node,'BlogPosting'),0);
      if(articleEntities!==1)errors.push(`${r}: expected exactly one Article entity, found ${articleEntities}`);
      if(!h.includes('/blog/topics/')&&!h.includes('/blog/turnkey-riyadh/'))errors.push(`${r}: missing topic-hub context link`);
    }else if(localSilo){
      const accepted=['WebPage','AboutPage','ContactPage','CollectionPage','Service'];
      if(!accepted.some(type=>schemas.some(x=>schemaHas(x,type))))errors.push(`${r}: missing local page schema`);
    }else if(maintenanceSilo){
      const expected=maintenanceHub?'WebPage':'Service';
      if(!schemas.some(x=>schemaHas(x,expected)))errors.push(`${r}: missing maintenance ${expected} schema`);
    }else if(!schemas.some(x=>schemaHas(x,'WebPage')))errors.push(`${r}: missing WebPage schema`);
  }
  all(h,/<(?:a|link|script|img|source|iframe)\b[^>]*(?:href|src|srcset)=["']([^"']+)["'][^>]*>/gi).forEach(m=>m[1].split(',').map(x=>x.trim().split(/\s+/)[0]).filter(Boolean).forEach(v=>{const t=localTarget(r,v);if(!t)return;const full=path.join(root,t.file);if(!fs.existsSync(full)){errors.push(`${r}: broken reference ${v} -> ${t.file}`);return}if(t.anchor&&t.file.endsWith('.html')){const target=pages.get(t.file)||fs.readFileSync(full,'utf8');const safe=t.anchor.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(!new RegExp(`\\bid=["']${safe}["']`).test(target))errors.push(`${r}: missing anchor #${t.anchor} in ${t.file}`)}}));
}

if(!fs.existsSync('sitemap.xml'))errors.push('sitemap.xml missing');else{const s=fs.readFileSync('sitemap.xml','utf8'),listed=all(s,/<loc>([^<]+)<\/loc>/gi).map(m=>new URL(m[1]).pathname),urls=new Set(listed);if(listed.length!==urls.size)errors.push(`sitemap.xml contains ${listed.length-urls.size} duplicate URL(s)`);for(const p of indexable)if(!urls.has(p))errors.push(`sitemap.xml missing ${p}`);for(const p of urls){let r=p==='/'?'index.html':p.slice(1);if(r.endsWith('/'))r+='index.html';if(!pages.has(r))errors.push(`sitemap URL does not resolve: ${p}`)}}
const localCities=[...new Set([...indexable].map(p=>p.match(/^\/(dammam|khobar|dhahran)\//)?.[1]).filter(Boolean))];
for(const city of localCities){const file=`sitemap-${city}.xml`;if(!fs.existsSync(file)){errors.push(`${file} missing`);continue}const s=fs.readFileSync(file,'utf8'),urls=new Set(all(s,/<loc>([^<]+)<\/loc>/gi).map(m=>new URL(m[1]).pathname)),cityPages=new Set([...indexable].filter(p=>p.startsWith(`/${city}/`)));for(const p of cityPages)if(!urls.has(p))errors.push(`${file} missing ${p}`);for(const p of urls){if(!p.startsWith(`/${city}/`))errors.push(`${file} contains non-${city} URL ${p}`);if(!cityPages.has(p))errors.push(`${file} has unexpected URL ${p}`)}}
if(!fs.existsSync('robots.txt'))errors.push('robots.txt missing');else{const robots=fs.readFileSync('robots.txt','utf8'),sitemapLines=robots.split(/\r?\n/).filter(line=>/^Sitemap:/i.test(line.trim())).map(line=>line.trim());if(sitemapLines.length!==1||sitemapLines[0]!=='Sitemap: https://tawodco.com/sitemap.xml')errors.push(`robots.txt must advertise only the canonical sitemap.xml; found ${sitemapLines.join(', ')||'none'}`)}
if(!fs.existsSync('assets/js/tawod-inner.js'))errors.push('tawod-inner.js missing');else{const js=fs.readFileSync('assets/js/tawod-inner.js','utf8');['injectComprehensiveFaq','addFaqSchema','applyServiceProfile','injectTrustStrip','addPageSchema'].forEach(x=>{if(js.includes(x))errors.push(`tawod-inner.js still contains runtime generator ${x}`)});if(/\.\.\/\.\.\/images\/logo\//.test(js))errors.push('tawod-inner.js contains a depth-dependent logo path')}
for(const file of [typographyFile,'assets/fonts/alexandria-arabic-variable.woff2','assets/fonts/ibm-plex-sans-arabic-regular.woff2','assets/fonts/ibm-plex-sans-arabic-medium.woff2','assets/fonts/ibm-plex-sans-arabic-semibold.woff2','assets/fonts/IBM-PLEX-SANS-ARABIC-LICENSE.txt'])if(!fs.existsSync(file)||fs.statSync(file).size===0)errors.push(`${file} missing or empty`);
if(!fs.existsSync('assets/js/tawod-analytics.js'))errors.push('tawod-analytics.js missing');else{const js=fs.readFileSync('assets/js/tawod-analytics.js','utf8');['G-YE1NT4R4YT','AW-18266173285','AW-18266173285/qi4gCLu5lsUcEOXe_oVE','form_submit_attempt','tawodLeadSubmitted','generate_lead','transaction_id'].forEach(value=>{if(!js.includes(value))errors.push(`tawod-analytics.js missing ${value}`)})}
for(const file of ['assets/js/tawod-home.js','assets/js/tawod-inner.js','assets/js/blog-archive.js']){const js=fs.readFileSync(file,'utf8');if(/\bgtag\s*\(/.test(js))errors.push(`${file}: duplicate analytics tracking remains`)}
if(fs.existsSync('assets/js/contact-conversion.js')){const js=fs.readFileSync('assets/js/contact-conversion.js','utf8');for(const marker of ['form_submit_attempt','tawodLeadSubmitted','generate_lead'])if(js.includes(marker))errors.push(`contact-conversion.js must leave ${marker} to sitewide analytics`)}
for(const [file,html] of pages){for(const form of all(html,/<form\b(?=[^>]*\baction=["']https:\/\/(?:www\.)?formsubmit\.co\/[^"']+["'])[^>]*>[\s\S]*?<\/form>/gi)){if(!/\bdata-analytics-form=["'][^"']+["']/i.test(form[0]))errors.push(`${file}: lead form missing data-analytics-form`);if(!/<input\b[^>]*\bname=["']_next["'][^>]*\bvalue=["']https:\/\/tawodco\.com\/thank-you\.html["'][^>]*>/i.test(form[0]))errors.push(`${file}: lead form must redirect to confirmed thank-you page`)}}
const thankYou=pages.get('thank-you.html')||'';for(const marker of ['TAWOD_STATIC_CONTEXT','TAWOD_STATIC_FAQ','TAWOD_STATIC_SCHEMA','lead_confirmation'])if(thankYou.includes(marker))errors.push(`thank-you.html still contains ${marker}`);
const home=pages.get('index.html')||'';for(const required of ['"@type": "GeneralContractor"','"@id": "https://tawodco.com/#organization"','"value": "7033495099"','"hasOfferCatalog"'])if(!home.includes(required))errors.push(`index.html entity graph missing ${required}`);for(const stale of ['https://tawodco.com/#localbusiness','"priceRange"'])if(home.includes(stale))errors.push(`index.html entity graph still contains ${stale}`);
const localArticleBases=fs.readdirSync(path.join(root,'dammam','blog'),{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>entry.name.replace(/-dammam$/,''));for(const base of localArticleBases){const variants=['dammam','khobar','dhahran'].map(city=>({city,file:`${city}/blog/${base}-${city}/index.html`})).filter(item=>pages.has(item.file));for(let i=0;i<variants.length;i+=1)for(let j=i+1;j<variants.length;j+=1){const similarity=jaccard(articleTokens(variants[i].file),articleTokens(variants[j].file));if(similarity>0.86)errors.push(`local article similarity regression ${base}: ${variants[i].city}/${variants[j].city} = ${similarity.toFixed(3)}`)}}
warnings.forEach(x=>console.warn('WARNING: '+x));if(errors.length){console.error(`Site validation failed with ${errors.length} error(s):`);errors.forEach(x=>console.error(' - '+x));process.exit(1)}console.log(`Validated ${htmlFiles.length} HTML files, ${indexable.size} indexable URLs, links, sitemap, metadata and JSON-LD.`);
