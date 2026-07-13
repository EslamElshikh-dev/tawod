import fs from 'node:fs';

const file='contact.html';
let html=fs.readFileSync(file,'utf8');
const before=html;

// Normalize generated contact markup so repeated workflow runs produce identical HTML.
if(!/contact-conversion\.css/.test(html)){
  html=html.replace('</head>','<link href="assets/css/contact-conversion.css" rel="stylesheet"></head>');
}

if(!/contact-conversion\.js/.test(html)){
  html=html.replace('</body>','<script src="assets/js/contact-conversion.js" defer></script></body>');
}

html=html.replace(/<form id="form" class="([^"]*)"/i,(match,classNames)=>{
  const classes=classNames.split(/\s+/).filter(Boolean).filter((value,index,list)=>list.indexOf(value)===index);
  if(!classes.includes('contact-lead-form')) classes.push('contact-lead-form');
  return `<form id="form" class="${classes.join(' ')}"`;
});

html=html.replace(/<input\b[^>]*name="_next"[^>]*>/i,'<input name="_next" type="hidden" value="https://tawodco.com/thank-you.html">');
html=html.replace(/<input\b[^>]*name="_captcha"[^>]*>/i,'<input name="_captcha" type="hidden" value="true">');

html=html.replace(/<input\b[^>]*name="رقم_الجوال"[^>]*>/i,(tag)=>{
  let normalized=tag
    .replace(/\sinputmode="[^"]*"/gi,'')
    .replace(/\sautocomplete="[^"]*"/gi,'')
    .replace(/\smaxlength="[^"]*"/gi,'');
  return normalized.replace(/>$/,' inputmode="tel" autocomplete="tel" maxlength="16">');
});

html=html.replace(/<input\b[^>]*name="البريد_الإلكتروني"[^>]*>/i,(tag)=>{
  let normalized=tag.replace(/\sautocomplete="[^"]*"/gi,'');
  return normalized.replace(/>$/,' autocomplete="email">');
});

html=html.replace(/<textarea\b[^>]*name="التفاصيل"[^>]*>/i,(tag)=>{
  let normalized=tag.replace(/\smaxlength="[^"]*"/gi,'');
  return normalized.replace(/>$/,' maxlength="1200">');
});

if(html!==before){
  fs.writeFileSync(file,html);
  console.log('Enhanced contact.html');
}else{
  console.log('contact.html already enhanced');
}
