(function () {
  'use strict';

  var API = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
  var TOKEN_KEY = 'tawodAdminToken';
  var NOTIFICATION_KEY = 'tawodSeenNotificationsV2';
  var LAST_REFERRAL_KEY = 'tawodLastReferralV2';
  var token = '';
  var payload = null;
  var insights = [];

  function el(id) { return document.getElementById(id); }
  function number(value) { return Number(value || 0); }
  function n(value, digits) {
    return number(value).toLocaleString('ar-SA', { maximumFractionDigits: digits == null ? 0 : digits });
  }
  function pct(value) { return n(value, 1) + '%'; }
  function rate(a, b) { return number(b) ? number(a) / number(b) * 100 : 0; }
  function money(value, currency) {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency || 'SAR', maximumFractionDigits: 2 }).format(number(value));
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
      whatsapp: 'WhatsApp', 'l.wl.co': 'رابط WhatsApp'
    };
    return labels[key] || value || 'غير معروف';
  }
  function deviceLabel(value) {
    return { mobile: 'جوال', desktop: 'كمبيوتر', tablet: 'تابلت', unknown: 'غير معروف' }[value] || value || '—';
  }
  function statusFreshness(connected, at) {
    if (!connected) return { label: 'غير متصل', cls: 'is-offline' };
    var age = at ? (Date.now() - new Date(at).getTime()) / 3600000 : Infinity;
    if (age <= 30) return { label: 'متصل · محدث', cls: 'is-live' };
    return { label: 'متصل · يحتاج تحديث', cls: 'is-stale' };
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
    ['refreshButton', 'copyButton', 'printButton'].forEach(function (id) { el(id).disabled = on; });
    el('refreshButton').textContent = on ? 'تحديث…' : 'تحديث';
  }
  function metric(label, value, hint, source, cls) {
    return '<article class="kpi-card ' + esc(cls || '') + '"><div class="metric-top"><span>' + esc(label) +
      '</span><em>' + esc(source) + '</em></div><strong>' + esc(value) + '</strong><small>' + esc(hint) + '</small></article>';
  }
  function unavailableMetrics(labels, source) {
    return labels.map(function (label) { return metric(label, 'غير متصل', 'يلزم ربط المصدر', source, 'is-unavailable'); }).join('');
  }

  function confidence(sessions) {
    if (number(sessions) < 10) return 'غير كافية';
    if (number(sessions) < 50) return 'أولية';
    if (number(sessions) < 150) return 'متوسطة';
    return 'قوية';
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
    return { score: score, label: label, text: 'الحكم مبني على معدل الإحالة، اتجاهها، ومطابقة إجماليات المصادر والأجهزة.' };
  }
  function makeInsight(priority, area, title, evidence, action, source) {
    return { priority: priority, area: area, title: title, evidence: evidence, action: action, source: source };
  }
  function buildInsights(data) {
    var s = data.summary || {};
    var ads = data.googleAds || {};
    var bp = data.businessProfile || {};
    var rows = [];
    if (!(data.dataQuality || {}).reconciled) {
      rows.push(makeInsight('high', 'جودة البيانات', 'يوجد فرق في إجماليات الجلسات', 'مجموع المصادر أو الأجهزة لا يساوي إجمالي الزيارات.', 'أوقف قرارات الميزانية حتى تتم مطابقة المصدر.', 'First-party'));
    }
    if (!ads.connected) {
      rows.push(makeInsight('high', 'Google Ads', 'الميزانيات ومدة المكالمات غير متصلة', 'بيانات الموقع تثبت وجود إحالات، لكن مصدر Google Ads لم يرسل ميزانية أو Call Reporting بعد.', 'شغّل سكربت المزامنة من حساب Google Ads وجدوله يوميًا.', 'Google Ads API'));
    }
    if (!bp.connected) {
      rows.push(makeInsight('medium', 'الملف التجاري', 'أداء الملف التجاري غير متصل', 'لا يمكن قياس Search وMaps والمكالمات والاتجاهات بدقة بدون Performance API.', 'فعّل Business Profile Performance API وشغّل مزامنة الموقع التجاري.', 'Business Profile API'));
    }
    if (number(s.sessions) >= 30 && number(s.referralRate) < 5) {
      rows.push(makeInsight('high', 'التحويل', 'معدل الإحالة أقل من 5%', n(s.referralSessions) + ' إحالة فريدة من ' + n(s.sessions) + ' زيارة.', 'حسّن عرض القيمة وأزرار الاتصال وواتساب في الصفحات الأعلى زيارة.', 'First-party'));
    }
    var desktop = (data.devices || []).filter(function (row) { return row.device === 'desktop'; })[0];
    var mobile = (data.devices || []).filter(function (row) { return row.device === 'mobile'; })[0];
    if (desktop && mobile && number(desktop.sessions) >= 30 && number(desktop.referralRate) < number(mobile.referralRate) * 0.5) {
      rows.push(makeInsight('medium', 'الأجهزة', 'تحويل الكمبيوتر أضعف من الجوال', 'معدل الكمبيوتر ' + pct(desktop.referralRate) + ' مقابل ' + pct(mobile.referralRate) + ' للجوال.', 'راجع وضوح أزرار التواصل والعرض أعلى صفحات الكمبيوتر.', 'First-party'));
    }
    var paid = (data.sources || []).filter(function (row) { return row.source === 'google-ads'; })[0];
    if (paid && number(paid.sessions) >= 20 && number(paid.referralRate) >= 8) {
      rows.push(makeInsight('good', 'الاكتساب', 'زيارات Google Ads تُظهر نية تواصل قوية', n(paid.referrals) + ' إحالة من ' + n(paid.sessions) + ' زيارة منسوبة للحملات (' + pct(paid.referralRate) + ').', 'اربط الصرف والميزانية قبل التوسع لتقييم تكلفة الإحالة الحقيقية.', 'First-party attribution'));
    }
    if (ads.connected) {
      var a = ads.summary || {};
      if (number(a.receivedCalls) && rate(a.missedCalls, a.trackedCalls) > 20) {
        rows.push(makeInsight('high', 'المكالمات', 'نسبة مكالمات فائتة مرتفعة', n(a.missedCalls) + ' مكالمة فائتة من ' + n(a.trackedCalls) + ' مكالمة مقاسة.', 'حدد تغطية للرد خلال ساعات الحملات وراجع جدول ظهور الإعلانات.', 'Google Ads Call Reporting'));
      }
      if (number(a.budgetUseRate) > 110) {
        rows.push(makeInsight('high', 'الميزانية', 'الصرف أعلى من الميزانية المخططة للفترة', 'نسبة استخدام الميزانية التقديرية ' + pct(a.budgetUseRate) + '.', 'راجع الميزانيات المشتركة وتغييرات الميزانية قبل رفع العطاءات.', 'Google Ads API'));
      }
    }
    if (!rows.length) rows.push(makeInsight('info', 'المتابعة', 'لا توجد إشارة حرجة', 'الإجماليات متطابقة ولا توجد مشكلة مدعومة بعينة كافية.', 'استمر بالمراقبة وراجع جودة العملاء أسبوعيًا.', 'المصادر المتصلة'));
    var weight = { high: 0, medium: 1, info: 2, good: 3 };
    return rows.sort(function (a, b) { return weight[a.priority] - weight[b.priority]; });
  }

  function renderExecutive(data) {
    var s = data.summary || {};
    var q = data.dataQuality || {};
    var ads = data.googleAds || {};
    var a = ads.summary || {};
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
      metric('الإحالات الناجحة', n(s.referralSessions), 'جلسة ضغطت اتصال أو واتساب', 'الموقع', 'referrals'),
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
    quality.innerHTML = '<span class="quality-dot"></span><strong>' + (q.reconciled ? 'الإجماليات متطابقة 100%' : 'يوجد فرق يحتاج مراجعة') +
      '</strong><small>الزيارات ' + n(q.sessionTotal) + ' = المصادر ' + n(q.sourceTotal) + ' = الأجهزة ' + n(q.deviceTotal) +
      ' · آخر حدث ' + formatDate(q.lastEventAt) + '</small>';

    var defs = data.definitions || {};
    el('definitionStrip').innerHTML = [
      ['الزيارة', defs.visit], ['الإحالة الناجحة', defs.successfulReferral],
      ['العميل المحتمل', defs.potentialCustomer], ['العميل المؤكد', defs.confirmedCustomer]
    ].map(function (item) { return '<div><strong>' + esc(item[0]) + '</strong><span>' + esc(item[1]) + '</span></div>'; }).join('');
  }

  function renderFunnel(data) {
    var s = data.summary || {};
    var ads = data.googleAds || {};
    var a = ads.summary || {};
    var stages = [
      { label: 'زيارة', value: n(s.sessions), note: 'جلسة فريدة', source: 'الموقع', cls: '' },
      { label: 'إحالة ناجحة', value: n(s.referralSessions), note: pct(s.referralRate) + ' من الزيارات', source: 'الموقع', cls: 'referral' },
      { label: 'مكالمة مقاسة', value: ads.callReportingConnected ? n(a.trackedCalls) : '—', note: ads.callReportingConnected ? 'سجل Call Reporting' : 'المصدر غير متصل', source: 'Google Ads', cls: ads.callReportingConnected ? '' : 'muted' },
      { label: 'عميل محتمل', value: ads.callReportingConnected ? n(a.potentialCustomers) : '—', note: 'مكالمة > 60 ثانية', source: 'Google Ads', cls: ads.callReportingConnected ? 'potential' : 'muted' },
      { label: 'عميل مؤكد', value: ads.callReportingConnected ? n(a.confirmedCustomers) : '—', note: '>60ث + تكرار أو زيارة', source: 'تأهيل', cls: ads.callReportingConnected ? 'confirmed' : 'muted' }
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
    el('googleAdsConnectHint').hidden = !!ads.connected;
    if (!ads.connected) {
      el('adsSummaryMetrics').innerHTML = unavailableMetrics(['الميزانية اليومية', 'الصرف', 'النقرات', 'التحويلات', 'مكالمات مقاسة', 'عملاء محتملون', 'عملاء مؤكدون', 'CPA'], 'Google Ads');
      el('budgetPanel').innerHTML = '<div class="empty-box">الميزانية والصرف غير متاحين قبل مزامنة الحساب.</div>';
      el('adsDailyChart').innerHTML = '<div class="chart-empty">المصدر غير متصل.</div>';
      el('adsCampaignsBody').innerHTML = ''; el('adsCampaignsEmpty').hidden = false;
      el('adsConversionActions').innerHTML = '<div class="table-empty">المصدر غير متصل.</div>';
    } else {
      el('adsSummaryMetrics').innerHTML = [
        metric('الميزانية اليومية', money(s.dailyBudget, currency), 'الميزانية الحالية للحملات المفعلة', 'Google Ads', 'budget'),
        metric('الصرف', money(s.cost, currency), 'الفترة المختارة', 'Google Ads', 'spend'),
        metric('النقرات', n(s.clicks), 'CTR ' + pct(s.ctr), 'Google Ads', ''),
        metric('التحويلات', n(s.conversions, 1), 'Conversion Actions', 'Google Ads', ''),
        metric('مكالمات مقاسة', ads.callReportingConnected ? n(s.trackedCalls) : 'غير متصل', 'مدة وحالة فعلية', 'Call Reporting', ''),
        metric('عملاء محتملون', ads.callReportingConnected ? n(s.potentialCustomers) : 'غير متصل', 'مكالمة مستلمة >60ث', 'Call Reporting', 'potential'),
        metric('عملاء مؤكدون', ads.callReportingConnected ? n(s.confirmedCustomers) : 'غير متصل', '>60ث + تكرار/زيارة', 'تأهيل', 'confirmed'),
        metric('CPA', money(s.cpa, currency), 'تكلفة تحويل Google Ads', 'Google Ads', '')
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
        var referrals = Math.max(number(row.trackedCalls), number(row.phoneCalls)) + number(row.whatsappConversions);
        return '<tr><td><strong>' + esc(row.name) + '</strong><br><small>' + esc(row.campaignId) + '</small></td><td>' + esc(row.status) + '</td><td>' + money(row.dailyBudget, currency) + '</td><td>' + money(row.cost, currency) + '</td><td>' + n(row.clicks) + '</td><td>' + pct(row.ctr) + '</td><td>' + n(referrals, 1) + '</td><td>' + n(row.potentialCustomers) + '</td><td>' + n(row.confirmedCustomers) + '</td><td>' + money(row.cpa, currency) + '</td></tr>';
      }).join('');
      var actions = ads.conversionActions || [];
      el('adsConversionActions').innerHTML = actions.length ? actions.map(function (row) {
        return '<div class="ads-conversion-action"><strong>' + esc(row.name) + '</strong><span>' + n(row.conversions, 1) + ' تحويل</span></div>';
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
      return '<tr><td>' + esc(formatDate(row.at)) + '</td><td>' + channel + '</td><td>' + esc(cleanPath(row.sourcePath)) + '</td><td>' + esc(sourceLabel(row.source)) + '</td><td>' + esc(row.campaign) + '</td><td>' + esc(deviceLabel(row.device)) + '</td><td><code>' + esc(row.session) + '</code></td></tr>';
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
      return '<article class="decision-item ' + row.priority + '"><div class="decision-meta"><span>أولوية ' + String(index + 1).padStart(2, '0') + '</span><b>' + labels[row.priority] + ' · ' + esc(row.area) + '</b></div><div class="decision-main"><h3>' + esc(row.title) + '</h3><p>' + esc(row.evidence) + '</p></div><div class="decision-next"><span>المصدر: ' + esc(row.source) + '</span><strong>' + esc(row.action) + '</strong></div></article>';
    }).join('');
  }

  function buildNotifications(data) {
    var rows = [];
    (data.recentReferrals || []).slice(0, 8).forEach(function (row) {
      rows.push({ id: 'ref-' + row.at + '-' + row.session + '-' + row.method, at: row.at, level: 'good', title: row.method === 'call' ? 'إحالة اتصال جديدة' : 'إحالة واتساب جديدة', text: sourceLabel(row.source) + ' · ' + cleanPath(row.sourcePath) });
    });
    var ads = data.googleAds || {};
    if (!ads.connected) rows.push({ id: 'source-google-ads-offline', at: null, level: 'high', title: 'Google Ads غير متصل', text: 'الميزانية والصرف ومدة المكالمات غير متاحة.' });
    if (!(data.businessProfile || {}).connected) rows.push({ id: 'source-business-profile-offline', at: null, level: 'medium', title: 'الملف التجاري غير متصل', text: 'إحصاءات Search وMaps والإجراءات غير متاحة.' });
    if (!(data.dataQuality || {}).reconciled) rows.push({ id: 'quality-mismatch-' + data.generatedAt, at: data.generatedAt, level: 'high', title: 'فرق في مطابقة البيانات', text: 'إجماليات المصادر أو الأجهزة لا تطابق الزيارات.' });
    (ads.calls || []).filter(function (row) { return row.confirmed; }).slice(0, 5).forEach(function (row) {
      rows.push({ id: 'confirmed-' + row.resourceName, at: row.startedAt, level: 'good', title: 'عميل مؤكد', text: formatDuration(row.durationSeconds) + ' · ' + (row.campaignName || 'مكالمة') });
    });
    return rows;
  }
  function renderNotifications(data) {
    var rows = buildNotifications(data);
    var seen = [];
    try { seen = JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || '[]'); } catch (error) {}
    var unread = rows.filter(function (row) { return seen.indexOf(row.id) === -1; }).length;
    el('notificationBadge').hidden = !unread;
    el('notificationBadge').textContent = n(unread);
    el('notificationList').innerHTML = rows.length ? rows.map(function (row) {
      return '<article class="notification-item ' + row.level + '"><i></i><div><strong>' + esc(row.title) + '</strong><p>' + esc(row.text) + '</p><small>' + (row.at ? formatDate(row.at) : 'إجراء مطلوب') + '</small></div></article>';
    }).join('') : '<div class="empty-box">لا توجد أحداث مهمة.</div>';
    var latest = (data.recentReferrals || [])[0];
    if (latest) {
      var key = latest.at + '-' + latest.session + '-' + latest.method;
      var previous = localStorage.getItem(LAST_REFERRAL_KEY);
      if (previous && previous !== key) showToast(latest.method === 'call' ? 'إحالة اتصال جديدة وصلت الآن' : 'إحالة واتساب جديدة وصلت الآن', true);
      localStorage.setItem(LAST_REFERRAL_KEY, key);
    }
    el('notificationButton').onclick = function () {
      var drawer = el('notificationDrawer');
      drawer.hidden = !drawer.hidden;
      el('notificationButton').setAttribute('aria-expanded', String(!drawer.hidden));
      if (!drawer.hidden) {
        localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(rows.map(function (row) { return row.id; }).slice(0, 100)));
        el('notificationBadge').hidden = true;
      }
    };
    el('closeNotifications').onclick = function () { el('notificationDrawer').hidden = true; el('notificationButton').setAttribute('aria-expanded', 'false'); };
  }

  function render(data) {
    payload = data;
    renderExecutive(data);
    renderFunnel(data);
    renderTrend(data);
    renderSources(data);
    renderSiteTables(data);
    renderAds(data);
    renderBusinessProfile(data);
    renderReferralsAndCalls(data);
    renderInsights();
    renderNotifications(data);
  }

  async function request(body) {
    var response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', credentials: 'omit' });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) { var failure = new Error(data.error || 'request_failed'); failure.status = response.status; throw failure; }
    return data;
  }
  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      render(await request({ mode: 'admin', token: token, days: number(el('periodSelect').value) || 30 }));
      showToast('تم تحديث البيانات ومطابقة المصادر');
    } catch (error) {
      if (error.status === 401) logoutNow('انتهت الجلسة. سجّل الدخول من جديد.');
      else showToast('تعذر تحميل البيانات الآن', true);
    } finally { setLoading(false); }
  }
  async function loginNow(event) {
    event.preventDefault();
    var button = el('loginButton');
    button.disabled = true; button.textContent = 'تحقق…'; el('adminLoginError').textContent = '';
    try {
      var result = await request({ mode: 'admin_login', username: el('adminUsername').value.trim(), password: el('adminPassword').value });
      token = result.token; sessionStorage.setItem(TOKEN_KEY, token);
      el('adminPassword').value = ''; el('adminLogin').hidden = true; el('adminApp').hidden = false;
      document.body.classList.add('is-authenticated'); await load();
    } catch (error) {
      el('adminLoginError').textContent = error.status === 401 ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'تعذر إنشاء جلسة الإدارة.';
    } finally { button.disabled = false; button.textContent = 'تسجيل الدخول'; }
  }
  function logoutNow(message) {
    sessionStorage.removeItem(TOKEN_KEY); token = ''; payload = null;
    el('adminApp').hidden = true; el('adminLogin').hidden = false; document.body.classList.remove('is-authenticated');
    el('adminLoginError').textContent = message || '';
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
      'مطابقة البيانات: ' + ((payload.dataQuality || {}).reconciled ? 'سليمة' : 'تحتاج مراجعة')
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(function () { showToast('تم نسخ الملخص'); }).catch(function () { showToast('تعذر النسخ'); });
  }
  function initNavigation() {
    el('adminNav').addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]'); if (!link) return;
      el('adminNav').querySelectorAll('a').forEach(function (item) { item.classList.toggle('is-active', item === link); });
    });
  }

  el('adminLoginForm').addEventListener('submit', loginNow);
  el('togglePassword').addEventListener('click', function () {
    var input = el('adminPassword'); var visible = input.type === 'text'; input.type = visible ? 'password' : 'text';
    this.textContent = visible ? 'إظهار' : 'إخفاء'; this.setAttribute('aria-pressed', String(!visible));
  });
  el('refreshButton').addEventListener('click', load);
  el('periodSelect').addEventListener('change', load);
  el('copyButton').addEventListener('click', copySummary);
  el('printButton').addEventListener('click', function () { window.print(); });
  el('logoutButton').addEventListener('click', function () { logoutNow(); });
  el('callsBody').addEventListener('click', function (event) { if (event.target.classList.contains('save-call')) saveCall(event.target); });
  if (/\.vercel\.app$/i.test(window.location.hostname)) el('previewNotice').hidden = false;
  initNavigation();
  token = sessionStorage.getItem(TOKEN_KEY) || '';
  if (token) {
    el('adminLogin').hidden = true; el('adminApp').hidden = false; document.body.classList.add('is-authenticated'); load();
  }
})();
