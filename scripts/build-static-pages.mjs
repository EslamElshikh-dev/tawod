import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createHash} from 'node:crypto';
import {articleRole,legacyTopicHubSlugs,topicForArticle,topicForService,topicUrl} from './blog-topic-data.mjs';

const root=process.cwd(),check=process.argv.includes('--check'),domain='https://tawodco.com',date='2026-07-13';
const marks=['TRUST','TOC','TAKEAWAYS','TOOLS','TOPIC','RELATED','GUIDES','DECISION','CONTEXT','FAQ','SCHEMA'];
const rootServices=new Set(['service-construction.html','service-turnkey.html','service-restoration.html','service-finishing.html','service-decor.html','service-mep.html']);
const ignoredDirectories=new Set(['.git','.next','node_modules','out','public']);
const architectureCss='assets/css/tawod-blog-architecture.css';
const architectureVersion=createHash('sha256').update(fs.readFileSync(path.join(root,architectureCss))).digest('hex').slice(0,12);
const contentRefreshDates=new Map([
  ['blog/mechanical-mep-works-riyadh/index.html','2026-08-29'],
  ['blog/turnkey-commercial-fitout-riyadh/index.html','2026-08-29'],
  ['blog/turnkey-contracts-riyadh/index.html','2026-08-29'],
  ['blog/turnkey-contract-checklist-riyadh/index.html','2026-08-29'],
  ['blog/finishing-apartment-riyadh/index.html','2026-08-29'],
  ['blog/finishing-materials-riyadh/index.html','2026-08-29'],
  ['blog/finishing-villa-riyadh-guide/index.html','2026-08-29'],
]);
const serviceRefreshDates=new Map([
  ['service-construction.html','2026-08-29'],
  ['service-turnkey.html','2026-08-29'],
  ['service-finishing.html','2026-08-29'],
  ['service-decor.html','2026-08-29'],
  ['service-mep.html','2026-08-29'],
]);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>ignoredDirectories.has(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const rel=f=>path.relative(root,f).split(path.sep).join('/');
const prefix=f=>'../'.repeat(rel(f).split('/').length-1);
const pagePath=r=>r==='index.html'?'/':r.endsWith('/index.html')?'/'+r.slice(0,-10):'/'+r;
const marker=n=>[`<!-- TAWOD_STATIC_${n}_START -->`,`<!-- TAWOD_STATIC_${n}_END -->`];
const strip=(h,n)=>{const [a,b]=marker(n);return h.replace(new RegExp(a+'[\\s\\S]*?'+b+'\\s*','g'),'')};
const first=(h,re,d='')=>{const m=h.match(re);return m?text(m[1]):d};
const metaDescription=(h,d='')=>{const tag=h.match(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i)?.[0],value=tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1];return value?text(value):d};
const insertBeforeMainEnd=(h,m)=>h.replace(/<\/main>/i,m+'\n</main>');
const insertBeforeHeadEnd=(h,m)=>h.includes('<!-- TAWOD_ANALYTICS_START -->')?h.replace('<!-- TAWOD_ANALYTICS_START -->',m+'<!-- TAWOD_ANALYTICS_START -->'):h.replace(/<\/head>/i,m+'</head>');

