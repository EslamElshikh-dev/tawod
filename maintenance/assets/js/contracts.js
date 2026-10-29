/* Prepare a contract enquiry locally; sending and staff qualification remain separate. */
(function () {
  'use strict';
  var form = document.getElementById('contract-request');
  if (!form) return;
  var review = document.getElementById('contract-review');
  var error = document.getElementById('contract-error');
  function digits(value) {
    return String(value).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); });
  }
  function reveal(element) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    error.textContent = '';
    var fields = form.elements;
    var district = fields.district.value.trim();
    if (!district) { error.textContent = 'اكتب الحي داخل الرياض.'; fields.district.focus(); return; }
    var sites = digits(fields.sites.value.trim());
    if (sites && (!/^\d{1,5}$/.test(sites) || Number(sites) < 1)) {
      error.textContent = 'اكتب عدد المواقع كرقم موجب، أو اتركه فارغًا.'; fields.sites.focus(); return;
    }
    var phone = digits(fields.contact_phone.value.trim()).replace(/[\s()-]/g, '').replace(/^00/, '+');
    if (/^05\d{8}$/.test(phone)) phone = '+966' + phone.slice(1);
    else if (/^5\d{8}$/.test(phone)) phone = '+966' + phone;
    else if (/^9665\d{8}$/.test(phone)) phone = '+' + phone;
    if (phone && !/^\+9665\d{8}$/.test(phone)) {
      error.textContent = 'أدخل رقم جوال سعودي صحيحًا أو اترك الرقم فارغًا.'; fields.contact_phone.focus(); return;
    }
    var intentLabels = {
      facilities: 'إدارة مرافق المنشآت',
      'maintenance-contract': 'عقود التشغيل والصيانة الدورية',
      'shared-facilities': 'تشغيل العمائر والمرافق المشتركة'
    };
    var intent = form.getAttribute('data-contract-intent');
    var message = ['السلام عليكم، أرغب في دراسة عقد لدى تعاود للصيانة والتشغيل.', '', 'المسار: ' + (intentLabels[intent] || 'عقود المنشآت'), 'نوع المنشأة: ' + fields.property.value, 'الموقع: الرياض، ' + district];
    if (sites) message.push('عدد المواقع: ' + sites);
    if (fields.units.value.trim()) message.push('الوحدات أو المساحة: ' + fields.units.value.trim());
    var systems = Array.from(form.querySelectorAll('input[name="systems"]:checked')).map(function (input) { return input.value; });
    if (systems.length) message.push('الأنظمة والخدمات: ' + systems.join('، '));
    message.push('مدة العقد: ' + fields.duration.value, 'التغطية المطلوبة: ' + fields.coverage.value);
    if (fields.start.value.trim()) message.push('موعد البدء المتوقع: ' + fields.start.value.trim());
    if (fields.notes.value.trim()) message.push('تفاصيل الاحتياج: ' + fields.notes.value.trim());
    if (fields.contact_name.value.trim()) message.push('مسؤول التواصل: ' + fields.contact_name.value.trim());
    if (phone) message.push('رقم التواصل البديل: ' + phone);
    message.push('', 'أرجو مراجعة الاحتياج وتحديد المعاينة ونطاق العرض المناسب.');
    var text = message.join('\n');
    document.getElementById('contract-summary').textContent = text;
    var whatsappLink = document.getElementById('contract-whatsapp');
    // Keep only the typed reference already verified by the shared attribution script.
    // Replacing the prepared message must not discard GCLID/GBRAID/WBRAID attribution.
    var referenceType = whatsappLink.getAttribute('data-ads-attribution-id');
    if (['GCLID', 'GBRAID', 'WBRAID'].indexOf(referenceType) !== -1) {
      try {
        var previousText = new URL(whatsappLink.href, window.location.href).searchParams.get('text') || '';
        var reference = previousText.match(/(?:^|\n)مرجع الإعلان: (GCLID|GBRAID|WBRAID):([^\s]+)(?:\s*)$/);
        if (reference && reference[1] === referenceType) text += '\n\nمرجع الإعلان: ' + referenceType + ':' + reference[2];
      } catch (_) { /* The enquiry still works without an attribution reference. */ }
    }
    whatsappLink.href = 'https://wa.me/966533152133?text=' + encodeURIComponent(text);
    form.hidden = true;
    review.hidden = false;
    reveal(review);
    // Intention only. No entered data, Ads conversion or qualified-lead event is sent here.
    if (/^(www\.)?tawodco\.com$/.test(window.location.hostname) && typeof window.gtag === 'function') {
      window.gtag('event', 'maintenance_contract_request_prepared', { contract_intent: intent, page_path: window.location.pathname });
    }
  });
  document.getElementById('contract-edit').addEventListener('click', function () {
    review.hidden = true; form.hidden = false; reveal(fieldsFirst());
  });
  function fieldsFirst() { return form.elements.property; }
  form.addEventListener('input', function () { error.textContent = ''; });
  form.addEventListener('change', function () { error.textContent = ''; });
})();
