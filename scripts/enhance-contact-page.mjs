import fs from 'node:fs';

const file='contact.html';
let html=fs.readFileSync(file,'utf8');
const before=html;

if(!/contact-conversion\.css/.test(html)){
  html=html.replace('</head>','<link href="assets/css/contact-conversion.css" rel="stylesheet"></head>');
}

if(!/contact-conversion\.js/.test(html)){
  html=html.replace('</body>','<script src="assets/js/contact-conversion.js" defer></script></body>');
}

if(!/<form id="form" class="[^"]*\bcontact-lead-form\b/.test(html)){
  html=html.replace(/<form id="form" class="clean-form([^"]*)"/,'<form id="form" class="clean-form contact-lead-form$1"');
}

html=html.replace('value="https://tawodco.com/"','value="https://tawodco.com/thank-you.html"');
html=html.replace('name="_captcha" type="hidden" value="false"','name="_captcha" type="hidden" value="true"');
html=html.replace('placeholder="رقم الجوال" required type="tel"','placeholder="رقم الجوال" required type="tel" inputmode="tel" autocomplete="tel" maxlength="16"');
html=html.replace('placeholder="البريد الإلكتروني" type="email"','placeholder="البريد الإلكتروني" type="email" autocomplete="email"');
html=html.replace('placeholder="تفاصيل المشروع أو الموقع أو الخدمة المطلوبة" required></textarea>','placeholder="تفاصيل المشروع أو الموقع أو الخدمة المطلوبة" required maxlength="1200"></textarea>');

if(html!==before){
  fs.writeFileSync(file,html);
  console.log('Enhanced contact.html');
}else{
  console.log('contact.html already enhanced');
}