function state(r,h){const slug=r.match(/^blog\/([^/]+)\/index\.html$/)?.[1];return{home:r==='index.html',skip:['privacy-policy.html','thank-you.html','404.html'].includes(r)||r.startsWith('en/'),article:Boolean(slug&&!legacyTopicHubSlugs.has(slug)),indexable:!r.endsWith('404.html')&&!/noindex/i.test(h)}}
function landingRobots(h){const tag='<meta name="robots" content="noindex,follow,max-image-preview:large">';return /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i.test(h)?h.replace(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i,tag):h.replace(/<\/title>/i,`</title>${tag}`)}
function jsonLdNodes(h){const nodes=[];for(const match of h.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const value=JSON.parse(match[1].trim()),queue=[value];while(queue.length){const node=queue.shift();if(!node||typeof node!=='object')continue;if(Array.isArray(node)){queue.push(...node);continue}if(Array.isArray(node['@graph']))queue.push(...node['@graph']);nodes.push(node)}}catch{}}return nodes}
function articleMetadata(h){const articles=jsonLdNodes(h).filter(node=>node['@type']==='Article'||node['@type']==='BlogPosting'),primary=articles.find(node=>node.datePublished)||articles[0]||{};const og=h.match(/<meta\b(?=[^>]*\bproperty=["']og:image["'])[^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1]||h.match(/<meta\b(?=[^>]*\bcontent=["']([^"']+)["'])(?=[^>]*\bproperty=["']og:image["'])[^>]*>/i)?.[1]||'';let image=primary.image||og||`${domain}/images/blog/construction-building-riyadh.webp`;if(Array.isArray(image))image=image[0];if(image&&typeof image==='object')image=image.url||image.contentUrl||'';if(image.startsWith('/'))image=domain+image;const published=primary.datePublished||primary.dateModified||date;return{datePublished:published,dateModified:primary.dateModified||published,image,keywords:primary.keywords||''}}
function stripArticleSchemas(h){return h.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,'')}
function visibleFaqs(h){return [...h.matchAll(/<div[^>]*class=["'][^"']*faq-item[^"']*["'][^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<div[^>]*class=["'][^"']*faq-answer[^"']*["'][^>]*>\s*<p>([\s\S]*?)<\/p>/gi)].map(match=>[text(match[1]),text(match[2])]).filter(item=>item[0]&&item[1])}
function formatEditorialDate(value){try{return new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00Z`))}catch{return value}}

const articleCatalog=walk(root)
  .filter(file=>{const slug=rel(file).match(/^blog\/([^/]+)\/index\.html$/)?.[1];return Boolean(slug&&!legacyTopicHubSlugs.has(slug))})
  .map(file=>{const r=rel(file),slug=r.split('/')[1],h=fs.readFileSync(file,'utf8'),topic=topicForArticle(slug);return{r,slug,title:first(h,/<h1[^>]*>([\s\S]*?)<\/h1>/i,slug),topic,role:articleRole(slug,topic)}})
  .sort((a,b)=>Number(a.role!=='pillar')-Number(b.role!=='pillar')||a.title.localeCompare(b.title,'ar'));
const articleBySlug=new Map(articleCatalog.map(article=>[article.slug,article]));
function context(r,h){const name=first(h,/<h1[^>]*>([\s\S]*?)<\/h1>/i,'خدمات شركة تعاود للمقاولات');let scope='حلول مقاولات للمشاريع السكنية والتجارية في الرياض تبدأ بفهم الاحتياج وتحديد النطاق ثم تنظيم التنفيذ والمتابعة والتسليم.';let factors='نوع المشروع، المساحة، الموقع، الحالة الحالية، نطاق البنود، الخامات، والمدة المطلوبة.';if(/construction|bone/.test(r)){scope='أعمال البناء والعظم للفلل والملاحق والمباني، مع تنظيم مراحل التنفيذ وربطها بالتمديدات والتشطيبات التالية.';factors='المساحة، نوع المبنى، حالة الموقع، المخططات، المواصفات، ونطاق الأعمال.'}else if(/turnkey/.test(r)){scope='إدارة مراحل المشروع من تنسيق البنود والأعمال الأساسية إلى التشطيبات والفحص والتسليم الجاهز للاستخدام.';factors='نوع المشروع، مستوى التشطيب، المواد، الأنظمة الفنية، والبرنامج الزمني.'}else if(/restoration|renovation/.test(r)){scope='تقييم الحالة القائمة ومعالجة مظاهر التلف وتجديد الواجهات والمساحات وتحسين الوظيفة والمظهر.';factors='عمر المبنى، نوع الضرر، نتائج المعاينة، الأعمال المخفية، والمواد المطلوبة.'}else if(/finishing/.test(r)){scope='تنسيق وتنفيذ التشطيبات الداخلية والخارجية وربط الأرضيات والدهانات والأسقف والواجهات بالأعمال الفنية.';factors='المساحة، مستوى التشطيب، الخامات، حالة الأعمال السابقة، وعدد البنود.'}else if(/decor|interior|facades/.test(r)){scope='تصميم وتنفيذ حلول ديكور عملية ومتناسقة تراعي الاستخدام والإضاءة والحركة وهوية المكان.';factors='المساحة، أسلوب التصميم، المواد، الإضاءة، الأثاث، ومتطلبات التنفيذ.'}else if(/electrical|plumbing|mechanical|mep/.test(r)){scope='تنفيذ وتنسيق الأعمال الكهربائية والصحية والميكانيكية وربطها بالبناء والتشطيب لتقليل التعارضات.';factors='المخططات، الأحمال والنقاط، الأنظمة، حالة التمديدات، ومتطلبات الاختبار.'}return{name,scope,factors}}
function trust(){const [a,b]=marker('TRUST');return`${a}<section class="tawod-inner-trust" aria-label="منهج شركة تعاود"><div class="container"><div class="tawod-inner-trust-grid"><div><i class="fa-solid fa-list-check"></i><span><strong>نطاق واضح</strong><small>بنود ومسؤوليات قابلة للمتابعة</small></span></div><div><i class="fa-solid fa-compass-drafting"></i><span><strong>تنسيق هندسي</strong><small>ربط التخصصات قبل التعارضات</small></span></div><div><i class="fa-solid fa-magnifying-glass-chart"></i><span><strong>متابعة مرحلية</strong><small>مراجعة الأعمال في توقيتها</small></span></div><div><i class="fa-solid fa-clipboard-check"></i><span><strong>تسليم منظم</strong><small>فحص وإغلاق الملاحظات</small></span></div></div></div></section>${b}`}
function afterHero(h,m){const re=/<section[^>]*class="[^"]*(?:page-hero|blog-hero|article-hero)[^"]*"[^>]*>[\s\S]*?<\/section>/i;return re.test(h)?h.replace(re,x=>x+'\n'+m):h}
function faqs(c,article){const q=[[article?'ما الفائدة العملية من هذا الدليل؟':`ما الذي تشمل ${c.name}؟`,article?'يساعدك الدليل على فهم القرارات والنقاط التي يجب مراجعتها قبل التنفيذ أو التعاقد لتقليل التعديلات والمفاجآت.':c.scope],['ما أنواع المشاريع المناسبة؟','تنطبق الخدمة على الفلل والملاحق والمباني السكنية والتجارية والمكاتب والمحلات، وتختلف التفاصيل حسب حالة المشروع.'],['كيف يتم تحديد التكلفة؟',`تُحدد بعد مراجعة ${c.factors} ويفضل توفير مخططات أو صور أو جدول كميات إن وجد.`],['هل يحتاج المشروع إلى معاينة؟','يمكن مناقشة بعض الأعمال مبدئيًا بالصور، بينما تحتاج المشاريع الإنشائية أو المتكاملة إلى معاينة لفهم الحالة والقياسات.'],['كم تستغرق مدة التنفيذ؟','تعتمد المدة على حجم المشروع وعدد البنود وتسلسل التخصصات وتوفر المواد والموافقات والتعديلات.'],['هل يمكن اختيار الخامات؟','نعم، تناقش البدائل وفق الاستخدام والميزانية والمتطلبات الفنية مع توضيح أثرها على الجودة والصيانة والتكلفة.'],['كيف تتم متابعة الجودة؟','تتم المراجعة خلال المراحل المهمة وقبل تغطية الأعمال أو الانتقال للمرحلة التالية، ثم تغلق الملاحظات قبل التسليم.'],['هل يمكن تعديل البنود أثناء التنفيذ؟','يمكن دراسة التعديلات قبل تنفيذها مع توضيح أثرها على التكلفة والمدة وتسلسل الأعمال.'],['هل تخدمون جميع أحياء الرياض؟','نخدم مشاريع داخل مدينة الرياض ويُراجع الموقع وطبيعة الأعمال عند التواصل.'],['كيف أطلب عرض سعر؟','أرسل نوع المشروع والموقع والمساحة والمرحلة الحالية والصور أو المخططات المتاحة عبر نموذج التواصل أو واتساب.']];const cards=q.map((x,i)=>`<div class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="static-faq-${i}"><span>${esc(x[0])}</span><i class="fa-solid fa-chevron-down"></i></button><div class="faq-answer" id="static-faq-${i}"><p>${esc(x[1])}</p></div></div>`).join('');const [a,b]=marker('FAQ');return{q,html:`${a}<section id="faq" class="section-padding bg-light tawod-faq-section"><div class="container"><div class="section-title"><span class="eyebrow">أسئلة شائعة</span><h2>إجابات واضحة حول ${esc(c.name)}</h2><p>معلومات تساعدك على فهم النطاق والتكلفة والمدة والمتابعة والتسليم قبل اتخاذ القرار.</p></div><div class="faq-wrap tawod-faq-grid">${cards}</div></div></section>${b}`}}
function contextLinks(c,p){const l=[['البناء والإنشاءات','service-construction.html','fa-trowel-bricks'],['تسليم المفتاح','service-turnkey.html','fa-key'],['الترميم والتجديد','service-restoration.html','fa-house-chimney-crack'],['التشطيبات','service-finishing.html','fa-paint-roller'],['الديكور','service-decor.html','fa-couch'],['الكهرباء والسباكة','service-mep.html','fa-screwdriver-wrench']];const [a,b]=marker('CONTEXT');return`${a}<section class="section-padding tawod-context-links"><div class="container"><div class="section-title"><span class="eyebrow">خدمات مترابطة</span><h2>اربط ${esc(c.name)} بباقي مراحل مشروعك</h2><p>التنسيق المبكر يقلل التعارضات ويجعل القرارات وتسلسل التنفيذ أكثر وضوحًا.</p></div><div class="tawod-context-grid">${l.map(x=>`<a href="${p+x[1]}"><i class="fa-solid ${x[2]}"></i><span>${x[0]}</span><i class="fa-solid fa-arrow-left"></i></a>`).join('')}</div></div></section>${b}`}
function decisionProof(r,p){const profiles={
  'service-construction.html':{slug:'construction',eyebrow:'قرار البناء',title:'ما الذي تراجعه قبل توقيع عقد البناء؟',intro:'العرض الأقوى ليس الأقل رقمًا فقط؛ بل الأكثر وضوحًا في المدخلات ونقاط الفحص وما سيتم تسليمه.',cards:[['fa-file-signature','قبل عرض السعر',['مخططات معتمدة وتقرير التربة عند الحاجة','جدول كميات ومواصفات يحددان حدود المسؤولية','توضيح الأعمال غير المشمولة والافتراضات']],['fa-magnifying-glass-chart','أثناء التنفيذ',['اعتماد المواد قبل التوريد','نقاط فحص قبل الصب أو تغطية الأعمال','سجل مكتوب للتغييرات وأثرها على المدة والتكلفة']],['fa-clipboard-check','عند الاستلام',['قائمة ملاحظات وإغلاقها قبل اعتماد المرحلة','نتائج الاختبارات والمحاضر المرتبطة بالنطاق','حصر واضح للأعمال المنفذة والمتبقية']]]},
  'service-turnkey.html':{slug:'turnkey',eyebrow:'قرار تسليم المفتاح',title:'كيف تمنع فجوات المسؤولية في مشروع تسليم المفتاح؟',intro:'نجاح المسار المتكامل يعتمد على تثبيت القرارات ومن يملك كل اعتماد قبل انتقال المشروع بين التخصصات.',cards:[['fa-diagram-project','قبل البدء',['تثبيت المخططات ومستوى التشطيب','مصفوفة مسؤوليات للمقاول والمصمم والمالك','جدول اختيارات يحدد مواعيد اعتماد الخامات']],['fa-calendar-check','أثناء التنفيذ',['برنامج يربط البناء وMEP والتشطيبات','تقارير دورية للمنجز والقرارات المتأخرة','أوامر تغيير مكتوبة قبل تنفيذ البنود الإضافية']],['fa-key','قبل التسليم',['تشغيل واختبار الأنظمة المرتبطة بالنطاق','قائمة ملاحظات نهائية ومسؤول عن إغلاقها','تجميع الضمانات وتعليمات الاستخدام المتاحة']]]},
  'service-restoration.html':{slug:'restoration',eyebrow:'قرار الترميم',title:'ابدأ بسبب المشكلة لا بمظهرها فقط',intro:'التشقق أو الرطوبة أو تلف التشطيب قد يكون عرضًا لسبب أعمق؛ لذلك يبدأ القرار الجيد بالتشخيص وحدود التدخل.',cards:[['fa-stethoscope','قبل التسعير',['توثيق الحالة بالصور والقياسات','تمييز السبب المحتمل عن الأثر الظاهر','حصر العناصر التي ستبقى وما سيزال أو يستبدل']],['fa-house-circle-check','أثناء المعالجة',['حماية الأجزاء المستخدمة أو السليمة','اختبار عينة أو مساحة محدودة عند الحاجة','توثيق الأعمال المخفية قبل إغلاقها']],['fa-shield-halved','عند الإغلاق',['التحقق من توقف السبب قبل إعادة التشطيب','مقارنة نطاق التنفيذ بالحصر المعتمد','تعليمات الصيانة والمراقبة بعد الترميم']]]},
  'service-finishing.html':{slug:'finishing',eyebrow:'قرار التشطيب',title:'حوّل مستوى التشطيب إلى مواصفات قابلة للفحص',intro:'وصف مثل “تشطيب فاخر” لا يكفي للمقارنة؛ القرار الأدق يربط كل بند بعينة ومقاس وطريقة استلام.',cards:[['fa-swatchbook','قبل التعاقد',['لوحة مواد وعينات معتمدة','تحديد المقاسات والماركات أو البدائل المقبولة','مراجعة جاهزية الأسطح والأعمال السابقة']],['fa-ruler-combined','أثناء التنفيذ',['نماذج اعتماد قبل تعميم البند','فحص الاستواء والفواصل والمحاذاة','تنسيق الإضاءة والأبواب والأثاث مع التشطيب']],['fa-list-check','قبل التسليم',['قائمة ملاحظات مقسمة حسب الغرف والبنود','تنظيف وحماية الأسطح حتى التسليم','حصر المواد الاحتياطية والضمانات المتاحة']]]},
  'service-decor.html':{slug:'decor',eyebrow:'قرار الديكور',title:'اختبر التصميم على الاستخدام قبل تنفيذه',intro:'الصورة الجميلة وحدها لا تكفي؛ يجب أن تعمل الحركة والإضاءة والمقاسات والخامات معًا داخل المساحة الفعلية.',cards:[['fa-pen-ruler','قبل التنفيذ',['رفع مقاسات الموقع ومراجعة المناسيب','تثبيت توزيع الأثاث ومسارات الحركة','ربط الإضاءة والمفاتيح والتكييف بالتصميم']],['fa-cubes-stacked','أثناء التصنيع والتركيب',['اعتماد عينات الألوان والخامات تحت إضاءة الموقع','مراجعة تفاصيل الالتقاء والحواف والفواصل','تجربة نموذج للتفاصيل المتكررة عند الحاجة']],['fa-camera-retro','عند التسليم',['مطابقة التنفيذ للعينات والتفاصيل المعتمدة','فحص التشغيل والوصول للصيانة','تسليم قائمة بالخامات وتعليمات العناية المتاحة']]]},
  'service-mep.html':{slug:'mep',eyebrow:'قرار الأعمال الفنية',title:'لا تُغلق الجدران قبل اختبارات الكهرباء والسباكة',intro:'أغلب تكلفة إعادة العمل تظهر عندما تُغطى المسارات قبل تنسيقها واختبارها؛ لذلك نقاط التوقف والفحص أساسية.',cards:[['fa-draw-polygon','قبل التنفيذ',['مخططات نقاط ومسارات متوافقة مع الاستخدام','مراجعة الأحمال والأقطار والمناسيب بحسب التصميم','كشف التعارضات مع الإنشاء والأسقف والديكور']],['fa-vial-circle-check','قبل الإغلاق',['اختبارات مرتبطة بنوع النظام ونطاقه','تصوير المسارات والأعمال المخفية','اعتماد نقطة فحص قبل اللياسة أو البلاط أو الأسقف']],['fa-screwdriver-wrench','عند التشغيل',['اختبار اللوحات والنقاط والتغذية والصرف','تسمية اللوحات والمحابس وفق النطاق','حفظ نتائج الاختبار والمخططات المعدلة المتاحة']]]}
};const profile=profiles[r];if(!profile)return'';const [a,b]=marker('DECISION');return`${a}<section class="section-padding tawod-decision-proof" aria-labelledby="decision-${profile.slug}"><div class="container"><div class="section-title"><span class="eyebrow">${profile.eyebrow}</span><h2 id="decision-${profile.slug}">${profile.title}</h2><p>${profile.intro}</p></div><div class="tawod-decision-grid">${profile.cards.map(card=>`<article class="tawod-decision-card"><div class="tawod-decision-icon"><i class="fa-solid ${card[0]}" aria-hidden="true"></i></div><h3>${card[1]}</h3><ul>${card[2].map(item=>`<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${item}</span></li>`).join('')}</ul></article>`).join('')}</div><div class="tawod-decision-actions"><a class="btn btn-outline" href="${p}projects.html">شاهد نماذج الأعمال</a><a class="btn btn-primary" href="${p}contact.html">أرسل تفاصيل مشروعك</a></div></div></section>${b}`}

function articleArchitecture(r,metadata){
  const slug=r.split('/')[1],topic=topicForArticle(slug),role=articleRole(slug,topic),related=articleCatalog.filter(article=>article.topic.slug===topic.slug&&article.slug!==slug).slice(0,4),[ta,tb]=marker('TOPIC'),[ra,rb]=marker('RELATED');
  const secondary=topic.secondaryServiceUrl?`<a href="${topic.secondaryServiceUrl}" data-article-link="service"><i class="fa-solid fa-swatchbook" aria-hidden="true"></i>${topic.secondaryServiceLabel}</a>`:'';
  const trail=`${ta}<nav class="tawod-article-topic-path" aria-label="مسار موضوع المقال"><a href="/blog/">المدونة</a><i class="fa-solid fa-angle-left" aria-hidden="true"></i><a href="${topicUrl(topic)}">${topic.title}</a><i class="fa-solid fa-angle-left" aria-hidden="true"></i><span aria-current="page">${role==='pillar'?'الدليل المحوري':'دليل متخصص'}</span></nav><aside class="tawod-editorial-meta" aria-label="إعداد ومراجعة المقال"><span><strong>إعداد</strong>فريق المحتوى في شركة تعاود</span><span><strong>مراجعة فنية</strong>فريق المشاريع والتنفيذ</span><a href="/editorial-policy/"><strong>آخر مراجعة</strong>${formatEditorialDate(metadata.dateModified)} · السياسة التحريرية</a></aside>${tb}`;
  const links=related.map(article=>`<a href="/blog/${article.slug}/" data-article-link="related"><span>${esc(article.title)}</span><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></a>`).join('');
  const cluster=`${ra}<section class="tawod-article-cluster" aria-labelledby="related-${slug}"><div class="tawod-article-cluster-head"><div><span class="eyebrow">المسار المعرفي</span><h2 id="related-${slug}">تابع أدلة ${topic.title}</h2><p>انتقل إلى الدليل المحوري أو الأدلة المرتبطة، ثم إلى الخدمة عندما تصبح جاهزًا للتنفيذ.</p></div><a href="${topicUrl(topic)}" data-article-link="hub">عرض المركز كاملًا</a></div><div class="tawod-related-guides">${links}</div><div class="tawod-article-cluster-actions"><a href="${topic.serviceUrl}" data-article-link="service"><i class="fa-solid ${topic.icon}" aria-hidden="true"></i>${topic.serviceLabel}</a>${secondary}<a href="${topic.projectUrl}" data-article-link="project"><i class="fa-solid fa-building-circle-check" aria-hidden="true"></i>${topic.projectLabel}</a><a href="/contact.html" data-article-link="quote"><i class="fa-solid fa-file-signature" aria-hidden="true"></i>طلب عرض سعر مناسب للمشروع</a></div></section>${rb}`;
  return{topic,role,trail,cluster};
}

function serviceGuides(r){
  const topic=topicForService(r);if(!topic)return'';
  const curated={
    'service-construction.html':['bone-construction-riyadh-guide','bone-construction-quote-request-riyadh','bone-construction-contract-riyadh','bone-construction-execution-plan-riyadh'],
    'service-turnkey.html':['turnkey-construction-riyadh-guide','turnkey-project-cost-riyadh','turnkey-contracts-riyadh','turnkey-commercial-fitout-riyadh'],
    'service-restoration.html':['best-renovation-company-riyadh','building-facade-restoration-riyadh','facade-restoration-cost-riyadh','renovation-company-site-assessment-riyadh'],
    'service-finishing.html':['finishing-villa-riyadh-guide','finishing-cost-riyadh','finishing-materials-riyadh','finishing-mistakes-riyadh'],
    'service-decor.html':['best-interior-design-company-riyadh','interior-design-execution-stages-riyadh','commercial-interior-design-riyadh','villa-interior-design-riyadh'],
    'service-mep.html':['mechanical-mep-works-riyadh','electrical-installation-maintenance-riyadh','plumbing-installation-riyadh'],
  }[r]||[topic.pillar];
  const guides=curated.map(slug=>articleBySlug.get(slug)).filter(Boolean),[a,b]=marker('GUIDES');
  return`${a}<section class="section-padding tawod-service-guides" aria-labelledby="service-guides-${topic.slug}"><div class="container"><div class="section-title"><span class="eyebrow">أدلة قبل التعاقد</span><h2 id="service-guides-${topic.slug}">اقرأ قبل بدء ${topic.title}</h2><p>أدلة عملية تساعدك على فهم النطاق والتكلفة والعقد والجودة قبل طلب عرض التنفيذ.</p></div><div class="tawod-service-guides-grid">${guides.map((guide,index)=>`<a class="tawod-service-guide-card" href="/blog/${guide.slug}/"><span>${index===0?'الدليل المحوري':'دليل متخصص'}</span><strong>${esc(guide.title)}</strong><i class="fa-solid fa-arrow-left-long" aria-hidden="true"></i></a>`).join('')}</div><div class="tawod-decision-actions"><a class="btn btn-outline" href="${topicUrl(topic)}">استكشف مركز ${topic.title}</a></div></div></section>${b}`
}
function article(h,r,metadata){
  const m=h.match(/<article[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/article>/i);
  if(!m)return{h,stats:null};
  let body=m[1],heads=[];const architecture=articleArchitecture(r,metadata);
  const hasAuthoredToc=/<nav[^>]*class=["'][^"']*tawod-article-toc[^"']*["']/i.test(body);
  if(hasAuthoredToc){
    body=body.replace(/<(aside|section)\b[^>]*class=["'][^"']*(?:tawod-key-takeaways|seo-inline-cta)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,block=>block.replace(/(<h2\b[^>]*?)\s+id=["']article-section-\d+["']/gi,'$1'));
  }else{
    body=body.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi,(x,a,t)=>{
      const existing=a.match(/\bid=["']([^"']+)["']/i),id=existing?existing[1]:'article-section-'+(heads.length+1);
      heads.push([id,text(t)]);
      return existing?x:`<h2${a} id="${id}">${t}</h2>`;
    });
  }
  const words=text(body).split(/\s+/).filter(Boolean).length,minutes=Math.max(1,Math.ceil(words/180));
  if(!hasAuthoredToc&&heads.length>=3){
    const [ta,tb]=marker('TOC'),[ka,kb]=marker('TAKEAWAYS');
    const toc=`${ta}<nav class="tawod-article-toc" aria-label="فهرس المقال"><div class="tawod-article-toc-head"><span><i class="fa-solid fa-list-ul"></i> محتويات المقال</span><small>انتقل للقسم المطلوب</small></div><ol>${heads.map(x=>`<li><a href="#${x[0]}">${esc(x[1])}</a></li>`).join('')}</ol></nav>${tb}`;
    const key=`${ka}<aside class="tawod-key-takeaways"><h2><i class="fa-solid fa-lightbulb"></i> ما الذي ستخرج به من هذا الدليل؟</h2><ul>${heads.slice(0,4).map(x=>`<li>${esc(x[1])}</li>`).join('')}</ul></aside>${kb}`;
    body=body.replace(/(<img\b[^>]*>)\s*/i,'$1'+toc+key);
  }
  body=/<img\b[^>]*>/i.test(body)?body.replace(/(<img\b[^>]*>)\s*/i,`$1${architecture.trail}`):architecture.trail+body;
  body+=architecture.cluster;
  const hasAuthoredTools=/<div[^>]*class=["'][^"']*tawod-article-tools[^"']*["']/i.test(body);
  if(!hasAuthoredTools){
    const [aa,ab]=marker('TOOLS');
    body+=`${aa}<div class="tawod-article-tools"><strong>وجدت الدليل مفيدًا؟</strong><div><button type="button" data-share-article><i class="fa-solid fa-share-nodes"></i> مشاركة</button><button type="button" data-print-article><i class="fa-solid fa-print"></i> طباعة</button><a href="https://wa.me/" data-whatsapp-share target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> واتساب</a></div></div>${ab}`;
  }
  h=h.replace(m[0],m[0].replace(m[1],body));
  const slug=r.split('/')[1],cleanBody=h.match(/<body\b([^>]*)>/i)?.[1]?.replace(/\sdata-article-(?:slug|topic|role)=["'][^"']*["']/gi,'')||'';
  h=h.replace(/<body\b[^>]*>/i,`<body${cleanBody} data-article-slug="${slug}" data-article-topic="${architecture.topic.slug}" data-article-role="${architecture.role}">`);
  if(!(hasAuthoredToc&&/data-reading-time/i.test(h))){
    h=h.replace(/(<div[^>]*class=["'][^"']*article-meta-line[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i,(x,a,b,c)=>a+b.replace(/<span[^>]*data-reading-time[^>]*>[\s\S]*?<\/span>/i,'')+`<span data-reading-time><i class="fa-regular fa-clock"></i> ${minutes} دقائق قراءة</span>`+c);
  }
  return{h,stats:{words,minutes}};
}
function pageSchema(r,h,c,q,pageDate=date){const title=first(h,/<h1[^>]*>([\s\S]*?)<\/h1>/i,c.name),desc=metaDescription(h,c.scope),url=domain+pagePath(r);const page={'@context':'https://schema.org','@type':'WebPage',name:title,headline:title,description:desc,url,inLanguage:'ar-SA',dateModified:pageDate,isPartOf:{'@id':domain+'/#website'},publisher:{'@id':domain+'/#organization'}};const faq={'@context':'https://schema.org','@type':'FAQPage',mainEntity:q.map(x=>({'@type':'Question',name:x[0],acceptedAnswer:{'@type':'Answer',text:x[1]}}))};const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'الرئيسية',item:domain+'/'},{'@type':'ListItem',position:2,name:title,item:url}]};const [a,b]=marker('SCHEMA');return`${a}<script id="tawod-static-page-schema" type="application/ld+json">${JSON.stringify(page)}</script><script id="tawod-static-faq-schema" type="application/ld+json">${JSON.stringify(faq)}</script><script id="tawod-static-breadcrumb-schema" type="application/ld+json">${JSON.stringify(crumbs)}</script>${b}`}
function articleSchema(r,h,c,q,stats,metadata){const slug=r.split('/')[1],topic=topicForArticle(slug),title=first(h,/<h1[^>]*>([\s\S]*?)<\/h1>/i,c.name),desc=metaDescription(h,c.scope),url=domain+pagePath(r),pageId=`${url}#webpage`,articleId=`${url}#article`,breadcrumbId=`${url}#breadcrumb`,topicAbsolute=domain+topicUrl(topic);const article={'@type':'Article','@id':articleId,headline:title,description:desc,url,image:metadata.image,author:{'@id':domain+'/#organization'},publisher:{'@id':domain+'/#organization'},datePublished:metadata.datePublished,dateModified:metadata.dateModified,articleSection:topic.title,inLanguage:'ar-SA',mainEntityOfPage:{'@id':pageId},isPartOf:{'@id':domain+'/blog/#blog'},about:{'@id':`${topicAbsolute}#webpage`}};if(metadata.keywords)article.keywords=metadata.keywords;if(stats){article.wordCount=stats.words;article.timeRequired=`PT${stats.minutes}M`}const graph={'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':domain+'/#organization',name:'شركة تعاود للمقاولات العامة',url:domain+'/',logo:{'@type':'ImageObject',url:domain+'/images/logo/tawod-logo.png'},telephone:'+966551128884'},{'@type':'WebPage','@id':pageId,url,name:title,description:desc,inLanguage:'ar-SA',isPartOf:{'@id':domain+'/#website'},breadcrumb:{'@id':breadcrumbId},mainEntity:{'@id':articleId}},article,{'@type':'BreadcrumbList','@id':breadcrumbId,itemListElement:[{'@type':'ListItem',position:1,name:'الرئيسية',item:domain+'/'},{'@type':'ListItem',position:2,name:'المدونة',item:domain+'/blog/'},{'@type':'ListItem',position:3,name:topic.title,item:topicAbsolute},{'@type':'ListItem',position:4,name:title,item:url}]},...(q.length?[{'@type':'FAQPage','@id':`${url}#faq`,mainEntity:q.map(item=>({'@type':'Question',name:item[0],acceptedAnswer:{'@type':'Answer',text:item[1]}}))}]:[])]};const [a,b]=marker('SCHEMA');return`${a}<script id="tawod-article-graph" type="application/ld+json">${JSON.stringify(graph)}</script>${b}`}

const changes=[];
for(const f of walk(root).filter(x=>x.endsWith('.html')&&!rel(x).startsWith('assets/project-pages/'))){
  const r=rel(f);
  // These self-contained silos and archives own their layout, links, content
  // and schema through dedicated generators. The generic enhancer must never
  // inject cross-silo navigation or duplicate their structured data.
  if(r.startsWith('maintenance/')||/^(?:dammam|khobar|dhahran)\//.test(r)||/^project-[^/]+\.html$/.test(r)||r==='blog/index.html'||/^blog\/(?:page\/\d+|topics\/[^/]+)\/index\.html$/.test(r)||r==='blog/turnkey-riyadh/index.html'||r==='editorial-policy/index.html')continue;
  let h=fs.readFileSync(f,'utf8'),old=h;
  if(r.startsWith('lp/'))h=landingRobots(h);
  const s=state(r,h),metadata=s.article?articleMetadata(h):null;
  if(metadata&&contentRefreshDates.has(r))metadata.dateModified=contentRefreshDates.get(r);
  const existingDate=h.match(/<script[^>]*id=["']tawod-static-page-schema["'][^>]*>[\s\S]*?"dateModified"\s*:\s*"([^"]+)"/i)?.[1]||date;
  for(const n of marks)h=strip(h,n);
  if(s.article)h=stripArticleSchemas(h);
  h=h.replace(/<script[^>]*id="tawod-(?:faq|page|breadcrumb)-schema"[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  h=h.replace(/"provider":\{"@type":"GeneralContractor","name":"شركة تعاود للمقاولات العامة","telephone":"\+966551128884"\}/g,'"provider":{"@id":"https://tawodco.com/#organization"}');
  if(!s.home&&!/tawod-system\.css/.test(h))h=h.replace(/<\/head>/i,`<link href="${prefix(f)}assets/css/tawod-system.css" rel="stylesheet"></head>`);
  if(rootServices.has(r)&&!/tawod-service-decisions\.css/.test(h))h=h.replace(/(<link[^>]*tawod-system\.css[^>]*>)/i,`$1<link href="${prefix(f)}assets/css/tawod-service-decisions.css?v=20260823-1" rel="stylesheet">`);
  if((s.article||rootServices.has(r))&&!/tawod-blog-architecture\.css/.test(h))h=h.replace(/(<link[^>]*tawod-system\.css[^>]*>)/i,`$1<link href="${prefix(f)}${architectureCss}?v=${architectureVersion}" rel="stylesheet">`);
  if(!s.home&&!s.skip&&!/class=["'][^"']*tawod-inner-trust[^"']*["']/i.test(h))h=afterHero(h,trust());
  let stats=null;
  if(s.article){const a=article(h,r,metadata);h=a.h;stats=a.stats}
  if(!s.home&&!s.skip){
    const c=context(r,h),fq=faqs(c,s.article);
    if(!s.article){if(rootServices.has(r)){h=insertBeforeMainEnd(h,serviceGuides(r));h=insertBeforeMainEnd(h,decisionProof(r,prefix(f)))}h=insertBeforeMainEnd(h,contextLinks(c,prefix(f)))}
    const hasFaq=/<section[^>]*(?:id=["']faq["']|class=["'][^"']*(?:seo-faq|tawod-faq-section)[^"']*["'])/i.test(h);
    if(!hasFaq)h=insertBeforeMainEnd(h,fq.html);
    if(s.indexable&&s.article){const questions=visibleFaqs(h);h=insertBeforeHeadEnd(h,articleSchema(r,h,c,questions.length?questions:fq.q,stats,metadata))}
    else if(s.indexable){const hasPageSchema=/"@type"\s*:\s*"WebPage"/.test(h),hasSchemas=hasPageSchema&&/"@type"\s*:\s*"FAQPage"/.test(h)&&/"@type"\s*:\s*"BreadcrumbList"/.test(h);if(!hasSchemas)h=insertBeforeHeadEnd(h,pageSchema(r,h,c,fq.q,serviceRefreshDates.get(r)||existingDate))}
  }
  h=h.replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n');
  if(h!==old){changes.push(r);if(!check)fs.writeFileSync(f,h)}
}
if(check&&changes.length){console.error('Static HTML is out of date. Run node scripts/build-static-pages.mjs');changes.forEach(x=>console.error(' - '+x));process.exit(1)}
console.log(`${check?'Checked':'Generated'} HTML; ${changes.length} ${check?'would change':'changed'}.`);
