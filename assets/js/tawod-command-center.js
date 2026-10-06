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
  var viewMotion = null;
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
      x: 'X', 'x-ads': 'X Ads', 'facebook-ads': 'Facebook Ads', 'instagram-ads': 'Instagram Ads', 'tiktok-ads': 'TikTok Ads', 'attribution-conflict': 'تعارض إسناد يحتاج مراجعة', google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
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
  var REPORTED_SOURCE_PREFIX = 'المصدر حسب إفادة العميل: ';
  var REPORTED_SOURCES = {
    google_maps: 'جوجل ماب', google_search: 'بحث جوجل', google_ad: 'إعلان جوجل',
    referral: 'توصية من شخص', social: 'منصات التواصل', other: 'مصدر آخر'
  };
  function readReportedSource(notes) {
    var value = String(notes || '');
    var keys = Object.keys(REPORTED_SOURCES);
    for (var i = 0; i < keys.length; i++) {
      var prefix = REPORTED_SOURCE_PREFIX + REPORTED_SOURCES[keys[i]];
      if (value === prefix) return { source: keys[i], notes: '' };
      if (value.indexOf(prefix + '\n') === 0) return { source: keys[i], notes: value.slice(prefix.length + 1) };
    }
    return { source: 'unknown', notes: value };
  }
  function writeReportedSource(source, notes) {
    var label = REPORTED_SOURCES[source];
    return label ? REPORTED_SOURCE_PREFIX + label + (notes ? '\n' + notes : '') : notes;
  }
  function reportedSourceDetail(notes) {
    var source = readReportedSource(notes).source;
    return REPORTED_SOURCES[source] ? '<small>حسب إفادة العميل: ' + esc(REPORTED_SOURCES[source]) + '</small>' : '';
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
      { title: 'الملف التجاري', connected: !!(data.businessProfile || {}).connected, at: (data.businessProfile || {}).lastSyncAt, hours: 26, detail: 'مزامنة يومية عبر Windsor؛ آخر أيام Google قابلة للمراجعة.' }
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
  function statusFreshness(connected, at, freshHours) {
    if (!connected) return { label: 'غير متصل', cls: 'is-offline' };
    var age = at ? (Date.now() - new Date(at).getTime()) / 3600000 : Infinity;
    if (age >= 0 && age <= (freshHours || 2)) return { label: 'متصل · محدث', cls: 'is-live' };
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
      '</span><em>' + esc(source) + '</em></div><strong><bdi>' + esc(value) + '</bdi></strong><small>' + esc(hint) + '</small></article>';
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
    var measurement = ads.referralMeasurement || {}, matched = measurement.summary || {};
    if (ads.connected && measurement.available && matched.costPerReferral != null) {
      var incomplete = number(matched.unmatchedReferrals) > 0 || number(matched.spendCoverage) < 95;
      rows.push(makeInsight(incomplete ? 'medium' : 'good', 'تكلفة الإحالة', 'الصرف مرتبط بإحالات الموقع', money(matched.matchedCost, ads.currency) + ' صرف مقابل ' + n(matched.referrals) + ' إحالة فريدة؛ التكلفة ' + money(matched.costPerReferral, ads.currency) + ' للفترة ' + measurement.startDate + ' إلى ' + measurement.endDate + '.', incomplete ? 'راجع الإحالات غير المنسوبة وجودة العملاء قبل التوسع؛ الربط يغطي ' + pct(matched.spendCoverage) + ' من صرف الفترة المكتملة.' : 'راجع تأهيل الإحالات والعقود في مسار البيع قبل زيادة الميزانية.', 'Google Ads + First-party', 'review-paid-referrals'));
    } else if (paid && number(paid.sessions) >= 20) {
      rows.push(makeInsight('medium', 'تكلفة الإحالة', 'تكلفة الإحالة تحتاج بيانات مكتملة', n(paid.referrals) + ' إحالة منسوبة للإعلانات في تقرير الموقع؛ لا تتوفر تكلفة متطابقة قابلة للعرض بعد.', 'افتح الصرف والإحالات وراجع تغطية الأيام وربط معرفات الحملات.', 'Google Ads + First-party', 'review-paid-referrals'));
    }
    if (ads.connected) {
      var a = ads.summary || {};
      if (number(a.receivedCalls) && rate(a.missedCalls, a.trackedCalls) > 20) {
        rows.push(makeInsight('high', 'المكالمات', 'نسبة مكالمات فائتة مرتفعة', n(a.missedCalls) + ' مكالمة فائتة من ' + n(a.trackedCalls) + ' مكالمة مقاسة.', 'حدد تغطية للرد خلال ساعات الحملات وراجع جدول ظهور الإعلانات.', 'Google Ads Call Reporting', 'missed-call-coverage'));
      }
      if (number(a.budgetUseRate) > 110) {
        rows.push(makeInsight('high', 'الميزانية', 'الصرف يتجاوز تقدير الميزانية الحالية', 'نسبة استخدام الميزانية التقديرية ' + pct(a.budgetUseRate) + '.', 'راجع الميزانيات المشتركة وتغييرات الميزانية قبل رفع العطاءات.', 'Google Ads API', 'budget-period-review'));
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
    el('secondaryNewVisitors').textContent = s.singleSessionVisitors == null ? '—' : n(s.singleSessionVisitors);
    el('secondaryReturningVisitors').textContent = s.repeatSessionVisitors == null ? '—' : n(s.repeatSessionVisitors);
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
      return '<div class="channel-item ' + item.cls + '"><div><strong>' + item.label + '</strong><span>' + n(item.value) + ' جلسة · ' + pct(item.share) + '</span></div><div class="channel-track"><progress value="' + Math.min(100, item.share) + '" max="100" aria-hidden="true"></progress></div></div>';
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
      return '<tr data-outcome="' + esc(row.id) + '"><td><code>' + esc(opportunityId(row)) + '</code>' + (row.isTest ? '<small>بيانات اختبار</small>' : '') + '<small>' + esc(formatDate(row.occurredAt)) + '</small></td><td><span class="channel-tag ' + esc(row.sourceType) + '">' + esc(salesSourceLabel(row.sourceType)) + '</span><small>' + esc(sourceLabel(row.acquisitionSource || 'غير مرتبط')) + '</small>' + reportedSourceDetail(row.notes) + '</td><td>' + esc(row.serviceType) + '<small>' + esc(row.projectLocation) + '</small></td><td>' + esc(row.campaignName) + '</td><td><span class="stage-tag ' + esc(row.stage) + '">' + esc(salesStageLabel(row.stage)) + '</span>' + (row.stage === 'lost' ? '<small>' + esc(lostReasonLabel(row.lostReason)) + '</small>' : '') + '</td><td>' + esc(row.assignee || 'دون مسؤول') + '<small>' + esc(formatDate(row.nextFollowUpAt)) + '</small></td><td><span class="stage-tag ' + esc(sync.cls) + '">' + esc(sync.text) + '</span></td><td>' + esc(money(row.estimatedValue, 'SAR')) + '</td><td><strong>' + esc(money(row.contractValue, 'SAR')) + '</strong></td><td><button class="pipeline-edit" type="button">فتح</button></td></tr>';
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
      return '<div class="loss-reason"><div><strong>' + esc(row.reason === 'unknown' ? 'سبب غير مسجل' : lostReasonLabel(row.reason)) + '</strong><span>' + n(row.total) + ' فرصة · ' + pct(rate(row.total,total)) + '</span></div><div class="source-track"><progress value="' + Math.min(100,rate(row.total,total)) + '" max="100" aria-hidden="true"></progress></div></div>';
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
    var q = data.dataQuality || {}, comparison=data.comparison7d || {};
    el('comparisonPeriod').textContent = comparison.currentStart ? 'مقارنة أسبوعين مكتملين: ' + comparison.currentStart + ' إلى ' + comparison.currentEnd + ' مقابل ' + comparison.previousStart + ' إلى ' + comparison.previousEnd + ' · بتوقيت الرياض' : 'مقارنة فترتين متتاليتين من 7 أيام.';
    window.TawodCharts.render(el('dailyChart'),{title:'أداء الموقع اليومي',rows:data.daily || [],start:q.startAt,end:q.endAt,today:window.TawodCharts.day(q.endAt),note:'فترة الموقع تشمل جزءًا من أول يوم واليوم الجاري؛ كل جلسة تُسند إلى يوم بدايتها.',modes:[
      {id:'traffic',label:'زيارات وإحالات',series:[{key:'sessions',label:'الزيارات',color:'#bf7237'},{key:'referrals',label:'الإحالات الفريدة',color:'#187d5d'}]},
      {id:'channels',label:'قنوات التواصل',series:[{key:'calls',label:'إحالات الاتصال',color:'#276eaa'},{key:'whatsapp',label:'إحالات واتساب',color:'#187d5d'}]},
      {id:'rate',label:'معدل الإحالة',unit:'%',series:[{get:function(r){return r.sessions ? r.referrals/r.sessions*100 : null;},label:'الإحالات ÷ الزيارات',color:'#bf7237'}]}
    ]});
  }

  function renderSources(data) {
    var rows = data.sources || [];
    if (!rows.length) { el('sourcesList').innerHTML = '<div class="empty-box">لا توجد بيانات مصادر.</div>'; return; }
    var max = Math.max.apply(null, rows.map(function (row) { return number(row.sessions); }).concat([1]));
    el('sourcesList').innerHTML = rows.map(function (row) {
      return '<div class="source-row"><div><strong>' + esc(sourceLabel(row.source)) + '</strong><span>' + n(row.sessions) + ' زيارة · ' + n(row.referrals) + ' إحالة <small>(' + n(row.calls) + ' اتصال + ' + n(row.whatsapp) + ' واتساب)</small></span></div><b>' + pct(row.referralRate) + '</b><div class="source-track"><progress value="' + Math.max(0, rate(row.sessions, max)) + '" max="100" aria-hidden="true"></progress></div></div>';
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

  function renderPaidReferralPanel(ads, currency) {
    var measurement = ads.referralMeasurement || {}, s = measurement.summary || {};
    if (!ads.connected || !measurement.available) {
      el('paidReferralPanel').innerHTML = '<div class="panel-title"><div><span class="micro-label">الصرف ← الإحالة ← التأهيل</span><h3>ربط تكلفة الإحالة</h3></div><span class="measurement-state is-pending">بانتظار اكتمال البيانات</span></div><p class="measurement-note">' + (number(measurement.missingDays) ? 'بيانات الصرف ناقصة في ' + n(measurement.missingDays) + ' يوم داخل فترة القياس. لن تظهر تكلفة غير مكتملة.' : 'يلزم صرف متزامن مع زيارات منسوبة لحملة، وأيام مكتملة بتوقيت الرياض.') + '</p>';
      return;
    }
    var complete = !number(s.unmatchedReferrals) && number(s.spendCoverage) >= 95;
    el('paidReferralPanel').innerHTML = '<div class="panel-title"><div><span class="micro-label">الصرف ← الإحالة ← التأهيل</span><h3>تكلفة الإحالة من صرف فعلي</h3></div><span class="measurement-state ' + (complete ? 'is-complete' : 'is-pending') + '">' + (complete ? 'تم الربط' : 'ربط جزئي') + '</span></div>' +
      '<div class="cost-equation"><div><span>صرف الحملات المرتبطة</span><strong>' + money(s.matchedCost, currency) + '</strong></div><span class="equation-symbol" aria-hidden="true">÷</span><div><span>جلسات أحالت للتواصل</span><strong>' + n(s.referrals) + '</strong></div><span class="equation-symbol" aria-hidden="true">=</span><div class="equation-result"><span>تكلفة الإحالة الفريدة</span><strong>' + (s.costPerReferral != null ? money(s.costPerReferral, currency) : '—') + '</strong></div></div>' +
      '<details class="finance-details"><summary>تفاصيل الفترة والربط · تغطية الصرف ' + (s.spendCoverage != null ? pct(s.spendCoverage) : '—') + '</summary><div class="measurement-coverage"><span>الفترة: <b dir="ltr">' + esc(measurement.startDate) + ' — ' + esc(measurement.endDate) + '</b></span><span>' + n(measurement.coveredDays) + ' أيام مكتملة · الرياض</span><span>ميزانية الأيام التقديرية: ' + money(number((ads.summary || {}).dailyBudget) * number(measurement.coveredDays), currency) + '</span><span>تغطية الصرف: ' + (s.spendCoverage != null ? pct(s.spendCoverage) : '—') + '</span><span>' + n(s.matchedCampaigns) + ' حملات مرتبطة</span></div>' +
      '<p class="measurement-note">' + (number(s.unmatchedReferrals) ? n(s.unmatchedReferrals) + ' إحالة إعلانية لم تُربط بحملة محددة. ' : '') + 'صرف غير مرتبط بزيارات الموقع: ' + money(Math.max(0, number(s.periodCost) - number(s.matchedCost)), currency) + '. ' + (measurement.trackingWindowShortened ? 'اقتُصرت الفترة على الأيام التي بدأ فيها قياس الموقع. ' : '') + 'تقدير الميزانية = الميزانية اليومية الحالية × الأيام المكتملة؛ لا يمثل سجل الميزانيات السابقة. الاتصال وواتساب في الجلسة نفسها يُحسبان إحالة واحدة. الإحالة ضغطة تواصل؛ التأهيل والعقد يُراجعان في مسار البيع.</p></details>' +
      '<div class="measurement-actions"><a href="#acquisition">راجع إسناد الحملات</a><a href="#sales-pipeline">راجع جودة الفرص</a></div>';
  }
  function renderAds(data) {
    var ads = data.googleAds || { connected: false };
    var s = ads.summary || {};
    var currency = ads.currency || 'SAR';
    renderPaidReferralPanel(ads, currency);
    var fresh = statusFreshness(ads.connected, ads.lastSyncAt);
    el('googleAdsStatus').className = 'ads-status-chip ' + fresh.cls;
    el('googleAdsStatus').innerHTML = '<i></i>' + fresh.label;
    el('googleAdsLastSync').textContent = ads.connected ? 'آخر مزامنة: ' + formatDate(ads.lastSyncAt) : 'لم تصل بيانات من الحساب بعد';
    el('googleAdsSyncFeedback').textContent = ads.connected && fresh.cls === 'is-live' ? 'مزامنة تلقائية كل ساعة · البيانات محدثة' : 'المشغّل التلقائي يعمل كل ساعة';
    el('googleAdsConnectHint').hidden = !!ads.connected;
    if (!ads.connected) {
      el('adsSummaryMetrics').innerHTML = unavailableMetrics(['الميزانية اليومية', 'الصرف', 'النقرات', 'التحويلات'], 'Google Ads');
      el('adsQualityMetrics').innerHTML = unavailableMetrics(['CPA', 'مكالمات مقاسة', 'عملاء محتملون', 'عملاء مؤكدون'], 'Google Ads');
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
        metric('التحويلات', n(s.conversions, 1), 'Conversion Actions', 'Google Ads', '')
      ].join('');
      el('adsQualityMetrics').innerHTML = [
        metric('CPA', money(s.cpa, currency), 'تكلفة تحويل Google Ads', 'Google Ads', ''),
        metric('مكالمات مقاسة', ads.callReportingConnected ? n(s.trackedCalls) : 'غير متصل', 'مدة وحالة فعلية', 'Call Reporting', ads.callReportingConnected ? '' : 'is-unavailable'),
        metric('عملاء محتملون', ads.callReportingConnected ? n(s.potentialCustomers) : 'غير متصل', 'مكالمة مستلمة >60ث', 'Call Reporting', ads.callReportingConnected ? 'potential' : 'is-unavailable'),
        metric('عملاء مؤكدون', ads.callReportingConnected ? n(s.confirmedCustomers) : 'غير متصل', '>60ث + تكرار/زيارة', 'تأهيل', ads.callReportingConnected ? 'confirmed' : 'is-unavailable')
      ].join('');
      var used = Math.min(100, Math.max(0, number(s.budgetUseRate)));
      el('budgetPanel').innerHTML = '<div class="budget-copy"><div><span class="micro-label">BUDGET CONTROL</span><h3>الصرف مقابل تقدير الميزانية الحالية</h3></div><strong>' + pct(s.budgetUseRate) + '</strong></div>' +
        '<div class="budget-track"><progress value="' + used + '" max="100" aria-hidden="true"></progress></div><div class="budget-values"><span>الصرف <b>' + money(s.cost, currency) + '</b></span><span>ميزانية الفترة التقديرية <b>' + money(s.plannedPeriodBudget, currency) + '</b></span><span>الميزانية اليومية الحالية <b>' + money(s.dailyBudget, currency) + '</b></span></div><small>ميزانية الفترة = الميزانية اليومية الحالية × عدد أيام العرض؛ قد تختلف عن الميزانيات التاريخية إذا تغيّرت أثناء الفترة.</small>';
      window.TawodCharts.render(el('adsDailyChart'),{title:'أداء الإعلانات اليومي',rows:ads.daily || [],start:ads.startDate,end:ads.endDate,today:ads.endDate,note:'بيانات اليوم الجاري أولية. خط الميزانية مرجع بالقيمة الحالية، وليس سجل الميزانية التاريخية.',modes:[
        {id:'cost',label:'الصرف والميزانية',unit:'SAR',series:[{key:'cost',label:'الصرف الفعلي',color:'#bf7237'},{get:function(){return s.dailyBudget;},label:'الميزانية اليومية الحالية',color:'#788d9c',dashed:true}]},
        {id:'clicks',label:'النقرات',series:[{key:'clicks',label:'نقرات الإعلان',color:'#276eaa'}]},
        {id:'conversions',label:'تحويلات Google Ads',decimals:2,series:[{key:'conversions',label:'تحويلات مسجلة',color:'#187d5d'}]}
      ]});
      var campaigns = ads.campaigns || [];
      el('adsCampaignsEmpty').hidden = !!campaigns.length;
      el('adsCampaignsBody').innerHTML = campaigns.map(function (row) {
        return '<tr><td><strong>' + esc(row.name) + '</strong><br><small>' + esc(row.campaignId) + '</small></td><td>' + esc(row.status) + '</td><td>' + money(row.dailyBudget, currency) + '</td><td>' + money(row.cost, currency) + '</td><td>' + n(row.clicks) + '</td><td>' + pct(row.ctr) + '</td><td><strong>' + n(row.siteReferrals) + '</strong><br><small>' + n(row.siteCalls) + ' اتصال · ' + n(row.siteWhatsapp) + ' واتساب</small></td><td>' + (row.siteCostPerReferral != null ? money(row.siteCostPerReferral, currency) : '—') + '<br><small>صرف الأيام المكتملة ' + (row.pairedCost != null ? money(row.pairedCost, currency) : '—') + '</small></td><td>' + (ads.callReportingConnected ? n(row.potentialCustomers) : '—') + '</td><td>' + (ads.callReportingConnected ? n(row.confirmedCustomers) : '—') + '</td><td>' + money(row.cpa, currency) + '</td></tr>';
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
    var fresh = statusFreshness(bp.connected, bp.lastSyncAt, 26);
    el('businessProfileStatus').className = 'ads-status-chip ' + fresh.cls;
    el('businessProfileStatus').innerHTML = '<i></i>' + fresh.label;
    el('businessProfileName').textContent = bp.profileName || 'الملف التجاري';
    el('businessProfileLastSync').textContent = bp.connected ? 'آخر مزامنة: ' + formatDate(bp.lastSyncAt) : 'لم تصل بيانات الملف بعد';
    el('businessProfileConnectHint').hidden = !!bp.connected;
    el('profileCoverageNote').hidden = !bp.connected;
    if (bp.connected) {
      var rangeLabel = esc(bp.rangeStart || '—') + ' إلى ' + esc(bp.rangeEnd || '—');
      el('profileCoverageNote').innerHTML = '<details class="report-details"><summary>تغطية البيانات · ' + n(bp.reportingDays) + ' من ' + n(bp.periodDays) + ' يوم</summary><strong>مزامنة يومية من ملف الرياض</strong> · الأيام الحديثة قابلة للمراجعة بعد معالجة Google. ضغط زر الاتصال لا يثبت مكالمة مستلمة؛ وضغط رابط الموقع لا يثبت جلسة في الموقع.<div class="profile-coverage"><span>فترة الملف: ' + rangeLabel + '</span><span>أيام متاحة: ' + n(bp.reportingDays) + ' من ' + n(bp.periodDays) + '</span><span>آخر يوم ورد: ' + esc(bp.lastReportDate || '—') + '</span></div></details>';
    }
    if (!bp.connected) {
      el('profileSummaryMetrics').innerHTML = unavailableMetrics(['ظهور البحث', 'ظهور الخرائط', 'ضغطات الاتصال', 'ضغطات الموقع', 'طلبات الاتجاهات', 'الحجوزات', 'مجموع الإجراءات', 'معدل الإجراء'], 'الملف التجاري');
      el('profileDailyChart').innerHTML = '<div class="chart-empty">المصدر غير متصل.</div>';
      el('profileKeywords').innerHTML = '<div class="empty-box">تظهر كلمات البحث بعد الربط.</div>';
      return;
    }
    el('profileSummaryMetrics').innerHTML = [
      metric('ظهور البحث', n(s.searchImpressions), 'Desktop + Mobile', 'Business Profile', ''),
      metric('ظهور الخرائط', n(s.mapsImpressions), 'Desktop + Mobile', 'Business Profile', ''),
      metric('ضغطات الاتصال', n(s.calls), 'ضغط زر الاتصال في الملف', 'Google', 'calls'),
      metric('ضغطات الموقع', n(s.websiteClicks), 'ضغط رابط الموقع في Google', 'Google', ''),
      metric('طلبات الاتجاهات', n(s.directions), 'Directions', 'Business Profile', ''),
      metric('الحجوزات', n(s.bookings), 'Reserve with Google', 'Business Profile', ''),
      metric('مجموع الإجراءات', n(number(s.calls) + number(s.websiteClicks) + number(s.directions) + number(s.bookings)), 'مجموع الضغطات والحجوزات', 'محسوب', ''),
      metric('معدل الإجراء', pct(s.actionRate), 'كل الإجراءات ÷ الظهور', 'محسوب', 'rate')
    ].join('');
    window.TawodCharts.render(el('profileDailyChart'),{title:'أداء الملف التجاري اليومي',rows:bp.daily || [],start:bp.rangeStart,end:bp.rangeEnd,today:bp.rangeEnd,note:'آخر أيام Google قابلة للمراجعة. اليوم دون سجل يظهر كفجوة؛ الصفر الوارد من المصدر يُعرض صفرًا.',modes:[
      {id:'impressions',label:'الظهور',series:[{key:'searchImpressions',label:'بحث Google',color:'#276eaa'},{key:'mapsImpressions',label:'خرائط Google',color:'#187d5d'}]},
      {id:'actions',label:'إجراءات الملف',series:[{key:'calls',label:'ضغطات الاتصال',color:'#bf7237'},{key:'websiteClicks',label:'ضغطات الموقع',color:'#276eaa'},{key:'directions',label:'طلبات الاتجاهات',color:'#187d5d'}]}
    ]});
    var keywords = bp.keywords || [];
    el('profileKeywords').innerHTML = keywords.length ? '<p class="keyword-note">بيانات شهرية قد تشمل أيامًا خارج الفترة المحددة. «أقل من» حد من Google؛ العدد الدقيق غير متاح. الأشهر الأخيرة قد تتأخر أو تتغير.</p>' + keywords.map(renderProfileKeyword).join('') : '<div class="empty-box">لم يرسل Google كلمات بحث لأشهر هذه الفترة بعد. يمكنك مراجعة نطاق 90 يومًا؛ لا تُستنتج الكلمات من الزيارات.</div>';
  }

  function renderProfileKeyword(row, index) {
    var threshold = row.threshold, impressions = row.impressions;
    var value = Number.isSafeInteger(threshold) && threshold > 0 ? 'أقل من ' + n(threshold) : Number.isSafeInteger(impressions) && impressions >= 0 ? n(impressions) : 'غير متاح';
    var month = 'الشهر غير متاح';
    try { if (/^\d{4}-\d{2}-01$/.test(row.month)) month = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(row.month + 'T00:00:00Z')); } catch (error) {}
    return '<div class="keyword-row"><span>' + n(index + 1) + '</span><strong>' + esc(row.keyword) + '<small>' + esc(month) + '</small></strong><b>' + value + '</b></div>';
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

  var socialPlatform = 'all';
  var socialImportRows = [];
  var socialImportTicket = 0;
  var socialImportPending = false;
  var SOCIAL_NAMES = {tiktok:'TikTok',instagram:'Instagram',facebook:'Facebook',x:'X'};
  var SOCIAL_CSV_FIELDS = ['platform','account_id','account_name','period_start','period_end','time_zone','scope','source_name','observed_at','aggregation','reach','views','impressions','interactions','profile_visits','link_clicks','followers_start','followers_end','spend','currency'];
  function socialValue(value) { return value == null ? '—' : n(value); }
  function socialScope(scope) { return {organic:'عضوي',paid:'مدفوع',combined:'عضوي + مدفوع'}[scope] || '—'; }
  function plainDay(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '—'; }
  function reportPeriod(row) { return plainDay(row.period_start) + ' ← ' + plainDay(row.period_end); }
  function renderSocial(data) {
    var social = data.social || {}, available = social.available === true;
    var rows = social.platforms || [], reports = social.reports || [];
    var windowInfo = social.window || {};
    el('socialWindow').textContent = available ? 'زيارات الموقع: ' + formatDate(windowInfo.startAt) + ' إلى ' + formatDate(windowInfo.endAt) + ' · بتوقيت الرياض' : 'تعذر تحميل قياس السوشيال حاليًا. المؤشرات غير المتاحة تظهر بشرطة.';
    el('socialPlatformCards').innerHTML = Object.keys(SOCIAL_NAMES).filter(function (key) { return socialPlatform === 'all' || socialPlatform === key; }).map(function (key) {
      var row = rows.find(function (item) { return item.platform === key; }) || {};
      var reported = reports.some(function (item) { return item.platform === key; });
      return '<article class="social-platform-card brand-' + key + '"><div class="social-card-head"><span class="social-brand">' + icon(key) + '</span><div><h3 dir="ltr">' + SOCIAL_NAMES[key] + '</h3><span>' + (reported ? 'تقرير حساب متاح' : 'لم يصل تقرير حساب') + '</span></div><button type="button" class="icon-button social-card-open" data-platform="' + key + '" aria-label="عرض أداء ' + SOCIAL_NAMES[key] + '">' + icon('arrow') + '</button></div><div class="social-card-main"><span>زيارات للموقع</span><strong>' + (available ? n(row.sessions) : '—') + '</strong><small>' + (available ? n(row.paidSessions) + ' مدفوعة · ' + n(Math.max(0,number(row.sessions)-number(row.paidSessions))) + ' عضوية / إحالة' : 'المصدر غير متاح') + '</small></div><div class="social-card-stats"><div><span>إحالات تواصل</span><b>' + (available ? n(row.referrals) : '—') + '</b></div><div><span>سبق تأهيلها</span><b>' + (available ? n(row.qualified) : '—') + '</b></div><div><span>عقود</span><b>' + (available ? n(row.contracts) : '—') + '</b></div></div><div class="social-card-foot"><span>معدل الإحالة <b>' + (available ? pct(rate(row.referrals,row.sessions)) : '—') + '</b></span><span>' + (available ? n(row.taggedSessions) + ' زيارة بحملة موسومة' : '—') + '</span></div></article>';
    }).join('');
    var previous = el('socialReportSelect').value;
    var selectedReports = reports.filter(function (row) { return socialPlatform === 'all' || row.platform === socialPlatform; });
    el('socialReportSelect').innerHTML = selectedReports.length ? selectedReports.map(function (row) {
      return '<option value="' + esc(row.id) + '">' + esc(SOCIAL_NAMES[row.platform] + ' · ' + (row.account_name || row.account_id) + ' · ' + socialScope(row.scope) + ' · ' + reportPeriod(row)) + '</option>';
    }).join('') : '<option value="">لا يوجد تقرير حساب لهذه المنصة بعد</option>';
    el('socialReportSelect').disabled = !selectedReports.length;
    if (selectedReports.some(function (row) { return row.id === previous; })) el('socialReportSelect').value = previous;
    renderSocialReport();
    var campaigns = (social.campaigns || []).filter(function (row) { return socialPlatform === 'all' || row.platform === socialPlatform; });
    el('socialCampaignBody').innerHTML = campaigns.map(function (row) {
      return '<tr><td>' + esc(SOCIAL_NAMES[row.platform]) + '</td><td dir="auto">' + esc(row.campaign) + '</td><td dir="auto">' + esc(row.content) + '</td><td>' + n(row.sessions) + '</td><td>' + n(row.referrals) + '</td><td>' + pct(rate(row.referrals,row.sessions)) + '</td><td>' + n(row.paid_sessions) + '</td></tr>';
    }).join('');
    el('socialCampaignNote').textContent = !available ? 'البيانات غير متاحة حاليًا.' : !campaigns.length ? 'لم تُسجل زيارات من هذه المنصات في الفترة. استخدم رابط الحملة أدناه لتمييز المنشورات القادمة.' : (social.campaignsTruncated ? 'عرض أكبر 100 مجموعة حملة ومحتوى. ' : '') + 'المصدر والمحتوى من وسوم الرابط عند بداية الجلسة. «غير موسومة» تعني إحالة متصفح متاحة بلا اسم حملة.';
  }
  function renderSocialReport() {
    var social = (payload || {}).social || {};
    var row = (social.reports || []).find(function (item) { return item.id === el('socialReportSelect').value; });
    var definitions = row && row.metric_definitions || {};
    var followers = row && row.followers_start != null && row.followers_end != null ? row.followers_end-row.followers_start : null;
    el('socialReportStatus').textContent = row ? (row.input_kind === 'connector' ? 'وصل عبر موصل' : 'تقرير مستورد') : 'بانتظار تقرير فعلي';
    el('socialNativeMetrics').innerHTML = [
      ['الوصول',row && row.reach,'حسابات فريدة وفق المصدر'],['المشاهدات',row && row.views,'المشاهدات خلال فترة التقرير'],
      ['التفاعلات',row && row.interactions,'إجمالي المصدر لهذه الفترة'],['صافي تغير المتابعين',followers,'نهاية الفترة − بدايتها']
    ].map(function (metric) { return '<div class="social-native-metric"><span>' + metric[0] + '</span><strong>' + socialValue(metric[1]) + '</strong><small>' + metric[2] + '</small></div>'; }).join('');
    el('socialReportContext').innerHTML = row ? '<div><span>فترة الحساب</span><strong dir="ltr">' + esc(reportPeriod(row)) + '</strong></div><div><span>المصدر والنطاق</span><strong>' + esc(row.source_name + ' · ' + socialScope(row.scope)) + '</strong></div><div><span>المنطقة الزمنية</span><strong dir="ltr">' + esc(row.time_zone) + '</strong></div><div><span>وقت استخراج التقرير</span><strong>' + esc(formatDate(row.observed_at)) + '</strong></div>' : '<p>الوصول والمشاهدات والمتابعون تحتاج تقريرًا من حساب المنصة. يمكنك استيراده الآن أو توصيل الحساب وإعداد نقل التقارير. زيارات الموقع أعلاه لها مصدر قياس مستقل.</p>';
    var details = row ? [
      ['مرات الظهور',socialValue(row.impressions)],['زيارات الملف',socialValue(row.profile_visits)],['نقرات الروابط',socialValue(row.link_clicks)],
      ['المتابعون في البداية',socialValue(row.followers_start)],['المتابعون في النهاية',socialValue(row.followers_end)],['الصرف',row.spend == null ? '—' : n(row.spend,2) + ' ' + row.currency]
    ] : [];
    el('socialReportDetails').innerHTML = details.length ? '<dl class="social-definition-list">' + details.map(function (item) { return '<div><dt>' + esc(item[0]) + '</dt><dd>' + esc(item[1]) + '</dd></div>'; }).join('') + '</dl><p class="workspace-notice">هوية الحساب: ' + esc(row.account_id) + ' · حفظ في اللوحة: ' + esc(formatDate(row.updated_at)) + '</p>' + Object.keys(definitions).filter(function (key) { return key !== 'aggregation'; }).map(function (key) { return '<p class="workspace-notice" dir="auto">' + esc(key) + ': ' + esc(definitions[key]) + '</p>'; }).join('') : '<p class="workspace-notice">لا يوجد تقرير حساب. الشرطة تعني أن الرقم غير متاح، وليست صفرًا.</p>';
    if (social.reportsTruncated) el('socialReportDetails').insertAdjacentHTML('beforeend','<p class="workspace-notice">حد العرض: 200 تقرير حساب ونطاق. لا تُجمع التقارير أو الفترات المتداخلة.</p>');
  }
  function filterSocial(key) {
    if (key !== 'all' && !Object.prototype.hasOwnProperty.call(SOCIAL_NAMES,key)) return;
    socialPlatform = key;
    el('socialFilter').querySelectorAll('button').forEach(function (button) { var selected=button.dataset.platform === key; button.classList.toggle('is-active',selected); button.setAttribute('aria-pressed',String(selected)); });
    if (payload) renderSocial(payload);
  }
  function renderMeasurement(data) {
    var q=data.dataQuality || {}, summary=data.summary || {};
    var known=typeof q.dailySessionTotal === 'number' && typeof q.dailyReferralTotal === 'number';
    var checks=[['جلسات حسب المصدر',q.sourceTotal,summary.sessions],['جلسات حسب الجهاز',q.deviceTotal,summary.sessions],['مجموع الجلسات اليومية',q.dailySessionTotal,summary.sessions],['مجموع الإحالات اليومية',q.dailyReferralTotal,summary.referralSessions]];
    var matched=known && checks.every(function (row) { return typeof row[1] === 'number' && row[1] === row[2]; });
    el('measurementHero').className='measurement-hero ' + (matched ? 'is-valid' : 'needs-review');
    el('measurementHero').innerHTML=icon(matched ? 'check' : 'chart') + '<div><span class="micro-label">' + (matched ? 'TOTALS RECONCILED' : 'REVIEW REQUIRED') + '</span><h3>' + (matched ? 'الإجماليات متطابقة حسابيًا' : known ? 'يوجد فرق يحتاج مراجعة' : 'الفحص الكامل غير متاح الآن') + '</h3><p>نفس الجلسات، ونفس الفترة. هذا الفحص لا يثبت اكتمال الإسناد أو حدوث محادثة أو بيع.</p><small>آخر تحقق: ' + esc(formatDate(q.verifiedAt)) + ' · ' + esc(q.timezone || 'Asia/Riyadh') + '</small></div>';
    el('measurementChecks').innerHTML=checks.map(function (row) {
      var valid=typeof row[1] === 'number' && row[1] === row[2];
      return '<article class="measurement-check"><span>' + row[0] + '</span><strong>' + socialValue(row[1]) + '<small> / ' + socialValue(row[2]) + '</small></strong><b class="' + (valid ? 'is-valid' : 'needs-review') + '">' + (valid ? 'متطابق' : row[1] == null ? 'غير متاح' : 'فرق: ' + n(row[1]-row[2])) + '</b></article>';
    }).join('');
    var social=(data.social || {}), socialRows=social.platforms || [];
    var socialSessions=social.available ? socialRows.reduce(function (sum,row) { return sum+number(row.sessions); },0) : null;
    var tagged=social.available ? socialRows.reduce(function (sum,row) { return sum+number(row.taggedSessions); },0) : null;
    var diagnostics=[
      ['تعارض مصدر السوشيال مع إعلان جوجل',socialValue(q.attributionConflicts),'تُصنّف ضمن «تعارض إسناد» لحين مراجعة الوسوم؛ لا تُنسب تلقائيًا لأي منصة.'],
      ['جلسات تواصل بلا مشاهدة صفحة في الفترة',socialValue(q.contactSessionsWithoutPage),'قد تبدأ الجلسة قبل بداية الفترة أو لا تصل مشاهدة الصفحة. مستبعدة من إحالات جلسات الموقع.'],
      ['نقرات تواصل بلا معرّف جلسة',socialValue(q.contactEventsWithoutSession),'لا يمكن ضمها إلى جلسة فريدة بثقة.'],
      ['أحداث اختبار مستبعدة',socialValue(q.excludedTestEvents),'معرّفات TEST / DUMMY / EXAMPLE / FAKE ووسم internal_qa مستبعدة من مؤشرات الموقع.'],
      ['نقرات تواصل مكررة أو مشتركة',socialValue(q.duplicateOrCrossChannelClicks),'الضغطات الخام: '+n(q.rawContactClicks)+'؛ إحالات الجلسات الفريدة: '+n(q.uniqueReferralSessions)+'.'],
      ['زيارات السوشيال بحملة موسومة',socialSessions == null ? '—' : n(tagged)+' / '+n(socialSessions),'الوسم UTM يربط الزيارة بالحملة؛ لا يثبت اكتمال إسناد كل زيارات التطبيق.'],
      ['آخر حدث موقع مستلم',formatDate(q.lastEventAt),'يخص الأحداث المؤهلة للقياس؛ انقطاع أو حجب التتبع يؤثر على اكتمال البيانات.'],
      ['زوار جدد / زاروا الموقع سابقًا',n(summary.newVisitors)+' / '+n(summary.returningVisitors),'حسب أول ظهور مسجل للمتصفح، مع الفصل عن عدد الجلسات خلال الفترة.']
    ];
    el('measurementDiagnostics').innerHTML=diagnostics.map(function (row) { return '<div><div><strong>'+esc(row[0])+'</strong><p>'+esc(row[2])+'</p></div><b>'+esc(row[1])+'</b></div>'; }).join('');
    el('measurementVerification').innerHTML=(data.measurementVerification || []).map(function(row){
      var result=row.results || {}, stale=Date.now()-Date.parse(row.checked_at)>48*3600000;
      return '<article class="source-verification"><strong>'+ (row.source==='google_ads' ? 'مطابقة صرف Google Ads' : 'مطابقة أداء الملف التجاري') +' · '+(result.matched ? 'الأرقام متطابقة ضمن دقة المصدر' : 'فرق يحتاج مراجعة')+'</strong><br><span>الفترة: '+esc(row.period_start)+' إلى '+esc(row.period_end)+' · آخر فحص: '+esc(formatDate(row.checked_at))+'</span><br><small>'+(stale ? 'مر أكثر من يومين على المطابقة المستقلة؛ المزامنة الحالية تُعرض منفصلة.' : 'مطابقة مستقلة وقت الفحص؛ لا تُغني عن توضيح الأيام الأولية أو تأخر المصدر.')+'</small></article>';
    }).join('') || '<div class="empty-box">لم تُحفظ مطابقة مستقلة للمصادر بعد.</div>';

  }
  function buildSocialLink() {
    var url=new URL(el('socialLinkTarget').value);
    if (url.protocol !== 'https:' || !['tawodco.com','www.tawodco.com'].includes(url.hostname) || url.username || url.password || (url.port && url.port !== '443')) throw new Error('استخدم رابط HTTPS لصفحة على tawodco.com.');
    var campaign=el('socialLinkCampaign').value.trim(), content=el('socialLinkContent').value.trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(campaign) || (content && !/^[A-Za-z0-9_-]{1,80}$/.test(content))) throw new Error('استخدم حروفًا إنجليزية وأرقامًا وشرطة فقط لرموز الحملة والمنشور.');
    Array.from(url.searchParams.keys()).forEach(function (key) { if (/^utm_/i.test(key) || /^(gclid|gbraid|wbraid|gad_campaignid|gad_source|fbclid|ttclid)$/i.test(key)) url.searchParams.delete(key); });
    url.searchParams.set('utm_source',el('socialLinkPlatform').value); url.searchParams.set('utm_medium',el('socialLinkMedium').value); url.searchParams.set('utm_campaign',campaign); if(content) url.searchParams.set('utm_content',content);
    url.hash=''; return url.href;
  }
  function parseSocialCsv(raw) {
    raw=raw.replace(/^\uFEFF/,''); var rows=[],row=[],cell='',quoted=false,closed=false;
    function field() { row.push(cell); cell=''; closed=false; }
    function record() { field(); if(row.some(function (value) { return value.trim() !== ''; })) rows.push(row); row=[]; if(rows.length>201) throw new Error('الحد الأقصى 200 تقرير.'); }
    for(var i=0;i<raw.length;i++) {
      var char=raw[i];
      if(quoted) { if(char==='"') { if(raw[i+1]==='"') {cell+='"';i++;} else {quoted=false;closed=true;} } else cell+=char; }
      else if(char==='"') { if(cell || closed) throw new Error('تنسيق اقتباس CSV غير صالح.'); quoted=true; }
      else if(char===',') field();
      else if(char==='\r'||char==='\n') { if(char==='\r'&&raw[i+1]==='\n') i++; record(); }
      else { if(closed) throw new Error('يوجد نص بعد إغلاق اقتباس CSV.'); cell+=char; }
    }
    if(quoted) throw new Error('يوجد اقتباس CSV غير مغلق.'); if(cell||row.length||closed) record();
    if(rows.length<2) throw new Error('الملف يحتوي على العناوين فقط. أضف تقريرًا فعليًا.');
    var headers=rows.shift().map(function (h) {return h.trim();});
    if(new Set(headers).size !== headers.length || headers.some(function(h) {return !SOCIAL_CSV_FIELDS.includes(h);})) throw new Error('العناوين مكررة أو لا تتطابق مع القالب الموحّد.');
    var required=SOCIAL_CSV_FIELDS.slice(0,10).filter(function(key){return key!=='account_name';});
    if(required.some(function(key){return !headers.includes(key);})) throw new Error('حقول تعريف التقرير ناقصة. استخدم القالب الموحّد.');
    return rows.map(function(values,index){
      if(values.length!==headers.length) throw new Error('عدد الحقول غير صحيح في السطر '+(index+2)+'.');
      var result={};headers.forEach(function(key,j){result[key]=values[j].trim() || null;});
      if(!SOCIAL_NAMES[result.platform] || !result.account_id || !result.source_name || !['organic','paid','combined'].includes(result.scope) || result.aggregation!=='account_period') throw new Error('راجع المنصة والحساب والمصدر والنطاق في السطر '+(index+2)+'.');
      var validDate=function(value){return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;};
      var today=riyadhInput(new Date().toISOString()).slice(0,10);
      if(!validDate(result.period_start)||!validDate(result.period_end)||result.period_end<result.period_start||result.period_end>today||Date.parse(result.period_end)-Date.parse(result.period_start)>366*86400000) throw new Error('فترة التقرير غير صحيحة في السطر '+(index+2)+'.');
      try{if(!result.time_zone)throw new Error();new Intl.DateTimeFormat('en',{timeZone:result.time_zone});}catch(error){throw new Error('المنطقة الزمنية غير صالحة في السطر '+(index+2)+'.');}
      var observed=Date.parse(result.observed_at);
      if(!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result.observed_at || '') || !Number.isFinite(observed)||observed>Date.now()+300000||observed<Date.parse(result.period_end)) throw new Error('وقت استخراج التقرير غير صالح في السطر '+(index+2)+'.');
      var metricCount=0;
      SOCIAL_CSV_FIELDS.slice(10,18).forEach(function(key){var value=result[key];if(value==null)return;if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))throw new Error('المؤشر '+key+' غير صالح في السطر '+(index+2)+'.');result[key]=Number(value);metricCount++;});
      if(result.spend!=null){if(!/^\d+(\.\d{1,2})?$/.test(result.spend)||Number(result.spend)>99999999999999.99||!/^[A-Z]{3}$/.test(result.currency || ''))throw new Error('راجع الصرف والعملة في السطر '+(index+2)+'.');result.spend=Number(result.spend);metricCount++;}
      if(!metricCount) throw new Error('لا توجد مؤشرات فعلية في السطر '+(index+2)+'.');
      if(result.account_id.length>120||result.source_name.length>180||(result.account_name||'').length>180)throw new Error('هوية الحساب أو المصدر أطول من الحد المسموح.');
      return result;
    }).map(function(row,index,all){var key=[row.platform,row.account_id,row.scope,row.period_start,row.period_end].join('\u0000');if(all.slice(0,index).some(function(r){return [r.platform,r.account_id,r.scope,r.period_start,r.period_end].join('\u0000')===key;}))throw new Error('تقرير الحساب والفترة مكرر داخل الملف.');return row;});
  }
  function resetSocialImport() {
    socialImportTicket++; socialImportRows=[];
    el('socialImportFile').value=''; el('socialImportConfirm').checked=false; el('socialImportSave').disabled=true;
    el('socialImportPreview').hidden=true; el('socialImportFeedback').textContent='';
  }
  async function previewSocialImport() {
    var ticket=++socialImportTicket, file=el('socialImportFile').files[0]; socialImportRows=[];
    el('socialImportSave').disabled=true;el('socialImportConfirm').checked=false;el('socialImportFeedback').textContent='';el('socialImportPreview').hidden=true;
    if(!file)return;
    try{
      if(file.size>1024*1024)throw new Error('حجم الملف أكبر من 1 MB.');
      var rows=parseSocialCsv(await file.text()); if(ticket!==socialImportTicket)return;
      socialImportRows=rows;
      el('socialImportPreview').innerHTML='<strong>'+n(rows.length)+' تقرير جاهز للمراجعة</strong><p>سيُحفظ تقرير واحد لكل حساب ونطاق وفترة. التقرير الأحدث في وقت الاستخراج يُحدّث النسخة السابقة؛ لا تتضاعف الأرقام بإعادة الاستيراد.</p><div class="table-wrap"><table><thead><tr><th>المنصة والحساب</th><th>الفترة والنطاق</th><th>الوصول</th><th>المشاهدات</th><th>التفاعلات</th></tr></thead><tbody>'+rows.map(function(row){return '<tr><td>'+esc(SOCIAL_NAMES[row.platform]+' · '+(row.account_name||row.account_id))+'</td><td>'+esc(reportPeriod(row)+' · '+socialScope(row.scope))+'</td><td>'+socialValue(row.reach)+'</td><td>'+socialValue(row.views)+'</td><td>'+socialValue(row.interactions)+'</td></tr>';}).join('')+'</tbody></table></div>';
      el('socialImportPreview').hidden=false;
    }catch(error){if(ticket===socialImportTicket)el('socialImportFeedback').textContent=error.message || 'تعذر قراءة الملف.';}
  }
  async function saveSocialImport() {
    if(!token || !socialImportRows.length || !el('socialImportConfirm').checked || socialImportPending)return;
    var auth=token,ticket=socialImportTicket;socialImportPending=true;el('socialImportSave').disabled=true;el('socialImportFile').disabled=true;el('socialImportConfirm').disabled=true;
    el('socialImportFeedback').textContent='جارٍ حفظ التقارير…';
    try{
      var result=await request({mode:'social_reports_import',token:auth,rows:socialImportRows});
      if(auth!==token || ticket!==socialImportTicket)return;
      resetSocialImport();el('socialImportFeedback').textContent='تم حفظ '+n(result.saved)+' من '+n(result.submitted)+' تقرير. '+(result.saved<result.submitted?'التقارير الأقدم من النسخة المحفوظة لم تُستبدل.':'');
      await load({quiet:true,background:true});showToast('تم حفظ تقارير السوشيال بمصدرها وفترتها');
    }catch(error){if(auth!==token || ticket!==socialImportTicket)return;if(error.status===401)logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');else el('socialImportFeedback').textContent='لم يتم حفظ الملف. راجع البيانات أو أعد المحاولة. ('+error.message+')';}
    finally{socialImportPending=false;el('socialImportFile').disabled=false;el('socialImportConfirm').disabled=false;el('socialImportSave').disabled=!socialImportRows.length||!el('socialImportConfirm').checked;}
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
    else if (activeView === 'customers') loadCustomers();
    else if (activeView === 'commercial') renderCommercial(data);
    else if (activeView === 'funnel') renderFunnel(data);
    else if (activeView === 'trend') renderTrend(data);
    else if (activeView === 'google-ads') renderAds(data);
    else if (activeView === 'business-profile') renderBusinessProfile(data);
    else if (activeView === 'social') renderSocial(data);
    else if (activeView === 'measurement') renderMeasurement(data);
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
      if (!options.quiet) showToast('تم تحديث البيانات وفحص الإجماليات');
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
    customerTicket++; customerPickerTicket++; customerDetailTicket++;
    customerRecord = null; pipelineCustomer = null; el('customerList').innerHTML = ''; el('customerDetail').innerHTML = ''; el('customerPickerList').innerHTML = ''; el('customerForm').reset();
    if(el('customerDialog').open)el('customerDialog').close();
    resetPipelineForm(); setLoading(false);
    closeDecisionEditor(); resetSocialImport();
    el('socialLinkOutput').value=''; el('socialLinkCopy').disabled=true; el('socialLinkOpen').hidden=true;
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
    pipelineCustomer = null;
    el('pipelineId').value = ''; renderPipelineCustomer();
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
    pipelineCustomer = null; renderPipelineCustomer();
    el('pipelineSourceType').value = row.sourceType || 'whatsapp';
    el('pipelineStage').value = row.stage || 'new';
    el('pipelineServiceType').value = row.serviceType || '';
    el('pipelineCampaign').value = row.campaignName || '';
    el('pipelineEstimatedValue').value = number(row.estimatedValue);
    el('pipelineContractValue').value = number(row.contractValue);
    var reported = readReportedSource(row.notes);
    el('pipelineReportedSource').value = reported.source;
    el('pipelineNotes').value = reported.notes;
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
      if (result.outcome) { fillPipelineForm(result.outcome); pipelineCustomer = result.contact || null; renderPipelineCustomer(); renderPipelineHistory(result.history || [], result.historyTruncated); }
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
    var freeNotes = el('pipelineNotes').value.trim();
    if (stage === 'lost' && el('pipelineLostReason').value === 'other' && !freeNotes) {
      el('pipelineError').textContent = 'اكتب سبب عدم التعاقد في الملاحظة.'; return;
    }
    var savedNotes = writeReportedSource(el('pipelineReportedSource').value, freeNotes);
    if (savedNotes.length > 500) {
      el('pipelineError').textContent = 'اختصر الملاحظة قليلًا لحفظها مع مصدر العميل (500 حرف كحد أقصى).'; return;
    }
    var queuedForSheets = el('pipelineSourceType').value === 'whatsapp' && ['qualified', 'quote_sent', 'site_visit', 'contract_signed'].indexOf(stage) !== -1;
    button.disabled = true; button.textContent = 'حفظ…';
    try {
      var savedOutcome = await request({
        mode: 'sales_outcome_upsert', token: token, id: el('pipelineId').value || null,
        sourceRef: el('pipelineForm').dataset.sourceRef || null,
        sourceType: el('pipelineSourceType').value, stage: stage,
        serviceType: el('pipelineServiceType').value.trim(), campaignName: el('pipelineCampaign').value.trim(),
        estimatedValue: number(el('pipelineEstimatedValue').value), contractValue: number(el('pipelineContractValue').value),
        notes: savedNotes,
        expectedUpdatedAt: el('pipelineForm').dataset.updatedAt || null,
        assignee: el('pipelineAssignee').value.trim(), nextAction: el('pipelineNextAction').value.trim(),
        nextFollowUpAt: inputTimestamp(el('pipelineFollowupAt').value), lastContactAt: inputTimestamp(el('pipelineLastContactAt').value),
        projectLocation: el('pipelineLocation').value.trim(), executionTiming: el('pipelineTiming').value,
        serviceFit: el('pipelineFit').value, contactResult: el('pipelineContactResult').value, lostReason: el('pipelineLostReason').value || null
      });
      showToast(queuedForSheets ? 'تم الحفظ وإضافة العميل إلى طابور Google Sheets' : 'تم حفظ مرحلة البيع وربطها بالإحصائيات', true);
      resetPipelineForm(); await load();
      if (savedOutcome.outcome) await openOpportunity(savedOutcome.outcome.id);
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
  var customerPage=1,customerTotal=0,customerTicket=0,customerPickerTicket=0,customerDetailTicket=0;
  var customerRecord=null,pipelineCustomer=null,customerSearchTimer,customerPickerTimer;
  var customerBusy=false;
  function customerRequest(action,body){return request({mode:'customer_api',token:token,action:action,payload:body});}
  function customerError(error){return {customer_duplicate:'يوجد عميل بنفس رقم الهاتف. ابحث عنه واربط الفرصة بملفه.',customer_conflict:'تغيّر الملف أو الربط من جلسة أخرى. افتح النسخة الأحدث وراجع التعديل.',customer_invalid:'راجع الاسم ورقم الهاتف والعميل المحدد.',customer_not_found:'ملف العميل غير متاح.'}[error.message]||'تعذّر تحميل أو حفظ ملف العميل. أعد المحاولة.';}
  function renderPipelineCustomer(){
    var id=el('pipelineId').value;
    el('pipelineCustomerName').textContent=pipelineCustomer?pipelineCustomer.name:'الفرصة غير مرتبطة بملف عميل';
    if(!id)el('pipelineCustomerName').textContent='احفظ الفرصة، ثم اربطها بملف العميل';
    el('pipelineCustomerChoose').hidden=!id;el('pipelineCustomerView').hidden=!pipelineCustomer;el('pipelineCustomerUnlink').hidden=!pipelineCustomer;
    el('pipelineCustomerChoose').textContent=pipelineCustomer?'تغيير العميل':'ربط بملف عميل';
  }
  async function loadCustomers(){
    var ticket=++customerTicket,auth=token;if(!auth)return;
    el('customerError').textContent='';el('customerList').innerHTML='<div class="empty-box">جارٍ تحميل العملاء…</div>';
    try{
      var data=await customerRequest('list',{page:customerPage,search:el('customerSearch').value.trim(),status:el('customerStatus').value});
      if(ticket!==customerTicket||auth!==token)return;
      customerTotal=data.total;el('customerCount').textContent=n(data.total)+' عميل';el('customerPage').textContent=customerPage+' / '+Math.max(1,Math.ceil(data.total/30));
      el('customerPrevious').disabled=customerPage<=1;el('customerNext').disabled=customerPage*30>=data.total;
      el('customerList').innerHTML=data.rows.length?data.rows.map(function(c){return '<article class="customer-card"><div class="customer-avatar">'+esc(c.name.slice(0,1))+'</div><div><h3>'+esc(c.name)+'</h3><p>'+esc(c.company||'عميل فردي')+'</p><a dir="ltr" href="tel:'+esc(c.phone)+'">'+esc(c.phone)+'</a></div><div class="customer-card-meta"><span>'+n(c.opportunities)+' فرصة مرتبطة</span><small>'+(c.next_follow_up_at?'المتابعة: '+esc(formatDate(c.next_follow_up_at)):'لا يوجد موعد متابعة مسجل')+'</small></div><button type="button" class="button-secondary" data-customer="'+esc(c.id)+'">فتح الملف</button></article>';}).join(''):'<div class="empty-box">لا توجد نتائج. أضف عميلًا أو غيّر البحث والتصفية.</div>';
    }catch(error){if(ticket!==customerTicket||auth!==token)return;el('customerList').innerHTML='';el('customerError').textContent=customerError(error);if(error.status===401)logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');}
  }
  function showCustomerDialog(title){
    el('customerDialogTitle').textContent=title;el('customerDialogError').textContent='';el('customerDetail').hidden=true;el('customerForm').hidden=true;el('customerPicker').hidden=true;
    if(!el('customerDialog').open)el('customerDialog').showModal();
  }
  function closeCustomerDialog(){if(customerBusy)return;customerDetailTicket++;customerPickerTicket++;el('customerDialog').close();el('customerDetail').innerHTML='';el('customerPickerList').innerHTML='';el('customerForm').reset();customerRecord=null;}
  async function openCustomer(id){
    showCustomerDialog('ملف العميل');el('customerDetail').hidden=false;el('customerDetail').innerHTML='<p>جارٍ تحميل رحلة العميل…</p>';
    var ticket=++customerDetailTicket,auth=token;
    try{
      var data=await customerRequest('detail',{id:id});if(ticket!==customerDetailTicket||auth!==token||!el('customerDialog').open)return;
      customerRecord=data.contact;renderCustomerDetail(data);
    }catch(error){if(ticket!==customerDetailTicket||auth!==token)return;el('customerDetail').innerHTML='';el('customerDialogError').textContent=customerError(error);if(error.status===401)logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');}
  }
  function renderCustomerDetail(data){
    var c=data.contact,stats=data.stats,open=(data.outcomes||[]).filter(function(o){return !['lost','contract_signed'].includes(o.stage);});
    var next=open.filter(function(o){return o.nextFollowUpAt;}).sort(function(a,b){return Date.parse(a.nextFollowUpAt)-Date.parse(b.nextFollowUpAt);})[0];
    el('customerDetail').innerHTML='<div class="customer-profile-head"><span class="customer-avatar">'+esc(c.name.slice(0,1))+'</span><div><h3>'+esc(c.name)+'</h3><p>'+esc(c.company||'عميل فردي')+' · '+(c.active?'نشط':'مؤرشف')+'</p><a dir="ltr" href="tel:'+esc(c.phone)+'">'+esc(c.phone)+'</a></div></div><div class="customer-profile-actions"><a class="button-secondary" href="tel:'+esc(c.phone)+'">اتصال</a><a class="button-secondary" href="https://wa.me/'+c.phone.replace(/\D/g,'')+'" target="_blank" rel="noreferrer">فتح واتساب</a><button type="button" class="button-ghost" data-customer-edit>تعديل الملف</button></div><div class="customer-profile-stats">'+[['فرص',n(stats.opportunities)],['مفتوحة',n(stats.open)],['عقود',n(stats.contracts)],['قيمة العقود',money(stats.contractValue,'SAR')]].map(function(x){return '<div><strong>'+esc(x[1])+'</strong><span>'+x[0]+'</span></div>';}).join('')+'</div>'+(next?'<button class="customer-next '+(Date.parse(next.nextFollowUpAt)<Date.now()?'is-overdue':'')+'" type="button" data-customer-outcome="'+esc(next.id)+'"><span>الخطوة القادمة'+(Date.parse(next.nextFollowUpAt)<Date.now()?' · متأخرة':'')+'</span><strong>'+esc(next.nextAction||'راجع الفرصة وحدد الإجراء')+'</strong><small>'+esc(formatDate(next.nextFollowUpAt))+' · '+esc(next.assignee||'غير معيّن')+'</small></button>':open.length?'<p class="workspace-notice">'+n(open.length)+' فرصة مفتوحة تحتاج تحديد موعد المتابعة.</p>':'')+(c.note?'<p class="customer-note">'+esc(c.note)+'</p>':'')+'<h3 class="customer-section-title">الفرص والعقود</h3><div class="customer-outcomes">'+(data.outcomes.length?data.outcomes.map(function(o){return '<button type="button" class="customer-outcome" data-customer-outcome="'+esc(o.id)+'"><div><code>'+esc(opportunityId(o))+'</code><strong>'+esc(o.serviceType||'الخدمة غير محددة')+'</strong><small>'+esc(sourceLabel(o.acquisitionSource||'غير مرتبط'))+' · '+esc(o.campaignName||'دون حملة مسجلة')+'</small></div><span class="stage-tag '+esc(o.stage)+'">'+esc(salesStageLabel(o.stage))+'</span><small>'+esc(o.stage==='contract_signed'?money(o.contractValue,'SAR'):formatDate(o.nextFollowUpAt))+'</small></button>';}).join(''):'<div class="empty-box">لا توجد فرص مرتبطة. افتح فرصة من المبيعات واختر «ربط بملف عميل».</div>')+'</div><small>يعرض أحدث 100 فرصة؛ الأعداد تشمل كل الفرص المرتبطة.</small><h3 class="customer-section-title">سجل الرحلة</h3><ol class="customer-timeline">'+(data.timeline.length?data.timeline.map(function(h){var contactEvent=h.id.indexOf('contact-')===0;var title=contactEvent?{created:'إنشاء ملف العميل',updated:'تعديل ملف العميل',linked:'ربط فرصة بالعميل',unlinked:'إزالة ربط فرصة'}[h.event_type]:h.event_type==='stage_changed'?salesStageLabel(h.from_stage)+' ← '+salesStageLabel(h.to_stage):h.event_type==='created'?'إنشاء فرصة':'تحديث متابعة الفرصة';var change=h.changes||{};var action=change.next_action&&change.next_action.to;return '<li><time>'+esc(formatDate(h.occurred_at))+'</time><strong>'+esc(title)+'</strong>'+(h.outcome_id?'<small>'+esc(opportunityId({id:h.outcome_id}))+'</small>':'')+(action?'<p>'+esc(action)+'</p>':'')+'</li>';}).join(''):'<li>لم تُسجل عمليات بعد.</li>')+'</ol><small>أحدث 100 عملية محفوظة بتاريخها الفعلي.</small>';
  }
  function editCustomer(record){
    customerRecord=record||{id:crypto.randomUUID(),version:0};customerDetailTicket++;showCustomerDialog(record?'تعديل ملف العميل':'عميل جديد');
    el('customerForm').hidden=false;el('customerForm').reset();el('customerName').value=customerRecord.name||'';el('customerPhone').value=customerRecord.phone||'';el('customerCompany').value=customerRecord.company||'';el('customerNote').value=customerRecord.note||'';el('customerActive').value=customerRecord.active===false?'false':'true';el('customerName').focus();
  }
  async function saveCustomer(event){
    event.preventDefault();if(customerBusy)return;customerBusy=true;el('customerSave').disabled=true;el('customerDialogError').textContent='';
    try{var data=await customerRequest('save',{id:customerRecord.id,version:customerRecord.version,name:el('customerName').value.trim(),phone:el('customerPhone').value,company:el('customerCompany').value.trim(),note:el('customerNote').value,active:el('customerActive').value==='true'});if(!token)return;showToast('تم حفظ ملف العميل');if(pipelineCustomer&&pipelineCustomer.id===data.contact.id){pipelineCustomer=data.contact;renderPipelineCustomer();}if(activeView==='customers')loadCustomers();await openCustomer(data.contact.id);}
    catch(error){el('customerDialogError').textContent=customerError(error);if(error.status===401)logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');}
    finally{customerBusy=false;el('customerSave').disabled=false;}
  }
  async function loadCustomerPicker(){
    var ticket=++customerPickerTicket,auth=token;el('customerPickerList').innerHTML='<p>جارٍ البحث…</p>';
    try{var data=await customerRequest('list',{status:'active',search:el('customerPickerSearch').value.trim()});if(ticket!==customerPickerTicket||auth!==token)return;el('customerPickerList').innerHTML=data.rows.length?data.rows.map(function(c){return '<button type="button" data-link-customer="'+esc(c.id)+'"><span><strong>'+esc(c.name)+'</strong><small dir="ltr">'+esc(c.phone)+'</small></span><span>ربط بهذا العميل</span></button>';}).join(''):'<p>لا توجد نتائج. أضف ملف العميل من قسم ملفات العملاء.</p>';}
    catch(error){if(ticket!==customerPickerTicket||auth!==token)return;el('customerPickerList').innerHTML='';el('customerDialogError').textContent=customerError(error);if(error.status===401)logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');}
  }
  async function linkCustomer(id){
    if(customerBusy||!el('pipelineId').value)return;customerBusy=true;el('customerDialogError').textContent='';
    var outcomeId=el('pipelineId').value;
    try{await customerRequest('link',{outcome_id:outcomeId,contact_id:id||null,expected_contact_id:pipelineCustomer?pipelineCustomer.id:null});customerBusy=false;closeCustomerDialog();showToast(id?'تم ربط الفرصة بملف العميل':'تمت إزالة الربط');await openOpportunity(outcomeId);}
    catch(error){var msg=customerError(error);if(el('customerDialog').open)el('customerDialogError').textContent=msg;else showToast(msg,true);if(error.status===401)logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');}
    finally{customerBusy=false;}
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
    var rows = [['معرف العرض','معرف الفرصة الكامل','تاريخ الإحالة','القناة','المصدر','الحملة','الخدمة','المنطقة','المرحلة','المسؤول','المتابعة القادمة (ISO)','آخر تواصل فعلي (ISO)','قيمة متوقعة SAR','قيمة العقد SAR','سبب عدم التعاقد','مرجع الإحالة','المصدر حسب إفادة العميل']].concat(entries.map(function (row) {
      return [opportunityId(row),row.id,row.occurredAt,salesSourceLabel(row.sourceType),sourceLabel(row.acquisitionSource || 'غير مرتبط'),row.campaignName,row.serviceType,row.projectLocation,salesStageLabel(row.stage),row.assignee,row.nextFollowUpAt,row.lastContactAt,row.estimatedValue,row.contractValue,row.lostReason ? lostReasonLabel(row.lostReason) : '',row.sourceRef,REPORTED_SOURCES[readReportedSource(row.notes).source] || 'لم يُسجل'];
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
    if (viewMotion) { viewMotion.cancel(); viewMotion = null; }
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
    renderRouteLinks(activeView);
    if (previous !== activeView || !section.dataset.rendered) { renderCurrentView(); section.dataset.rendered = payload ? 'true' : ''; }
    if (move && previous !== activeView && !window.matchMedia('(prefers-reduced-motion:reduce)').matches && section.animate) {
      viewMotion = section.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
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
  function renderRouteLinks(view) {
    var groups = {
      'google-ads': [['acquisition','مصادر الإحالات'],['sales-pipeline','جودة الفرص'],['decisions','قرار التوسع']],
      'acquisition': [['google-ads','الصرف والإحالات'],['performance','صفحات الوصول'],['funnel','مسار التحويل']],
      'business-profile': [['google-ads','الإعلانات'],['acquisition','المصادر'],['decisions','القرارات']],
      'sales-pipeline': [['followups','الخطوة القادمة'],['customers','ملفات العملاء'],['commercial','قيمة العقود']],
      'decisions': [['google-ads','الصرف والإحالات'],['followups','المتابعات'],['commercial','النتائج']]
    };
    var links = groups[view] || [['google-ads','الصرف والإحالات'],['sales-pipeline','الفرص والعقود'],['decisions','القرارات']];
    el('routeLinks').innerHTML = '<span>انتقل إلى</span>' + links.filter(function (item) { return item[0] !== view; }).map(function (item) { return '<a href="#' + item[0] + '">' + item[1] + '<svg class="cc-icon" aria-hidden="true"><use href="#cc-i-arrow"></use></svg></a>'; }).join('');
  }
  function navigateTo(id) {
    closeHeaderPanels(); closeNavigation(false);
    if (!el(id) || !el(id).closest('.admin-section')) id = 'executive';
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
  el('socialFilter').addEventListener('click',function(event){var button=event.target.closest('[data-platform]');if(button)filterSocial(button.dataset.platform);});
  el('socialPlatformCards').addEventListener('click',function(event){var button=event.target.closest('[data-platform]');if(button)filterSocial(button.dataset.platform);});
  el('socialReportSelect').addEventListener('change',renderSocialReport);
  el('socialLinkForm').addEventListener('submit',function(event){event.preventDefault();el('socialLinkError').textContent='';el('socialLinkOutput').value='';el('socialLinkCopy').disabled=true;el('socialLinkOpen').hidden=true;try{var link=buildSocialLink();el('socialLinkOutput').value=link;el('socialLinkCopy').disabled=false;el('socialLinkOpen').href=link;el('socialLinkOpen').hidden=false;}catch(error){el('socialLinkError').textContent=error.message || 'راجع رابط الصفحة.';}});
  el('socialLinkForm').addEventListener('input',function(event){if(event.target===el('socialLinkOutput'))return;el('socialLinkOutput').value='';el('socialLinkCopy').disabled=true;el('socialLinkOpen').hidden=true;});
  el('socialLinkCopy').addEventListener('click',function(){if(!el('socialLinkOutput').value)return;navigator.clipboard.writeText(el('socialLinkOutput').value).then(function(){showToast('تم نسخ رابط الحملة');}).catch(function(){showToast('تعذر النسخ؛ يمكنك نسخ الرابط من الحقل',true);});});
  el('socialTemplateButton').addEventListener('click',function(){downloadCsv([SOCIAL_CSV_FIELDS],'tawod-social-account-period-template.csv');});
  el('socialImportFile').addEventListener('change',previewSocialImport);
  el('socialImportConfirm').addEventListener('change',function(){el('socialImportSave').disabled=socialImportPending||!socialImportRows.length||!this.checked;});
  el('socialImportSave').addEventListener('click',saveSocialImport);
  el('googleAdsSyncButton').addEventListener('click', refreshGoogleAds);
  el('periodSelect').addEventListener('change', load);
  el('copyButton').addEventListener('click', function () { closeHeaderPanels(); copySummary(); });
  el('printButton').addEventListener('click', function () { closeHeaderPanels(); window.print(); });
  el('logoutButton').addEventListener('click', function () { logoutNow(); });
  el('callsBody').addEventListener('click', function (event) { if (event.target.classList.contains('save-call')) saveCall(event.target); });
  el('customerNew').addEventListener('click',function(){editCustomer(null);});
  el('customerClose').addEventListener('click',closeCustomerDialog);
  el('customerDialog').addEventListener('cancel',function(event){if(customerBusy)event.preventDefault();else{customerDetailTicket++;customerPickerTicket++;customerRecord=null;}});
  el('customerSearch').addEventListener('input',function(){clearTimeout(customerSearchTimer);customerSearchTimer=setTimeout(function(){customerPage=1;loadCustomers();},300);});
  el('customerStatus').addEventListener('change',function(){customerPage=1;loadCustomers();});
  el('customerPrevious').addEventListener('click',function(){if(customerPage>1){customerPage--;loadCustomers();}});
  el('customerNext').addEventListener('click',function(){if(customerPage*30<customerTotal){customerPage++;loadCustomers();}});
  el('customerList').addEventListener('click',function(event){var b=event.target.closest('[data-customer]');if(b)openCustomer(b.dataset.customer);});
  el('customerForm').addEventListener('submit',saveCustomer);
  el('customerCancelEdit').addEventListener('click',function(){if(customerBusy)return;if(customerRecord.version)openCustomer(customerRecord.id);else closeCustomerDialog();});
  el('customerDetail').addEventListener('click',function(event){if(event.target.closest('[data-customer-edit]'))editCustomer(customerRecord);var b=event.target.closest('[data-customer-outcome]');if(b){closeCustomerDialog();openOpportunity(b.dataset.customerOutcome);}});
  el('pipelineCustomerChoose').addEventListener('click',function(){showCustomerDialog('ربط فرصة بعميل');el('customerPicker').hidden=false;el('customerPickerSearch').value='';loadCustomerPicker();el('customerPickerSearch').focus();});
  el('pipelineCustomerView').addEventListener('click',function(){if(pipelineCustomer)openCustomer(pipelineCustomer.id);});
  el('pipelineCustomerUnlink').addEventListener('click',function(){linkCustomer(null);});
  el('customerPickerSearch').addEventListener('input',function(){clearTimeout(customerPickerTimer);customerPickerTimer=setTimeout(loadCustomerPicker,250);});
  el('customerPickerList').addEventListener('click',function(event){var b=event.target.closest('[data-link-customer]');if(b)linkCustomer(b.dataset.linkCustomer);});
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
