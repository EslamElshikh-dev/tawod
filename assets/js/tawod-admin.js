(function () {
  'use strict';

  var API = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
  var TOKEN_KEY = 'tawodAdminToken';
  var token = '';
  var lastData = null;
  var lastInsights = [];

  function $(id) { return document.getElementById(id); }
  var login = $('adminLogin');
  var app = $('adminApp');
  var form = $('adminLoginForm');
  var input = $('adminPassword');
  var error = $('adminLoginError');
  var loginButton = $('loginButton');
  var period = $('periodSelect');
  var refresh = $('refreshButton');
  var copyButton = $('copyButton');
  var printButton = $('printButton');
  var logout = $('logoutButton');
  var toast = $('adminToast');
  var loading = $('adminLoading');

  function number(value) { return Number(value || 0); }
  function n(value) { return number(value).toLocaleString('ar-SA'); }
  function pct(value) { return number(value).toLocaleString('ar-SA', { maximumFractionDigits: 1 }) + '%'; }
  function rate(a, b) { return number(b) ? (number(a) / number(b)) * 100 : 0; }
  function esc(value) {
    return String(value == null ? '—' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function sourceLabel(value) {
    var key = String(value || '').toLowerCase();
    var map = {
      direct: 'مباشر',
      'google-organic': 'Google Organic',
      google: 'Google',
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      whatsapp: 'WhatsApp'
    };
    return map[key] || value || '—';
  }
  function deviceLabel(value) {
    return { mobile: 'جوال', desktop: 'كمبيوتر', tablet: 'تابلت', unknown: 'غير معروف' }[value] || value || '—';
  }
  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh'
      }).format(new Date(value));
    } catch (e) { return '—'; }
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 1900);
  }
  function setLoading(on) {
    loading.hidden = !on;
    refresh.disabled = on;
    copyButton.disabled = on;
    printButton.disabled = on;
    refresh.textContent = on ? 'تحديث…' : 'تحديث';
  }

  function confidence(sessions) {
    sessions = number(sessions);
    if (sessions < 10) return { label: 'غير كافية', level: 'low' };
    if (sessions < 30) return { label: 'أولية', level: 'low' };
    if (sessions < 75) return { label: 'متوسطة', level: 'medium' };
    return { label: 'قوية', level: 'high' };
  }

  function growth(current, previous) {
    current = number(current);
    previous = number(previous);
    if (current === previous) return { label: 'بدون تغيير', cls: 'flat' };
    if (!previous) return { label: current ? 'بداية جديدة' : 'بدون تغيير', cls: current ? 'up' : 'flat' };
    var change = ((current - previous) / previous) * 100;
    return {
      label: (change > 0 ? '+' : '') + change.toLocaleString('ar-SA', { maximumFractionDigits: 1 }) + '%',
      cls: change > 0 ? 'up' : 'down'
    };
  }

  function health(data) {
    var s = data.summary || {};
    var current = (data.comparison7d || {}).current || {};
    var previous = (data.comparison7d || {}).previous || {};
    if (number(s.sessions) < 10) {
      return {
        score: 0,
        waiting: true,
        label: 'بانتظار عينة كافية',
        text: 'لا نعطي حكمًا رقميًا قبل وصول 10 جلسات فعلية على الأقل.'
      };
    }

    var contactScore = Math.min(number(s.contactRate) / 6, 1) * 25;
    var leadScore = Math.min(number(s.leadRate) / 4, 1) * 35;
    var completionScore = number(s.formSessions)
      ? Math.min(number(s.formCompletionRate) / 70, 1) * 20
      : 6;
    var momentum = 10;
    if (number(current.leads) > number(previous.leads)) momentum = 20;
    else if (number(current.leads) < number(previous.leads)) momentum = 4;

    var score = Math.round(Math.min(100, contactScore + leadScore + completionScore + momentum));
    var label = score >= 80 ? 'قمع قوي' : score >= 65 ? 'أداء جيد' : score >= 45 ? 'يحتاج تحسين' : 'فجوة تحويل واضحة';
    var text = score >= 80
      ? 'الأداء متماسك؛ ركّز على جودة العملاء والتوسع في المصادر الرابحة.'
      : score >= 65
        ? 'الوضع جيد لكن هناك مساحة لتحسين الصفحات أو المصادر الأقل تحويلًا.'
        : score >= 45
          ? 'هناك طلب فعلي، لكن جزءًا من الزوار يتسرب قبل الوصول إلى Lead.'
          : 'ابدأ بإصلاح التحويل قبل زيادة الزيارات أو الإنفاق الإعلاني.';
    return { score: score, waiting: false, label: label, text: text };
  }

  function insight(priority, area, title, evidence, action, impact) {
    return { priority: priority, area: area, title: title, evidence: evidence, action: action, impact: impact };
  }

  function buildInsights(data) {
    var s = data.summary || {};
    var pages = data.topPages || [];
    var sources = data.sources || [];
    var services = data.services || [];
    var campaigns = data.campaigns || [];
    var devices = data.devices || [];
    var insights = [];

    if (number(s.sessions) < 10) {
      insights.push(insight(
        'info', 'جودة البيانات', 'العينة ما زالت صغيرة',
        'عدد الجلسات أقل من 10؛ أي نسبة تحويل الآن قابلة للتذبذب بقوة.',
        'اجمع عينة فعلية أولًا ثم اتخذ قرارات التصميم أو الميزانية.',
        'منع قرارات مبكرة مضللة'
      ));
    }

    if (number(s.sessions) >= 20 && number(s.contactRate) < 3) {
      insights.push(insight(
        'high', 'التحويل', 'الزوار لا يصلون إلى التواصل بالمعدل المطلوب',
        'معدل جلسات التواصل ' + pct(s.contactRate) + ' فقط خلال الفترة.',
        'ابدأ بأعلى صفحتين زيارة: قوّ العرض، الثقة، ووضوح الاتصال/واتساب قبل زيادة الإنفاق.',
        'رفع عدد فرص التواصل من نفس الزيارات'
      ));
    }

    if (number(s.formSessions) >= 5 && number(s.formCompletionRate) < 55) {
      insights.push(insight(
        'high', 'النموذج', 'يوجد تسرب بعد بدء طلب السعر',
        'نسبة إكمال النموذج ' + pct(s.formCompletionRate) + ' من الجلسات التي بدأت الإرسال.',
        'راجع الحقول الإلزامية، أخطاء الإرسال، ورسالة التأكيد ثم اختبر النموذج على الجوال.',
        'استعادة Leads تضيع في آخر خطوة'
      ));
    }

    campaigns.filter(function (item) {
      return number(item.sessions) >= 10 && number(item.leads) === 0;
    }).slice(0, 2).forEach(function (item) {
      insights.push(insight(
        'high', 'الحملات', 'حملة تجلب جلسات بدون Leads',
        (item.campaign || 'حملة غير مسماة') + ' جلبت ' + n(item.sessions) + ' جلسة دون Lead مؤكدة.',
        'راجع نية الكلمات/الإعلان والصفحة المقصودة قبل زيادة الميزانية لهذه الحملة.',
        'تقليل هدر الزيارات المدفوعة'
      ));
    });

    pages.filter(function (item) {
      return number(item.views) >= 12 && number(item.contactRate) < 2;
    }).slice(0, 2).forEach(function (item) {
      insights.push(insight(
        'medium', 'الصفحات', 'صفحة ذات زيارة جيدة وتحويل ضعيف',
        (item.path || '/') + ' لديها ' + n(item.views) + ' مشاهدة ومعدل تواصل ' + pct(item.contactRate) + '.',
        'راجع أول شاشة، CTA، المشاريع المرتبطة، وعناصر الثقة في هذه الصفحة تحديدًا.',
        'تحويل الزيارات الحالية إلى فرص'
      ));
    });

    var bestSource = sources.slice().filter(function (item) { return number(item.leads) > 0; })
      .sort(function (a, b) { return number(b.leadRate) - number(a.leadRate); })[0];
    if (bestSource) {
      insights.push(insight(
        'good', 'الاكتساب', 'مصدر يستحق التوسع المدروس',
        sourceLabel(bestSource.source) + ' يحقق Lead Rate قدره ' + pct(bestSource.leadRate) + '.',
        'حافظ على تتبع UTM وزد الاستثمار تدريجيًا مع مراقبة جودة العملاء لا العدد فقط.',
        'زيادة الحجم من قناة أثبتت جودة'
      ));
    }

    var topService = services.slice().sort(function (a, b) {
      return number(b.attempts) - number(a.attempts);
    })[0];
    if (topService && number(topService.attempts) >= 3) {
      insights.push(insight(
        'good', 'الطلب', 'خدمة عليها طلب واضح',
        (topService.service || 'الخدمة') + ' هي الأعلى في محاولات الطلب (' + n(topService.attempts) + ').',
        'قوّ صفحة الخدمة بمشاريع مرتبطة، FAQ شراء، ورسالة عرض سعر أكثر وضوحًا.',
        'استثمار الطلب الموجود بالفعل'
      ));
    }

    var totalDevices = devices.reduce(function (sum, item) { return sum + number(item.sessions); }, 0);
    var mobileSessions = devices.reduce(function (sum, item) {
      return sum + (item.device === 'mobile' ? number(item.sessions) : 0);
    }, 0);
    var mobileShare = rate(mobileSessions, totalDevices);
    if (totalDevices >= 20 && mobileShare >= 70) {
      insights.push(insight(
        'medium', 'الجوال', 'الجوال هو بيئة التحويل الأساسية',
        pct(mobileShare) + ' من الجلسات تأتي من الجوال.',
        'اختبر CTA، سرعة أول شاشة، النماذج، والجداول على 360–430px قبل أي تحسين Desktop.',
        'تحسين التجربة للشريحة الأكبر'
      ));
    }

    if (number(s.sessions) >= 20 && number(s.leadRate) >= 5) {
      insights.push(insight(
        'good', 'القمع', 'معدل Lead قوي',
        'Lead Rate وصل إلى ' + pct(s.leadRate) + ' خلال الفترة.',
        'تجنب التغييرات الواسعة؛ حسّن المصادر والصفحات الضعيفة بشكل موضعي.',
        'الحفاظ على قمع ناجح أثناء التوسع'
      ));
    }

    if (!insights.length) {
      insights.push(insight(
        'info', 'المتابعة', 'لا توجد إشارة حادة حاليًا',
        'البيانات الحالية لا تكشف مشكلة ذات دليل كافٍ.',
        'راقب اتجاه 7 أيام واجمع عينة أكبر قبل تغيير الواجهة أو الميزانية.',
        'العمل بناءً على دليل لا انطباع'
      ));
    }

    var weight = { high: 0, medium: 1, info: 2, good: 3 };
    return insights.sort(function (a, b) { return weight[a.priority] - weight[b.priority]; });
  }

  function metric(label, value, hint, key) {
    return '<article class="kpi-card' + (key ? ' is-key' : '') + '"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small>' + esc(hint) + '</small></article>';
  }

  function renderExecutive(data) {
    var s = data.summary || {};
    var h = health(data);
    var c = confidence(s.sessions);
    var ring = $('healthRing');
    ring.style.setProperty('--score', h.score);
    $('healthScore').textContent = h.waiting ? '—' : h.score;
    $('healthLabel').textContent = h.label;
    $('healthText').textContent = h.text;
    $('confidenceLabel').textContent = c.label;

    lastInsights = buildInsights(data);
    var primary = lastInsights[0];
    $('primaryDecisionTitle').textContent = primary.title;
    $('primaryDecisionEvidence').textContent = primary.evidence;
    $('primaryDecisionAction').textContent = primary.action;
    $('primaryDecisionPriority').textContent = primary.priority === 'high' ? 'أولوية عالية' : primary.priority === 'medium' ? 'تحسين مهم' : primary.priority === 'good' ? 'فرصة نمو' : 'متابعة';
    $('primaryDecisionPriority').className = 'priority-badge ' + (primary.priority === 'high' ? 'high' : primary.priority === 'good' ? 'good' : '');

    var today = data.today || {};
    $('todayPulse').innerHTML = [
      ['جلسات', today.sessions], ['مشاهدات', today.views], ['تواصل', today.contacts], ['Leads', today.leads]
    ].map(function (item) {
      return '<div class="today-item"><span>' + item[0] + '</span><strong>' + n(item[1]) + '</strong></div>';
    }).join('');

    $('summaryMetrics').innerHTML = [
      metric('الجلسات', n(s.sessions), 'العينة الأساسية', false),
      metric('جلسات تواصلت', n(s.contactSessions), 'اتصال أو واتساب', true),
      metric('بدأت طلب سعر', n(s.formSessions), 'جلسات أرسلت النموذج', false),
      metric('Leads مؤكدة', n(s.leadSessions), 'بعد صفحة التأكيد', true),
      metric('معدل التواصل', pct(s.contactRate), 'تواصل / جلسات', true),
      metric('Lead Rate', pct(s.leadRate), 'Leads / جلسات', true)
    ].join('');

    $('secondaryViews').textContent = n(s.views);
    $('secondaryVisitors').textContent = n(s.visitors);
    $('secondaryCalls').textContent = n(s.calls);
    $('secondaryWhatsapp').textContent = n(s.whatsapp);
    $('secondaryArticles').textContent = n(s.articleViews);
    $('generatedAt').textContent = 'آخر تحديث: ' + formatDate(data.generatedAt) + ' · ' + n(data.periodDays) + ' يوم';
  }

  function renderFunnel(s) {
    var stages = [
      { label: 'الجلسات', value: number(s.sessions), note: 'بداية الرحلة' },
      { label: 'جلسات تواصلت', value: number(s.contactSessions), note: 'اتصال أو واتساب' },
      { label: 'بدأت طلب سعر', value: number(s.formSessions), note: 'إرسال النموذج' },
      { label: 'Leads مؤكدة', value: number(s.leadSessions), note: 'وصلت للتأكيد' }
    ];

    $('funnelGrid').innerHTML = stages.map(function (stage, index) {
      var previous = index ? stages[index - 1].value : stage.value;
      var conversion = index ? rate(stage.value, previous) : 100;
      var drop = index ? Math.max(0, 100 - conversion) : 0;
      return '<article class="funnel-stage"><span class="stage-index">0' + (index + 1) + '</span><strong>' + n(stage.value) + '</strong><h3>' + esc(stage.label) + '</h3><p>' + esc(stage.note) + '</p><span class="funnel-rate">' + (index ? pct(conversion) + ' من المرحلة السابقة' : '100% بداية القمع') + '</span>' + (index ? '<span class="drop-label">تسرب ' + pct(drop) + '</span>' : '') + '</article>';
    }).join('');

    var total = number(s.calls) + number(s.whatsapp);
    if (!total) {
      $('channelSplit').innerHTML = '<div class="empty-box">ستظهر تفضيلات التواصل بعد أول ضغطات فعلية.</div>';
    } else {
      var callShare = rate(s.calls, total);
      var waShare = rate(s.whatsapp, total);
      $('channelSplit').innerHTML = [
        { label: 'اتصال', value: s.calls, share: callShare, cls: '' },
        { label: 'واتساب', value: s.whatsapp, share: waShare, cls: 'whatsapp' }
      ].map(function (item) {
        return '<div class="channel-item ' + item.cls + '"><strong>' + item.label + '</strong><span>' + n(item.value) + ' · ' + pct(item.share) + '</span><div class="channel-track"><i style="width:' + Math.min(100, item.share) + '%"></i></div></div>';
      }).join('');
    }

    var leaks = [];
    for (var i = 1; i < stages.length; i += 1) {
      var prev = stages[i - 1].value;
      var conversionRate = rate(stages[i].value, prev);
      leaks.push({
        from: stages[i - 1].label,
        to: stages[i].label,
        drop: prev ? Math.max(0, 100 - conversionRate) : 0,
        enough: prev > 0
      });
    }
    var meaningful = leaks.filter(function (item) { return item.enough; }).sort(function (a, b) { return b.drop - a.drop; });
    $('leakSummary').innerHTML = meaningful.length ? meaningful.map(function (item, index) {
      return '<div class="leak-item"><span class="leak-rank">0' + (index + 1) + '</span><div><strong>' + esc(item.from) + ' ← ' + esc(item.to) + '</strong><small>نسبة الفقد بين المرحلتين</small></div><b>' + pct(item.drop) + '</b></div>';
    }).join('') : '<div class="empty-box">لا توجد مراحل كافية بعد لحساب التسرب.</div>';
  }

  function renderTrend(data) {
    var current = (data.comparison7d || {}).current || {};
    var previous = (data.comparison7d || {}).previous || {};
    var items = [
      ['الجلسات', current.sessions, previous.sessions],
      ['المشاهدات', current.views, previous.views],
      ['جلسات التواصل', current.contacts, previous.contacts],
      ['Leads', current.leads, previous.leads]
    ];
    $('comparisonMetrics').innerHTML = items.map(function (item) {
      var g = growth(item[1], item[2]);
      return '<article class="comparison-card"><span>' + item[0] + '</span><strong>' + n(item[1]) + '</strong><small>الأسبوع السابق: ' + n(item[2]) + '</small><div class="trend-pill ' + g.cls + '">' + g.label + '</div></article>';
    }).join('');

    var daily = data.daily || [];
    if (!daily.length) {
      $('dailyChart').innerHTML = '<div class="chart-empty">سيظهر الاتجاه اليومي بعد وصول البيانات.</div>';
      return;
    }
    var max = Math.max.apply(null, daily.map(function (item) {
      return Math.max(number(item.views), number(item.contacts), number(item.leads));
    }).concat([1]));
    $('dailyChart').innerHTML = daily.map(function (item) {
      var day = String(item.date || '').slice(-2).replace(/^0/, '');
      return '<div class="daily-group" title="مشاهدات ' + n(item.views) + ' · تواصل ' + n(item.contacts) + ' · Leads ' + n(item.leads) + '"><i class="bar-views" style="height:' + Math.max(2, rate(item.views, max)) + '%"></i><i class="bar-contacts" style="height:' + Math.max(2, rate(item.contacts, max)) + '%"></i><i class="bar-leads" style="height:' + Math.max(2, rate(item.leads, max)) + '%"></i><small>' + esc(day) + '</small></div>';
    }).join('');
  }

  function renderSources(items) {
    if (!items.length) {
      $('sourcesList').innerHTML = '<div class="empty-box">لا توجد بيانات مصادر كافية بعد.</div>';
      return;
    }
    var max = Math.max.apply(null, items.map(function (item) { return number(item.sessions); }).concat([1]));
    $('sourcesList').innerHTML = items.map(function (item) {
      return '<div class="source-row"><strong>' + esc(sourceLabel(item.source)) + '</strong><span>' + n(item.sessions) + ' جلسة · ' + n(item.leads) + ' Lead</span><b>' + pct(item.leadRate) + '</b><div class="source-track"><i style="width:' + Math.max(3, rate(item.sessions, max)) + '%"></i></div></div>';
    }).join('');
  }

  function renderDevices(items) {
    var total = items.reduce(function (sum, item) { return sum + number(item.sessions); }, 0);
    if (!total) {
      $('deviceDonut').style.setProperty('--mobile', 0);
      $('deviceDonut').style.setProperty('--tablet', 0);
      $('deviceDonut').innerHTML = '<strong>—</strong><span>جلسة</span>';
      $('devicesList').innerHTML = '<div class="empty-box">لا توجد بيانات أجهزة بعد.</div>';
      return;
    }
    var mobile = 0, tablet = 0, desktop = 0;
    items.forEach(function (item) {
      if (item.device === 'mobile') mobile += number(item.sessions);
      else if (item.device === 'tablet') tablet += number(item.sessions);
      else desktop += number(item.sessions);
    });
    var mobilePct = rate(mobile, total);
    var tabletPct = rate(tablet, total);
    $('deviceDonut').style.setProperty('--mobile', mobilePct);
    $('deviceDonut').style.setProperty('--tablet', tabletPct);
    $('deviceDonut').innerHTML = '<strong>' + n(total) + '</strong><span>جلسة</span>';
    var list = [
      { label: 'جوال', value: mobile, cls: 'mobile' },
      { label: 'تابلت', value: tablet, cls: 'tablet' },
      { label: 'كمبيوتر/أخرى', value: desktop, cls: 'desktop' }
    ];
    $('devicesList').innerHTML = list.map(function (item) {
      return '<div class="device-row ' + item.cls + '"><i></i><span>' + item.label + '</span><b>' + n(item.value) + ' · ' + pct(rate(item.value, total)) + '</b></div>';
    }).join('');
  }

  function renderCampaigns(items) {
    var body = $('campaignsBody');
    var empty = $('campaignsEmpty');
    empty.hidden = !!items.length;
    body.innerHTML = items.map(function (item) {
      return '<tr><td>' + esc(item.campaign) + '</td><td>' + esc(sourceLabel(item.source)) + '</td><td>' + esc(item.medium) + '</td><td>' + n(item.sessions) + '</td><td>' + n(item.contacts) + '</td><td>' + n(item.leads) + '</td><td>' + pct(item.leadRate) + '</td></tr>';
    }).join('');
  }

  function pageName(path) {
    if (!path || path === '/') return 'الصفحة الرئيسية';
    var clean = String(path).replace(/^\//, '').replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
    return clean || 'الصفحة الرئيسية';
  }

  function pageJudgement(item) {
    if (number(item.views) < 10) return { label: 'عينة صغيرة', cls: 'watch' };
    if (number(item.leadRate) >= 3 || number(item.contactRate) >= 5) return { label: 'قوي', cls: 'good' };
    if (number(item.contactRate) < 2) return { label: 'ضعيف تحويل', cls: 'weak' };
    return { label: 'متوسط', cls: 'watch' };
  }

  function renderPages(items) {
    if (!items.length) {
      $('pagesBody').innerHTML = '<tr><td colspan="7" class="table-empty">لا توجد بيانات صفحات كافية بعد.</td></tr>';
      return;
    }
    $('pagesBody').innerHTML = items.map(function (item) {
      var judgement = pageJudgement(item);
      return '<tr><td><div class="page-cell"><strong>' + esc(pageName(item.path)) + '</strong><small>' + esc(item.path) + '</small></div></td><td>' + n(item.views) + '</td><td>' + n(item.contacts) + '</td><td>' + n(item.leads) + '</td><td>' + pct(item.contactRate) + '</td><td>' + pct(item.leadRate) + '</td><td><span class="judgement ' + judgement.cls + '">' + judgement.label + '</span></td></tr>';
    }).join('');
  }

  function renderServices(items) {
    if (!items.length) {
      $('servicesGrid').innerHTML = '<div class="empty-box">ستظهر الخدمات الأكثر طلبًا بعد أول محاولات نموذج فعلية.</div>';
      return;
    }
    $('servicesGrid').innerHTML = items.map(function (item, index) {
      return '<article class="service-card"><header><h4>' + esc(item.service) + '</h4><span>#' + String(index + 1).padStart(2, '0') + '</span></header><div class="service-stats"><div><span>محاولات</span><strong>' + n(item.attempts) + '</strong></div><div><span>Leads</span><strong>' + n(item.leads) + '</strong></div><div><span>اكتمال</span><strong>' + pct(item.completionRate) + '</strong></div></div></article>';
    }).join('');
  }

  function renderLeads(items) {
    var body = $('recentLeadsBody');
    var empty = $('recentLeadsEmpty');
    empty.hidden = !!items.length;
    body.innerHTML = items.map(function (item) {
      return '<tr><td>' + esc(formatDate(item.at)) + '</td><td>' + esc(item.service) + '</td><td>' + esc(item.sourcePath) + '</td><td>' + esc(sourceLabel(item.source)) + '</td><td>' + esc(item.campaign) + '</td><td>' + esc(deviceLabel(item.device)) + '</td></tr>';
    }).join('');
  }

  function renderInsights(insights) {
    var priorityLabel = { high: 'أولوية عالية', medium: 'تحسين مهم', good: 'فرصة نمو', info: 'متابعة' };
    $('insightsGrid').innerHTML = insights.map(function (item, index) {
      return '<article class="decision-item ' + item.priority + '"><div class="decision-meta"><span>أولوية ' + String(index + 1).padStart(2, '0') + '</span><b>' + esc(priorityLabel[item.priority]) + ' · ' + esc(item.area) + '</b></div><div class="decision-main"><h3>' + esc(item.title) + '</h3><p>' + esc(item.evidence) + '</p></div><div class="decision-next"><span>الإجراء التالي · ' + esc(item.impact) + '</span><strong>' + esc(item.action) + '</strong></div></article>';
    }).join('');
  }

  function render(data) {
    lastData = data;
    var s = data.summary || {};
    renderExecutive(data);
    renderFunnel(s);
    renderTrend(data);
    renderSources(data.sources || []);
    renderDevices(data.devices || []);
    renderCampaigns(data.campaigns || []);
    renderPages(data.topPages || []);
    renderServices(data.services || []);
    renderLeads(data.recentLeads || []);
    renderInsights(lastInsights);
  }

  async function request(payload) {
    var response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'omit'
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var failure = new Error(data.error || 'request_failed');
      failure.status = response.status;
      throw failure;
    }
    return data;
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      var data = await request({ mode: 'admin', token: token, days: number(period.value) || 30 });
      render(data);
      showToast('تم تحديث مركز القيادة');
    } catch (e) {
      if (e.status === 401 || e.message === 'unauthorized') {
        sessionStorage.removeItem(TOKEN_KEY);
        token = '';
        app.hidden = true;
        login.hidden = false;
        error.textContent = 'انتهت الجلسة أو لم تعد صالحة. سجّل الدخول من جديد.';
      } else {
        showToast('تعذر تحميل البيانات الآن');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPassword(password) {
    loginButton.disabled = true;
    loginButton.textContent = 'تحقق…';
    error.textContent = '';
    try {
      var result = await request({ mode: 'admin_login', password: password });
      if (!result.token) throw new Error('no_token');
      token = result.token;
      sessionStorage.setItem(TOKEN_KEY, token);
      input.value = '';
      login.hidden = true;
      app.hidden = false;
      await load();
    } catch (e) {
      error.textContent = e.status === 401 ? 'مفتاح الدخول غير صحيح.' : 'تعذر إنشاء جلسة الإدارة الآن.';
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = 'دخول';
    }
  }

  function logoutNow() {
    sessionStorage.removeItem(TOKEN_KEY);
    token = '';
    lastData = null;
    app.hidden = true;
    login.hidden = false;
    input.value = '';
    error.textContent = '';
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value).replace(/"/g, '""');
    return '"' + text + '"';
  }

  function exportCsv() {
    if (!lastData) return showToast('لا توجد بيانات للتصدير بعد');
    var s = lastData.summary || {};
    var rows = [
      ['TAWOD Command Center', ''],
      ['الفترة', lastData.periodDays + ' يوم'],
      ['آخر تحديث', formatDate(lastData.generatedAt)],
      [],
      ['الملخص', 'القيمة'],
      ['الجلسات', s.sessions],
      ['جلسات تواصلت', s.contactSessions],
      ['بدأت طلب سعر', s.formSessions],
      ['Leads مؤكدة', s.leadSessions],
      ['معدل التواصل', pct(s.contactRate)],
      ['Lead Rate', pct(s.leadRate)],
      ['اكتمال النماذج', pct(s.formCompletionRate)],
      [],
      ['الحملات', 'المصدر', 'الوسيط', 'الجلسات', 'التواصل', 'Leads', 'Lead Rate']
    ];
    (lastData.campaigns || []).forEach(function (item) {
      rows.push([item.campaign, sourceLabel(item.source), item.medium, item.sessions, item.contacts, item.leads, pct(item.leadRate)]);
    });
    rows.push([], ['الصفحات', 'المشاهدات', 'التواصل', 'Leads', 'معدل التواصل', 'Lead Rate']);
    (lastData.topPages || []).forEach(function (item) {
      rows.push([item.path, item.views, item.contacts, item.leads, pct(item.contactRate), pct(item.leadRate)]);
    });
    rows.push([], ['الخدمات', 'المحاولات', 'Leads', 'اكتمال']);
    (lastData.services || []).forEach(function (item) {
      rows.push([item.service, item.attempts, item.leads, pct(item.completionRate)]);
    });
    var csv = '\ufeff' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tawod-command-center-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function buildSummaryText() {
    if (!lastData) return '';
    var s = lastData.summary || {};
    var primary = lastInsights[0] || {};
    return [
      'ملخص مركز قيادة تعاود – ' + lastData.periodDays + ' يوم',
      'الجلسات: ' + n(s.sessions),
      'جلسات التواصل: ' + n(s.contactSessions) + ' (' + pct(s.contactRate) + ')',
      'Leads مؤكدة: ' + n(s.leadSessions) + ' (' + pct(s.leadRate) + ')',
      'اكتمال النماذج: ' + pct(s.formCompletionRate),
      'أهم قرار: ' + (primary.title || '—'),
      'الإجراء: ' + (primary.action || '—'),
      'آخر تحديث: ' + formatDate(lastData.generatedAt)
    ].join('\n');
  }

  async function copySummary() {
    var text = buildSummaryText();
    if (!text) return showToast('لا توجد بيانات للنسخ بعد');
    try {
      await navigator.clipboard.writeText(text);
      showToast('تم نسخ الملخص التنفيذي');
    } catch (e) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      showToast('تم نسخ الملخص التنفيذي');
    }
  }

  function initNavigation() {
    var links = Array.prototype.slice.call(document.querySelectorAll('#adminNav a[href^="#"]'));
    var sections = links.map(function (link) { return $(link.getAttribute('href').slice(1)); }).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (!visible) return;
      links.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + visible.target.id);
      });
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .15, .35] });
    sections.forEach(function (section) { observer.observe(section); });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = input.value.trim();
    if (value) loginWithPassword(value);
  });
  refresh.addEventListener('click', load);
  period.addEventListener('change', load);
  copyButton.addEventListener('click', copySummary);
  printButton.addEventListener('click', function () { window.print(); });
  logout.addEventListener('click', logoutNow);

  if (/\.vercel\.app$/i.test(window.location.hostname)) $('previewNotice').hidden = false;
  initNavigation();

  var cached = sessionStorage.getItem(TOKEN_KEY);
  if (cached) {
    token = cached;
    login.hidden = true;
    app.hidden = false;
    load();
  }
})();
