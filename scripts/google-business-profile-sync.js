/*
 * Tawod Google Business Profile -> Supabase reporting sync.
 * Create a standalone Google Apps Script, enable the Business Profile Performance API,
 * add the business.manage OAuth scope in appsscript.json, set the 4 constants below,
 * run main() once, then schedule it daily.
 */
const TAWOD_PROFILE_SYNC_URL = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
const TAWOD_PROFILE_SYNC_KEY = 'PASTE_BUSINESS_PROFILE_SYNC_KEY_HERE';
const TAWOD_LOCATION_ID = 'PASTE_UNOBFUSCATED_LOCATION_ID_HERE';
const TAWOD_PROFILE_NAME = 'شركة تعاود للمقاولات العامة';
const PROFILE_LOOKBACK_DAYS = 90;

const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_CONVERSATIONS',
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_BOOKINGS'
];

const FIELD_BY_METRIC = {
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: 'searchDesktopImpressions',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: 'searchMobileImpressions',
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'mapsDesktopImpressions',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'mapsMobileImpressions',
  BUSINESS_CONVERSATIONS: 'conversations',
  BUSINESS_DIRECTION_REQUESTS: 'directionRequests',
  CALL_CLICKS: 'callClicks',
  WEBSITE_CLICKS: 'websiteClicks',
  BUSINESS_BOOKINGS: 'bookings'
};

function main() {
  if (TAWOD_PROFILE_SYNC_KEY.indexOf('PASTE_') === 0 || TAWOD_LOCATION_ID.indexOf('PASTE_') === 0) {
    throw new Error('Set TAWOD_PROFILE_SYNC_KEY and TAWOD_LOCATION_ID first.');
  }

  const token = ScriptApp.getOAuthToken();
  const end = new Date();
  const start = new Date(end.getTime() - (PROFILE_LOOKBACK_DAYS - 1) * 86400000);
  const location = `locations/${String(TAWOD_LOCATION_ID).replace(/\D/g, '')}`;
  const daily = fetchDailyMetrics_(location, start, end, token);
  const keywords = fetchMonthlyKeywords_(location, end, token);

  const response = UrlFetchApp.fetch(TAWOD_PROFILE_SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      mode: 'business_profile_sync',
      syncKey: TAWOD_PROFILE_SYNC_KEY,
      locationId: location,
      profileName: TAWOD_PROFILE_NAME,
      daily,
      keywords
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  console.log(`Tawod Business Profile sync: HTTP ${code} | daily=${daily.length} | keywords=${keywords.length}`);
  console.log(body);
  if (code < 200 || code >= 300) throw new Error(`Tawod profile sync failed: HTTP ${code} ${body}`);
}

function fetchDailyMetrics_(location, start, end, token) {
  const params = DAILY_METRICS.map(metric => `dailyMetrics=${encodeURIComponent(metric)}`);
  addDateParams_(params, 'daily_range.start_date', start);
  addDateParams_(params, 'daily_range.end_date', end);
  const url = `https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${params.join('&')}`;
  const payload = googleGet_(url, token);
  const byDate = {};
  const groups = payload.multiDailyMetricTimeSeries || [];

  groups.forEach(group => {
    (group.dailyMetricTimeSeries || []).forEach(series => {
      const field = FIELD_BY_METRIC[series.dailyMetric];
      if (!field) return;
      ((series.timeSeries || {}).datedValues || []).forEach(point => {
        const date = dateObjectToIso_(point.date);
        if (!date) return;
        if (!byDate[date]) byDate[date] = emptyDaily_(date);
        byDate[date][field] = Number(point.value || 0);
      });
    });
  });

  return Object.keys(byDate).sort().map(date => byDate[date]);
}

function fetchMonthlyKeywords_(location, end, token) {
  const rows = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const month = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - offset, 1));
    let pageToken = '';
    do {
      const params = [
        `monthly_range.start_month.year=${month.getUTCFullYear()}`,
        `monthly_range.start_month.month=${month.getUTCMonth() + 1}`,
        `monthly_range.end_month.year=${month.getUTCFullYear()}`,
        `monthly_range.end_month.month=${month.getUTCMonth() + 1}`,
        'pageSize=100'
      ];
      if (pageToken) params.push(`pageToken=${encodeURIComponent(pageToken)}`);
      const url = `https://businessprofileperformance.googleapis.com/v1/${location}/searchkeywords/impressions/monthly?${params.join('&')}`;
      const payload = googleGet_(url, token);
      (payload.searchKeywordsCounts || []).forEach(item => {
        const insight = item.insightsValue || {};
        rows.push({
          month: Utilities.formatDate(month, 'UTC', 'yyyy-MM-dd'),
          keyword: String(item.searchKeyword || ''),
          impressions: Number(insight.value || 0),
          threshold: insight.threshold == null ? null : Number(insight.threshold)
        });
      });
      pageToken = payload.nextPageToken || '';
    } while (pageToken);
  }
  return rows;
}

function googleGet_(url, token) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) throw new Error(`Google API HTTP ${code}: ${body}`);
  return JSON.parse(body || '{}');
}

function addDateParams_(params, prefix, date) {
  params.push(`${prefix}.year=${date.getUTCFullYear()}`);
  params.push(`${prefix}.month=${date.getUTCMonth() + 1}`);
  params.push(`${prefix}.day=${date.getUTCDate()}`);
}

function dateObjectToIso_(value) {
  if (!value || !value.year || !value.month || !value.day) return '';
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function emptyDaily_(date) {
  return {
    date,
    searchDesktopImpressions: 0,
    searchMobileImpressions: 0,
    mapsDesktopImpressions: 0,
    mapsMobileImpressions: 0,
    conversations: 0,
    directionRequests: 0,
    callClicks: 0,
    websiteClicks: 0,
    bookings: 0
  };
}
