import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const icon = name => {
  const paths = { cube: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 0v18M3 8l9 5 9-5"/>', play: '<path d="m9 5 11 7-11 7V5Z"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>', expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 6-6 4 4 3-3 4 4"/>' };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
const info = {
  interior: { photo: 'sahafa-villa-renovation-finishing', width: 1536, height: 1152, ar: [['lighting','الأسقف والإنارة','استكشف خطوط الإنارة في تصور السقف المفتوح.'],['floor','تشطيبات الأرضيات','اقترب من تنسيق الأرضيات والألوان الهادئة.'],['walls','الجدران والتفاصيل','تأمل تكامل الجدران والوزرات والتفاصيل الداخلية.']], en: [['lighting','Ceiling and lighting','Explore the linear lighting in the open-ceiling illustration.'],['floor','Floor finishes','Take a closer look at the floor pattern and calm palette.'],['walls','Walls and details','Explore the coordinated wall finishes and interior details.']] },
  entrance: { photo: 'wadi-villa-construction-finishing', width: 1152, height: 1536, ar: [['entrance','المدخل والواجهة','اقترب من الباب والنوافذ وتفاصيل الإنارة.'],['columns','الأعمدة والشرفة','تأمل التكوين الكلاسيكي والأعمدة والمنحنيات.'],['steps','الدرج والإنارة','استكشف درجات المدخل وإضاءتها الجانبية.']], en: [['entrance','Façade and entrance','Explore the entrance, windows and lighting details.'],['columns','Columns and balcony','Look around the classical composition and curved balcony.'],['steps','Steps and lighting','Explore the entrance steps and their lighting.']] },
};
export function renderVilla3D(variant, lang = 'ar') {
  const data = info[variant]; if (!data) throw new Error('Unknown villa section');
  const en = lang === 'en';
  const t = en ? { kicker: 'A different perspective', title: 'Explore an architectural 3D illustration', intro: 'Rotate the model, explore details and compare daytime and evening lighting.', badge: 'Illustrative model', startTitle: 'See the details from another angle', startText: 'A touch-friendly illustration inspired by the project photograph.', start: 'Start the 3D experience', photo: 'View the project photograph', view: 'Viewpoint', general: 'Overview', front: 'Front', top: 'Above', lighting: 'Lighting', day: 'Daytime', night: 'Evening', details: 'Explore details', note: 'An illustrative interpretation of the photograph. It does not represent the actual project dimensions or a construction drawing.', hint: 'Drag to rotate · Pinch or use + / − to zoom', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view', expand: 'Expand view', restore: 'Return to the photograph', poster: 'Project photograph before starting the interactive illustration' } : { kicker: 'زاوية مختلفة للتفاصيل', title: 'استكشف تصورًا معماريًا ثلاثي الأبعاد', intro: 'حرّك النموذج، واقترب من التفاصيل، وجرّب الإضاءة النهارية والمسائية.', badge: 'نموذج توضيحي', startTitle: 'شاهد التفاصيل من زاوية أخرى', startText: 'تصور قابل للتفاعل واللمس، مستوحى من صورة المشروع.', start: 'تشغيل العرض ثلاثي الأبعاد', photo: 'شاهد صورة المشروع', view: 'زاوية المشاهدة', general: 'منظور عام', front: 'من الأمام', top: 'من الأعلى', lighting: 'الإضاءة', day: 'نهارية', night: 'مسائية', details: 'تفاصيل تستحق الاكتشاف', note: 'تصور توضيحي مستوحى من الصورة؛ لا يمثل أبعاد المشروع الفعلية أو مخططًا للتنفيذ.', hint: 'اسحب للتحريك · استخدم إصبعين أو + / − للتقريب', zoomIn: 'تقريب النموذج', zoomOut: 'إبعاد النموذج', reset: 'إعادة ضبط العرض', expand: 'تكبير العرض', restore: 'العودة إلى الصورة', poster: 'صورة المشروع قبل تشغيل التصور التفاعلي' };
  const photoAnchor = en ? '#site-photographs' : '#project-photo';
  return `<!-- TAWOD_VILLA_3D_START -->
<section class="section-padding villa-3d-section" id="project-3d" aria-labelledby="villa-3d-title" dir="${en ? 'ltr' : 'rtl'}"><div class="container">
<div class="villa-3d-heading"><div><span class="eyebrow">${t.kicker}</span><h2 id="villa-3d-title">${t.title}</h2></div><p>${t.intro}</p></div>
<div class="villa-3d-shell" data-villa-viewer data-model="${variant}" data-lang="${lang}" data-state="idle">
<div class="villa-3d-stage"><img class="villa-3d-poster" src="/images/projects/${data.photo}-768.webp" width="768" height="${Math.round(768 * data.height / data.width)}" alt="" loading="lazy" decoding="async" aria-hidden="true"><div class="villa-3d-mount" data-3d-mount></div>
<div class="villa-3d-stage-top"><span class="villa-3d-badge">${icon('cube')}${t.badge}</span><span class="villa-3d-view" data-3d-view>${t.general}</span></div>
<div class="villa-3d-overlay" data-3d-overlay><span class="villa-3d-cube">${icon('cube')}</span><h3>${t.startTitle}</h3><p>${t.startText}</p><button class="villa-3d-start" type="button" data-3d-start hidden>${icon('play')}<span>${t.start}</span></button><a class="villa-3d-photo-link" href="${photoAnchor}">${t.photo}</a></div>
<div class="villa-3d-tools" data-3d-tools hidden>${[['in','plus',t.zoomIn],['out','minus',t.zoomOut],['reset','reset',t.reset],['fullscreen','expand',t.expand],['photo','photo',t.restore]].map(([action,i,label])=>`<button type="button" data-3d-action="${action}" aria-label="${label}" title="${label}">${icon(i)}</button>`).join('')}</div><p class="villa-3d-hint" data-3d-hint hidden>${t.hint}</p></div>
<aside class="villa-3d-panel" aria-label="${t.view}"><div class="villa-3d-control"><span class="villa-3d-label">${t.view}</span><div class="villa-3d-presets" role="group" aria-label="${t.view}">${[['general',t.general],['front',t.front],['top',t.top]].map(([id,label])=>`<button type="button" data-3d-preset="${id}" aria-pressed="${id==='general'}" disabled>${label}</button>`).join('')}</div></div>
<div class="villa-3d-control"><span class="villa-3d-label">${t.lighting}</span><div class="villa-3d-light" role="group" aria-label="${t.lighting}"><button type="button" data-3d-light="day" aria-pressed="true" disabled>${t.day}</button><button type="button" data-3d-light="night" aria-pressed="false" disabled>${t.night}</button></div></div>
<div class="villa-3d-detail-list"><span class="villa-3d-label">${t.details}</span>${data[lang].map(([id,label,desc],index)=>`<button class="villa-3d-detail" type="button" data-3d-detail="${id}" aria-pressed="false" disabled><span class="villa-3d-detail-number">0${index+1}</span><span><strong>${label}</strong><small>${desc}</small></span></button>`).join('')}</div>
<p class="villa-3d-note">${t.note}</p></aside></div><p class="villa-3d-status" data-3d-status role="status" aria-live="polite"></p></div></section>
<!-- TAWOD_VILLA_3D_END -->`;
}
export function buildArabicVillaExperience() {
  for (const [variant, data] of Object.entries(info)) {
    const file = `project-${data.photo}.html`; let html = fs.readFileSync(file, 'utf8');
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
    const marker = /<!-- TAWOD_VILLA_3D_START -->[\s\S]*?<!-- TAWOD_VILLA_3D_END -->/;
    if (marker.test(html)) html = html.replace(marker, block);
    else html = html.replace(/(<section class="section-padding bg-light" aria-labelledby="project-facts">)/, `${block}$1`);
    if (!html.includes('src="/assets/js/tawod-villa-viewer.js')) html = html.replace('</body>', '<script src="/assets/js/tawod-villa-viewer.js" defer></script></body>');
    fs.writeFileSync(file, html);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildArabicVillaExperience();
