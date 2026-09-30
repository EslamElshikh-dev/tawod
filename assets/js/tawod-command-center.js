(function () {
  'use strict';

  var API = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
  var TOKEN_KEY = 'tawodAdminToken';
  var NOTIFICATION_KEY = 'tawodReadEventsV3';
  var PROFILE_KEY = 'tawodAccountAppearanceV1';
  var token = '';
  var payload = null;
  var insights = [];
  var editRequest = 0;
  var decisionDraft = null;
  var decisionEditRequest = 0;
  var boardExpanded = {};
  var activeView = 'executive';
  var notificationFeed = null;
  var notificationRows = [];
  var notificationPending = false;
  var notificationTicket = 0;
  var accountUsername = 'admin';
  var profilePhotoDraft = null;
  var profilePhotoTicket = 0;
  var navTrigger = null;
  var loadTicket = 0;

  function icon(name) {
    return /^[a-z-]+$/.test(name) ? '<svg class="cc-icon" aria-hidden="true" focusable="false"><use href="#cc-i-' + name + '"></use></svg>' : '';
  }

  function el(id) { return document.getElementById(id); }
  function number(value) { return Number(value || 0); }
  function n(value, digits) {
    return number(value).toLocaleString('ar-SA', { maximumFractionDigits: digits == null ? 0 : digits });
  }
  function pct(value) { return n(value, 1) + '%'; }
  function rate(a, b) { return number(b) ? number(a) / number(b) * 100 : 0; }
  function money(value, currency) {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency || 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number(value));
  }
  function esc(value) {
    return String(value == null ? '—' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(new Date(value));
    } catch (error) { return '—'; }
  }
  function formatDuration(seconds) {
    var total = Math.max(0, Math.round(number(seconds)));
    var minutes = Math.floor(total / 60);
    var rest = total % 60;
    return minutes ? n(minutes) + ' د ' + n(rest) + ' ث' : n(rest) + ' ث';
  }
  function cleanPath(value) {
    try { return new URL(String(value || '/'), 'https://tawodco.com').pathname || '/'; }
    catch (error) { return String(value || '/').split('?')[0]; }
  }
  function sourceLabel(value) {
    var key = String(value || '').toLowerCase();
    var labels = {
      direct: 'مباشر', 'google-ads': 'Google Ads', 'google-organic': 'Google Organic',
      google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
      whatsapp: 'WhatsApp', 'l.wl.co': 'رابط WhatsApp',
      unlinked: 'غير مرتبط بإحالة مقاسة', unknown: 'مصدر غير معروف'
    };
    return labels[key] || value || 'غير معروف';
  }
  function deviceLabel(value) {
    return { mobile: 'جوال', desktop: 'كمبيوتر', tablet: 'تابلت', unknown: 'غير معروف' }[value] || value || '—';
  }
  function salesSourceLabel(value) {
    return { call: 'اتصال', whatsapp: 'واتساب', form: 'نموذج', other: 'أخرى' }[value] || value || '—';
  }
  function salesStageLabel(value) {
    return { new: 'إحالة جديدة', qualified: 'عميل مؤهل', quote_sent: 'عرض سعر مرسل', site_visit: 'زيارة موقع', contract_signed: 'عقد موقّع', lost: 'لم يتم التعاقد' }[value] || value || '—';
  }
  function lostReasonLabel(value) {
    return { price: 'السعر', timing: 'تأجيل المشروع', outside_scope: 'خارج نطاق الخدمة', no_response: 'انقطاع الرد', competitor: 'منافس', other: 'سبب آخر' }[value] || '—';
  }
  function riyadhInput(value) {
    if (!value || isNaN(new Date(value).getTime())) return '';
    return new Date(new Date(value).getTime() + 3 * 3600000).toISOString().slice(0, 16);
  }
  function inputTimestamp(value) { return value ? new Date(value + '+03:00').toISOString() : null; }
  function opportunityId(row) { return 'TW-' + String(row.id || '').slice(0, 8).toUpperCase(); }
  function matchesFollowup(row, filter) {
    var now = Date.now();
    var due = row.nextFollowUpAt ? new Date(row.nextFollowUpAt).getTime() : null;
    var dayEnd = new Date(riyadhInput(new Date(now).toISOString()).slice(0, 10) + 'T00:00:00+03:00').getTime() + 86400000;
    return { all: true, overdue: due !== null && due < now, today: due !== null && due >= now && due < dayEnd,
      unassigned: !row.assignee, unscheduled: due === null,
      stale: new Date(row.lastContactAt || row.firstContactAt || row.occurredAt).getTime() < now - 7 * 86400000,
      unqualified: !row.qualifiedAt }[filter] || false;
  }
  function renderFollowups(data) {
    var sales = data.salesPipeline || {}, f = sales.followups || {};
    el('followupMetrics').innerHTML = sales.connected ? [
      ['overdue','متابعات متأخرة', f.overdue, 'تجاوزت موعد المتابعة'],
      ['today','باقي متابعات اليوم', f.today, 'قبل نهاية اليوم في الرياض'],
      ['unassigned','دون مسؤول', f.unassigned, 'تحتاج توزيعًا على الفريق'],
      ['unscheduled','دون موعد متابعة', f.unscheduled, 'حدد إجراءً وموعدًا واضحًا']
    ].map(function (item) {
      return '<button type="button" class="followup-stat ' + item[0] + '" data-filter="' + item[0] + '"><span>' + item[1] + '</span><strong>' + n(item[2]) + '</strong><small>' + item[3] + '</small></button>';
    }).join('') : '<div class="empty-box">تعذر تحميل مسار البيع؛ لا تتوفر أعداد المتابعات.</div>';
    el('followupLimit').hidden = !sales.openEntriesTruncated;
    var filter = el('followupFilter').value, query = el('followupSearch').value.trim().toLowerCase();
    var rows = (sales.openEntries || []).filter(function (row) {
      return matchesFollowup(row, filter) && (!query || [opportunityId(row),row.id,row.serviceType,row.assignee,row.campaignName,row.acquisitionSource,row.projectLocation].join(' ').toLowerCase().includes(query));
    });
    el('followupCount').textContent = n(rows.length) + ' معروضة · ' + n(f.total) + ' مفتوحة';
    el('followupList').innerHTML = rows.length ? rows.map(function (row) {
      var overdue = matchesFollowup(row, 'overdue');
      return '<article class="followup-card ' + (overdue ? 'is-overdue' : '') + '"><div class="followup-card-title"><code>' + esc(opportunityId(row)) + '</code><span class="stage-tag ' + esc(row.stage) + '">' + esc(salesStageLabel(row.stage)) + '</span>' +
        (overdue ? '<span class="followup-urgency">متأخرة</span>' : '') + '</div><h3>' + esc(row.serviceType || 'الخدمة تحتاج تحديدًا') + '</h3><p>' + esc(row.projectLocation || 'المنطقة غير محددة') + ' · ' + esc(sourceLabel(row.acquisitionSource || 'غير مرتبط')) + '</p>' +
        '<dl><div><dt>المسؤول</dt><dd>' + esc(row.assignee || 'لم يُعيّن') + '</dd></div><div><dt>المتابعة القادمة</dt><dd>' + esc(row.nextFollowUpAt ? formatDate(row.nextFollowUpAt) : 'لم تُجدول') + '</dd></div><div><dt>آخر تواصل فعلي</dt><dd>' + esc(formatDate(row.lastContactAt)) + '</dd></div></dl>' +
        '<div class="followup-next"><span>الإجراء القادم</span><strong>' + esc(row.nextAction || 'يحتاج تحديدًا') + '</strong></div><button type="button" class="followup-open" data-outcome="' + esc(row.id) + '">فتح الفرصة والمتابعة</button></article>';
    }).join('') : '<div class="empty-box">' + (sales.connected ? 'لا توجد فرص مطابقة لهذا العرض.' : 'مصدر مسار البيع غير متاح الآن.') + '</div>';
  }
  function renderSourceQuality(data) {
    var q = data.dataQuality || {}, sales = data.salesPipeline || {}, s = sales.summary || {};
    var cards = [
      { title: 'الموقع', connected: !!q.lastEventAt, at: q.lastEventAt, hours: 26, detail: 'آخر حدث مقاس؛ هدوء الزيارات لا يعني تعطل التتبع.' },
      { title: 'Google Ads', connected: !!(data.googleAds || {}).connected, at: (data.googleAds || {}).lastSyncAt, hours: 2, detail: 'الإنفاق والتحويلات · قياس المكالمات له اتصال مستقل.' },
      { title: 'الملف التجاري', connected: !!(data.businessProfile || {}).connected, at: (data.businessProfile || {}).lastSyncAt, hours: 26, detail: 'اكتمال الأيام يتطلب مراجعة دفعات Performance API.' }
    ];
    el('sourceQualityGrid').innerHTML = cards.map(function (row) {
      var stale = row.connected && (!row.at || Date.now() - new Date(row.at).getTime() > row.hours * 3600000);
      return '<article class="source-quality-card"><header><strong>' + row.title + '</strong><span class="quality-state ' + (!row.connected || stale ? 'watch' : 'good') + '">' + (!row.connected ? 'لا توجد بيانات' : stale ? 'آخر بيانات قديمة' : 'بيانات حديثة') + '</span></header><time>' + esc(formatDate(row.at)) + '</time><p>' + row.detail + '</p></article>';
    }).join('') + '<article class="source-quality-card"><header><strong>اكتمال الفرص في الفترة</strong><span class="quality-state ' + (sales.connected ? 'good' : 'watch') + '">' + (sales.connected ? n(s.opportunities) + ' فرصة فعلية' : 'غير متاح') + '</span></header><p>مرتبط بإحالة مقاسة: <b>' + (sales.connected && number(s.opportunities) ? pct(rate(s.linked,s.opportunities)) : '—') + '</b> · ' + n(s.linked) + ' من ' + n(s.opportunities) + '</p><p>بيانات التأهيل مكتملة: <b>' + (sales.connected && number(s.opportunities) ? pct(rate(s.qualificationComplete,s.opportunities)) : '—') + '</b></p><small>الخدمة، المنطقة، التوقيت، الملاءمة ونتيجة المراجعة. بيانات الاختبار مستبعدة.</small></article>';
  }
  function sheetsSyncLabel(row) {
    if (row.sourceType !== 'whatsapp' || !row.qualifiedAt) return { text: 'غير مشمول', cls: '' };
    var test = /^TEST(?:-|_|$)/i.test(row.clickId || '');
    if (row.sheetsSyncedAt) return { text: test ? 'وصل الاختبار' : 'تمت المزامنة', cls: 'contract_signed' };
    return { text: test ? 'اختبار بانتظار الرفع' : 'بانتظار الرفع', cls: 'quote_sent' };
  }
  function statusFreshness(connected, at) {
    if (!connected) return { label: 'غير متصل', cls: 'is-offline' };
    var age = at ? (Date.now() - new Date(at).getTime()) / 3600000 : Infinity;
    if (age <= 2) return { label: 'متصل · محدث', cls: 'is-live' };
    if (age <= 26) return { label: 'متصل · يحتاج مزامنة', cls: 'is-stale' };
    return { label: 'متصل · بيانات قديمة', cls: 'is-stale' };
  }
  function adsActionCategory(value) {
    return {
      CONTACT: 'تواصل', PHONE_CALL_LEAD: 'مكالمة', SUBMIT_LEAD_FORM: 'نموذج',
      QUALIFIED_LEAD: 'عميل مؤهل', CONVERTED_LEAD: 'عميل محوّل',
      GET_DIRECTIONS: 'اتجاهات', OUTBOUND_CLICK: 'نقرة خارجية'
    }[value] || value || 'غير مصنف';
  }
  function showToast(message, important) {
    var node = el('adminToast');
    node.textContent = message;
    node.className = 'toast is-visible' + (important ? ' is-important' : '');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { node.classList.remove('is-visible'); }, important ? 4200 : 2200);
  }
  function setLoading(on) {
    el('adminLoading').hidden = !on;
    ['refreshButton', 'copyButton', 'printButton', 'googleAdsSyncButton'].forEach(function (id) { el(id).disabled = on; });
    el('refreshLabel').textContent = on ? 'جاري تحديث البيانات' : 'تحديث البيانات';
    el('refreshButton').setAttribute('aria-label',el('refreshLabel').textContent);
    el('refreshButton').setAttribute('aria-busy',String(on));
  }
  function metric(label, value, hint, source, cls) {
    return '<article class="kpi-card ' + esc(cls || '') + '"><div class="metric-top"><span>' + esc(label) +
      '</span><em>' + esc(source) + '</em></div><strong>' + esc(value) + '</strong><small>' + esc(hint) + '</small></article>';
  }
  function unavailableMetrics(labels, source) {
    return labels.map(function (label) { return metric(label, 'غير متصل', 'يلزم ربط المصدر', source, 'is-unavailable'); }).join('');
  }

  function confidence(sessions) {
    if (number(sessions) < 10) return 'صغيرة جدًا';
    if (number(sessions) < 50) return 'صغيرة';
    if (number(sessions) < 150) return 'متوسطة';
    return 'كبيرة';
  }
  function health(data) {
    var s = data.summary || {};
    var q = data.dataQuality || {};
    if (number(s.sessions) < 10) return { score: 0, label: 'بانتظار عينة', text: 'نحتاج 10 جلسات على الأقل قبل الحكم.' };
    var referralScore = Math.min(number(s.referralRate) / 10, 1) * 70;
    var qualityScore = q.reconciled ? 20 : 0;
    var momentum = number(((data.comparison7d || {}).current || {}).referrals) >= number(((data.comparison7d || {}).previous || {}).referrals) ? 10 : 3;
    var score = Math.round(referralScore + qualityScore + momentum);
    var label = score >= 80 ? 'إحالات قوية' : score >= 60 ? 'أداء جيد' : score >= 40 ? 'يحتاج تحسين' : 'فجوة إحالة';
    return { score: score, label: label, text: 'مؤشر تقديري لقواعد الإحالة واتجاهها ومطابقة الإجماليات؛ لا يقيس ربحية العقود أو دقة الإسناد.' };
  }
  function makeInsight(priority, area, title, evidence, action, source, key) {
    return { priority: priority, area: area, title: title, evidence: evidence, action: action, source: source, key: key };
  }
  function buildInsights(data) {
    var s = data.summary || {};
    var ads = data.googleAds || {};
    var bp = data.businessProfile || {};
    var rows = [];
    if (!(data.dataQuality || {}).reconciled) {
      rows.push(makeInsight('high', 'جودة البيانات', 'يوجد فرق في إجماليات الجلسات', 'مجموع المصادر أو الأجهزة لا يساوي إجمالي الزيارات.', 'أوقف قرارات الميزانية حتى تتم مطابقة المصدر.', 'First-party', 'session-reconciliation'));
    }
    if (!ads.connected) {
      rows.push(makeInsight('high', 'Google Ads', 'بيانات الإعلانات غير متصلة', 'لم تصل بيانات الإنفاق والميزانية من Google Ads. قياس مدة المكالمات يحتاج مصدرًا متاحًا مستقلًا.', 'راجع سكربت المزامنة من حساب Google Ads وجدول تشغيله.', 'Google Ads API', 'google-ads-connection'));
    }
    if (!bp.connected) {
      rows.push(makeInsight('medium', 'الملف التجاري', 'أداء الملف التجاري غير متصل', 'لا يمكن قياس Search وMaps والمكالمات والاتجاهات بدقة بدون Performance API.', 'فعّل Business Profile Performance API وشغّل مزامنة الموقع التجاري.', 'Business Profile API', 'business-profile-connection'));
    }
    var sales = data.salesPipeline || {};
    var pipeline = sales.summary || {};
    var followups = sales.followups || {};
    if (sales.connected && number(followups.overdue)) rows.push(makeInsight('high', 'المتابعة', 'متابعات تجاوزت موعدها', n(followups.overdue) + ' فرصة مفتوحة عبر جميع التواريخ.', 'افتح مركز المتابعات وراجع الإجراء القادم مع المسؤول عن كل فرصة.', 'مسار البيع', 'overdue-sales-followups'));
    if (sales.connected && (number(followups.unassigned) || number(followups.unscheduled))) rows.push(makeInsight('high', 'المتابعة', 'فرص تحتاج توزيعًا وجدولة', n(followups.unassigned) + ' دون مسؤول و' + n(followups.unscheduled) + ' دون موعد؛ قد تتداخل المجموعتان.', 'عيّن مسؤولًا وموعدًا وإجراءً لكل فرصة مفتوحة.', 'مسار البيع', 'sales-ownership-schedule'));
    if (sales.connected && number(pipeline.opportunities) >= 3 && !number(pipeline.contracts)) {
      rows.push(makeInsight('high', 'العقود', 'لا توجد عقود مسجلة من الفرص الحالية', n(pipeline.opportunities) + ' فرص في مسار البيع دون عقد موقّع مسجل.', 'راجع العروض المفتوحة وحدد موعد متابعة وقرارًا واضحًا لكل فرصة.', 'مسار البيع', 'cohort-no-contracts'));
    } else if (sales.connected && number(pipeline.contracts)) {
      rows.push(makeInsight('good', 'العقود', 'تم تسجيل عقود موقعة', n(pipeline.contracts) + ' عقد بقيمة ' + money(pipeline.contractValue, 'SAR') + '.', 'قارن مصدر العقود بالحملات قبل زيادة الميزانية.', 'مسار البيع', 'review-contract-sources'));
    }
    if (number(s.sessions) >= 30 && number(s.referralRate) < 5) {
      rows.push(makeInsight('high', 'التحويل', 'معدل الإحالة أقل من 5%', n(s.referralSessions) + ' إحالة فريدة من ' + n(s.sessions) + ' زيارة.', 'حسّن عرض القيمة وأزرار الاتصال وواتساب في الصفحات الأعلى زيارة.', 'First-party', 'low-referral-rate'));
    }
    var desktop = (data.devices || []).filter(function (row) { return row.device === 'desktop'; })[0];
    var mobile = (data.devices || []).filter(function (row) { return row.device === 'mobile'; })[0];
    if (desktop && mobile && number(desktop.sessions) >= 30 && number(desktop.referralRate) < number(mobile.referralRate) * 0.5) {
      rows.push(makeInsight('medium', 'الأجهزة', 'تحويل الكمبيوتر أضعف من الجوال', 'معدل الكمبيوتر ' + pct(desktop.referralRate) + ' مقابل ' + pct(mobile.referralRate) + ' للجوال.', 'راجع وضوح أزرار التواصل والعرض أعلى صفحات الكمبيوتر.', 'First-party', 'desktop-referral-gap'));
    }
    var paid = (data.sources || []).filter(function (row) { return row.source === 'google-ads'; })[0];
    if (paid && number(paid.sessions) >= 20 && number(paid.referralRate) >= 8) {
      rows.push(makeInsight('good', 'الاكتساب', 'زيارات Google Ads تُظهر نية تواصل قوية', n(paid.referrals) + ' إحالة من ' + n(paid.sessions) + ' زيارة منسوبة للحملات (' + pct(paid.referralRate) + ').', 'اربط الصرف والميزانية قبل التوسع لتقييم تكلفة الإحالة الحقيقية.', 'First-party attribution', 'review-paid-referrals'));
    }
    if (ads.connected) {
      var a = ads.summary || {};
      if (number(a.receivedCalls) && rate(a.missedCalls, a.trackedCalls) > 20) {
        rows.push(makeInsight('high', 'المكالمات', 'نسبة مكالمات فائتة مرتفعة', n(a.missedCalls) + ' مكالمة فائتة من ' + n(a.trackedCalls) + ' مكالمة مقاسة.', 'حدد تغطية للرد خلال ساعات الحملات وراجع جدول ظهور الإعلانات.', 'Google Ads Call Reporting', 'missed-call-coverage'));
      }
      if (number(a.budgetUseRate) > 110) {
        rows.push(makeInsight('high', 'الميزانية', 'الصرف أعلى من الميزانية المخططة للفترة', 'نسبة استخدام الميزانية التقديرية ' + pct(a.budgetUseRate) + '.', 'راجع الميزانيات المشتركة وتغييرات الميزانية قبل رفع العطاءات.', 'Google Ads API', 'budget-period-review'));
      }
    }
    if (!rows.length) rows.push(makeInsight('info', 'المتابعة', 'لا توجد إشارة حرجة', 'الإجماليات متطابقة ولا توجد مشكلة مدعومة بعينة كافية.', 'استمر بالمراقبة وراجع جودة العملاء أسبوعيًا.', 'المصادر المتصلة', 'weekly-quality-review'));
    var weight = { high: 0, medium: 1, info: 2, good: 3 };
    return rows.sort(function (a, b) { return weight[a.priority] - weight[b.priority]; });
  }

  function renderExecutive(data) {
    var s = data.summary || {};
    var q = data.dataQuality || {};
    var ads = data.googleAds || {};
    var a = ads.summary || {};
    var sales = data.salesPipeline || {};
    var pipeline = sales.summary || {};
    var h = health(data);
    el('healthRing').style.setProperty('--score', h.score);
    el('healthScore').textContent = h.score || '—';
    el('healthLabel').textContent = h.label;
    el('healthText').textContent = h.text;
    el('confidenceLabel').textContent = confidence(s.sessions);
    insights = buildInsights(data);
    var primary = insights[0];
    el('primaryDecisionTitle').textContent = primary.title;
    el('primaryDecisionEvidence').textContent = primary.evidence;
    el('primaryDecisionAction').textContent = primary.action;
    el('primaryDecisionPriority').textContent = primary.priority === 'high' ? 'أولوية عالية' : primary.priority === 'medium' ? 'تحسين مهم' : primary.priority === 'good' ? 'فرصة نمو' : 'متابعة';
    el('primaryDecisionPriority').className = 'priority-badge ' + primary.priority;

    var today = data.today || {};
    el('todayPulse').innerHTML = [
      ['زيارات', today.sessions], ['إحالات', today.referrals], ['اتصال', today.calls], ['واتساب', today.whatsapp]
    ].map(function (item) { return '<div class="today-item"><span>' + item[0] + '</span><strong>' + n(item[1]) + '</strong></div>'; }).join('');

    el('summaryMetrics').innerHTML = [
      metric('الزيارات', n(s.sessions), 'جلسات فريدة بدأت بمشاهدة صفحة', 'الموقع', 'visits'),
      metric('إحالات التواصل', n(s.referralSessions), 'جلسة ضغطت اتصال أو واتساب', 'الموقع', 'referrals'),
      metric('عقود موقّعة', sales.connected ? n(pipeline.contracts) : 'غير متصل', 'الحالة الحالية لفرص الفترة', 'إدارة المبيعات', sales.connected ? 'confirmed' : 'is-unavailable'),
      metric('قيمة العقود', sales.connected ? money(pipeline.contractValue, 'SAR') : 'غير متصل', 'قيمة عقود هذه الفرص المسجلة', 'إدارة المبيعات', sales.connected ? 'confirmed' : 'is-unavailable')
    ].join('');
    el('summaryExtraMetrics').innerHTML = [
      metric('إحالات الاتصال', n(s.callReferralSessions), 'جلسات فريدة — وليست عدد الضغطات', 'الموقع', 'calls'),
      metric('إحالات واتساب', n(s.whatsappReferralSessions), 'جلسات فريدة — وليست عدد الضغطات', 'الموقع', 'whatsapp'),
      metric('معدل الإحالة', pct(s.referralRate), 'الإحالات الفريدة ÷ الزيارات', 'محسوب', 'rate'),
      metric('عميل محتمل', ads.callReportingConnected ? n(a.potentialCustomers) : 'غير متصل', 'مكالمة مستلمة أطول من 60 ثانية', 'Call Reporting', ads.callReportingConnected ? 'potential' : 'is-unavailable')
    ].join('');
    el('secondaryViews').textContent = n(s.views);
    el('secondaryVisitors').textContent = n(s.visitors);
    el('secondaryNewVisitors').textContent = n(s.newVisitors);
    el('secondaryReturningVisitors').textContent = n(s.returningVisitors);
    el('secondaryCalls').textContent = n(s.callClicks);
    el('secondaryWhatsapp').textContent = n(s.whatsappClicks);
    el('secondaryDuplicates').textContent = n(q.duplicateOrCrossChannelClicks);
    el('secondaryArticles').textContent = n(s.articleViews);
    el('generatedAt').textContent = 'آخر تحديث: ' + formatDate(data.generatedAt) + ' · ' + n(data.periodDays) + ' يوم';

    var quality = el('dataQualityBar');
    quality.className = 'quality-bar ' + (q.reconciled ? 'is-valid' : 'is-invalid');
    quality.innerHTML = '<span class="quality-dot"></span><strong>' + (q.reconciled ? 'إجماليات الجلسات متطابقة' : 'يوجد فرق يحتاج مراجعة') +
      '</strong><small>الزيارات ' + n(q.sessionTotal) + ' = المصادر ' + n(q.sourceTotal) + ' = الأجهزة ' + n(q.deviceTotal) +
      ' · مطابقة حسابية؛ لا تثبت اكتمال الإسناد أو وصول التواصل الفعلي</small>';

    var defs = data.definitions || {};
    el('definitionStrip').innerHTML = [
      ['الزيارة', defs.visit], ['الإحالة الناجحة', defs.successfulReferral],
      ['الفرصة المؤهلة', 'فرصة راجع الفريق تواصلها وملاءمة الخدمة ثم اعتمد تأهيلها؛ مؤشرات مدة المكالمات تُعرض منفصلة.'], ['فترة المبيعات', 'الفرص التي بدأت إحالتها في الفترة المختارة، بما يشمل حالتها الحالية. المتابعات المفتوحة تشمل كل التواريخ.']
    ].map(function (item) { return '<div><strong>' + esc(item[0]) + '</strong><span>' + esc(item[1]) + '</span></div>'; }).join('');
  }

  function renderFunnel(data) {
    var s = data.summary || {};
    var ads = data.googleAds || {};
    var a = ads.summary || {};
    var sales = data.salesPipeline || {};
    var pipeline = sales.summary || {};
    var stages = [
      { label: 'زيارة', value: n(s.sessions), note: 'جلسة فريدة', source: 'الموقع', cls: '' },
      { label: 'إحالة ناجحة', value: n(s.referralSessions), note: pct(s.referralRate) + ' من الزيارات', source: 'الموقع', cls: 'referral' },
      { label: 'فرصة مسجلة', value: sales.connected ? n(pipeline.opportunities) : '—', note: 'بدأت في فترة التقرير', source: 'المبيعات', cls: sales.connected ? '' : 'muted' },
      { label: 'سبق تأهيلها', value: sales.connected ? n(pipeline.qualified) : '—', note: 'مراجعة تجارية مسجلة', source: 'المبيعات', cls: sales.connected ? 'potential' : 'muted' },
      { label: 'عرض أو مرحلة تالية', value: sales.connected ? n(pipeline.quotes) : '—', note: 'الحالة الحالية للفرص', source: 'المبيعات', cls: sales.connected ? 'confirmed' : 'muted' },
      { label: 'عقد موقّع', value: sales.connected ? n(pipeline.contracts) : '—', note: sales.connected ? pct(pipeline.contractRate) + ' من الفرص المسجلة' : 'المصدر غير متصل', source: 'المبيعات', cls: sales.connected ? 'confirmed' : 'muted' }
    ];
    el('funnelGrid').innerHTML = stages.map(function (stage, index) {
      return '<article class="funnel-stage ' + stage.cls + '"><span class="stage-index">0' + (index + 1) + '</span><em>' + esc(stage.source) + '</em><strong>' + esc(stage.value) + '</strong><h3>' + esc(stage.label) + '</h3><p>' + esc(stage.note) + '</p></article>';
    }).join('');
    el('qualificationMetrics').innerHTML = [
      metric('مكالمات مستلمة', ads.callReportingConnected ? n(a.receivedCalls) : 'غير متصل', 'حالة RECEIVED', 'Call Reporting', ''),
      metric('مكالمات فائتة', ads.callReportingConnected ? n(a.missedCalls) : 'غير متصل', 'حالة MISSED', 'Call Reporting', ''),
      metric('متوسط مدة المكالمة', ads.callReportingConnected ? formatDuration(a.avgCallDurationSeconds) : 'غير متصل', 'للمكالمات المستلمة', 'Call Reporting', ''),
      metric('عملاء مؤكدون', ads.callReportingConnected ? n(a.confirmedCustomers) : 'غير متصل', '>60ث ومعها تكرار أو زيارة', 'تأهيل يدوي', 'confirmed')
    ].join('');

    var channelTotal = number(s.callReferralSessions) + number(s.whatsappReferralSessions);
    el('channelSplit').innerHTML = [
      { label: 'اتصال', value: s.callReferralSessions, share: rate(s.callReferralSessions, channelTotal), cls: 'call' },
      { label: 'واتساب', value: s.whatsappReferralSessions, share: rate(s.whatsappReferralSessions, channelTotal), cls: 'whatsapp' }
    ].map(function (item) {
      return '<div class="channel-item ' + item.cls + '"><div><strong>' + item.label + '</strong><span>' + n(item.value) + ' جلسة · ' + pct(item.share) + '</span></div><div class="channel-track"><i style="width:' + Math.min(100, item.share) + '%"></i></div></div>';
    }).join('') + '<small class="channel-note">الجلسة التي استخدمت القناتين تظهر في القناتين، لكنها تُحتسب إحالة ناجحة واحدة فقط.</small>';
    var q = data.dataQuality || {};
    el('reconciliationBox').innerHTML =
      '<div><span>ضغطات خام</span><strong>' + n(q.rawContactClicks) + '</strong></div>' +
      '<b>−</b><div><span>تكرار/تقاطع</span><strong>' + n(q.duplicateOrCrossChannelClicks) + '</strong></div>' +
      '<b>=</b><div class="result"><span>إحالات فريدة</span><strong>' + n(q.uniqueReferralSessions) + '</strong></div>';
  }

  function renderSalesPipeline(data) {
    var sales = data.salesPipeline || { connected: false, entries: [] };
    var s = sales.summary || {};
    el('pipelineSummaryMetrics').innerHTML = sales.connected ? [
      metric('كل الفرص', n(s.opportunities), 'فرص مسجلة في الفترة', 'المبيعات', ''),
      metric('فرص سبق تأهيلها', n(s.qualified), 'يشمل الفرص المفقودة بعد التأهيل', 'المبيعات', 'potential'),
      metric('عروض مرسلة', n(s.quotes), 'يشمل الزيارات والعقود', 'المبيعات', ''),
      metric('زيارات موقع', n(s.visits), 'يشمل العقود اللاحقة', 'المبيعات', 'calls'),
      metric('عقود موقّعة', n(s.contracts), pct(s.contractRate) + ' من كل الفرص', 'المبيعات', 'confirmed'),
      metric('قيمة العقود', money(s.contractValue, 'SAR'), 'المسجل للعقود الموقعة', 'المبيعات', 'confirmed')
    ].join('') : unavailableMetrics(['كل الفرص', 'عملاء مؤهلون', 'عروض مرسلة', 'زيارات موقع', 'عقود موقّعة', 'قيمة العقود'], 'مسار البيع');
    var entries = (sales.entries || []).filter(function (row) { return el('pipelineStageFilter').value === 'all' || row.stage === el('pipelineStageFilter').value; });
    el('pipelineLimit').hidden = !sales.entriesTruncated;
    el('pipelineEmpty').hidden = !!entries.length;
    el('pipelineLastUpdate').textContent = sales.lastUpdatedAt ? 'آخر تحديث: ' + formatDate(sales.lastUpdatedAt) : 'لم تُسجل نتائج بعد';
    el('pipelineBody').innerHTML = entries.map(function (row) {
      var sync = sheetsSyncLabel(row);
      return '<tr data-outcome="' + esc(row.id) + '"><td><code>' + esc(opportunityId(row)) + '</code>' + (row.isTest ? '<small>بيانات اختبار</small>' : '') + '<small>' + esc(formatDate(row.occurredAt)) + '</small></td><td><span class="channel-tag ' + esc(row.sourceType) + '">' + esc(salesSourceLabel(row.sourceType)) + '</span><small>' + esc(sourceLabel(row.acquisitionSource || 'غير مرتبط')) + '</small></td><td>' + esc(row.serviceType) + '<small>' + esc(row.projectLocation) + '</small></td><td>' + esc(row.campaignName) + '</td><td><span class="stage-tag ' + esc(row.stage) + '">' + esc(salesStageLabel(row.stage)) + '</span>' + (row.stage === 'lost' ? '<small>' + esc(lostReasonLabel(row.lostReason)) + '</small>' : '') + '</td><td>' + esc(row.assignee || 'دون مسؤول') + '<small>' + esc(formatDate(row.nextFollowUpAt)) + '</small></td><td><span class="stage-tag ' + esc(sync.cls) + '">' + esc(sync.text) + '</span></td><td>' + esc(money(row.estimatedValue, 'SAR')) + '</td><td><strong>' + esc(money(row.contractValue, 'SAR')) + '</strong></td><td><button class="pipeline-edit" type="button">فتح</button></td></tr>';
    }).join('');
  }

  function renderStageBoard(data) {
    var commercial = data.commercial || {}, board = commercial.board || {};
    if (!commercial.connected) { el('salesStageBoard').innerHTML = '<div class="empty-box">تحليل المراحل غير متاح الآن.</div>'; return; }
    var scope = el('boardScope').value;
    var stages = scope === 'open' ? ['new','qualified','quote_sent','site_visit'] : ['new','qualified','quote_sent','site_visit','contract_signed','lost'];
    el('salesStageBoard').classList.toggle('all-stages', scope === 'period');
    el('salesStageBoard').innerHTML = stages.map(function (stage) {
      var summary = (board.stages || []).find(function (row) { return row.scope === scope && row.stage === stage; }) || {};
      var all = (board.entries || []).filter(function (row) { return row.scope === scope && row.stage === stage; });
      var expanded = boardExpanded[scope + '-' + stage];
      var rows = expanded ? all : all.slice(0, 6);
      var valueLabel = stage === 'contract_signed' ? 'قيمة العقود' : stage === 'lost' ? 'قيمة الفرص المفقودة التقديرية' : 'قيمة تقديرية';
      return '<article class="board-column ' + esc(stage) + '"><header><span class="stage-tag ' + esc(stage) + '">' + esc(salesStageLabel(stage)) + '</span><strong>' + n(summary.total) + '</strong></header><p class="board-value">' + valueLabel + '<b>' + esc(money(summary.value, 'SAR')) + '</b></p>' +
        (number(summary.aging) ? '<p class="board-aging">' + n(summary.aging) + ' منذ 14 يومًا أو أكثر في المرحلة</p>' : '') +
        '<div class="board-cards">' + (rows.length ? rows.map(function (row) {
          var days = row.stageEnteredAt ? Math.max(0, Math.floor((Date.now() - new Date(row.stageEnteredAt).getTime()) / 86400000)) : null;
          var open = !['contract_signed','lost'].includes(row.stage);
          return '<button class="board-card' + (open && days !== null && days >= 14 ? ' is-aging' : '') + '" type="button" data-outcome="' + esc(row.id) + '"><span class="board-card-id">' + esc(opportunityId(row)) + '</span><strong>' + esc(row.serviceType || 'الخدمة غير محددة') + '</strong><span>' + esc(row.assignee || 'دون مسؤول') + ' · ' + esc(sourceLabel(row.source)) + '</span><span class="board-card-age">' + (days === null ? 'عمر المرحلة غير معروف' : n(days) + ' يوم في المرحلة') + '</span>' +
            (open ? '<span class="board-card-action">' + esc(row.nextAction || 'الإجراء القادم غير محدد') + '</span><time>' + esc(row.nextFollowUpAt ? formatDate(row.nextFollowUpAt) : 'دون موعد متابعة') + '</time>' : '') + '</button>';
        }).join('') : '<div class="board-empty">لا توجد فرص في هذه المرحلة.</div>') + '</div>' +
        (all.length > 6 ? '<button type="button" class="board-more" data-stage="' + esc(stage) + '">' + (expanded ? 'عرض مختصر' : 'عرض ' + n(all.length) + ' فرصة') + '</button>' : '') +
        (number(summary.total) > all.length ? '<small class="board-limit">يعرض أحدث أولويات المتابعة حتى 40 فرصة؛ الإجمالي يشمل ' + n(summary.total) + '.</small>' : '') + '</article>';
    }).join('');
  }
  function commercialGroups() {
    var commercial = (payload || {}).commercial || {};
    return el('commercialGroup').value === 'campaign' ? commercial.campaigns || [] : commercial.sources || [];
  }
  function renderCommercial(data) {
    var commercial = data.commercial || {}, activity = commercial.activity || {};
    el('commercialActivityMetrics').innerHTML = commercial.connected ? [
      metric('عقود اعتُمدت في الفترة', n(activity.contracts), 'اعتماد المرحلة في اللوحة · أي تاريخ إحالة', 'المبيعات', 'confirmed'),
      metric('قيمتها المسجلة حاليًا', money(activity.contractValue, 'SAR'), 'قيمة تعاقد، وليست تحصيلًا', 'المبيعات', 'confirmed'),
      metric('نجاح الفرص المغلقة', activity.closedWinRate == null ? '—' : pct(activity.closedWinRate), n(activity.contracts) + ' عقد و' + n(activity.lost) + ' لم يتم التعاقد', 'اعتماد خلال الفترة', ''),
      metric('متوسط دورة البيع', activity.avgCycleDays == null ? '—' : n(activity.avgCycleDays,1) + ' يوم', 'من الإحالة إلى اعتماد حالة العقد', 'العقود المؤرخة', '')
    ].join('') : unavailableMetrics(['عقود اعتُمدت في الفترة','قيمتها المسجلة حاليًا','نجاح الفرص المغلقة','متوسط دورة البيع'], 'تحليل المبيعات');
    el('commercialWindowNote').textContent = commercial.connected ?
      'الفترة: ' + formatDate(commercial.startAt) + ' إلى ' + formatDate(commercial.endAt) + '. يُستخدم آخر انتقال للحالة الحالية؛ إعادة فتح الفرصة تُزيلها من نتائج الإغلاق. ' + (number(commercial.unknownClosedDates) ? n(commercial.unknownClosedDates) + ' نتيجة مغلقة قديمة دون تاريخ اعتماد معروف، مستبعدة من مؤشرات الإغلاق.' : 'لا يُفترض تاريخ توقيع فعلي خارج السجل.') : 'تعذر تحميل تحليل النتائج الآن.';
    var campaign = el('commercialGroup').value === 'campaign';
    el('commercialGroupHeading').textContent = campaign ? 'المصدر / الحملة' : 'المصدر';
    el('commercialGroupLimit').hidden = !campaign || !commercial.campaignsTruncated;
    var rows = commercialGroups();
    el('commercialSourceEmpty').hidden = !!rows.length;
    el('commercialSourceEmpty').textContent = commercial.connected ? 'لا توجد فرص فعلية في هذه الفترة.' : 'مصدر التحليل غير متاح الآن.';
    el('commercialSourceBody').innerHTML = rows.map(function (row) {
      return '<tr><td><strong>' + esc(sourceLabel(row.source_key)) + '</strong>' + (campaign ? '<small>' + esc(row.campaign) + '</small>' : '') + '<small>' + (number(row.opportunities) < 10 ? 'عينة صغيرة · اقرأ العدد مع النسبة' : 'مصدر إحالة التواصل') + '</small></td><td>' + n(row.opportunities) + '</td><td>' + n(row.qualified) + '</td><td>' + n(row.open) + '</td><td>' + n(row.contracts) + '</td><td>' + n(row.lost) + '</td><td>' + pct(rate(row.contracts,row.opportunities)) + '</td><td><strong>' + esc(money(row.contract_value,'SAR')) + '</strong></td><td>' + esc(money(row.open_value,'SAR')) + '</td></tr>';
    }).join('');
    var reasons = commercial.lossReasons || [], total = reasons.reduce(function (sum,row) { return sum+number(row.total); },0);
    el('commercialLossReasons').innerHTML = reasons.length ? reasons.map(function (row) {
      return '<div class="loss-reason"><div><strong>' + esc(row.reason === 'unknown' ? 'سبب غير مسجل' : lostReasonLabel(row.reason)) + '</strong><span>' + n(row.total) + ' فرصة · ' + pct(rate(row.total,total)) + '</span></div><div class="source-track"><i style="width:' + Math.min(100,rate(row.total,total)) + '%"></i></div></div>';
    }).join('') : '<div class="empty-box">' + (commercial.connected ? 'لا توجد فرص مفقودة مسجلة في هذه المجموعة.' : 'لا تتوفر بيانات الأسباب الآن.') + '</div>';
  }

  function growth(current, previous) {
    current = number(current); previous = number(previous);
    if (current === previous) return { text: 'بدون تغيير', cls: '' };
    if (!previous) return { text: current ? 'بداية قياس' : 'بدون تغيير', cls: current ? 'up' : '' };
    var value = (current - previous) / previous * 100;
    return { text: (value > 0 ? '+' : '') + pct(value), cls: value > 0 ? 'up' : 'down' };
  }
  function renderTrend(data) {
    var c = (data.comparison7d || {}).current || {};
    var p = (data.comparison7d || {}).previous || {};
    el('comparisonMetrics').innerHTML = [
      ['الزيارات', c.sessions, p.sessions], ['الإحالات', c.referrals, p.referrals],
      ['إحالات الاتصال', c.calls, p.calls], ['إحالات واتساب', c.whatsapp, p.whatsapp]
    ].map(function (item) {
      var g = growth(item[1], item[2]);
      return '<article class="comparison-card"><span>' + item[0] + '</span><strong>' + n(item[1]) + '</strong><small>السابق: ' + n(item[2]) + '</small><div class="trend-pill ' + g.cls + '">' + g.text + '</div></article>';
    }).join('');
    var rows = data.daily || [];
    if (!rows.length) { el('dailyChart').innerHTML = '<div class="chart-empty">لا توجد بيانات يومية.</div>'; return; }
    var max = Math.max.apply(null, rows.map(function (row) { return Math.max(number(row.sessions), number(row.referrals)); }).concat([1]));
    el('dailyChart').innerHTML = rows.map(function (row) {
      return '<div class="daily-group" title="زيارات ' + n(row.sessions) + ' · إحالات ' + n(row.referrals) + ' · اتصال ' + n(row.calls) + ' · واتساب ' + n(row.whatsapp) + '">' +
        '<i class="bar-views" style="height:' + Math.max(3, rate(row.sessions, max)) + '%"></i>' +
        '<i class="bar-contacts" style="height:' + Math.max(3, rate(row.referrals, max)) + '%"></i>' +
        '<small>' + esc(String(row.date || '').slice(-2).replace(/^0/, '')) + '</small></div>';
    }).join('');
  }

  function renderSources(data) {
    var rows = data.sources || [];
    if (!rows.length) { el('sourcesList').innerHTML = '<div class="empty-box">لا توجد بيانات مصادر.</div>'; return; }
    var max = Math.max.apply(null, rows.map(function (row) { return number(row.sessions); }).concat([1]));
    el('sourcesList').innerHTML = rows.map(function (row) {
      return '<div class="source-row"><div><strong>' + esc(sourceLabel(row.source)) + '</strong><span>' + n(row.sessions) + ' زيارة · ' + n(row.referrals) + ' إحالة <small>(' + n(row.calls) + ' اتصال + ' + n(row.whatsapp) + ' واتساب)</small></span></div><b>' + pct(row.referralRate) + '</b><div class="source-track"><i style="width:' + Math.max(3, rate(row.sessions, max)) + '%"></i></div></div>';
    }).join('');
    var devices = data.devices || [];
    var total = devices.reduce(function (sum, row) { return sum + number(row.sessions); }, 0);
    var mobile = 0, tablet = 0, desktop = 0;
    devices.forEach(function (row) {
      if (row.device === 'mobile') mobile += number(row.sessions);
      else if (row.device === 'tablet') tablet += number(row.sessions);
      else desktop += number(row.sessions);
    });
    el('deviceDonut').style.setProperty('--mobile', rate(mobile, total));
    el('deviceDonut').style.setProperty('--tablet', rate(tablet, total));
    el('deviceDonut').innerHTML = '<strong>' + n(total) + '</strong><span>جلسة</span>';
    el('devicesList').innerHTML = [
      ['جوال', mobile, 'mobile'], ['تابلت', tablet, 'tablet'], ['كمبيوتر/أخرى', desktop, 'desktop']
    ].map(function (item) { return '<div class="device-row ' + item[2] + '"><i></i><span>' + item[0] + '</span><b>' + n(item[1]) + ' · ' + pct(rate(item[1], total)) + '</b></div>'; }).join('');
  }

  function renderSiteTables(data) {
    var campaigns = data.campaigns || [];
    el('campaignsEmpty').hidden = !!campaigns.length;
    el('campaignsBody').innerHTML = campaigns.map(function (row) {
      return '<tr><td><strong>' + esc(row.campaign) + '</strong></td><td>' + esc(sourceLabel(row.source)) + '</td><td>' + n(row.sessions) + '</td><td>' + n(row.calls) + '</td><td>' + n(row.whatsapp) + '</td><td><strong>' + n(row.referrals) + '</strong></td><td>' + pct(row.referralRate) + '</td></tr>';
    }).join('');
    var pages = data.topPages || [];
    el('pagesBody').innerHTML = pages.length ? pages.map(function (row) {
      var judgement = number(row.sessions) < 10 ? ['عينة صغيرة', 'watch'] : number(row.referralRate) >= 8 ? ['قوي', 'good'] : number(row.referralRate) < 3 ? ['ضعيف', 'weak'] : ['متوسط', 'watch'];
      return '<tr><td><div class="page-cell"><strong>' + esc(cleanPath(row.path) === '/' ? 'الصفحة الرئيسية' : cleanPath(row.path)) + '</strong><small>' + esc(cleanPath(row.path)) + '</small></div></td><td>' + n(row.sessions) + '</td><td>' + n(row.views) + '</td><td>' + n(row.calls) + '</td><td>' + n(row.whatsapp) + '</td><td><strong>' + n(row.referrals) + '</strong></td><td>' + pct(row.referralRate) + '</td><td><span class="judgement ' + judgement[1] + '">' + judgement[0] + '</span></td></tr>';
    }).join('') : '<tr><td colspan="8" class="table-empty">لا توجد بيانات صفحات.</td></tr>';
    var services = data.services || [];
    el('servicesGrid').innerHTML = services.length ? services.map(function (row, index) {
      return '<article class="service-card"><header><h4>' + esc(row.service) + '</h4><span>#' + String(index + 1).padStart(2, '0') + '</span></header><div class="service-stats"><div><span>محاولات</span><strong>' + n(row.attempts) + '</strong></div><div><span>تأكيدات نموذج</span><strong>' + n(row.confirmedForms) + '</strong></div><div><span>اكتمال</span><strong>' + pct(row.completionRate) + '</strong></div></div></article>';
    }).join('') : '<div class="empty-box">لا توجد طلبات نماذج في الفترة؛ الاتصال وواتساب محسوبان كإحالات في القسم الرئيسي.</div>';
  }

  function renderAds(data) {
    var ads = data.googleAds || { connected: false };
    var s = ads.summary || {};
    var currency = ads.currency || 'SAR';
    var fresh = statusFreshness(ads.connected, ads.lastSyncAt);
    el('googleAdsStatus').className = 'ads-status-chip ' + fresh.cls;
    el('googleAdsStatus').innerHTML = '<i></i>' + fresh.label;
    el('googleAdsLastSync').textContent = ads.connected ? 'آخر مزامنة: ' + formatDate(ads.lastSyncAt) : 'لم تصل بيانات من الحساب بعد';
    el('googleAdsSyncFeedback').textContent = ads.connected && fresh.cls === 'is-live' ? 'مزامنة تلقائية كل ساعة · البيانات محدثة' : 'المشغّل التلقائي يعمل كل ساعة';
    el('googleAdsConnectHint').hidden = !!ads.connected;
    if (!ads.connected) {
      el('adsSummaryMetrics').innerHTML = unavailableMetrics(['الميزانية اليومية', 'الصرف', 'النقرات', 'التحويلات', 'مكالمات مقاسة', 'عملاء محتملون', 'عملاء مؤكدون', 'CPA'], 'Google Ads');
      el('budgetPanel').innerHTML = '<div class="empty-box">الميزانية والصرف غير متاحين قبل مزامنة الحساب.</div>';
      el('adsDailyChart').innerHTML = '<div class="chart-empty">المصدر غير متصل.</div>';
      el('adsCampaignsBody').innerHTML = ''; el('adsCampaignsEmpty').hidden = false;
      el('adsConversionActions').innerHTML = '<div class="table-empty">المصدر غير متصل.</div>';
      el('adsConversionGoalHealth').textContent = 'غير متصل';
    } else {
      el('adsSummaryMetrics').innerHTML = [
        metric('الميزانية اليومية', money(s.dailyBudget, currency), 'الميزانية الحالية للحملات المفعلة', 'Google Ads', 'budget'),
        metric('الصرف', money(s.cost, currency), 'الفترة المختارة', 'Google Ads', 'spend'),
        metric('النقرات', n(s.clicks), 'CTR ' + pct(s.ctr), 'Google Ads', ''),
        metric('التحويلات', n(s.conversions, 1), 'Conversion Actions', 'Google Ads', ''),
        metric('مكالمات مقاسة', ads.callReportingConnected ? n(s.trackedCalls) : 'غير متصل', 'مدة وحالة فعلية', 'Call Reporting', ''),
        metric('عملاء محتملون', ads.callReportingConnected ? n(s.potentialCustomers) : 'غير متصل', 'مكالمة مستلمة >60ث', 'Call Reporting', 'potential'),
        metric('عملاء مؤكدون', ads.callReportingConnected ? n(s.confirmedCustomers) : 'غير متصل', '>60ث + تكرار/زيارة', 'تأهيل', 'confirmed'),
        metric('CPA', money(s.cpa, currency), 'تكلفة تحويل Google Ads', 'Google Ads', ''),
        metric('تكلفة إحالة الموقع', number(s.siteReferrals) ? money(s.siteCostPerReferral, currency) : '—', n(s.siteReferrals) + ' إحالة فريدة من الإعلانات', 'First-party', 'referral-cpa')
      ].join('');
      var used = Math.min(100, Math.max(0, number(s.budgetUseRate)));
      el('budgetPanel').innerHTML = '<div class="budget-copy"><div><span class="micro-label">BUDGET CONTROL</span><h3>الصرف مقابل الميزانية المخططة</h3></div><strong>' + pct(s.budgetUseRate) + '</strong></div>' +
        '<div class="budget-track"><i style="width:' + used + '%"></i></div><div class="budget-values"><span>الصرف <b>' + money(s.cost, currency) + '</b></span><span>ميزانية الفترة التقديرية <b>' + money(s.plannedPeriodBudget, currency) + '</b></span><span>الميزانية الكلية المحددة <b>' + money(s.totalBudget, currency) + '</b></span></div><small>ميزانية الفترة = الميزانية اليومية الحالية × عدد أيام العرض؛ قد تختلف عن الميزانيات التاريخية إذا تغيّرت أثناء الفترة.</small>';
      var daily = ads.daily || [];
      var maxCost = Math.max.apply(null, daily.map(function (row) { return number(row.cost); }).concat([1]));
      el('adsDailyChart').innerHTML = daily.length ? daily.map(function (row) {
        return '<div class="ads-day" title="إنفاق ' + money(row.cost, currency) + ' · نقرات ' + n(row.clicks) + '"><i class="cost" style="height:' + Math.max(3, rate(row.cost, maxCost)) + '%"></i><small>' + esc(String(row.date || '').slice(-2)) + '</small></div>';
      }).join('') : '<div class="chart-empty">لا توجد صفوف في الفترة.</div>';
      var campaigns = ads.campaigns || [];
      el('adsCampaignsEmpty').hidden = !!campaigns.length;
      el('adsCampaignsBody').innerHTML = campaigns.map(function (row) {
        return '<tr><td><strong>' + esc(row.name) + '</strong><br><small>' + esc(row.campaignId) + '</small></td><td>' + esc(row.status) + '</td><td>' + money(row.dailyBudget, currency) + '</td><td>' + money(row.cost, currency) + '</td><td>' + n(row.clicks) + '</td><td>' + pct(row.ctr) + '</td><td><strong>' + n(row.siteReferrals) + '</strong><br><small>' + n(row.siteCalls) + ' اتصال · ' + n(row.siteWhatsapp) + ' واتساب</small></td><td>' + n(row.potentialCustomers) + '</td><td>' + n(row.confirmedCustomers) + '</td><td>' + money(row.cpa, currency) + '</td></tr>';
      }).join('');
      var actions = ads.conversionActions || [];
      var leadCategories = ['CONTACT', 'PHONE_CALL_LEAD', 'SUBMIT_LEAD_FORM', 'QUALIFIED_LEAD', 'CONVERTED_LEAD'];
      var enabledLeadActions = actions.filter(function (row) { return row.status === 'ENABLED' && leadCategories.indexOf(row.category) > -1; });
      var primaryLeadActions = enabledLeadActions.filter(function (row) { return row.primaryForGoal && row.includedInConversionsMetric; });
      el('adsConversionGoalHealth').textContent = ads.conversionActionMetadataConnected ?
        n(primaryLeadActions.length) + ' أساسي · ' + n(Math.max(0, enabledLeadActions.length - primaryLeadActions.length)) + ' ثانوي' :
        'تفاصيل الإعداد بانتظار المزامنة';
      el('adsConversionActions').innerHTML = actions.length ? actions.map(function (row) {
        var configured = row.configured === true;
        var primary = configured && row.primaryForGoal && row.includedInConversionsMetric;
        return '<div class="ads-conversion-action"><div class="ads-conversion-copy"><strong>' + esc(row.name) + '</strong><small>' + esc(adsActionCategory(row.category)) + ' · ' + n(row.conversions, 1) + ' تحويل</small></div><div class="ads-conversion-flags">' +
          (configured ? '<span class="conversion-flag ' + (primary ? 'is-primary' : 'is-secondary') + '">' + (primary ? 'أساسي' : 'ثانوي') + '</span><span class="conversion-flag">' + (row.status === 'ENABLED' ? 'فعال' : esc(row.status)) + '</span>' : '<span class="conversion-flag is-pending">بانتظار تفاصيل الإعداد</span>') + '</div></div>';
      }).join('') : '<div class="table-empty">لا توجد Conversion Actions في الفترة.</div>';
    }
    el('adsRecommendations').innerHTML = insights.filter(function (row) { return row.area === 'Google Ads' || row.area === 'الميزانية' || row.area === 'المكالمات'; }).map(function (row) {
      return '<article class="ads-action ' + row.priority + '"><span>' + esc(row.source) + '</span><h4>' + esc(row.title) + '</h4><p>' + esc(row.action) + '</p></article>';
    }).join('') || '<article class="ads-action good"><span>Google Ads</span><h4>لا توجد إشارة حادة</h4><p>استمر في مراقبة التكلفة وجودة العملاء.</p></article>';
  }

  function renderBusinessProfile(data) {
    var bp = data.businessProfile || { connected: false };
    var s = bp.summary || {};
    var fresh = statusFreshness(bp.connected, bp.lastSyncAt);
    el('businessProfileStatus').className = 'ads-status-chip ' + fresh.cls;
    el('businessProfileStatus').innerHTML = '<i></i>' + fresh.label;
    el('businessProfileName').textContent = bp.profileName || 'الملف التجاري';
    el('businessProfileLastSync').textContent = bp.connected ? 'آخر مزامنة: ' + formatDate(bp.lastSyncAt) : 'لم تصل بيانات الملف بعد';
    el('businessProfileConnectHint').hidden = !!bp.connected;
    if (!bp.connected) {
      el('profileSummaryMetrics').innerHTML = unavailableMetrics(['ظهور البحث', 'ظهور الخرائط', 'المكالمات', 'المحادثات', 'زيارات الموقع', 'طلبات الاتجاهات', 'الحجوزات', 'معدل الإجراء'], 'الملف التجاري');
      el('profileDailyChart').innerHTML = '<div class="chart-empty">المصدر غير متصل.</div>';
      el('profileKeywords').innerHTML = '<div class="empty-box">تظهر كلمات البحث بعد الربط.</div>';
      return;
    }
    el('profileSummaryMetrics').innerHTML = [
      metric('ظهور البحث', n(s.searchImpressions), 'Desktop + Mobile', 'Business Profile', ''),
      metric('ظهور الخرائط', n(s.mapsImpressions), 'Desktop + Mobile', 'Business Profile', ''),
      metric('المكالمات', n(s.calls), 'ضغط زر الاتصال في الملف', 'Business Profile', 'calls'),
      metric('المحادثات', n(s.conversations), 'محادثات الملف التجاري', 'Business Profile', 'whatsapp'),
      metric('زيارات الموقع', n(s.websiteClicks), 'ضغط رابط الموقع', 'Business Profile', ''),
      metric('طلبات الاتجاهات', n(s.directions), 'Directions', 'Business Profile', ''),
      metric('الحجوزات', n(s.bookings), 'Reserve with Google', 'Business Profile', ''),
      metric('معدل الإجراء', pct(s.actionRate), 'كل الإجراءات ÷ الظهور', 'محسوب', 'rate')
    ].join('');
    var daily = bp.daily || [];
    var max = Math.max.apply(null, daily.map(function (row) { return Math.max(number(row.searchImpressions) + number(row.mapsImpressions), number(row.calls) + number(row.conversations) + number(row.websiteClicks) + number(row.directions)); }).concat([1]));
    el('profileDailyChart').innerHTML = daily.length ? daily.map(function (row) {
      var impressions = number(row.searchImpressions) + number(row.mapsImpressions);
      var actions = number(row.calls) + number(row.conversations) + number(row.websiteClicks) + number(row.directions);
      return '<div class="profile-day" title="ظهور ' + n(impressions) + ' · إجراءات ' + n(actions) + '"><i style="height:' + Math.max(3, rate(impressions, max)) + '%"></i><i style="height:' + Math.max(3, rate(actions, max)) + '%"></i><small>' + esc(String(row.date || '').slice(-2)) + '</small></div>';
    }).join('') : '<div class="chart-empty">لا توجد بيانات يومية.</div>';
    var keywords = bp.keywords || [];
    el('profileKeywords').innerHTML = keywords.length ? keywords.slice(0, 12).map(function (row, index) {
      var value = row.threshold != null ? 'أقل من ' + n(row.threshold) : n(row.impressions);
      return '<div class="keyword-row"><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + esc(row.keyword) + '</strong><b>' + value + '</b></div>';
    }).join('') : '<div class="empty-box">لا توجد كلمات بحث في الفترة.</div>';
  }

  function renderReferralsAndCalls(data) {
    var referrals = data.recentReferrals || [];
    el('recentLeadsEmpty').hidden = !!referrals.length;
    el('recentLeadsBody').innerHTML = referrals.map(function (row) {
      var channel = row.method === 'call' ? '<span class="channel-tag call">اتصال</span>' : '<span class="channel-tag whatsapp">واتساب</span>';
      return '<tr><td>' + esc(formatDate(row.at)) + '</td><td>' + channel + '</td><td>' + esc(cleanPath(row.sourcePath)) + '</td><td>' + esc(sourceLabel(row.source)) + '</td><td>' + esc(row.campaign) + '</td><td>' + esc(deviceLabel(row.device)) + '</td><td><code>' + esc(row.session) + '</code></td><td><button class="promote-referral" type="button" data-source-type="' + esc(row.method) + '" data-source-ref="' + esc(row.sourceRef || row.session) + '" data-campaign="' + esc(row.campaign || '') + '" data-source-path="' + esc(cleanPath(row.sourcePath)) + '">نقل للمبيعات</button></td></tr>';
    }).join('');
    var ads = data.googleAds || {};
    var calls = ads.calls || [];
    el('callsEmpty').hidden = !!calls.length;
    el('callSourceNote').className = 'call-source-note ' + (ads.callReportingConnected ? 'is-live' : '');
    el('callSourceNote').innerHTML = ads.callReportingConnected ?
      '<strong>المصدر متصل:</strong> المدة والحالة من Google Ads Call Reporting؛ تكرار التواصل وطلب الزيارة يُعتمدان يدويًا.' :
      '<strong>مدة المكالمة غير قابلة للقياس من نقرة tel:</strong> يلزم Call Reporting أو مزود اتصالات. لذلك لا تُعرض قيمة تقديرية.';
    el('callsBody').innerHTML = calls.map(function (row) {
      var classification = row.confirmed ? '<span class="class-tag confirmed">عميل مؤكد</span>' : row.potential ? '<span class="class-tag potential">عميل محتمل</span>' : '<span class="class-tag">إحالة/مكالمة</span>';
      return '<tr data-call="' + esc(row.resourceName) + '"><td>' + esc(formatDate(row.startedAt)) + '</td><td>' + esc(row.campaignName || '—') + '</td><td><strong>' + esc(formatDuration(row.durationSeconds)) + '</strong></td><td>' + esc(row.status) + '</td><td><input class="repeat-input" type="number" min="1" max="20" value="' + number(row.repeatContacts || 1) + '" aria-label="مرات التواصل"></td><td><input class="visit-input" type="checkbox" ' + (row.visitRequested ? 'checked' : '') + ' aria-label="طلب زيارة"></td><td>' + classification + '</td><td><button class="save-call" type="button">حفظ</button></td></tr>';
    }).join('');
  }

  function renderInsights() {
    var labels = { high: 'أولوية عالية', medium: 'تحسين مهم', good: 'فرصة نمو', info: 'متابعة' };
    el('insightsGrid').innerHTML = insights.map(function (row, index) {
      var saved = ((((payload || {}).decisions || {}).entries) || []).find(function (item) { return item.insightKey === row.key; });
      return '<article class="decision-item ' + row.priority + '"><div class="decision-meta"><span>أولوية ' + String(index + 1).padStart(2, '0') + '</span><b>' + labels[row.priority] + ' · ' + esc(row.area) + '</b></div><div class="decision-main"><h3>' + esc(row.title) + '</h3><p>' + esc(row.evidence) + '</p></div><div class="decision-next"><span>المصدر: ' + esc(row.source) + '</span><strong>' + esc(row.action) + '</strong><button type="button" class="insight-adopt" data-insight="' + esc(row.key) + '">' + (saved ? 'فتح الإجراء · ' + decisionStatusLabel(saved.status) : 'اعتماد كإجراء') + '</button></div></article>';
    }).join('');
  }

  function decisionStatusLabel(value) { return { planned:'مخطط',in_progress:'قيد التنفيذ',done:'تم التنفيذ',dismissed:'مستبعد' }[value] || '—'; }
  function renderDecisions(data) {
    var workspace = data.decisions || {}, summary = workspace.summary || {};
    el('decisionMetrics').innerHTML = workspace.connected ? [
      metric('إجراءات مفتوحة',n(summary.active),'مخططة أو قيد التنفيذ · كل التواريخ','التنفيذ',''),
      metric('تجاوزت موعد المراجعة',n(summary.overdue),'إجراءات مفتوحة متأخرة','التنفيذ',''),
      metric('دون مسؤول',n(summary.unassigned),'إجراءات مفتوحة تحتاج توزيعًا','التنفيذ',''),
      metric('تم تنفيذها',n(summary.done),'بنتيجة محفوظة ومراجعة يدوية','التنفيذ','confirmed')
    ].join('') : unavailableMetrics(['إجراءات مفتوحة','تجاوزت موعد المراجعة','دون مسؤول','تم تنفيذها'],'مركز القرارات');
    el('decisionLimit').hidden = !workspace.entriesTruncated;
    var filter = el('decisionFilter').value, query = el('decisionSearch').value.trim().toLowerCase();
    var rows = (workspace.entries || []).filter(function (row) {
      var active = ['planned','in_progress'].includes(row.status);
      var matches = filter === 'all' || filter === row.status || (filter === 'active' && active) || (filter === 'overdue' && active && row.dueAt && new Date(row.dueAt).getTime()<Date.now()) || (filter === 'unassigned' && active && !row.assignee);
      return matches && (!query || [row.title,row.assignee,row.action,row.area].join(' ').toLowerCase().includes(query));
    });
    el('decisionList').innerHTML = rows.length ? rows.map(function (row) {
      var overdue = ['planned','in_progress'].includes(row.status) && row.dueAt && new Date(row.dueAt).getTime()<Date.now();
      return '<article class="execution-card' + (overdue ? ' is-overdue' : '') + '"><div class="execution-heading"><span class="decision-status ' + esc(row.status) + '">' + esc(decisionStatusLabel(row.status)) + '</span><span>' + ({high:'أولوية عالية',medium:'أولوية متوسطة',low:'أولوية منخفضة'}[row.priority] || '') + (overdue ? ' · متأخر' : '') + '</span></div><h4>' + esc(row.title) + '</h4><p>' + esc(row.action) + '</p><dl><div><dt>المسؤول</dt><dd>' + esc(row.assignee || 'غير معين') + '</dd></div><div><dt>موعد المراجعة</dt><dd>' + esc(formatDate(row.dueAt)) + '</dd></div></dl>' + (row.result ? '<p class="execution-result"><strong>النتيجة:</strong> ' + esc(row.result) + '</p>' : '') + '<button type="button" class="decision-open" data-decision="' + esc(row.id) + '">فتح الإجراء وسجله</button></article>';
    }).join('') : '<div class="empty-box">' + (workspace.connected ? 'لا توجد إجراءات مطابقة. اعتمد اقتراحًا أو أضف إجراءً جديدًا.' : 'تعذر تحميل الإجراءات المحفوظة.') + '</div>';
  }

  function buildNotifications(data) {
    var unique = new Set();
    return ((data || {}).entries || []).filter(function (row) {
      if (!row.id || unique.has(row.id) || !row.at || isNaN(new Date(row.at).getTime())) return false;
      unique.add(row.id); return ['referral','sales','decision'].includes(row.kind);
    }).map(function (row) {
      var detail = row.detail || {}, title, text, symbol, action;
      if (row.kind === 'referral') {
        title = detail.method === 'call' ? 'نقرة اتصال من الموقع' : 'نقرة واتساب من الموقع';
        text = sourceLabel(detail.source) + ' · ' + cleanPath(detail.path); symbol = 'message'; action = 'مراجعة الإحالة';
      } else if (row.kind === 'sales') {
        title = detail.eventType === 'created' ? 'أُنشئت فرصة في المبيعات' : 'تغيرت مرحلة فرصة';
        text = opportunityId({id:row.outcomeId}) + ' · ' + (detail.fromStage ? salesStageLabel(detail.fromStage) + ' ← ' : '') + salesStageLabel(detail.toStage);
        symbol = detail.toStage === 'contract_signed' ? 'check' : 'board'; action = 'فتح الفرصة';
      } else {
        title = detail.eventType === 'created' ? 'أُضيف إجراء لخطة التنفيذ' : 'تغيرت حالة إجراء';
        text = (detail.title || 'إجراء محفوظ') + ' · ' + decisionStatusLabel(detail.toStatus); symbol = 'check'; action = 'فتح الإجراء';
      }
      return Object.assign({}, row, {title:title,text:text,icon:symbol,action:action});
    });
  }
  function notificationReadKey() { return NOTIFICATION_KEY + ':' + accountUsername; }
  function readNotificationIds() {
    try { var saved = JSON.parse(localStorage.getItem(notificationReadKey()) || '[]'); return Array.isArray(saved) ? saved.filter(function (id) { return typeof id === 'string'; }).slice(-1000) : []; }
    catch (error) { return []; }
  }
  function markRead(ids) {
    var seen = new Set(readNotificationIds()); ids.forEach(function (id) { seen.add(id); });
    try { localStorage.setItem(notificationReadKey(),JSON.stringify(Array.from(seen).slice(-1000))); }
    catch (error) { showToast('تعذر حفظ حالة القراءة في هذا المتصفح',true); }
    renderNotifications();
  }
  function renderNotifications(feed) {
    if (feed) {
      if (notificationFeed && feed.generatedAt && notificationFeed.generatedAt && new Date(feed.generatedAt)<new Date(notificationFeed.generatedAt)) return;
      var previous = notificationFeed;
      notificationFeed = feed; notificationRows = feed.connected ? buildNotifications(feed) : [];
      if (previous && previous.connected && feed.connected && notificationRows.some(function (row) { return new Date(row.at)>new Date(previous.generatedAt); })) showToast('وصلت أحداث جديدة في سجل اللوحة');
    }
    var seen = readNotificationIds(), connected = !!(notificationFeed || {}).connected;
    var unread = notificationRows.filter(function (row) { return !seen.includes(row.id); }).length;
    el('notificationBadge').hidden = !unread;
    el('notificationBadge').textContent = unread>99 ? '99+' : n(unread);
    el('notificationButton').setAttribute('aria-label','الإشعارات' + (connected ? ' · ' + n(unread) + ' غير مقروءة من الأحداث المعروضة' : ' · تعذر تحميل الأحداث'));
    el('notificationUnreadCount').textContent = n(unread);
    el('markNotificationsRead').disabled = !connected || !unread;
    var rows = notificationRows.filter(function (row) { return !el('notificationUnreadOnly').checked || !seen.includes(row.id); });
    el('notificationList').innerHTML = rows.length ? rows.map(function (row) {
      var isRead = seen.includes(row.id);
      return '<article class="notification-event' + (isRead ? ' is-read' : ' is-unread') + '"><button type="button" class="notification-open" data-event="' + esc(row.id) + '"><span class="notification-event-icon">' + icon(row.icon) + '</span><span class="notification-event-copy"><strong>' + esc(row.title) + '</strong><span>' + esc(row.text) + '</span><time datetime="' + esc(row.at) + '">' + esc(formatDate(row.at)) + '</time><em>' + esc(row.action) + ' ←</em></span></button>' + (!isRead ? '<button class="notification-read" type="button" data-read-event="' + esc(row.id) + '" aria-label="تعليم هذا الحدث كمقروء">' + icon('check') + '</button>' : '') + '</article>';
    }).join('') : '<div class="empty-box">' + (!connected ? 'تعذر تحميل سجل الأحداث الآن.' : el('notificationUnreadOnly').checked ? 'كل الأحداث المعروضة مقروءة.' : 'لا توجد أحداث مسجلة خلال آخر 7 أيام.') + '</div>';
    var alerts = [], live = (notificationFeed || {}).alerts || {}, state = payload || {};
    if (number(live.overdueFollowups)) alerts.push({view:'followups',filter:'overdue',icon:'calendar',title:'متابعات تجاوزت موعدها',text:n(live.overdueFollowups)+' فرصة مفتوحة تحتاج متابعة'});
    if (number(live.unassignedOpportunities)) alerts.push({view:'followups',filter:'unassigned',icon:'user',title:'فرص دون مسؤول',text:n(live.unassignedOpportunities)+' فرصة مفتوحة تحتاج توزيعًا'});
    if (number(live.overdueDecisions)) alerts.push({view:'decisions',filter:'overdue',icon:'clock',title:'إجراءات تجاوزت موعد المراجعة',text:n(live.overdueDecisions)+' إجراء مفتوح'});
    if (payload && !(state.googleAds || {}).connected) alerts.push({view:'google-ads',icon:'megaphone',title:'بيانات Google Ads غير متاحة',text:'راجع اتصال مصدر الإنفاق والحملات'});
    if (payload && !(state.businessProfile || {}).connected) alerts.push({view:'business-profile',icon:'pin',title:'بيانات الملف التجاري غير متاحة',text:'راجع آخر مزامنة للمصدر'});
    if (payload && !(state.dataQuality || {}).reconciled) alerts.push({view:'executive',icon:'chart',title:'فرق في إجماليات الجلسات',text:'راجع مطابقة المصادر والأجهزة'});
    el('notificationAlertCount').textContent = n(alerts.length);
    el('notificationAlertList').innerHTML = alerts.length ? alerts.map(function (row) {
      return '<button type="button" class="notification-alert" data-alert-view="' + row.view + '" data-alert-filter="' + (row.filter || '') + '"><span class="notification-event-icon">' + icon(row.icon) + '</span><span><strong>' + esc(row.title) + '</strong><small>' + esc(row.text) + '</small><em>فتح القسم ←</em></span></button>';
    }).join('') : '<div class="empty-box">' + (connected ? 'لا توجد تنبيهات متابعة في آخر فحص.' : 'تنبيهات المتابعة غير متاحة الآن.') + '</div>';
    el('notificationFeedStatus').textContent = connected ? 'آخر 7 أيام · ' + (notificationFeed.truncated ? 'أحدث 100 من ' + n(notificationFeed.totalAvailable) + ' حدث' : n(notificationRows.length) + ' حدث') + ' · آخر فحص: ' + formatDate(notificationFeed.generatedAt) + '. يتحدث كل دقيقة أثناء استخدام اللوحة. القراءة محفوظة لهذا المتصفح.' : 'لم يُحمّل سجل الأحداث. أعد تحديث البيانات.';
    var overdue = connected ? number(live.overdueFollowups) : number((((payload || {}).salesPipeline || {}).followups || {}).overdue);
    el('navFollowupBadge').hidden = !overdue; el('navFollowupBadge').textContent = n(overdue); el('navFollowupBadge').setAttribute('aria-label',n(overdue)+' متابعة متأخرة');
  }
  async function refreshNotifications() {
    if (!token || document.hidden || notificationPending) return;
    var auth = token, ticket = ++notificationTicket; notificationPending = true;
    try {
      var result = await request({mode:'notification_feed',token:auth});
      if (auth === token && ticket === notificationTicket) renderNotifications(result);
    } catch (error) {
      if (auth !== token || ticket !== notificationTicket) return;
      if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');
      else el('notificationFeedStatus').textContent = 'تعذر الفحص الحالي؛ الأحداث المعروضة من آخر فحص ناجح.';
    } finally { if (ticket === notificationTicket) notificationPending = false; }
  }

  function render(data) {
    payload = data;
    insights = buildInsights(data);
    renderCurrentView(); renderAccount(data.adminProfile);
    renderNotifications(data.notifications || {connected:false,entries:[]});
    el('headerSyncStatus').textContent = 'آخر تحديث ' + (data.generatedAt ? new Intl.DateTimeFormat('ar-SA',{timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(data.generatedAt)) : '—');
  }
  function renderCurrentView() {
    if (!payload) return;
    var data = payload;
    if (activeView === 'executive') { renderExecutive(data); renderSourceQuality(data); }
    else if (activeView === 'followups') renderFollowups(data);
    else if (activeView === 'sales-pipeline') { renderSalesPipeline(data); renderStageBoard(data); }
    else if (activeView === 'commercial') renderCommercial(data);
    else if (activeView === 'funnel') renderFunnel(data);
    else if (activeView === 'trend') renderTrend(data);
    else if (activeView === 'google-ads') renderAds(data);
    else if (activeView === 'business-profile') renderBusinessProfile(data);
    else if (activeView === 'acquisition') renderSources(data);
    else if (activeView === 'performance') renderSiteTables(data);
    else if (activeView === 'leads') renderReferralsAndCalls(data);
    else if (activeView === 'decisions') { renderInsights(); renderDecisions(data); }
  }

  async function request(body) {
    var response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', credentials: 'omit' });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) { var failure = new Error(data.error || 'request_failed'); failure.status = response.status; failure.outcomeId = data.outcomeId; failure.decisionId = data.decisionId; throw failure; }
    return data;
  }
  async function load(options) {
    options = options || {};
    if (!token) return null;
    var auth = token, ticket = ++loadTicket;
    if (!options.background) setLoading(true);
    try {
      var data = await request({ mode: 'admin', token: auth, days: number(el('periodSelect').value) || 30 });
      if (auth !== token || ticket !== loadTicket) return null;
      render(data);
      if (!options.quiet) showToast('تم تحديث البيانات ومطابقة المصادر');
      return data;
    } catch (error) {
      if (auth !== token || ticket !== loadTicket) return null;
      if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');
      else showToast('تعذر تحميل البيانات الآن', true);
      return null;
    } finally { if (ticket === loadTicket) setLoading(false); }
  }
  async function refreshGoogleAds() {
    var button = el('googleAdsSyncButton');
    var before = payload && payload.googleAds ? payload.googleAds.lastSyncAt : null;
    button.textContent = 'جارٍ التحديث…';
    el('googleAdsSyncFeedback').textContent = 'جارٍ طلب أحدث دفعة وصلت من Google Ads…';
    try {
      var data = await load({ quiet: true });
      if (!data) {
        el('googleAdsSyncFeedback').textContent = 'تعذر طلب أحدث بيانات الآن';
        return;
      }
      var ads = data.googleAds || { connected: false };
      var after = ads.lastSyncAt;
      if (!ads.connected) {
        el('googleAdsSyncFeedback').textContent = 'لم تصل بيانات من المشغّل حتى الآن';
        showToast('لم تصل بيانات Google Ads بعد', true);
      } else if (after && (!before || new Date(after).getTime() > new Date(before).getTime())) {
        el('googleAdsSyncFeedback').textContent = 'وصلت دفعة جديدة · المزامنة التلقائية كل ساعة';
        showToast('وصلت مزامنة جديدة من Google Ads', true);
      } else if (statusFreshness(true, after).cls === 'is-live') {
        el('googleAdsSyncFeedback').textContent = 'البيانات محدثة · المزامنة التلقائية كل ساعة';
        showToast('بيانات Google Ads محدثة بالفعل');
      } else {
        el('googleAdsSyncFeedback').textContent = 'لا توجد دفعة جديدة بعد · المشغّل يعمل كل ساعة';
        showToast('لم تصل دفعة جديدة بعد؛ ستُفحص تلقائيًا', true);
      }
    } finally {
      button.textContent = 'تحديث Google Ads';
    }
  }
  async function loginNow(event) {
    event.preventDefault();
    var button = el('loginButton');
    button.disabled = true; button.textContent = 'تحقق…'; el('adminLoginError').textContent = '';
    try {
      var result = await request({ mode: 'admin_login', username: el('adminUsername').value.trim(), password: el('adminPassword').value });
      token = result.token; sessionStorage.setItem(TOKEN_KEY, token);
      renderAccount(result.adminProfile);
      el('adminPassword').value = ''; el('adminLogin').hidden = true; el('adminApp').hidden = false;
      document.body.classList.add('is-authenticated'); await load();
    } catch (error) {
      el('adminLoginError').textContent = error.status === 401 ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'تعذر إنشاء جلسة الإدارة.';
    } finally { button.disabled = false; button.textContent = 'تسجيل الدخول'; }
  }
  function logoutNow(message) {
    sessionStorage.removeItem(TOKEN_KEY); token = ''; payload = null;
    loadTicket++; notificationTicket++; notificationPending = false;
    notificationFeed = null; notificationRows = []; closeHeaderPanels(); closeNavigation();
    if (el('accountDialog').open) el('accountDialog').close();
    resetPipelineForm(); setLoading(false);
    closeDecisionEditor();
    el('adminApp').hidden = true; el('adminLogin').hidden = false; document.body.classList.remove('is-authenticated');
    el('adminLoginError').textContent = message || '';
    el('adminUsername').focus();
  }
  async function saveCall(button) {
    var row = button.closest('tr[data-call]');
    if (!row) return;
    button.disabled = true; button.textContent = 'حفظ…';
    try {
      await request({ mode: 'call_qualification_update', token: token, resourceName: row.getAttribute('data-call'), repeatContacts: number(row.querySelector('.repeat-input').value) || 1, visitRequested: row.querySelector('.visit-input').checked });
      showToast('تم حفظ تأهيل المكالمة'); await load();
    } catch (error) { showToast('تعذر حفظ التأهيل', true); }
    finally { button.disabled = false; button.textContent = 'حفظ'; }
  }
  function resetPipelineForm() {
    editRequest++;
    el('pipelineForm').reset();
    el('pipelineId').value = '';
    el('pipelineEstimatedValue').value = '0';
    el('pipelineContractValue').value = '0';
    delete el('pipelineForm').dataset.sourceRef;
    delete el('pipelineForm').dataset.updatedAt;
    el('pipelineSourceType').disabled = false;
    el('pipelineCampaign').readOnly = false;
    el('pipelineSourceBinding').textContent = 'فرصة يدوية · المصدر غير مرتبط بإحالة مقاسة';
    el('pipelineHistory').hidden = true;
    el('pipelineError').textContent = '';
    el('pipelineReloadButton').hidden = true;
    el('pipelineSaveButton').textContent = 'حفظ في مسار البيع';
    el('pipelineCancelButton').hidden = true;
    el('opportunity-editor').hidden = true;
    updatePipelineRules();
  }
  function updatePipelineRules() {
    var stage = el('pipelineStage').value;
    var qualified = ['qualified','quote_sent','site_visit','contract_signed'].includes(stage);
    var terminal = ['contract_signed','lost'].includes(stage);
    ['pipelineAssignee','pipelineNextAction','pipelineFollowupAt'].forEach(function (id) {
      el(id).required = qualified && !terminal;
      el(id).disabled = terminal;
    });
    el('pipelineServiceType').required = qualified;
    el('pipelineLastContactAt').required = qualified || el('pipelineContactResult').value === 'contacted';
    el('pipelineLastContactAt').max = riyadhInput(new Date().toISOString());
    el('pipelineLostReasonLabel').hidden = stage !== 'lost';
    el('pipelineLostReason').required = stage === 'lost';
    el('pipelineContractValue').min = stage === 'contract_signed' ? '0.01' : '0';
  }
  function fillPipelineForm(row) {
    editRequest++;
    el('pipelineId').value = row.id || '';
    el('pipelineSourceType').value = row.sourceType || 'whatsapp';
    el('pipelineStage').value = row.stage || 'new';
    el('pipelineServiceType').value = row.serviceType || '';
    el('pipelineCampaign').value = row.campaignName || '';
    el('pipelineEstimatedValue').value = number(row.estimatedValue);
    el('pipelineContractValue').value = number(row.contractValue);
    el('pipelineNotes').value = row.notes || '';
    el('pipelineLocation').value = row.projectLocation || '';
    el('pipelineTiming').value = row.executionTiming || 'unknown';
    el('pipelineFit').value = row.serviceFit || 'unknown';
    el('pipelineContactResult').value = row.contactResult || 'not_contacted';
    el('pipelineAssignee').value = row.assignee || '';
    el('pipelineNextAction').value = row.nextAction || '';
    el('pipelineFollowupAt').value = riyadhInput(row.nextFollowUpAt);
    el('pipelineLastContactAt').value = riyadhInput(row.lastContactAt);
    el('pipelineLostReason').value = row.lostReason || '';
    el('pipelineError').textContent = '';
    el('pipelineHistory').hidden = true;
    el('pipelineReloadButton').hidden = true;
    if (row.updatedAt) el('pipelineForm').dataset.updatedAt = row.updatedAt;
    else delete el('pipelineForm').dataset.updatedAt;
    var bound = !!row.sourceEventId || (!!row.sourceRef && !row.id);
    el('pipelineSourceType').disabled = bound;
    el('pipelineCampaign').readOnly = bound;
    el('pipelineSourceBinding').textContent = row.sourceRef ? 'إحالة ' + row.sourceRef + ' · ' + sourceLabel(row.acquisitionSource || 'يُتحقق من المصدر عند الحفظ') + (row.landingPath ? ' · صفحة الدخول: ' + cleanPath(row.landingPath) : '') : 'فرصة يدوية · المصدر غير مرتبط بإحالة مقاسة';
    if (row.sourceRef) el('pipelineForm').dataset.sourceRef = row.sourceRef;
    else delete el('pipelineForm').dataset.sourceRef;
    el('pipelineSaveButton').textContent = row.id ? 'حفظ التعديل' : 'حفظ في مسار البيع';
    el('pipelineCancelButton').hidden = false;
    el('opportunity-editor').hidden = false;
    updatePipelineRules();
    navigateTo('opportunity-editor');
    el('pipelineStage').focus({preventScroll:true});
  }
  function renderPipelineHistory(history, truncated) {
    var labels = { stage: 'المرحلة', assignee: 'المسؤول', next_follow_up_at: 'موعد المتابعة', next_action: 'الإجراء القادم', last_contact_at: 'آخر تواصل', service_type: 'الخدمة', project_location: 'المنطقة', execution_timing: 'توقيت التنفيذ', service_fit: 'الملاءمة', contact_result: 'نتيجة التواصل', lost_reason: 'سبب الفقد', estimated_value: 'القيمة المتوقعة', contract_value: 'قيمة العقد', notes: 'الملاحظة', campaign_name: 'الحملة' };
    el('pipelineHistory').hidden = false;
    el('pipelineHistoryList').innerHTML = history.length ? history.map(function (item) {
      var title = item.event_type === 'created' ? 'إنشاء الفرصة' : item.event_type === 'stage_changed' ? salesStageLabel(item.from_stage) + ' ← ' + salesStageLabel(item.to_stage) : 'تحديث بيانات الفرصة';
      var fields = Object.keys(item.changes || {}).map(function (key) { return labels[key] || key; }).join('، ');
      var change = item.changes || {};
      var detail = ['assignee','next_action','next_follow_up_at','lost_reason'].filter(function (key) { return change[key]; }).map(function (key) {
        var value = change[key].to;
        return labels[key] + ': ' + (key === 'next_follow_up_at' ? formatDate(value) : key === 'lost_reason' ? lostReasonLabel(value) : value || 'أُزيل');
      }).join(' · ');
      return '<li><time>' + esc(formatDate(item.occurred_at)) + '</time><strong>' + esc(title) + '</strong><span>' + esc(fields) + '</span>' + (detail ? '<p>' + esc(detail) + '</p>' : '') + '</li>';
    }).join('') + (truncated ? '<li>يعرض السجل أحدث 100 تغيير.</li>' : '') : '<li>لا توجد تغييرات مسجلة منذ تفعيل نظام المتابعة.</li>';
  }
  async function openOpportunity(id, sourceRef, fallback) {
    var ticket = ++editRequest;
    try {
      var result = await request({ mode: 'sales_outcome_get', token: token, id: id || null, sourceRef: sourceRef || null });
      if (ticket !== editRequest) return;
      if (result.outcome) { fillPipelineForm(result.outcome); renderPipelineHistory(result.history || [], result.historyTruncated); }
      else if (fallback) fillPipelineForm(fallback);
      else showToast('لم تعد الفرصة متاحة', true);
    } catch (error) { if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.'); else showToast('تعذر فتح الفرصة وسجلها', true); }
  }
  async function savePipeline(event) {
    event.preventDefault();
    var button = el('pipelineSaveButton');
    var stage = el('pipelineStage').value;
    el('pipelineError').textContent = '';
    if (['qualified','quote_sent','site_visit','contract_signed'].includes(stage) && (el('pipelineFit').value !== 'suitable' || el('pipelineContactResult').value !== 'contacted')) {
      el('pipelineError').textContent = 'راجع التواصل واختر خدمة مناسبة قبل اعتماد التأهيل.'; return;
    }
    var queuedForSheets = el('pipelineSourceType').value === 'whatsapp' && ['qualified', 'quote_sent', 'site_visit', 'contract_signed'].indexOf(stage) !== -1;
    button.disabled = true; button.textContent = 'حفظ…';
    try {
      await request({
        mode: 'sales_outcome_upsert', token: token, id: el('pipelineId').value || null,
        sourceRef: el('pipelineForm').dataset.sourceRef || null,
        sourceType: el('pipelineSourceType').value, stage: stage,
        serviceType: el('pipelineServiceType').value.trim(), campaignName: el('pipelineCampaign').value.trim(),
        estimatedValue: number(el('pipelineEstimatedValue').value), contractValue: number(el('pipelineContractValue').value),
        notes: el('pipelineNotes').value.trim(),
        expectedUpdatedAt: el('pipelineForm').dataset.updatedAt || null,
        assignee: el('pipelineAssignee').value.trim(), nextAction: el('pipelineNextAction').value.trim(),
        nextFollowUpAt: inputTimestamp(el('pipelineFollowupAt').value), lastContactAt: inputTimestamp(el('pipelineLastContactAt').value),
        projectLocation: el('pipelineLocation').value.trim(), executionTiming: el('pipelineTiming').value,
        serviceFit: el('pipelineFit').value, contactResult: el('pipelineContactResult').value, lostReason: el('pipelineLostReason').value || null
      });
      showToast(queuedForSheets ? 'تم الحفظ وإضافة العميل إلى طابور Google Sheets' : 'تم حفظ مرحلة البيع وربطها بالإحصائيات', true);
      resetPipelineForm(); await load();
    } catch (error) {
      var messages = { qualification_required: 'حدد الخدمة المناسبة ونتيجة التواصل الفعلي قبل التأهيل.', followup_required: 'حدد المسؤول والإجراء وموعد المتابعة للفرصة المؤهلة.', lost_reason_required: 'حدد سبب عدم التعاقد.', lost_details_required: 'وضح السبب الآخر في الملاحظة التشغيلية.', contract_value_required: 'أدخل قيمة العقد الموقّع.', invalid_followup_date: 'راجع المواعيد؛ آخر تواصل فعلي لا يمكن أن يكون في المستقبل.', invalid_sales_value: 'راجع قيم الفرصة والعقد.', sales_outcome_conflict: 'تغيّرت هذه الفرصة من جلسة أخرى. حمّل النسخة الأحدث ثم راجع تعديلاتك.', referral_already_linked: 'هذه الإحالة مرتبطة بفرصة بالفعل. افتح الفرصة الموجودة.', source_is_locked: 'المصدر الأصلي للإحالة محفوظ ولا يمكن تغييره.', sales_outcome_not_found: 'الفرصة لم تعد متاحة.' };
      el('pipelineError').textContent = messages[error.message] || 'تعذر الحفظ الآن. البيانات التي أدخلتها محفوظة في النموذج؛ أعد المحاولة.';
      if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');
      if (error.message === 'sales_outcome_conflict' || error.message === 'referral_already_linked') {
        el('pipelineReloadButton').hidden = false;
        el('pipelineReloadButton').dataset.outcomeId = error.outcomeId || el('pipelineId').value;
      }
      showToast('لم يُحفظ التعديل؛ راجع رسالة النموذج', true);
    }
    finally { button.disabled = false; button.textContent = el('pipelineId').value ? 'حفظ التعديل' : 'حفظ في مسار البيع'; }
  }
  function updateDecisionRules() {
    var status = el('decisionStatus').value;
    el('decisionAssignee').required = status === 'in_progress' || status === 'done';
    el('decisionDueAt').required = status === 'in_progress';
    el('decisionResult').required = status === 'done' || status === 'dismissed';
  }
  function closeDecisionEditor() {
    decisionEditRequest++; decisionDraft = null;
    el('decisionEditor').hidden = true; el('decisionForm').reset(); el('decisionId').value = '';
    el('decisionHistory').hidden = true; el('decisionError').textContent = '';
  }
  function fillDecisionForm(row) {
    decisionEditRequest++; decisionDraft = Object.assign({}, row);
    el('decisionForm').reset();
    el('decisionId').value = row.id || '';
    el('decisionTitle').value = row.title || '';
    el('decisionAction').value = row.action || '';
    el('decisionPriority').value = row.priority || 'medium';
    el('decisionStatus').value = row.status || 'planned';
    el('decisionAssignee').value = row.assignee || '';
    el('decisionDueAt').value = riyadhInput(row.dueAt);
    el('decisionResult').value = row.result || '';
    el('decisionEditorTitle').textContent = row.id ? 'تحديث الإجراء ونتيجته' : 'اعتماد إجراء جديد';
    el('decisionEvidence').innerHTML = row.evidence ? '<span>دليل محفوظ · ' + esc(row.source || 'مراجعة داخلية') + (row.periodDays ? ' · فترة ' + n(row.periodDays) + ' يوم' : '') + '</span><p>' + esc(row.evidence) + '</p>' + (row.observedAt ? '<time>حُفظ في: ' + esc(formatDate(row.observedAt)) + '</time>' : '<small>ستُحفظ هذه النسخة من الدليل عند إنشاء الإجراء.</small>') : '<span>إجراء تشغيلي يضيفه الفريق يدويًا.</span>';
    el('decisionError').textContent = ''; el('decisionReloadButton').hidden = true;
    el('decisionHistory').hidden = true; el('decisionEditor').hidden = false;
    updateDecisionRules(); navigateTo('decisionEditor'); el('decisionTitle').focus({ preventScroll:true });
  }
  function renderDecisionHistory(history, truncated) {
    var fields = {title:'العنوان',action:'الإجراء',priority:'الأولوية',status:'الحالة',assignee:'المسؤول',due_at:'الموعد',result:'النتيجة'};
    el('decisionHistory').hidden = false;
    el('decisionHistoryList').innerHTML = history.length ? history.map(function (row) {
      var title = row.event_type === 'created' ? 'إنشاء الإجراء' : row.event_type === 'status_changed' ? decisionStatusLabel(row.from_status) + ' ← ' + decisionStatusLabel(row.to_status) : 'تحديث الإجراء';
      var changes = row.changes || {};
      var detail = Object.keys(changes).map(function (key) { var value = changes[key].to;
        if (key === 'status') value = decisionStatusLabel(value);
        else if (key === 'due_at') value = formatDate(value);
        else if (key === 'priority') value = {high:'عالية',medium:'متوسطة',low:'منخفضة'}[value] || value;
        return (fields[key] || key) + ': ' + (value || 'أُزيل');
      }).join(' · ');
      return '<li><time>' + esc(formatDate(row.occurred_at)) + '</time><strong>' + esc(title) + '</strong><p>' + esc(detail) + '</p></li>';
    }).join('') + (truncated ? '<li>يعرض السجل أحدث 100 تغيير.</li>' : '') : '<li>لا توجد تغييرات مسجلة.</li>';
  }
  async function openDecision(id, insightKey, fallback) {
    var ticket = ++decisionEditRequest;
    try {
      var data = await request({mode:'decision_get',token:token,id:id || null,insightKey:insightKey || null});
      if (ticket !== decisionEditRequest) return;
      if (data.decision) { fillDecisionForm(data.decision); renderDecisionHistory(data.history || [], data.historyTruncated); }
      else if (fallback) fillDecisionForm(fallback);
      else showToast('الإجراء غير متاح الآن',true);
    } catch (error) {
      if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');
      else showToast('تعذر فتح الإجراء وسجله',true);
    }
  }
  async function saveDecisionForm(event) {
    event.preventDefault(); if (!decisionDraft) return;
    var ticket = decisionEditRequest;
    var button = el('decisionSaveButton'); button.disabled = true; button.textContent = 'حفظ…';
    el('decisionError').textContent = '';
    try {
      var saved = await request({mode:'decision_upsert',token:token,id:el('decisionId').value || null,
        insightKey:decisionDraft.insightKey || null,expectedUpdatedAt:decisionDraft.updatedAt || null,
        evidence:decisionDraft.evidence || null,source:decisionDraft.source || null,area:decisionDraft.area || null,periodDays:decisionDraft.periodDays || null,
        title:el('decisionTitle').value.trim(),action:el('decisionAction').value.trim(),priority:el('decisionPriority').value,
        status:el('decisionStatus').value,assignee:el('decisionAssignee').value.trim(),dueAt:inputTimestamp(el('decisionDueAt').value),result:el('decisionResult').value.trim()});
      showToast('تم حفظ الإجراء ونتيجته');
      if (ticket === decisionEditRequest) { fillDecisionForm(saved.decision); ticket = decisionEditRequest; }
      await load({quiet:true}); if (ticket === decisionEditRequest) await openDecision(saved.decision.id);
    } catch (error) {
      if (ticket !== decisionEditRequest) return;
      var messages = {invalid_decision:'راجع عنوان الإجراء وخطوات التنفيذ.',decision_owner_date_required:'بدء التنفيذ يحتاج مسؤولًا وموعد مراجعة.',decision_owner_required:'حدد المسؤول عن الإجراء قبل اعتماد التنفيذ.',decision_result_required:'سجّل نتيجة التنفيذ أو سبب الاستبعاد قبل الإغلاق.',invalid_decision_date:'راجع موعد المراجعة.',decision_conflict:'تغير الإجراء في جلسة أخرى. مدخلاتك باقية؛ حمّل النسخة الأحدث ثم راجعها.',decision_already_saved:'هذا الاقتراح له إجراء محفوظ. افتح النسخة الحالية لمتابعتها.'};
      el('decisionError').textContent = messages[error.message] || 'تعذر حفظ الإجراء الآن؛ مدخلاتك باقية في النموذج.';
      if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');
      if (error.message === 'decision_conflict' || error.message === 'decision_already_saved') {
        el('decisionReloadButton').hidden = false; el('decisionReloadButton').dataset.decisionId = error.decisionId || el('decisionId').value;
      }
    } finally { button.disabled = false; button.textContent = 'حفظ الإجراء'; }
  }
  function downloadCsv(rows, filename) {
    var csv = rows.map(function (row) { return row.map(function (value) {
      var cell = String(value == null ? '' : value); if (/^[\s]*[=+\-@]/.test(cell)) cell = "'" + cell;
      return '"' + cell.replace(/"/g, '""') + '"';
    }).join(','); }).join('\r\n');
    var link = document.createElement('a'), url = URL.createObjectURL(new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'}));
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); },1000);
  }
  function exportCommercial() {
    var commercial = (payload || {}).commercial || {}; if (!commercial.connected) return;
    var campaign = el('commercialGroup').value === 'campaign';
    var rows = [['مصدر إحالة التواصل','الحملة','فرص الفترة','سبق تأهيلها','مفتوحة','عقود حالية','لم يتم التعاقد','عقود ÷ فرص %','قيمة العقود الحالية SAR','القيمة المفتوحة التقديرية SAR','بداية الفترة ISO','نهاية الفترة ISO']].concat(commercialGroups().map(function (row) {
      return [sourceLabel(row.source_key),campaign ? row.campaign : '',row.opportunities,row.qualified,row.open,row.contracts,row.lost,rate(row.contracts,row.opportunities).toFixed(2),row.contract_value,row.open_value,commercial.startAt,commercial.endAt];
    }));
    downloadCsv(rows,'tawod-commercial-' + (campaign ? 'campaigns-' : 'sources-') + riyadhInput(payload.generatedAt || new Date().toISOString()).slice(0,10) + '.csv');
    showToast(campaign && commercial.campaignsTruncated ? 'تم تصدير أكبر 100 مجموعة حملة فقط' : 'تم تصدير نتائج المجموعة الحالية');
  }
  function exportPipeline() {
    if (!payload || !(payload.salesPipeline || {}).connected) return;
    var sales = payload.salesPipeline;
    var entries = (sales.entries || []).filter(function (row) { return !row.isTest && (el('pipelineStageFilter').value === 'all' || el('pipelineStageFilter').value === row.stage); });
    var rows = [['معرف العرض','معرف الفرصة الكامل','تاريخ الإحالة','القناة','المصدر','الحملة','الخدمة','المنطقة','المرحلة','المسؤول','المتابعة القادمة (ISO)','آخر تواصل فعلي (ISO)','قيمة متوقعة SAR','قيمة العقد SAR','سبب عدم التعاقد','مرجع الإحالة']].concat(entries.map(function (row) {
      return [opportunityId(row),row.id,row.occurredAt,salesSourceLabel(row.sourceType),sourceLabel(row.acquisitionSource || 'غير مرتبط'),row.campaignName,row.serviceType,row.projectLocation,salesStageLabel(row.stage),row.assignee,row.nextFollowUpAt,row.lastContactAt,row.estimatedValue,row.contractValue,row.lostReason ? lostReasonLabel(row.lostReason) : '',row.sourceRef];
    }));
    downloadCsv(rows,'tawod-opportunities-' + riyadhInput(payload.generatedAt || new Date().toISOString()).slice(0,10) + '.csv');
    showToast(sales.entriesTruncated ? 'تم تصدير الفرص المعروضة فقط (حد العرض 500)' : 'تم تصدير الفرص الفعلية في العرض الحالي');
  }
  function copySummary() {
    if (!payload) return;
    var s = payload.summary || {};
    var a = (payload.googleAds || {}).summary || {};
    var lines = [
      'ملخص مركز قيادة تعاود — ' + n(payload.periodDays) + ' يوم',
      'الزيارات: ' + n(s.sessions),
      'الإحالات الناجحة: ' + n(s.referralSessions),
      'إحالات الاتصال: ' + n(s.callReferralSessions),
      'إحالات واتساب: ' + n(s.whatsappReferralSessions),
      'معدل الإحالة: ' + pct(s.referralRate),
      'ضغطات خام: ' + n(number(s.callClicks) + number(s.whatsappClicks)),
      'العميل المحتمل: ' + ((payload.googleAds || {}).callReportingConnected ? n(a.potentialCustomers) : 'المصدر غير متصل'),
      'العميل المؤكد: ' + ((payload.googleAds || {}).callReportingConnected ? n(a.confirmedCustomers) : 'المصدر غير متصل'),
      'عقود فرص فترة الإحالة (حالتها الحالية): ' + ((payload.salesPipeline || {}).connected ? n(((payload.salesPipeline || {}).summary || {}).contracts) : 'المصدر غير متصل'),
      'قيمة عقود هذه الفرص: ' + ((payload.salesPipeline || {}).connected ? money(((payload.salesPipeline || {}).summary || {}).contractValue, 'SAR') : 'المصدر غير متصل'),
      'عقود اعتُمدت خلال الفترة (أي تاريخ إحالة): ' + ((payload.commercial || {}).connected ? n(((payload.commercial || {}).activity || {}).contracts) : 'المصدر غير متصل'),
      'قيمة هذه العقود المسجلة حاليًا: ' + ((payload.commercial || {}).connected ? money(((payload.commercial || {}).activity || {}).contractValue,'SAR') : 'المصدر غير متصل'),
      'إجراءات تحسين مفتوحة: ' + ((payload.decisions || {}).connected ? n(((payload.decisions || {}).summary || {}).active) : 'المصدر غير متصل'),
      'متابعات متأخرة (كل التواريخ): ' + n(((payload.salesPipeline || {}).followups || {}).overdue),
      'فرص دون مسؤول: ' + n(((payload.salesPipeline || {}).followups || {}).unassigned),
      'مطابقة إجماليات الجلسات: ' + ((payload.dataQuality || {}).reconciled ? 'سليمة حسابيًا؛ لا تعني اكتمال الإسناد' : 'تحتاج مراجعة')
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(function () { showToast('تم نسخ الملخص'); }).catch(function () { showToast('تعذر النسخ'); });
  }
  function viewFor(id) {
    var target = el(id), section = target && target.closest('.admin-section');
    return section || el('executive');
  }
  function activateView(id, move) {
    var section = viewFor(id), target = el(id), previous = activeView;
    activeView = section.id;
    document.querySelectorAll('.admin-section').forEach(function (item) { item.hidden = item !== section; });
    el('adminNav').querySelectorAll('a').forEach(function (link) {
      var selected = link.hash === '#' + activeView;
      link.classList.toggle('is-active',selected);
      if (selected) {
        link.setAttribute('aria-current','page');
        var title = link.cloneNode(true); title.querySelectorAll('svg,b').forEach(function (node) { node.remove(); });
        el('viewTitle').textContent = title.textContent.trim();
        el('viewGroup').textContent = link.closest('.nav-group').querySelector('span').textContent;
      } else link.removeAttribute('aria-current');
    });
    var quick = ['executive','followups','sales-pipeline'];
    el('mobileBottomNav').querySelectorAll('a').forEach(function (link) {
      var selected = link.hash === '#' + activeView;
      link.classList.toggle('is-active',selected);
      if (selected) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    el('mobileMoreButton').classList.toggle('is-active',!quick.includes(activeView));
    document.title = el('viewTitle').textContent + ' | لوحة تعاود';
    if (previous !== activeView || !section.dataset.rendered) { renderCurrentView(); section.dataset.rendered = payload ? 'true' : ''; }
    if (id === 'opportunity-editor') { target.hidden = false; el('pipelineCancelButton').hidden = false; }
    if (move) {
      if (target && target !== section && !target.hidden) target.scrollIntoView({block:'start',behavior:'instant'});
      else {
        window.scrollTo({top:0,behavior:'instant'});
        var heading = section.querySelector('h2');
        if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
      }
    }
  }
  function navigateTo(id) {
    closeHeaderPanels(); closeNavigation(false);
    if (location.hash !== '#' + id) history.pushState(null,'','#' + id);
    activateView(id,true);
  }
  function openNavigation(trigger) {
    if (!window.matchMedia('(max-width:900px)').matches) return;
    closeHeaderPanels(); navTrigger = trigger || el('navigationButton');
    el('adminSidebar').classList.add('nav-open'); el('navBackdrop').hidden = false;
    el('adminSidebar').setAttribute('role','dialog'); el('adminSidebar').setAttribute('aria-modal','true');
    el('adminWorkspace').inert = true; el('mobileBottomNav').inert = true;
    document.body.classList.add('drawer-open');
    ['navigationButton','mobileMoreButton'].forEach(function (id) { el(id).setAttribute('aria-expanded','true'); });
    el('closeNavigation').focus();
  }
  function closeNavigation(restore) {
    var wasOpen = el('adminSidebar').classList.contains('nav-open');
    el('adminSidebar').classList.remove('nav-open'); el('navBackdrop').hidden = true;
    el('adminSidebar').removeAttribute('role'); el('adminSidebar').removeAttribute('aria-modal');
    el('adminWorkspace').inert = false; el('mobileBottomNav').inert = false;
    document.body.classList.remove('drawer-open');
    ['navigationButton','mobileMoreButton'].forEach(function (id) { el(id).setAttribute('aria-expanded','false'); });
    if (wasOpen && restore !== false && navTrigger) navTrigger.focus();
    navTrigger = null;
  }
  function closeHeaderPanels(restore) {
    [['notificationDrawer','notificationButton'],['accountMenu','accountButton'],['toolsMenu','toolsButton']].forEach(function (pair) {
      var open = !el(pair[0]).hidden; el(pair[0]).hidden = true; el(pair[1]).setAttribute('aria-expanded','false');
      if (restore && open) el(pair[1]).focus();
    });
  }
  function toggleHeaderPanel(panel,button) {
    var open = !el(panel).hidden; closeHeaderPanels();
    if (!open) { el(panel).hidden = false; el(button).setAttribute('aria-expanded','true'); }
    if (panel === 'notificationDrawer' && !open) refreshNotifications();
  }
  function profileKey() { return PROFILE_KEY + ':' + accountUsername; }
  function validPhoto(photo) { return typeof photo === 'string' && photo.length < 300000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo); }
  function readProfile() {
    try {
      var profile = JSON.parse(localStorage.getItem(profileKey()) || '{}');
      return {name:typeof profile.name === 'string' ? profile.name.slice(0,80) : '',photo:validPhoto(profile.photo) ? profile.photo : null};
    } catch (error) { return {name:'',photo:null}; }
  }
  function avatarMarkup(photo) { return validPhoto(photo) ? '<img src="' + esc(photo) + '" alt="صورة الحساب">' : icon('user'); }
  function renderAccount(account) {
    if (account && account.username) accountUsername = String(account.username);
    var profile = readProfile(), name = profile.name || 'حساب الإدارة';
    el('accountDisplayName').textContent = name; el('accountMenuName').textContent = name;
    el('accountUsername').textContent = accountUsername;
    el('accountAvatar').innerHTML = avatarMarkup(profile.photo); el('accountMenuAvatar').innerHTML = avatarMarkup(profile.photo);
    el('accountButton').setAttribute('aria-label','فتح قائمة الحساب · ' + name);
  }
  function openProfile() {
    closeHeaderPanels(); var profile = readProfile(); profilePhotoTicket++;
    profilePhotoDraft = profile.photo; el('profilePhotoPreview').innerHTML = avatarMarkup(profilePhotoDraft);
    el('profileDisplayName').value = profile.name; el('profilePhotoInput').value = '';
    el('profilePhotoError').textContent = ''; el('saveAccountProfile').disabled = false;
    el('accountDialog').showModal(); el('profileDisplayName').focus();
  }
  async function prepareProfilePhoto() {
    var file = el('profilePhotoInput').files[0], ticket = ++profilePhotoTicket;
    if (!file) return;
    el('profilePhotoError').textContent = ''; el('saveAccountProfile').disabled = false;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>3*1024*1024) {
      el('profilePhotoError').textContent = 'اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 3 ميجابايت.'; return;
    }
    var url = URL.createObjectURL(file), image = new Image(); el('saveAccountProfile').disabled = true;
    try {
      await new Promise(function (resolve,reject) { image.onload=resolve; image.onerror=reject; image.src=url; });
      if (ticket !== profilePhotoTicket || !el('accountDialog').open) return;
      if (!image.width || !image.height || image.width>4096 || image.height>4096 || image.width*image.height>16000000) throw new Error('dimensions');
      var canvas=document.createElement('canvas'), side=Math.min(image.width,image.height); canvas.width=384; canvas.height=384;
      canvas.getContext('2d').drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,384,384);
      var photo=canvas.toDataURL('image/webp',0.82); if (!validPhoto(photo)) throw new Error('size');
      profilePhotoDraft=photo; el('profilePhotoPreview').innerHTML=avatarMarkup(photo);
    } catch (error) { if (ticket === profilePhotoTicket) el('profilePhotoError').textContent='تعذر قراءة الصورة. جرّب صورة أصغر بأبعاد لا تتجاوز 4096 بكسل.'; }
    finally { URL.revokeObjectURL(url); if (ticket === profilePhotoTicket) el('saveAccountProfile').disabled=false; }
  }
  function initNavigation() {
    document.querySelectorAll('[data-icon]').forEach(function (node) { node.insertAdjacentHTML('afterbegin',icon(node.dataset.icon)); });
    activateView(location.hash.slice(1) || 'executive',false);
    document.addEventListener('click',function (event) {
      var link=event.target.closest('a[href^="#"]');
      if (link && el(link.hash.slice(1)) && el(link.hash.slice(1)).closest('.admin-section')) { event.preventDefault(); navigateTo(link.hash.slice(1)); return; }
      var insidePanel=event.composedPath().some(function (node) { return node instanceof Element && node.matches('.header-menu,.notification-drawer,#notificationButton,#accountButton,#toolsButton'); });
      if (!insidePanel) closeHeaderPanels();
    });
    window.addEventListener('popstate',function () { closeHeaderPanels(); closeNavigation(false); activateView(location.hash.slice(1) || 'executive',true); });
    window.addEventListener('hashchange',function () { activateView(location.hash.slice(1) || 'executive',true); });
    el('navigationButton').addEventListener('click',function () { openNavigation(this); });
    el('mobileMoreButton').addEventListener('click',function () { openNavigation(this); });
    el('closeNavigation').addEventListener('click',function () { closeNavigation(); });
    el('navBackdrop').addEventListener('click',function () { closeNavigation(); });
    window.matchMedia('(max-width:900px)').addEventListener('change',function () { closeNavigation(false); });
    document.addEventListener('keydown',function (event) {
      if (el('adminSidebar').classList.contains('nav-open')) {
        if (event.key === 'Escape') { event.preventDefault(); closeNavigation(); }
        if (event.key === 'Tab') {
          var nodes=Array.from(el('adminSidebar').querySelectorAll('a[href],button')).filter(function (node) { return node.getClientRects().length && !node.disabled; });
          var first=nodes[0],last=nodes[nodes.length-1];
          if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
        }
      } else if (event.key === 'Escape' && !el('accountDialog').open) closeHeaderPanels(true);
    });
    el('notificationButton').addEventListener('click',function () { toggleHeaderPanel('notificationDrawer','notificationButton'); });
    el('accountButton').addEventListener('click',function () { toggleHeaderPanel('accountMenu','accountButton'); });
    el('toolsButton').addEventListener('click',function () { toggleHeaderPanel('toolsMenu','toolsButton'); });
    el('closeNotifications').addEventListener('click',function () { closeHeaderPanels(true); });
    [['notificationEventsTab','notificationEventPanel'],['notificationAlertsTab','notificationAlertPanel']].forEach(function (tab) {
      el(tab[0]).addEventListener('click',function () {
        ['notificationEventsTab','notificationAlertsTab'].forEach(function (id) { el(id).classList.toggle('is-active',id===tab[0]); el(id).setAttribute('aria-pressed',String(id===tab[0])); });
        el('notificationEventPanel').hidden=tab[1]!=='notificationEventPanel'; el('notificationAlertPanel').hidden=tab[1]!=='notificationAlertPanel';
      });
    });
    el('notificationUnreadOnly').addEventListener('change',function () { renderNotifications(); });
    el('markNotificationsRead').addEventListener('click',function () { markRead(notificationRows.map(function (row) { return row.id; })); });
    el('notificationList').addEventListener('click',function (event) {
      var read=event.target.closest('[data-read-event]');
      if (read) {
        var eventId=read.dataset.readEvent; markRead([eventId]);
        var next=Array.from(el('notificationList').querySelectorAll('[data-event]')).find(function (button) { return button.dataset.event===eventId; });
        (next || el('notificationUnreadOnly')).focus({preventScroll:true}); return;
      }
      var button=event.target.closest('[data-event]'), row=button && notificationRows.find(function (item) { return item.id===button.dataset.event; });
      if (!row) return; markRead([row.id]); closeHeaderPanels();
      if (row.kind==='sales') openOpportunity(row.outcomeId);
      else if (row.kind==='decision') openDecision(row.decisionId);
      else openOpportunity(null,row.id.slice('referral:'.length),{sourceType:row.detail.method,sourceRef:row.id.slice('referral:'.length),acquisitionSource:row.detail.source,notes:'إحالة من الصفحة '+cleanPath(row.detail.path),stage:'new'});
    });
    el('notificationAlertList').addEventListener('click',function (event) {
      var button=event.target.closest('[data-alert-view]'); if (!button) return;
      if (button.dataset.alertFilter) el(button.dataset.alertView==='decisions'?'decisionFilter':'followupFilter').value=button.dataset.alertFilter;
      navigateTo(button.dataset.alertView); renderCurrentView(); load({quiet:true,background:true});
    });
    el('editAccountButton').addEventListener('click',openProfile);
    el('closeAccountDialog').addEventListener('click',function () { el('accountDialog').close(); });
    el('accountDialog').addEventListener('close',function () { profilePhotoTicket++; profilePhotoDraft=null; el('accountButton').focus(); });
    el('profilePhotoInput').addEventListener('change',prepareProfilePhoto);
    el('removeProfilePhoto').addEventListener('click',function () { profilePhotoTicket++; profilePhotoDraft=null; el('profilePhotoPreview').innerHTML=avatarMarkup(null); el('profilePhotoInput').value=''; el('profilePhotoError').textContent=''; el('saveAccountProfile').disabled=false; });
    el('accountProfileForm').addEventListener('submit',function (event) {
      event.preventDefault();
      try { localStorage.setItem(profileKey(),JSON.stringify({name:el('profileDisplayName').value.trim(),photo:profilePhotoDraft})); }
      catch (error) { el('profilePhotoError').textContent='تعذر حفظ المظهر على هذا المتصفح.'; return; }
      renderAccount(); el('accountDialog').close(); showToast('تم تحديث مظهر الحساب على هذا المتصفح');
    });
  }

  el('adminLoginForm').addEventListener('submit', loginNow);
  el('togglePassword').addEventListener('click', function () {
    var input = el('adminPassword'); var visible = input.type === 'text'; input.type = visible ? 'password' : 'text';
    this.textContent = visible ? 'إظهار' : 'إخفاء'; this.setAttribute('aria-pressed', String(!visible));
  });
  el('refreshButton').addEventListener('click', load);
  el('googleAdsSyncButton').addEventListener('click', refreshGoogleAds);
  el('periodSelect').addEventListener('change', load);
  el('copyButton').addEventListener('click', function () { closeHeaderPanels(); copySummary(); });
  el('printButton').addEventListener('click', function () { closeHeaderPanels(); window.print(); });
  el('logoutButton').addEventListener('click', function () { logoutNow(); });
  el('callsBody').addEventListener('click', function (event) { if (event.target.classList.contains('save-call')) saveCall(event.target); });
  el('pipelineForm').addEventListener('submit', savePipeline);
  el('pipelineNewButton').addEventListener('click',function () { resetPipelineForm(); fillPipelineForm({}); });
  el('pipelineCancelButton').addEventListener('click', resetPipelineForm);
  el('pipelineStage').addEventListener('change', updatePipelineRules);
  el('pipelineContactResult').addEventListener('change', updatePipelineRules);
  el('pipelineStageFilter').addEventListener('change', function () { if (payload) renderSalesPipeline(payload); });
  el('pipelineExportButton').addEventListener('click', exportPipeline);
  el('boardScope').addEventListener('change', function () { if (payload) renderStageBoard(payload); });
  el('salesStageBoard').addEventListener('click', function (event) {
    var card = event.target.closest('[data-outcome]'); if (card) { openOpportunity(card.dataset.outcome); return; }
    var more = event.target.closest('[data-stage]'); if (more && payload) { var key = el('boardScope').value + '-' + more.dataset.stage; boardExpanded[key] = !boardExpanded[key]; renderStageBoard(payload); }
  });
  el('commercialGroup').addEventListener('change', function () { if (payload) renderCommercial(payload); });
  el('commercialExportButton').addEventListener('click', exportCommercial);
  el('decisionForm').addEventListener('submit', saveDecisionForm);
  el('decisionStatus').addEventListener('change', updateDecisionRules);
  el('decisionNewButton').addEventListener('click', function () { fillDecisionForm({}); });
  el('decisionCancelButton').addEventListener('click', closeDecisionEditor);
  el('decisionReloadButton').addEventListener('click', function () { openDecision(this.dataset.decisionId, decisionDraft && decisionDraft.insightKey); });
  ['decisionFilter','decisionSearch'].forEach(function (id) { el(id).addEventListener(id === 'decisionSearch' ? 'input' : 'change', function () { if (payload) renderDecisions(payload); }); });
  el('decisionList').addEventListener('click', function (event) { var button = event.target.closest('[data-decision]'); if (button) openDecision(button.dataset.decision); });
  el('insightsGrid').addEventListener('click', function (event) {
    var button = event.target.closest('[data-insight]'); if (!button) return;
    var insight = insights.find(function (row) { return row.key === button.dataset.insight; }); if (!insight) return;
    openDecision(null,insight.key,{insightKey:insight.key,title:insight.title,action:insight.action,source:insight.source,area:insight.area,
      evidence:insight.evidence + ' · آخر بيانات: ' + formatDate(payload.generatedAt),periodDays:payload.periodDays,priority:insight.priority === 'high' ? 'high' : 'medium',status:'planned'});
  });
  el('pipelineReloadButton').addEventListener('click', function () { openOpportunity(this.dataset.outcomeId, el('pipelineForm').dataset.sourceRef); });
  ['followupFilter','followupSearch'].forEach(function (id) { el(id).addEventListener(id === 'followupSearch' ? 'input' : 'change', function () { if (payload) renderFollowups(payload); }); });
  el('followupMetrics').addEventListener('click', function (event) { var button = event.target.closest('[data-filter]'); if (button && payload) { el('followupFilter').value = button.dataset.filter; renderFollowups(payload); } });
  el('followupList').addEventListener('click', function (event) { var button = event.target.closest('.followup-open'); if (button) openOpportunity(button.dataset.outcome); });
  el('pipelineBody').addEventListener('click', function (event) {
    var button = event.target.closest('.pipeline-edit'); if (!button || !payload) return;
    var id = button.closest('tr[data-outcome]').getAttribute('data-outcome');
    openOpportunity(id);
  });
  el('recentLeadsBody').addEventListener('click', function (event) {
    var button = event.target.closest('.promote-referral'); if (!button) return;
    var referral = ((payload || {}).recentReferrals || []).find(function (row) { return row.sourceRef === button.dataset.sourceRef; }) || {};
    openOpportunity(null, button.dataset.sourceRef, {
      sourceType: button.dataset.sourceType === 'call' ? 'call' : 'whatsapp', sourceRef: button.dataset.sourceRef,
      campaignName: button.dataset.campaign, acquisitionSource: referral.source, landingPath: referral.landingPath,
      notes: 'إحالة من الصفحة ' + button.dataset.sourcePath, stage: 'new'
    });
  });
  window.setInterval(function () {
    if (token && !document.hidden) load({ quiet: true, background: true });
  }, 300000);
  window.setInterval(refreshNotifications,60000);
  document.addEventListener('visibilitychange',function () { if (!document.hidden) refreshNotifications(); });
  var printDetails=[];
  window.addEventListener('beforeprint',function () {
    printDetails=Array.from(el(activeView).querySelectorAll('details')).filter(function (detail) { return !detail.open; });
    printDetails.forEach(function (detail) { detail.open=true; });
  });
  window.addEventListener('afterprint',function () { printDetails.forEach(function (detail) { detail.open=false; }); printDetails=[]; });
  if (/\.vercel\.app$/i.test(window.location.hostname)) el('previewNotice').hidden = false;
  initNavigation();
  updatePipelineRules();
  token = sessionStorage.getItem(TOKEN_KEY) || '';
  if (token) {
    el('adminLogin').hidden = true; el('adminApp').hidden = false; document.body.classList.add('is-authenticated'); load();
  }
})();
