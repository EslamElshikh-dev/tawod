import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Final build pass: retain developer metadata and omit the visible footer signature.
const config = {"url": "https://tawodco.com/", "website_id": "https://tawodco.com/#website", "name": "شركة تعاود للمقاولات العامة", "color": "#e7ab4b", "developer": {"@type": "Person", "@id": "https://www.eslam-elshikh.com/#person", "name": "إسلام الشيخ", "alternateName": ["المهندس إسلام الشيخ", "Eslam Elshikh"], "url": "https://www.eslam-elshikh.com/", "sameAs": ["https://github.com/EslamElshikh-dev"]}, "creditText": "تصميم وبرمجة وتطوير الموقع: المهندس إسلام الشيخ — https://www.eslam-elshikh.com/"};
function parse(text) {
 const nodes=[],stack=[]; const tags=/<\/?[A-Za-z][^>]*(?:>|$)/g;let m;
 while((m=tags.exec(text))) {
  const tok=m[0],close=/^<\//.test(tok),tag=(tok.match(/^<\/?([\w:-]+)/)||[])[1]?.toLowerCase();if(!tag)continue;
  if(close){let i=stack.length-1;while(i>=0&&stack[i].tag!==tag)i--;if(i>=0){stack[i].end=tags.lastIndex;stack.length=i;}continue;}
  const a={};for(const x of tok.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))a[x[1].toLowerCase()]=x[2]??x[3];
  const n={tag,a,start:m.index,end:null,parent:stack.at(-1)};nodes.push(n);
  if(['img','meta','link','br','hr','input','source','wbr','area','base','embed','param','track','col'].includes(tag)||/\/>$/.test(tok))n.end=tags.lastIndex;
  else if(tag==='script'||tag==='style'){const end=text.indexOf('</'+tag,tags.lastIndex);if(end>=0){const gt=text.indexOf('>',end);n.end=gt+1;tags.lastIndex=gt+1;}}
  else stack.push(n);
 }
 return nodes;
}
export function normalize(text) {
 if(!/<html\b/i.test(text)||!/<footer\b/i.test(text))return text;
 text=text.replace(/<style\b[^>]*id="eslam-developer-credit-style"[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script\b[^>]*id="eslam-developer-credit-schema"[^>]*>[\s\S]*?<\/script>/gi,'');
 const nodes=parse(text),candidates=[];
 const inside=n=>{for(let p=n.parent;p;p=p.parent)if(p.tag==='footer')return true;return false;};
 for(const n of nodes){
  if(!n.end||!inside(n))continue;
  const raw=text.slice(n.start,n.end),plain=raw.replace(/<[^>]+>/g,' '),cl=n.a.class||'';
  const anchor=n.tag==='a'&&(/eslam-elshikh\.com/.test(n.a.href||'')||n.a.href==='/developer'&&/إسلام|اسلام|Eslam/i.test(plain));
  const block=['div','p','span'].includes(n.tag)&&/es-dev-credit$|developer-credit|footer-bottom__credit/.test(cl)&&/إسلام|اسلام|Eslam/i.test(plain);
  if(!anchor&&!block)continue;
  let chosen=n;
  for(let p=n.parent;p&&['div','p','span'].includes(p.tag)&&p.end;p=p.parent){
   const pr=text.slice(p.start,p.end),pt=pr.replace(/<[^>]+>/g,' '),links=[...pr.matchAll(/href=["']([^"']+)/gi)].map(x=>x[1]);
   const credit=/es-dev-credit|developer-credit|signature-copy|footer-bottom__credit/.test(p.a.class||'')||p.tag==='p'&&/Develop|تصميم|تطوير/i.test(pt);
   if(pr.length<2000&&credit&&!/©|حقوق|Privacy|الخصوصية/i.test(pt)&&links.every(x=>/eslam-elshikh\.com|^\/developer$/.test(x)))chosen=p;else break;
  }
  candidates.push(chosen);
 }
 const ranges=[...new Map(candidates.map(n=>[n.start+':'+n.end,n])).values()].sort((a,b)=>a.start-b.start||b.end-a.end),outer=[];
 for(const n of ranges)if(!outer.some(x=>x.start<=n.start&&x.end>=n.end))outer.push(n);
 const edits=outer.map(n=>[n.start,n.end,'']);
 for(const [a,b,s] of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+s+text.slice(b);
 let website={ '@type':'WebSite','@id':config.website_id,url:config.url,name:config.name,creator:{'@id':config.developer['@id']},creditText:config.creditText};
 text=text.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,(all,start,raw,end)=>{
  let obj;try{obj=JSON.parse(raw);}catch{return all;}
  const visit=x=>{if(Array.isArray(x))x.forEach(visit);else if(x&&typeof x==='object'){if([x['@type']].flat().includes('WebSite')){x.creator={'@id':config.developer['@id']};x.creditText=config.creditText;website={...website,'@id':x['@id']||website['@id'],url:x.url||website.url,name:x.name||website.name};}Object.values(x).forEach(visit);}};visit(obj);
  return start+JSON.stringify(obj).replace(/</g,'\\u003c')+end;
 });
 const graph={'@context':'https://schema.org','@graph':[config.developer,website]};
 const extras='<script id="eslam-developer-credit-schema" type="application/ld+json">'+JSON.stringify(graph).replace(/</g,'\\u003c')+'</script>';
 if(!/<meta\b[^>]*name=["']creator["']/i.test(text))text=text.replace(/<\/head>/i,'<meta name="creator" content="المهندس إسلام الشيخ"></head>');
 text=text.replace(/<\/head>/i,()=>extras+'</head>');
 // This site's footer omits the visible developer signature at the owner's request.
 text=text.replace(/<div\b(?=[^>]*\bclass=["'][^"']*\beslam-credit-slot\b[^"']*["'])[^>]*>\s*<\/div>/gi,'');
 if(/data-eslam-signature=["']v1["']/.test(text))throw Error('Visible developer signature must be absent');
 return text;
}
let processed=0;
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','.next','.openai','tests','test','.sites-runtime'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.html?$/i.test(e.name)){const old=fs.readFileSync(p,'utf8'),next=normalize(old);if(next!==old){fs.writeFileSync(p,next);processed++;}}}}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
for(const dir of process.argv.slice(2).length?process.argv.slice(2):['dist'])walk(path.resolve(dir));
console.log('Verified developer credit in '+processed+' generated HTML pages.');
}
