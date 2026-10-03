import { pageStyles, imageSizes, iconMarkup, uiRevision } from './contracting-design-assets.mjs';

const attr=(tag,name)=>tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`,'i'))?.[1];
const addClass=(tag,name)=>/\bclass=["']/.test(tag)?tag.replace(/\bclass=(["'])([^"']*)\1/,(_,q,c)=>`class=${q}${c} ${name}${q}`):tag.replace(/>$/,` class="${name}">`);

export function applyContractingDesign(relativePath, source) {
  if(!pageStyles[relativePath]||source.includes('data-contracting-design="2026-10"')) return source;
  let html=source.replace(/<body\b[^>]*>/i,tag=>addClass(tag,'tawod-contracting').replace(/>$/,' data-contracting-design="2026-10">'));
  // Presentation changes only: original metadata, text, links and forms stay.
  if(relativePath!=='index.html') {
    html=html.replace(/<link\b[^>]*>/gi,tag=>{
      const href=attr(tag,'href')||'';
      if(/fonts\.(googleapis|gstatic)\.com|font-awesome/i.test(href)) return '';
      if(attr(tag,'rel')==='stylesheet'&&/assets\/css\//.test(href)) return '';
      return tag;
    }).replace(/<\/head>/i,`<link rel="stylesheet" href="${pageStyles[relativePath]}">\n</head>`);
  }
  if(!/rel=["']preload["'][^>]*alexandria-arabic-variable\.woff2/i.test(html)) html=html.replace(/<\/head>/i,'<link rel="preload" href="/assets/fonts/alexandria-arabic-variable.woff2" as="font" type="font/woff2" crossorigin>\n</head>');
  html=html.replace(/<svg\b[^>]*class=["']icon-sprite["'][\s\S]*?<\/svg>/gi,'');
  html=html.replace(/<i\b[^>]*class=["'][^"']*\bfa-[^"']*["'][^>]*>[\s\S]*?<\/i>/gi,tag=>{
    const classes=attr(tag,'class')||'';
    const style=classes.includes('fa-brands')?'brands':classes.includes('fa-regular')?'regular':'solid';
    const name=classes.split(/\s+/).find(c=>c.startsWith('fa-')&&!['fa-solid','fa-regular','fa-brands','fa-fw','fa-lg','fa-sm','fa-spin'].includes(c));
    const svg=iconMarkup[`${style}-${name?.slice(3)}`];
    if(!svg) return tag;
    const open=tag.slice(0,tag.indexOf('>')+1);
    if(/id=["'](?:menuBtn|closeSidebar)["']/.test(open)) {
      const menu=attr(open,'id')==='menuBtn';
      return `<button type="button" class="${menu?'mobile-menu-btn':'close-sidebar'}" id="${menu?'menuBtn':'closeSidebar'}" aria-label="${menu?'فتح القائمة':'إغلاق القائمة'}"${menu?' aria-controls="mobileSidebar" aria-expanded="false"':''}>${svg}</button>`;
    }
    return `${open.replace(/\saria-hidden=["'][^"']*["']/i,'').replace(/>$/,' aria-hidden="true">')}${svg}</i>`;
  });
  html=html.replace(/(<button\b(?=[^>]*\bid=["']menuBtn["'])[^>]*>)\s*(<\/button>)/i,`$1${iconMarkup['solid-bars']}$2`);
  html=html.replace(/<img\b[^>]*>/gi,tag=>{
    const src=attr(tag,'src');if(!src||/^(?:data:|https?:)/.test(src)) return tag;
    const local=src.replace(/^\//,'').replace(/^(?:\.\.\/)+/,'').split('?')[0];
    if(/^images\/logo\/tawod-logo(?:\.png|-180\.webp)$/.test(local)) {
      tag=tag.replace(/\bsrc=(["'])[^"']*\1/i,'src="/images/logo/tawod-logo-180.webp"').replace(/\s(?:width|height)=["'][^"']*["']/gi,'').replace(/>$/,' width="180" height="80">');
    } else {
      const dimensions=imageSizes[local];
      if(dimensions&&!/\bwidth=["']/.test(tag))tag=tag.replace(/>$/,` width="${dimensions[0]}">`);
      if(dimensions&&!/\bheight=["']/.test(tag))tag=tag.replace(/>$/,` height="${dimensions[1]}">`);
    }
    if(!/\bdecoding=["']/.test(tag))tag=tag.replace(/>$/,' decoding="async">');
    return tag;
  });
  html=html.replace(/(<header\b[\s\S]*?<a\b[^>]*class=["']logo["'][^>]*>[\s\S]*?)(<\/a>)/i,`$1<span class="contracting-brand-copy">${relativePath.startsWith('en/')?'General<br>Contracting':'للمقاولات<br>العامة'}</span>$2`);
  html=html.replace(/<a\b[^>]*class=["']home-project-media["'][^>]*>[\s\S]*?<\/a>/gi,anchor=>{
    const label=attr(anchor,'aria-label');
    const badgeText=[...anchor.matchAll(/<span\b[^>]*class=["'](?:home-project-index|home-project-latest)["'][^>]*>([^<]*)<\/span>/gi)].map(m=>m[1].trim()).filter(Boolean).join(' ');
    return label&&badgeText?anchor.replace(/\baria-label=(["'])([^"']*)\1/,(_,q,value)=>`aria-label=${q}${value}، ${badgeText}${q}`):anchor;
  });
  html=html.replace(/<section\b[^>]*class=["']hero["'][^>]*>[\s\S]*?<\/section>/i,section=>{
    const open=section.match(/^<section\b[^>]*>/)[0];
    let content=section.slice(open.length).replace(/<\/section>$/,'');
    content=content.replace(/<div class="container">\s*(<div class="hero-content">[\s\S]*<\/div>)\s*<\/div>\s*$/,'$1');
    content=content.replace(/(<div\b[^>]*class=(["']))container\s+(hero-content[^"']*)(\2[^>]*>)/,'$1$3$4');
    return `${open}<div class="container contracting-hero-grid">${content}</div></section>`;
  });
  return html.replace(/<\/body>/i,`<script src="/assets/js/tawod-contracting-ui.js?v=${uiRevision}" defer></script>\n</body>`);
}
