import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const icon = name => {
  const paths = { cube: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 0v18M3 8l9 5 9-5"/>', play: '<path d="m9 5 11 7-11 7V5Z"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>', expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 6-6 4 4 3-3 4 4"/>', orbit: '<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)"/><path d="m9 8 3-2 3 2v5l-3 2-3-2V8Z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>', moon: '<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>', front: '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M9 8h2m2 0h2M9 12h2m2 0h2m-5 8v-4h4v4"/>', rear: '<path d="m4 8 8-5 8 5v12H4V8Z"/><path d="M8 11h3v3H8zm5 0h3v3h-3zM10 20v-3h4v3"/>', top: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>', arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>' };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
export const projectExperiences = {
  interior: { photo: 'sahafa-villa-renovation-finishing', width:1536,height:1152,initialMode:'room',
    modes:[['room','المساحة المصوّرة','Photographed room'],['exterior','الفيلا كاملة','Complete villa'],['ground','كشف الأرضي','Ground floor'],['upper','كشف الأول','Upper floor']],
    titles:{ar:['تفاصيل الصحافة… من الصورة إلى المشهد','استكشف الصالة الداخلية وخطوط الإضاءة والأرضيات والتكييف، ثم تنقّل إلى الفيلا والأدوار.','ادخل إلى تفاصيل الصالة','صالة خالية بتشطيبات هادئة وإضاءة زاوية، مع زوايا قريبة للأرضيات والسقف.','استكشف فيلا الصحافة'],en:['Al Sahafa, from photograph to space','Explore the empty interior hall, angular lighting, tiled floor and air conditioning, then switch to the villa and floor views.','Explore the photographed hall','Discover the quiet finishes and angular lighting, with closer floor and ceiling views.','Explore Al Sahafa']},
    ar:[['lighting','الإضاءة الزاوية والتكييف','اقترب من قنوات الإضاءة ووحدتي التكييف على الجدار.'],['floor','الأرضيات والتشطيبات','شاهد شبكة البلاط والوزرات والتقاءات الجدران.'],['terrace','الفيلا والسطح','انتقل إلى المبنى الكامل واستكشف الدورين والسطح.']],
    en:[['lighting','Angular lighting and AC','Look closer at the lighting channels and the two wall-mounted AC units.'],['floor','Floor and finishes','Explore the tile grid, skirting and wall junctions.'],['terrace','Villa and roof','Switch to the complete building and explore its floors and roof.']] },
  entrance: { photo: 'wadi-villa-construction-finishing', width: 1152, height: 1536, ar: [['entrance','المدخل الكلاسيكي','اقترب من الأعمدة والباب والدرج والإنارة.'],['columns','الشرفة والتفاصيل','تأمل الشرفة والمنحنيات وتفاصيل الواجهة.'],['garden','الحوش والمحيط','استكشف تصور التنسيق الخارجي والجلسة الخلفية.']], en: [['entrance','Classical entrance','Explore the columns, doorway, steps and lighting.'],['columns','Balcony and details','Look around the curved balcony and facade details.'],['garden','Courtyard and grounds','Explore the illustrative landscape and rear terrace.']] },
};
Object.assign(projectExperiences, {
  faisaliah: { file: 'project-faisaliah-villa-facades-finishing.html', photo: 'faisaliah-villa-facades-finishing-01-v3', width: 1152, height: 1536, summary: ['حي الفيصلية · الرياض', '900 م²', 'شهران'],
    ar: [['facade','الواجهة والقوس','اقترب من الإطار المركزي والقوس وتفاصيل الواجهة.'],['cornice','الكرانيش والخطوط','شاهد طبقات الكورنيش وتناسق التشطيبات الخارجية.'],['living','المساحات الداخلية','اكشف الدور الأرضي واستكشف الجلسات والخدمات.']],
    en: [['facade','Façade and arch','Explore the central frame, blind arch and façade details.'],['cornice','Cornices and profiles','Look around the layered cornice and exterior finishes.'],['living','Interior spaces','Open the ground floor to explore seating and service spaces.']] },
  uhud: { file: 'project-villa-plaster-ceramic-marble-uhud-riyadh.html', photo: 'villa-plaster-ceramic-marble-uhud-riyadh-01', width: 1080, height: 1440, summary: ['حي أحد · الرياض', '700 م²', '3 أشهر'],
    ar: [['facade','الكتل والواجهة','استكشف الواجهة الجانبية المقوّسة وتدرّج كتل الفيلا.'],['grooves','اللياسة والقروفات','اقترب من خطوط الواجهة وإطارات الفتحات.'],['living','الجلسات والخدمات','اكشف الأرضي واستكشف توزيع المساحات.']],
    en: [['facade','Massing and façade','Explore the arched side elevation and stepped villa volumes.'],['grooves','Plaster and grooves','Look closer at the façade profiles and opening surrounds.'],['living','Living and services','Open the ground floor to explore the interior spaces.']] },
  arouba: { file: 'project-arouba-mosque-villas.html', photo: 'arouba-mosque-villas-01', width: 420, height: 560, summary: ['حي العروبة · الرياض', 'مسجد وفيلتان', '1800 م²', '12 شهرًا'],
    modes: [['exterior','الكتل والبلوك','Massing and masonry'],['plaster','الواجهة المليّسة','Plastered façade'],['structure','كشف الهيكل','Structure']],
    titles: { ar: ['مسجد وفيلتان… تجربة واحدة متكاملة','استكشف الكتل المتجاورة والبلوك والهيكل الخرساني، ثم انتقل إلى الواجهة المليّسة.','استكشف مجمّع العروبة','تنقّل بين الكتل والبلوك واللياسة، واقترب من المدخل والعنصر الرأسي والممر.','استكشف المجمّع'], en: ['A mosque and two villas, together','Explore the adjoining volumes, blockwork and concrete frame, then switch to the plastered façade.','Explore the Al Arouba complex','Move between the masonry, plaster and structure views, and explore the entrance and access route.','Explore the complex'] },
    ar: [['masonry','البلوك والكتل','اقترب من مداميك البلوك والفتحات والأعمدة.'],['portal','المدخل واللياسة','شاهد الإطار المستطيل وتدرّج مناسيب الواجهة.'],['tower','العنصر الرأسي والمحيط','استكشف العنصر الخرساني المرتفع ومسار الدخول.']],
    en: [['masonry','Blockwork and volumes','Look closer at the masonry courses, openings and columns.'],['portal','Entrance and plaster','Explore the rectangular frame and stepped façade levels.'],['tower','Vertical element and surroundings','Look around the concrete tower and access route.']] },
  warehouses: { file: 'project-modon-eight-warehouses-riyadh.html', photo: 'modon-eight-warehouses-01-v4', width: 1200, height: 1596, summary: ['الصناعية الثانية · الرياض', '8 مستودعات', '29,122.40 م²', '6 أشهر'],
    modes: [['exterior','الموقع كاملًا','Complete site'],['structure','الهيكل المعدني','Steel structure'],['foundations','كشف القواعد','Foundations']],
    titles: { ar: ['ثمانية مستودعات… من الموقع إلى الهيكل','استكشف الوحدات الثماني، واكشف الإطارات المعدنية والقواعد المعزولة من زوايا متعددة.','استكشف الموقع الصناعي','جولة حول المستودعات الثمانية، مع أوضاع مستقلة للهيكل والقواعد.','استكشف المستودعات'], en: ['Eight warehouses, from site to structure','Explore all eight units, then reveal the steel frames and waterproofed foundations.','Explore the industrial site','Move around the eight warehouses and switch between the structure and foundation views.','Explore the warehouses'] },
    ar: [['portal','الإطارات المعدنية','اقترب من الأعمدة والجسور والروابط المعدنية.'],['footings','القواعد والعزل','اكشف القواعد والميدات وتسلسل الوحدات.'],['site','تنظيم الموقع','شاهد توزيع المستودعات الثمانية ومسار الحركة.']],
    en: [['portal','Steel portal frames','Look closer at the columns, rafters and bracing.'],['footings','Footings and waterproofing','Reveal the footings and grade beams across the units.'],['site','Site organization','Explore the eight units and the central access route.']] },
  tanks: { file: 'project-alrajhi-tanks-king-salman-park.html', photo: 'alrajhi-tanks-king-salman-park-01', width: 480, height: 640, summary: ['حديقة الملك سلمان · الرياض', 'حدادة وعزل', '119 م²', 'أسبوعان'],
    modes: [['exterior','الخزان والمحيط','Tank and surroundings'],['reinforcement','كشف التسليح','Reinforcement'],['waterproofing','تفاصيل العزل','Waterproofing']],
    titles: { ar: ['تفاصيل الخزان… طبقة بعد طبقة','استكشف محيط الحفر، ثم انتقل إلى شبكة التسليح أو طبقات العزل والتقاءاتها.','استكشف الخزان من الداخل','ثلاثة أوضاع مترابطة تكشف المبنى والتسليح والعزل، مع زوايا قريبة للتفاصيل.','استكشف الخزان'], en: ['Tank details, layer by layer','Explore the excavation, reinforcement cage, waterproofing layers and junctions.','Explore inside the tank','Switch between the complete structure, reinforcement and waterproofing, with closer detail views.','Explore the tank'] },
    ar: [['rebar','شبكة التسليح','اكشف حديد القاعدة والجدران ونقاط التقاطع.'],['junctions','التقاءات العزل','اقترب من الأرضية والجوانب وشرائط الالتقاء.'],['excavation','الحفر والمحيط','استكشف الخزان داخل نطاق الحفر من الأعلى.']],
    en: [['rebar','Reinforcement cage','Reveal the base and wall reinforcement and intersections.'],['junctions','Waterproofing junctions','Explore the floor, sides and junction bands.'],['excavation','Excavation and surroundings','Look around the tank within the excavation.']] },
});
projectExperiences.arouba.references={exterior:'/images/projects/arouba-mosque-villas-01.webp',plaster:'/images/projects/arouba-mosque-villas-02.webp',structure:'/images/projects/arouba-mosque-villas-01.webp'};
projectExperiences.warehouses.references={exterior:'/images/projects/modon-eight-warehouses-02-v3.webp',structure:'/images/projects/modon-eight-warehouses-02-v3.webp',foundations:'/images/projects/modon-eight-warehouses-01-v4.webp'};
const info = projectExperiences;
const names={interior:['فيلا الصحافة','Al Sahafa villa'],entrance:['فيلا الوادي','Al Wadi villa'],faisaliah:['فيلا الفيصلية','Al Faisaliah villa'],uhud:['فيلا أحد','Uhud villa'],arouba:['مشروع العروبة','Al Arouba complex'],warehouses:['المستودعات الثمانية','Eight warehouses'],tanks:['خزانات حديقة الملك سلمان','King Salman Park tanks']};
for (const data of Object.values(info)) {
  data.file ||= `project-${data.photo}.html`;
  data.poster = `/images/projects/${data.photo}${['sahafa-villa-renovation-finishing','wadi-villa-construction-finishing'].includes(data.photo) ? '-768' : ''}.webp`;
}
export function renderVilla3D(variant, lang = 'ar') {
  const data = info[variant]; if (!data) throw new Error('Unknown villa section');
  const en = lang === 'en';
  const t = en ? {
    kicker: 'A new perspective on the project', title: 'A complete villa, from every angle', intro: 'Explore all sides and the roof, or open either floor to discover an illustrative interior layout.', badge: 'Architectural concept',
    startTitle: 'Explore a complete villa concept', startText: 'Rotate freely around the villa, courtyard and roof, then open a furnished floor cutaway.', start: 'Start the 3D experience', photo: 'View the project photograph',
    mode: 'Explore the villa', exterior: 'Complete villa', ground: 'Ground floor', upper: 'Upper floor', modeHint: 'Exterior or open-floor view', view: 'Viewpoint', general: 'Overview', front: 'Front', rear: 'Rear', top: 'Above',
    lighting: 'Lighting', day: 'Daytime', night: 'Evening', details: 'Explore details',
    hint: 'Drag to rotate · Pinch or use + / − to zoom', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view', expand: 'Expand view', restore: 'Return to the photograph', tour: 'Orbit tour', enlargePhoto: 'Enlarge photograph', close: 'Close photograph', reference: 'From the project'
  } : {
    kicker: 'المشروع من زاوية أخرى', title: 'فيلا كاملة… من كل زاوية', intro: 'استكشف الواجهات والسطح، أو اكشف كل دور للتعرّف على توزيع داخلي توضيحي للمساحات.', badge: 'تصور معماري',
    startTitle: 'استكشف تصور فيلا كاملة', startText: 'جولة حرة حول الفيلا والحوش والسطح، مع كشف داخلي للأدوار والجلسات.', start: 'تشغيل العرض ثلاثي الأبعاد', photo: 'شاهد صورة المشروع',
    mode: 'استكشف الفيلا', exterior: 'الفيلا كاملة', ground: 'كشف الأرضي', upper: 'كشف الأول', modeHint: 'عرض خارجي أو كشف داخلي', view: 'زاوية المشاهدة', general: 'منظور عام', front: 'من الأمام', rear: 'من الخلف', top: 'من الأعلى',
    lighting: 'الإضاءة', day: 'نهارية', night: 'مسائية', details: 'تفاصيل تستحق الاكتشاف',
    hint: 'اسحب للتدوير · استخدم إصبعين أو + / − للتقريب', zoomIn: 'تقريب النموذج', zoomOut: 'إبعاد النموذج', reset: 'إعادة ضبط العرض', expand: 'تكبير العرض', restore: 'العودة إلى الصورة', tour: 'جولة حول المشروع', enlargePhoto: 'تكبير الصورة', close: 'إغلاق الصورة', reference: 'من واقع المشروع'
  };
  if (data.titles) [t.title, t.intro, t.startTitle, t.startText, t.mode] = data.titles[lang];
  const modes = data.modes ? data.modes.map(([id,ar,enLabel]) => [id,en ? enLabel : ar]) : [['exterior',t.exterior],['ground',t.ground],['upper',t.upper]];
  if (data.modes) t.modeHint = en ? 'Choose an exploration layer' : 'اختر طبقة الاستكشاف';
  t.badge=names[variant][en?1:0];
  const reference = data.references?.[data.initialMode||'exterior']||data.poster;
  const originalReference = data.references?.[data.initialMode||'exterior'] || `/images/projects/${data.photo}.webp`;
  const dialogId = `villa-reference-${variant}-${lang}`;
  return `<!-- TAWOD_VILLA_3D_START -->
<section class="section-padding villa-3d-section" id="project-3d" aria-labelledby="villa-3d-title" dir="${en ? 'ltr' : 'rtl'}"><div class="container">
<div class="villa-3d-heading"><div><span class="eyebrow villa-3d-eyebrow">${icon('cube')}${t.kicker}</span><h2 id="villa-3d-title">${t.title}</h2></div><p>${t.intro}</p></div>
<div class="villa-3d-shell" data-villa-viewer data-model="${variant}" data-lang="${lang}" data-state="idle" data-lighting="day" data-tour="off" data-reference-original="${originalReference}" data-default-mode="${data.initialMode||'exterior'}" ${Object.entries(data.references||{}).map(([mode,src])=>`data-reference-${mode}="${src}"`).join(' ')}>
<div class="villa-3d-modebar"><div><strong>${t.mode}</strong><span>${t.modeHint}</span></div><div class="villa-3d-modes" role="group" aria-label="${t.mode}">${modes.map(([id,label],index)=>`<button type="button" data-3d-mode="${id}" aria-pressed="${id===(data.initialMode||'exterior')}" disabled><span class="villa-3d-mode-number" aria-hidden="true">0${index+1}</span><span data-control-label>${label}</span></button>`).join('')}</div></div>
<div class="villa-3d-stage"><img class="villa-3d-poster" src="${data.poster}" width="${data.width}" height="${data.height}" alt="" loading="lazy" decoding="async" aria-hidden="true"><div class="villa-3d-mount" data-3d-mount></div>
<div class="villa-3d-stage-top"><span class="villa-3d-badge">${icon('cube')}${t.badge}</span><span class="villa-3d-view" data-3d-view>${t.general}</span></div>
<div class="villa-3d-overlay" data-3d-overlay><span class="villa-3d-cube">${icon('cube')}</span><h3>${t.startTitle}</h3><p>${t.startText}</p><button class="villa-3d-start" type="button" data-3d-start hidden>${icon('play')}<span>${t.start}</span></button><a class="villa-3d-photo-link" data-3d-open-reference href="${originalReference}">${t.photo}</a></div>
<div class="villa-3d-tools" data-3d-tools hidden>${[['in','plus',t.zoomIn],['out','minus',t.zoomOut],['reset','reset',t.reset],['fullscreen','expand',t.expand],['photo','photo',t.restore]].map(([action,i,label])=>`<button type="button" data-3d-action="${action}" aria-label="${label}" title="${label}">${icon(i)}</button>`).join('')}</div><button class="villa-3d-tour" type="button" data-3d-action="tour" aria-pressed="false" hidden>${icon('orbit')}<span data-tour-label>${t.tour}</span><span class="villa-3d-tour-indicator" aria-hidden="true"></span></button></div>
<aside class="villa-3d-panel" aria-label="${t.view}"><a class="villa-3d-reference" data-3d-open-reference href="${originalReference}"><span class="villa-3d-reference-thumb"><img data-3d-reference-image src="${reference}" width="96" height="112" alt="${t.badge}" loading="lazy">${icon('expand')}</span><span><small>${t.reference}</small><strong>${t.badge}</strong><span class="villa-3d-reference-link">${t.enlargePhoto}${icon('arrow')}</span></span></a><div class="villa-3d-control"><span class="villa-3d-label">${t.view}</span><div class="villa-3d-presets" role="group" aria-label="${t.view}">${[['general',t.general,'cube'],['front',t.front,'front'],['rear',t.rear,'rear'],['top',t.top,'top']].map(([id,label,i])=>`<button type="button" data-3d-preset="${id}" aria-pressed="${id==='general'}" disabled>${icon(i)}<span data-control-label>${label}</span></button>`).join('')}</div></div>
<div class="villa-3d-control"><span class="villa-3d-label">${t.lighting}</span><div class="villa-3d-light" role="group" aria-label="${t.lighting}"><button type="button" data-3d-light="day" aria-pressed="true" disabled>${icon('sun')}<span>${t.day}</span></button><button type="button" data-3d-light="night" aria-pressed="false" disabled>${icon('moon')}<span>${t.night}</span></button></div></div>
<div class="villa-3d-detail-list"><span class="villa-3d-label">${t.details}</span>${data[lang].map(([id,label,desc],index)=>`<button class="villa-3d-detail" type="button" data-3d-detail="${id}" aria-pressed="false" disabled><span class="villa-3d-detail-number">0${index+1}</span><span class="villa-3d-detail-copy"><strong>${label}</strong><small>${desc}</small></span>${icon('arrow')}</button>`).join('')}</div>
</aside><div class="villa-3d-footer"><p class="villa-3d-status" data-3d-status role="status" aria-live="polite"></p><p class="villa-3d-hint" data-3d-hint hidden>${t.hint}</p></div>
<dialog class="villa-reference-dialog" data-3d-reference-dialog aria-labelledby="${dialogId}" dir="${en?'ltr':'rtl'}"><div class="villa-reference-heading"><div><small>${t.reference}</small><strong id="${dialogId}">${t.badge}</strong></div><form method="dialog"><button type="submit" aria-label="${t.close}" autofocus>${icon('close')}</button></form></div><img data-3d-reference-full src="${originalReference}" width="${data.width}" height="${data.height}" alt="${t.badge}" loading="lazy"></dialog>
</div></div></section>
<!-- TAWOD_VILLA_3D_END -->`;
}
export function buildArabicVillaExperience() {
  for (const [variant, data] of Object.entries(info)) {
    const file = data.file;
    if (!fs.existsSync(file) && variant === 'faisaliah') fs.writeFileSync(file, Array.from({length:5}, (_,i)=>fs.readFileSync(`assets/project-pages/faisaliah-villa.part0${i}.html`,'utf8')).join(''));
    if (data.summary) { fs.writeFileSync(file, enhanceArabicProject(fs.readFileSync(file, 'utf8'), variant)); continue; }
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('villa-hero-grid')) {
      const figure = html.match(/<figure class="tawod-case-image" id="project-photo">[\s\S]*?<\/figure>/)?.[0];
      if (!figure) throw new Error(`Missing project photograph: ${file}`);
      html = html.replace(figure, '').replace('class="tawod-case-overview"', 'class="tawod-case-overview villa-overview-text"');
      const hero = html.match(/<section class="page-hero">([\s\S]*?)<\/section>/);
      const content = hero[1].match(/^<div class="container">([\s\S]*)<\/div>$/)[1];
      const breadcrumbs = content.match(/<div class="breadcrumbs">[\s\S]*?<\/div>/)[0];
      const copy = content.replace(breadcrumbs, '').replace('<div class="hero-actions">', '<div class="hero-actions"><a class="btn btn-primary villa-3d-hero-link" href="#project-3d">استكشف النموذج ثلاثي الأبعاد</a>').replace('class="btn btn-primary" href="#project-photo"','class="btn btn-outline" href="#project-photo"');
      const navigation = `<nav class="villa-section-nav" aria-label="أقسام صفحة المشروع"><a href="#project-overview">نظرة عامة</a><a href="#project-3d">العرض التفاعلي</a><a href="#project-facts">بيانات المشروع</a><a href="#faq">الأسئلة الشائعة</a></nav>`;
      const heroHtml = `<section class="page-hero villa-experience-hero"><div class="container">${breadcrumbs}<div class="villa-hero-grid"><div class="villa-hero-copy">${copy}</div>${figure.replace('class="tawod-case-image"','class="tawod-case-image villa-hero-photo"')}</div>${navigation}</div></section>`;
      html = html.replace(hero[0], heroHtml).replace(/<section class="section-padding"><div class="container"><div class="tawod-case-overview villa-overview-text">/, '<section class="section-padding" id="project-overview"><div class="container"><div class="tawod-case-overview villa-overview-text">');
    }
    const block = renderVilla3D(variant);
    if(variant==='warehouses')html=html.replace(/<figure class="tawod-case-image villa-hero-photo" id="project-photo">[\s\S]*?<\/figure>/,figure=>figure.replace(/alt="[^"]*"/,'alt="تجهيز وعزل القواعد الخرسانية لمشروع المستودعات الثمانية في المدينة الصناعية الثانية بالرياض"').replace(/<figcaption>[^<]*<\/figcaption>/,'<figcaption>تجهيز وعزل القواعد الخرسانية للمستودعات الثمانية</figcaption>'));
  const marker = /<!-- TAWOD_VILLA_3D_START -->[\s\S]*?<!-- TAWOD_VILLA_3D_END -->/;
    if (marker.test(html)) html = html.replace(marker, block);
    else html = html.replace(/(<section class="section-padding bg-light" aria-labelledby="project-facts">)/, `${block}$1`);
    if (!html.includes('src="/assets/js/tawod-villa-viewer.js')) html = html.replace('</body>', '<script src="/assets/js/tawod-villa-viewer.js" defer></script></body>');
    fs.writeFileSync(file, html);
  }
}

// Read just one balanced legacy element, so nested badges and grids survive
// moving the existing project photograph into the shared hero.
function elementAt(html, start, tag = 'div') {
  const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g'); tokens.lastIndex = start;
  let depth = 0, match;
  while ((match = tokens.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, tokens.lastIndex);
  }
  throw new Error('Unbalanced legacy project markup');
}
export function enhanceArabicProject(source, variant) {
  const data = info[variant]; if (!data?.summary) return source;
  let html = source;
  html = html.replace(/<main\b[^>]*>/, '<main id="main" class="tawod-villa-case">');
  // Preserve the original Arouba classes as well as the common component styles.
  const aliases = { 'case-overview-grid':'tawod-case-overview', 'case-overview-copy':'tawod-case-copy', 'case-main-image':'tawod-case-image', 'case-image-badge':'tawod-case-badge', 'case-facts-grid':'tawod-case-facts', 'case-fact':'tawod-case-fact', 'case-section-intro':'tawod-case-section-intro', 'case-scope-grid':'tawod-case-scope', 'case-scope-card':'tawod-case-scope-card', 'case-scope-icon':'tawod-case-scope-icon', 'case-stage-grid':'tawod-case-stages', 'case-stage':'tawod-case-stage', 'case-gallery-grid':'tawod-case-gallery', 'case-gallery-card':'tawod-case-gallery-card', 'case-related-grid':'tawod-case-related' };
  html = html.replace(/class="([^"]+)"/g, (all, names) => {
    const tokens = names.split(/\s+/), added = tokens.map(name=>aliases[name]).filter(name=>name&&!tokens.includes(name));
    return `class="${[...tokens,...added].join(' ')}"`;
  });
  if (!html.includes('villa-hero-grid')) {
    const imageStart = html.search(/<div class="[^"]*\btawod-case-image\b[^\"]*"/);
    if (imageStart < 0) throw new Error(`Missing photograph in ${data.file}`);
    const imageBlock = elementAt(html, imageStart);
    let img = imageBlock.match(/<img\b[^>]*>/)?.[0];
    if (!img) throw new Error(`Missing image in ${data.file}`);
    img = img.replace(/src="[^"]*"/, `src="images/projects/${data.photo}.webp"`).replace(/width="[^"]*"/, `width="${data.width}"`).replace(/height="[^"]*"/, `height="${data.height}"`);
    const caption = imageBlock.match(/<span>([^<]+)<\/span>/)?.[1] || 'من صور المشروع';
    const figure = `<figure class="tawod-case-image villa-hero-photo" id="project-photo">${img}<figcaption>${caption}</figcaption></figure>`;
    html = html.replace(imageBlock, '');
    const hero = html.match(/<section class="page-hero">([\s\S]*?)<\/section>/);
    if (!hero) throw new Error(`Missing project hero in ${data.file}`);
    const content = hero[1].replace(/^\s*<div\b[^>]*>/,'').replace(/<\/div>\s*$/,'');
    const breadcrumbs = content.match(/<div class="breadcrumbs">[\s\S]*?<\/div>/)?.[0] || '';
    const copy = content.replace(breadcrumbs, '').replace('<div class="hero-actions">', `<div class="villa-case-summary">${data.summary.map(value=>`<span>${value}</span>`).join('')}</div><div class="hero-actions"><a class="btn btn-primary villa-3d-hero-link" href="#project-3d">استكشف النموذج ثلاثي الأبعاد</a><a class="btn btn-outline" href="#project-photo">شاهد صورة المشروع</a>`).replace(/<a class="btn btn-primary" href="contact[^>]+>[^<]*<\/a>/,'');
    const last = /id="faq"/.test(html) ? ['#faq','الأسئلة الشائعة'] : ['#project-scope','نطاق التنفيذ'];
    const nav = `<nav class="villa-section-nav" aria-label="أقسام صفحة المشروع">${[['#project-overview','نظرة عامة'],['#project-3d','العرض التفاعلي'],['#project-facts','بيانات المشروع'],last].map(([href,label])=>`<a href="${href}">${label}</a>`).join('')}</nav>`;
    html = html.replace(hero[0], `<section class="page-hero villa-experience-hero"><div class="container">${breadcrumbs}<div class="villa-hero-grid"><div class="villa-hero-copy">${copy}</div>${figure}</div>${nav}</div></section>`);
    html = html.replace(/class="([^"]*\btawod-case-overview\b[^\"]*)"/, 'class="$1 villa-overview-text"');
    const overviewAt = html.indexOf('villa-overview-text'), sectionAt = html.lastIndexOf('<section', overviewAt);
    html = html.slice(0, sectionAt) + html.slice(sectionAt).replace(/<section\b([^>]*)>/, '<section$1 id="project-overview">');
    const factsAt = html.search(/<div class="[^"]*\btawod-case-facts\b/);
    const factsSectionAt = html.lastIndexOf('<section', factsAt);
    if (factsSectionAt < 0) throw new Error(`Missing facts in ${data.file}`);
    html = html.slice(0, factsSectionAt) + html.slice(factsSectionAt).replace(/<section\b([^>]*)>/, '<section$1 id="project-facts">');
    if (last[0] === '#project-scope') html = html.replace(/(<section\b[^>]*>)(\s*<div class="container">\s*<div class="tawod-case-section-intro">)/, '<section class="section-padding" id="project-scope">$2');
  }
  if(variant==='warehouses')html=html.replace(/<figure class="tawod-case-image villa-hero-photo" id="project-photo">[\s\S]*?<\/figure>/,figure=>figure.replace(/alt="[^"]*"/,'alt="تجهيز وعزل القواعد الخرسانية لمشروع المستودعات الثمانية في المدينة الصناعية الثانية بالرياض"').replace(/<figcaption>[^<]*<\/figcaption>/,'<figcaption>تجهيز وعزل القواعد الخرسانية للمستودعات الثمانية</figcaption>'));
  const marker = /<!-- TAWOD_VILLA_3D_START -->[\s\S]*?<!-- TAWOD_VILLA_3D_END -->/;
  const block = renderVilla3D(variant);
  html = marker.test(html) ? html.replace(marker, block) : html.replace(/(<section\b[^>]*id="project-facts"[^>]*>)/, `${block}$1`);
  if (!html.includes('data-villa-viewer')) throw new Error(`Could not insert viewer in ${data.file}`);
  if (!html.includes('tawod-project-case.css')) html = html.replace('</head>', '<link href="assets/css/tawod-project-case.css?v=20260827-1" rel="stylesheet"></head>');
  if (!html.includes('src="/assets/js/tawod-villa-viewer.js')) html = html.replace('</body>', '<script src="/assets/js/tawod-villa-viewer.js" defer></script></body>');
  return html;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildArabicVillaExperience();
