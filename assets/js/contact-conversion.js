(function () {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback);
    else callback();
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[٠-٩۰-۹]/g, function (digit) {
      var code = digit.charCodeAt(0);
      return String(code >= 1776 ? code - 1776 : code - 1632);
    }).replace(/[^0-9+]/g, '');
  }

  function validSaudiPhone(value) {
    return /^(?:\+?966|00966|0)?5\d{8}$/.test(normalizePhone(value));
  }

  ready(function () {
    var form = document.getElementById('form');
    if (!form) return;

    form.classList.add('contact-lead-form');
    var phone = form.querySelector('input[name="رقم_الجوال"]');
    var details = form.querySelector('textarea[name="التفاصيل"]');
    var submit = form.querySelector('button[type="submit"]');
    var submitLabel = submit ? submit.innerHTML : '';
    var sending = false;
    var completed = false;
    var requestId = null;
    var services = {
      construction: 'البناء والإنشاءات', turnkey: 'تسليم مفتاح',
      restoration: 'ترميم مباني', finishing: 'تشطيبات عامة',
      decor: 'ديكورات', mep: 'أعمال الكهرباء والسباكة'
    };
    var serviceSelect = form.querySelector('[name="الخدمة_المطلوبة"]');
    try {
      var requestedService = services[new URLSearchParams(window.location.search).get('service')];
      if (requestedService && serviceSelect) serviceSelect.value = requestedService;
    } catch (error) {}
    var status = document.createElement('div');
    status.className = 'form-status';
    status.setAttribute('role', 'alert');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);

    var next = form.querySelector('input[name="_next"]');
    if (next) next.value = 'https://tawodco.com/thank-you.html';
    var captcha = form.querySelector('input[name="_captcha"]');
    if (captcha) captcha.value = 'true';

    if (!form.querySelector('input[name="_honey"]')) {
      var honeypot = document.createElement('div');
      honeypot.className = 'hp-field';
      honeypot.setAttribute('aria-hidden', 'true');
      honeypot.innerHTML = '<label for="website-field">اترك هذا الحقل فارغًا</label><input id="website-field" name="_honey" tabindex="-1" autocomplete="off">';
      form.insertBefore(honeypot, form.firstChild);
    }

    if (phone) {
      phone.setAttribute('inputmode', 'tel');
      phone.setAttribute('autocomplete', 'tel');
      phone.setAttribute('maxlength', '16');
      phone.setAttribute('aria-describedby', 'phone-hint phone-error');
      var hint = document.createElement('small');
      hint.id = 'phone-hint';
      hint.className = 'field-hint';
      hint.textContent = 'مثال: 0551128884';
      var error = document.createElement('small');
      error.id = 'phone-error';
      error.className = 'field-error';
      error.textContent = 'أدخل رقم جوال سعودي صحيح.';
      phone.parentNode.appendChild(hint);
      phone.parentNode.appendChild(error);
      phone.addEventListener('input', function () {
        phone.classList.remove('is-invalid');
        error.classList.remove('visible');
      });
    }

    if (details) {
      details.setAttribute('maxlength', '1200');
      details.setAttribute('aria-describedby', 'details-counter');
      var meta = document.createElement('div');
      meta.className = 'details-meta';
      meta.innerHTML = '<span>اذكر الموقع والمساحة والمرحلة الحالية لتحصل على رد أدق.</span><span id="details-counter">0 / 1200</span>';
      details.parentNode.appendChild(meta);
      var counter = meta.querySelector('#details-counter');
      var updateCounter = function () {
        counter.textContent = details.value.length + ' / 1200';
      };
      details.addEventListener('input', updateCounter);
      updateCounter();
    }

    if (submit) {
      var row = document.createElement('div');
      row.className = 'submit-row';
      submit.parentNode.insertBefore(row, submit);
      row.appendChild(submit);
      var note = document.createElement('span');
      note.className = 'submit-note';
      note.innerHTML = '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> بياناتك تستخدم لمراجعة الطلب والتواصل فقط';
      row.appendChild(note);
    }

    if (!form.querySelector('#privacy-consent')) {
      var privacy = document.createElement('div');
      privacy.className = 'privacy-check form-group-full';
      privacy.innerHTML = '<input id="privacy-consent" name="الموافقة_على_الخصوصية" type="checkbox" value="موافق" required><label for="privacy-consent">أوافق على استخدام بياناتي للتواصل بخصوص هذا الطلب وفق <a href="privacy-policy.html">سياسة الخصوصية</a>.</label>';
      var target = submit && submit.closest('.submit-row');
      form.insertBefore(privacy, target || submit);
    }

    form.addEventListener('submit', function (event) {
      if (sending || completed) { event.preventDefault(); return; }
      status.className = 'form-status';
      status.textContent = '';
      if (phone && !validSaudiPhone(phone.value)) {
        event.preventDefault();
        phone.classList.add('is-invalid');
        var phoneError = form.querySelector('#phone-error');
        if (phoneError) phoneError.classList.add('visible');
        phone.focus();
        status.className = 'form-status error visible';
        status.textContent = 'راجع رقم الجوال قبل إرسال الطلب.';
        return;
      }

      if (phone) phone.value = normalizePhone(phone.value);
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
        event.preventDefault();
        return;
      }

      var action = form.getAttribute('action') || '';
      var canConfirm = typeof window.fetch === 'function' && window.TawodAnalytics &&
        typeof window.TawodAnalytics.prepareFormSubmission === 'function' &&
        typeof window.TawodAnalytics.confirmFormSubmission === 'function';
      if (!canConfirm || !/^https:\/\/(?:www\.)?formsubmit\.co\//i.test(action)) return;

      event.preventDefault();
      var context = window.TawodAnalytics.prepareFormSubmission(form, { mode: 'ajax', submissionId: requestId });
      if (!context) return;
      requestId = context.submission_id;
      var payload = {};
      new window.FormData(form).forEach(function (value, key) { payload[key] = value; });
      // The documented AJAX endpoint handles acceptance without a cross-site redirect.
      // Keep the existing CAPTCHA-enabled native action as the no-JavaScript fallback.
      delete payload._next;
      delete payload._captcha;
      var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
      var timer = controller ? window.setTimeout(function () { controller.abort(); }, 25000) : null;
      sending = true;

      if (submit) {
        submit.setAttribute('aria-busy', 'true');
        submit.disabled = true;
        submit.innerHTML = 'جاري إرسال الطلب <i class="fa-solid fa-spinner" aria-hidden="true"></i>';
      }
      status.className = 'form-status visible';
      status.textContent = 'جاري إرسال طلبك، انتظر لحظة.';

      window.fetch(action.replace(/formsubmit\.co\//i, 'formsubmit.co/ajax/'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload), signal: controller ? controller.signal : undefined,
        credentials: 'omit'
      }).then(function (response) {
        if (!response.ok) throw new Error('provider_rejected');
        return response.json();
      }).then(function (result) {
        var accepted = result && (result.success === true || result.success === 'true');
        if (!accepted || /activat|confirm.*email/i.test(String(result.message || ''))) throw new Error('acceptance_unconfirmed');
        completed = true;
        window.TawodAnalytics.confirmFormSubmission(requestId);
        status.className = 'form-status success visible';
        status.textContent = 'تم إرسال طلبك بنجاح. رقم المتابعة: ' + requestId + '. سنراجع التفاصيل للتواصل معك.';
        if (submit) submit.textContent = 'تم إرسال الطلب';
      }).catch(function () {
        status.className = 'form-status error visible';
        status.textContent = 'تعذر تأكيد إرسال الطلب. البيانات ما زالت في النموذج؛ أعد المحاولة أو تواصل معنا عبر الهاتف أو الواتساب.';
      }).finally(function () {
        if (timer) window.clearTimeout(timer);
        sending = false;
        if (submit) {
          submit.removeAttribute('aria-busy');
          submit.disabled = completed;
          if (!completed) submit.innerHTML = submitLabel;
        }
      });
    });

    window.addEventListener('pageshow', function () {
      if (!sending && !completed && submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.innerHTML = submitLabel;
      }
    });
  });
})();
