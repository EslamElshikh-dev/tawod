# Tawod Website SEO & QA Checklist

قائمة فحص تشغيلية لموقع شركة تعاود للمقاولات العامة بعد تطوير الصفحة الرئيسية، الصفحات الداخلية، المدونة، وصفحات الهبوط.

---

## 1. صفحات يجب فحصها بعد النشر

- https://tawodco.com/
- https://tawodco.com/about.html
- https://tawodco.com/contact.html
- https://tawodco.com/service-construction.html
- https://tawodco.com/service-turnkey.html
- https://tawodco.com/service-restoration.html
- https://tawodco.com/service-finishing.html
- https://tawodco.com/service-decor.html
- https://tawodco.com/service-mep.html
- https://tawodco.com/blog/
- https://tawodco.com/lp/best-contracting-company-riyadh/
- https://tawodco.com/lp/construction-riyadh/
- https://tawodco.com/lp/bone-contractor-riyadh/
- https://tawodco.com/lp/finishing-riyadh/
- https://tawodco.com/lp/interior-design-riyadh/

---

## 2. SEO Technical

- [ ] كل صفحة لها Title فريد.
- [ ] كل صفحة لها Meta Description مناسب.
- [ ] كل صفحة لها Canonical URL صحيح.
- [ ] كل صفحة تسمح بالفهرسة `index, follow`.
- [ ] `sitemap.xml` محدث بتاريخ آخر تعديل.
- [ ] `robots.txt` يسمح بالأرشفة ويشير إلى sitemap.
- [ ] روابط المدونة داخلية وليست خارجية.
- [ ] صفحات الخدمات مرتبطة من الصفحة الرئيسية والمدونة وصفحات الهبوط.
- [ ] صور الخدمات تحتوي على Alt Text وصفي.
- [ ] Schema موجود للصفحة الرئيسية والخدمات والصفحات المناسبة.

---

## 3. UX & Conversion

- [ ] زر الاتصال يعمل على الجوال والكمبيوتر.
- [ ] زر واتساب يعمل ويرسل إلى الرقم الصحيح.
- [ ] نموذج التواصل يعمل ويرسل إلى البريد الصحيح.
- [ ] CTA ظاهر في Hero وفي نهاية الصفحات.
- [ ] القائمة الجانبية تعمل على الموبايل.
- [ ] زر إغلاق القائمة يعمل.
- [ ] الأزرار لا تغطي محتوى الصفحة على الموبايل.
- [ ] الخريطة لا تؤثر على سرعة التحميل الأولي.

---

## 4. Responsive Testing

اختبر الصفحات الأساسية على:

- [ ] iPhone SE / 375px
- [ ] iPhone 14 / 390px
- [ ] Android / 360px
- [ ] iPad / 768px
- [ ] Laptop / 1366px
- [ ] Desktop / 1440px
- [ ] Desktop / 1920px

متصفحات مقترحة:

- [ ] Chrome Windows
- [ ] Edge Windows
- [ ] Safari iOS
- [ ] Chrome Android
- [ ] Safari macOS

---

## 5. Performance

- [ ] اختبر الصفحة الرئيسية عبر Lighthouse.
- [ ] اختبر المدونة وصفحة خدمة واحدة وصفحة هبوط واحدة.
- [ ] راجع LCP للصورة الرئيسية.
- [ ] راجع CLS خصوصًا على الجوال.
- [ ] راجع حجم صور الخدمات.
- [ ] راجع تحميل Font Awesome والخطوط.
- [ ] راجع Cache Headers عند النشر على Vercel أو الاستضافة النهائية.

---

## 6. Search Console بعد ربط الدومين

- [ ] أضف النطاق في Google Search Console.
- [ ] أرسل sitemap: `https://tawodco.com/sitemap.xml`.
- [ ] افحص الصفحة الرئيسية URL Inspection.
- [ ] افحص صفحات الخدمات الأساسية.
- [ ] افحص صفحات الهبوط الأساسية.
- [ ] راقب Coverage وIndexing خلال أول أسبوع.

---

## 7. صفحات مقترحة للتطوير لاحقًا

- صفحة مشاريع / أعمالنا.
- صفحة مناطق الخدمة داخل الرياض.
- صفحة تقييمات العملاء.
- صفحة سياسة الخصوصية.
- صفحة شروط الاستخدام.
- مقالات إضافية طويلة حول البناء والتشطيب والترميم.

---

## 8. ملاحظات للمطور

- لا تضف CSS ضخم داخل كل صفحة إلا عند الضرورة.
- الأفضل استخدام الملفات المشتركة:
  - `assets/css/tawod-home.css`
  - `assets/css/tawod-upgrades.css`
  - `assets/css/tawod-inner.css`
  - `assets/css/tawod-blog.css`
  - `assets/js/tawod-inner.js`
- عند إضافة صفحة جديدة، أضفها إلى `sitemap.xml`.
- عند تعديل صفحة مهمة، حدث تاريخ `lastmod` الخاص بها.
