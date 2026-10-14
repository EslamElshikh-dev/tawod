(() => {
  const form = document.getElementById('decision-project-brief');
  const status = document.getElementById('decision-brief-status');
  if (!form || !status) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const message = ['السلام عليكم، أرغب في مناقشة تشطيب مشروع تجاري مع تعاود بالرياض.', `نوع المشروع: ${data.get('project_type')}`, `المساحة التقريبية: ${data.get('area')} م²`, `الحي: ${String(data.get('district') || '').trim()}`, `موعد الافتتاح المستهدف: ${data.get('opening_date') || 'يُحدد لاحقًا'}`, 'حالة الموقع والصور أو المخططات: سأرفقها في المحادثة.'].join('\n');
    const url = `https://wa.me/966551128884?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'افتح الرسالة الجاهزة في واتساب';
    link.dataset.contactPosition = 'decision-project-brief';
    status.replaceChildren(document.createTextNode('الرسالة جاهزة للمراجعة والإرسال من واتساب. '), link);
    // A prepared message is not a submitted lead. Existing analytics tracks
    // the outbound WhatsApp action; this form does not emit generate_lead.
    link.click();
  });
})();
