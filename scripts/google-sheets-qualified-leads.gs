/** @OnlyCurrentDoc */

var TAWOD_SHEETS_ENDPOINT = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
var TAWOD_SPREADSHEET_ID = '1EA8m8v7im0x3g-kgi-F3v-yQRvM1-_1vlWZVK28Tzxc';
var TAWOD_SHEET_NAME = 'الورقة1';
var TAWOD_SYNC_PROPERTY = 'TAWOD_SHEETS_SYNC_KEY';
var TAWOD_SYNC_HANDLER = 'syncQualifiedWhatsAppLeads';
var TAWOD_HEADERS = [
  'Lead ID', 'Qualification Status', 'Qualification Time', 'Google Click ID',
  'Email', 'Phone Number', 'Conversion Name', 'Conversion Time', 'Conversion Value',
  'Conversion Currency', 'Ad User Data Consent', 'Ad Personalization Consent',
  'Project Type', 'Project Location', 'Estimated Budget', 'Notes', 'Project Stage',
  'Inspection Requested', 'Quotation Requested', 'First Contact Time', 'Reviewed By', 'Evidence'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('تعاود')
    .addItem('مزامنة العملاء المؤهلين الآن', TAWOD_SYNC_HANDLER)
    .addItem('تهيئة المزامنة التلقائية', 'configureTawodSheetsSync')
    .addToUi();
}

function configureTawodSheetsSync() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'تهيئة مزامنة تعاود',
    'ألصق مفتاح المزامنة المخصص. سيُحفظ داخل خصائص السكربت ولن يُكتب في خلايا الملف.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var key = String(response.getResponseText() || '').trim();
  if (key.length < 32 || key.length > 200) {
    ui.alert('مفتاح المزامنة غير صالح.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty(TAWOD_SYNC_PROPERTY, key);
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === TAWOD_SYNC_HANDLER) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(TAWOD_SYNC_HANDLER).timeBased().everyMinutes(5).create();
  var result = syncQualifiedWhatsAppLeads();
  ui.alert('تم تفعيل المزامنة كل 5 دقائق. عولج الآن ' + result.processed + ' صف.');
}

function syncQualifiedWhatsAppLeads() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { processed: 0, skipped: true };
  try {
    var key = PropertiesService.getScriptProperties().getProperty(TAWOD_SYNC_PROPERTY);
    if (!key) throw new Error('لم يتم إعداد مفتاح مزامنة تعاود.');
    var exported = tawodRequest_({ mode: 'google_sheets_export', syncKey: key });
    var leads = Array.isArray(exported.leads) ? exported.leads : [];
    if (!leads.length) return { processed: 0 };

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet || spreadsheet.getId() !== TAWOD_SPREADSHEET_ID) {
      throw new Error('أوقف التنفيذ: هذا السكربت مرتبط بملف غير متوقع.');
    }
    var sheet = spreadsheet.getSheetByName(TAWOD_SHEET_NAME);
    if (!sheet) throw new Error('لم يتم العثور على ورقة ' + TAWOD_SHEET_NAME + '.');
    assertTawodHeaders_(sheet);
    var rowByLeadId = existingLeadRows_(sheet);
    var appends = [];
    leads.forEach(function (lead) {
      var values = leadValues_(lead);
      var existingRow = rowByLeadId[String(lead.leadId || '')];
      if (existingRow) sheet.getRange(existingRow, 1, 1, TAWOD_HEADERS.length).setValues([values]);
      else {
        appends.push(values);
        rowByLeadId[String(lead.leadId || '')] = -1;
      }
    });
    if (appends.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, TAWOD_HEADERS.length).setValues(appends);
    }
    SpreadsheetApp.flush();

    var acknowledged = tawodRequest_({
      mode: 'google_sheets_ack',
      syncKey: key,
      leads: leads.map(function (lead) { return { id: lead.outcomeId, updatedAt: lead.updatedAt }; })
    });
    if (Number(acknowledged.acknowledged || 0) !== leads.length) {
      throw new Error('لم يقرّ Supabase كل الصفوف؛ ستُعاد المحاولة دون إنشاء صف مكرر.');
    }
    return { processed: leads.length };
  } finally {
    lock.releaseLock();
  }
}

function tawodRequest_(payload) {
  var response = UrlFetchApp.fetch(TAWOD_SHEETS_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var body;
  try { body = JSON.parse(response.getContentText() || '{}'); }
  catch (error) { throw new Error('استجابة غير صالحة من تكامل تعاود.'); }
  if (status < 200 || status >= 300 || !body.ok) {
    throw new Error('فشلت مزامنة تعاود (' + status + '): ' + (body.error || 'unknown_error'));
  }
  return body;
}

function assertTawodHeaders_(sheet) {
  var actual = sheet.getRange(1, 1, 1, TAWOD_HEADERS.length).getDisplayValues()[0];
  for (var index = 0; index < TAWOD_HEADERS.length; index += 1) {
    if (actual[index] !== TAWOD_HEADERS[index]) {
      throw new Error('عنوان العمود ' + (index + 1) + ' لا يطابق قالب تعاود؛ أوقفت المزامنة دون تعديل الملف.');
    }
  }
}

function existingLeadRows_(sheet) {
  var rows = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return rows;
  sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().forEach(function (value, index) {
    var leadId = String(value[0] || '').trim();
    if (leadId && !rows[leadId]) rows[leadId] = index + 2;
  });
  return rows;
}

function safeCell_(value) {
  if (value == null) return '';
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function leadValues_(lead) {
  return [
    lead.leadId, lead.qualificationStatus, lead.qualificationTime, lead.googleClickId,
    lead.email, lead.phoneNumber, lead.conversionName, lead.conversionTime,
    Number(lead.conversionValue || 0), lead.conversionCurrency,
    lead.adUserDataConsent, lead.adPersonalizationConsent, lead.projectType,
    lead.projectLocation, Number(lead.estimatedBudget || 0), lead.notes,
    lead.projectStage, lead.inspectionRequested, lead.quotationRequested,
    lead.firstContactTime, lead.reviewedBy, lead.evidence
  ].map(safeCell_);
}
