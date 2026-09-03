import fs from 'node:fs';
import { createHash } from 'node:crypto';

const file='contact.html';
let html=fs.readFileSync(file,'utf8');
const before=html;
const socialImage='https://tawodco.com/images/social/tawod-og-1200x630.png';

function setAttribute(tag,name,value){
  const pattern=new RegExp(`\\s${name}="[^"]*"`,'i');
  const attribute=` ${name}="${value}"`;
  return pattern.test(tag)?tag.replace(pattern,attribute):tag.replace(/>$/,`${attribute}>`);
}

function addFieldLabel(fieldId,label,optional=false){
  if(new RegExp(`<label[^>]*for="${fieldId}"`,'i').test(html))return;
  const tagPattern=new RegExp(`(<div class="form-group">)(<(?:(?:input)|(?:select)|(?:textarea))\\b[^>]*id="${fieldId}"[^>]*>)`,'i');
  const suffix=optional?' <span class="optional">(اختياري)</span>':'';
  html=html.replace(tagPattern,`$1<label for="${fieldId}">${label}${suffix}</label>$2`);
}

// Normalize generated contact markup so repeated workflow runs produce identical HTML.
html=html.replace(/<script[^>]*id="tawod-static-faq-schema"[^>]*>[\s\S]*?<\/script>/i,'');
html=html.replace(/<script[^>]*id="tawod-static-page-schema"[^>]*>[\s\S]*?<\/script>/i,'');
html=html.replace(/<meta\b(?=[^>]*property="og:image")[^>]*>/i,`<meta property="og:image" content="${socialImage}">`);
if(!/property="og:image:width"/i.test(html)){
  html=html.replace(/(<meta\b(?=[^>]*property="og:image")[^>]*>)/i,'$1<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="شركة تعاود للمقاولات العامة في الرياض">');
}
if(!/name="twitter:card"/i.test(html)){
  html=html.replace(/(<link rel="icon")/i,`<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="تواصل مع شركة تعاود للمقاولات العامة بالرياض"><meta name="twitter:description" content="اتصال وواتساب وطلب عرض سعر لخدمات المقاولات العامة في الرياض."><meta name="twitter:image" content="${socialImage}"><meta name="twitter:image:alt" content="شركة تعاود للمقاولات العامة في الرياض">$1`);
}
if(!/contact-conversion\.css/.test(html)){
  html=html.replace('</head>','<link href="assets/css/contact-conversion.css" rel="stylesheet"></head>');
}

const contactConversionVersion=createHash('sha256').update(fs.readFileSync('assets/js/contact-conversion.js')).digest('hex').slice(0,12);
if(!/contact-conversion\.js/.test(html)) html=html.replace('</body>',`<script src="assets/js/contact-conversion.js?v=${contactConversionVersion}" defer></script></body>`);
else html=html.replace(/assets\/js\/contact-conversion\.js(?:\?v=[^"']*)?/i,`assets/js/contact-conversion.js?v=${contactConversionVersion}`);

html=html.replace(/<form\b[^>]*\bid="form"[^>]*>/i,(tag)=>{
  let normalized=tag.replace(/\sdata-analytics-form="[^"]*"/gi,'');
  normalized=normalized.replace(/class="([^"]*)"/i,(match,classNames)=>{
    const classes=classNames.split(/\s+/).filter(Boolean).filter((value,index,list)=>list.indexOf(value)===index);
    if(!classes.includes('contact-lead-form')) classes.push('contact-lead-form');
    return `class="${classes.join(' ')}"`;
  });
  normalized=normalized.replace(/\saria-labelledby="[^"]*"/gi,'');
  return normalized.replace(/>$/,' aria-labelledby="contact-form-title" data-analytics-form="contact_quote_request">');
});

html=html.replace(/<h2>اطلب عرض سعر<\/h2>/i,'<h2 id="contact-form-title">اطلب عرض سعر</h2>');

html=html.replace(/<input\b[^>]*name="الاسم"[^>]*>/i,(tag)=>{
  let normalized=setAttribute(tag,'id','contact-name');
  normalized=setAttribute(normalized,'autocomplete','name');
  return normalized;
});

html=html.replace(/<input\b[^>]*name="_next"[^>]*>/i,'<input name="_next" type="hidden" value="https://tawodco.com/thank-you.html">');
html=html.replace(/<input\b[^>]*name="_captcha"[^>]*>/i,'<input name="_captcha" type="hidden" value="true">');

html=html.replace(/<input\b[^>]*name="رقم_الجوال"[^>]*>/i,(tag)=>{
  let normalized=tag
    .replace(/\sinputmode="[^"]*"/gi,'')
    .replace(/\sautocomplete="[^"]*"/gi,'')
    .replace(/\smaxlength="[^"]*"/gi,'');
  normalized=setAttribute(normalized,'id','contact-phone');
  return normalized.replace(/>$/,' inputmode="tel" autocomplete="tel" maxlength="16">');
});

html=html.replace(/<input\b[^>]*name="البريد_الإلكتروني"[^>]*>/i,(tag)=>{
  let normalized=tag.replace(/\sautocomplete="[^"]*"/gi,'');
  normalized=setAttribute(normalized,'id','contact-email');
  return normalized.replace(/>$/,' autocomplete="email">');
});

html=html.replace(/<select\b[^>]*name="الخدمة_المطلوبة"[^>]*>/i,(tag)=>setAttribute(tag,'id','contact-service'));

html=html.replace(/<textarea\b[^>]*name="التفاصيل"[^>]*>/i,(tag)=>{
  let normalized=tag.replace(/\smaxlength="[^"]*"/gi,'');
  normalized=setAttribute(normalized,'id','contact-details');
  return normalized.replace(/>$/,' maxlength="1200">');
});

addFieldLabel('contact-name','الاسم الكريم');
addFieldLabel('contact-phone','رقم الجوال');
addFieldLabel('contact-email','البريد الإلكتروني',true);
addFieldLabel('contact-service','الخدمة المطلوبة');
addFieldLabel('contact-details','تفاصيل المشروع');

if(!/id="privacy-consent"/i.test(html)){
  const privacy='<div class="privacy-check form-group-full"><input id="privacy-consent" name="الموافقة_على_الخصوصية" type="checkbox" value="موافق" required><label for="privacy-consent">أوافق على استخدام بياناتي للتواصل بخصوص هذا الطلب وفق <a href="privacy-policy.html">سياسة الخصوصية</a>.</label></div>';
  html=html.replace(/(<button\b[^>]*type="submit"[^>]*>)/i,`${privacy}$1`);
}

if(html!==before){
  fs.writeFileSync(file,html);
  console.log('Enhanced contact.html');
}else{
  console.log('contact.html already enhanced');
}
