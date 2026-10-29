/* Staff-selected shortcuts use the existing sales stages and never mark a lead qualified. */
(function () {
  'use strict';
  var control = document.getElementById('pipelineMisfitPreset');
  if (!control) return;
  var presets = {
    other_company: { reason: 'other', text: '[نية الطلب: يبحث عن شركة أخرى]' },
    service_not_offered: { reason: 'outside_scope', text: '[نية الطلب: خدمة غير مقدمة]' },
    automotive: { reason: 'outside_scope', text: '[نية الطلب: صيانة سيارة أو ورشة]' },
    television: { reason: 'outside_scope', text: '[نية الطلب: تلفزيون أو أجهزة منزلية]' },
    outside_area: { reason: 'outside_scope', text: '[نية الطلب: خارج النطاق الجغرافي للخدمة]' }
  };
  control.addEventListener('change', function () {
    var preset = presets[control.value];
    control.value = '';
    if (!preset) return;
    var notes = document.getElementById('pipelineNotes');
    var previous = notes.value.trim();
    var next = previous.indexOf(preset.text) === 0 ? previous : preset.text + (previous ? ' ' + previous : '');
    if (next.length > notes.maxLength) {
      document.getElementById('pipelineError').textContent = 'اختصر الملاحظة قبل إضافة سبب عدم الملاءمة؛ لم تُغيّر البيانات.';
      notes.focus(); return;
    }
    notes.value = next;
    document.getElementById('pipelineStage').value = 'lost';
    document.getElementById('pipelineFit').value = 'unsuitable';
    document.getElementById('pipelineLostReason').value = preset.reason;
    document.getElementById('pipelineStage').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('pipelineError').textContent = '';
    notes.focus();
  });
})();
