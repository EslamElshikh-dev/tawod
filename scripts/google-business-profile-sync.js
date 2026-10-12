/*
 * Tawod Google Business Profile -> Supabase reporting sync.
 * Create a standalone Google Apps Script, enable the Business Profile Performance API,
 * add the business.manage OAuth scope in appsscript.json, set the sync key and
 * location ID in Script Properties (TAWOD_PROFILE_SYNC_KEY / TAWOD_LOCATION_ID),
 * run main() once, then schedule it daily.
 */
const TAWOD_PROFILE_SYNC_URL = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
const TAWOD_PROFILE_SYNC_KEY = 'PASTE_BUSINESS_PROFILE_SYNC_KEY_HERE';
const TAWOD_LOCATION_ID = 'PASTE_UNOBFUSCATED_LOCATION_ID_HERE';
const TAWOD_PROFILE_NAME = 'شركة تعاود للمقاولات · الرياض';
const PROFILE_LOOKBACK_DAYS = 90;

const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
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
  BUSINESS_DIRECTION_REQUESTS: 'directionRequests',
  CALL_CLICKS: 'callClicks',
  WEBSITE_CLICKS: 'websiteClicks',
  BUSINESS_BOOKINGS: 'bookings'
};

function main() {
  const properties = PropertiesService.getScriptProperties();
  const syncKey = properties.getProperty('TAWOD_PROFILE_SYNC_KEY') || TAWOD_PROFILE_SYNC_KEY;
  const locationId = properties.getProperty('TAWOD_LOCATION_ID') || TAWOD_LOCATION_ID;
  if (syncKey.indexOf('PASTE_') === 0 || !/^(?:locations\/)?\d+$/.test(locationId)) {
    throw new Error('Set TAWOD_PROFILE_SYNC_KEY and TAWOD_LOCATION_ID in Script Properties first.');
  }

  const token = ScriptApp.getOAuthToken();
  const { start, end } = profileRange_(new Date());
  const location = locationId.indexOf('locations/') === 0 ? locationId : `locations/${locationId}`;
  const fetchedAt = new Date().toISOString();
  const daily = fetchDailyMetrics_(location, start, end, token);
  const keywords = fetchMonthlyKeywords_(location, start, end, token);

  const response = UrlFetchApp.fetch(TAWOD_PROFILE_SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      mode: 'business_profile_sync',
      syncKey,
      locationId: location,
      profileName: TAWOD_PROFILE_NAME,
      syncedAt: fetchedAt,
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

function profileRange_(now) {
  const today = new Date(Utilities.formatDate(now, 'Asia/Riyadh', 'yyyy-MM-dd') + 'T00:00:00Z');
  const end = new Date(today.getTime() - 86400000);
  return { start: new Date(end.getTime() - (PROFILE_LOOKBACK_DAYS - 1) * 86400000), end };
}

function fetchDailyMetrics_(location, start, end, token) {
  const params = DAILY_METRICS.map(metric => `dailyMetrics=${encodeURIComponent(metric)}`);
  addDateParams_(params, 'daily_range.start_date', start);
  addDateParams_(params, 'daily_range.end_date', end);
  const url = `https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${params.join('&')}`;
  const payload = googleGet_(url, token);
  const byDate = {};
  const groups = payload.multiDailyMetricTimeSeries;
  if (!Array.isArray(groups) || !groups.length) throw new Error('Google returned no daily metric series.');
  const seen = new Set();
  const firstDate = start.toISOString().slice(0, 10), lastDate = end.toISOString().slice(0, 10);

  groups.forEach(group => {
    if (!Array.isArray(group.dailyMetricTimeSeries)) throw new Error('Missing Google daily series.');
    group.dailyMetricTimeSeries.forEach(series => {
      const field = FIELD_BY_METRIC[series.dailyMetric];
      const points = (series.timeSeries || {}).datedValues;
      if (!field || seen.has(field) || !Array.isArray(points) || (series.dailySubEntityType && Object.keys(series.dailySubEntityType).length)) throw new Error('Invalid or duplicate Google metric series.');
      seen.add(field);
      points.forEach(point => {
        const date = dateObjectToIso_(point.date);
        if (!date || date < firstDate || date > lastDate) throw new Error('Invalid Google observation date.');
        if (!byDate[date]) byDate[date] = { date };
        if (Object.prototype.hasOwnProperty.call(byDate[date], field)) throw new Error('Duplicate Google metric point.');
        // Documented DatedValue omission means zero; missing points/series do not.
        // https://developers.google.com/my-business/reference/performance/rest/v1/TimeSeries
        const value = Object.prototype.hasOwnProperty.call(point, 'value') ? point.value : 0;
        if (!(typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw new Error('Invalid Google daily value.');
        byDate[date][field] = Number(value);
      });
    });
  });

  if (seen.size !== DAILY_METRICS.length || !Object.keys(byDate).length) throw new Error('Incomplete Google daily metrics.');
  return Object.keys(byDate).sort().map(date => {
    const row = byDate[date];
    if (Object.values(FIELD_BY_METRIC).some(field => !Object.prototype.hasOwnProperty.call(row, field))) throw new Error('A Google date is missing a metric.');
    return row;
  });
}

function fetchMonthlyKeywords_(location, start, end, token) {
  const rows = [];
  for (let month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); month <= end; month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))) {
    let pageToken = '';
    const seenTokens = new Set();
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
      const fetchedAt = new Date().toISOString();
      const payload = googleGet_(url, token);
      const counts = payload.searchKeywordsCounts || [];
      if (!Array.isArray(counts)) throw new Error('Invalid Google keyword page.');
      counts.forEach(item => {
        const insight = item.insightsValue || {};
        const count = keywordCount_(insight);
        rows.push({
          month: Utilities.formatDate(month, 'UTC', 'yyyy-MM-dd'),
          keyword: String(item.searchKeyword || ''),
          impressions: count.impressions,
          threshold: count.threshold,
          syncedAt: fetchedAt
        });
      });
      pageToken = payload.nextPageToken || '';
      if (pageToken && (typeof pageToken !== 'string' || seenTokens.has(pageToken))) throw new Error('Repeated or invalid Google page token.');
      seenTokens.add(pageToken);
      if (rows.length > 2000 || seenTokens.size > 20) throw new Error('Google keyword batch exceeds the ingestion limit.');
    } while (pageToken);
  }
  return rows;
}

function keywordCount_(insight) {
  const hasValue = insight.value != null, hasThreshold = insight.threshold != null;
  if (hasValue === hasThreshold) throw new Error('Google keyword must contain one exact value or threshold.');
  const raw = hasThreshold ? insight.threshold : insight.value;
  if (!(typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw)))) throw new Error('Invalid Google keyword count.');
  const count = Number(raw);
  if (!Number.isSafeInteger(count) || count < (hasThreshold ? 1 : 0)) throw new Error('Invalid Google keyword count.');
  return { impressions: hasValue ? count : null, threshold: hasThreshold ? count : null };
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
  const payload = JSON.parse(body);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.error) throw new Error('Invalid Google API response.');
  return payload;
}

function addDateParams_(params, prefix, date) {
  params.push(`${prefix}.year=${date.getUTCFullYear()}`);
  params.push(`${prefix}.month=${date.getUTCMonth() + 1}`);
  params.push(`${prefix}.day=${date.getUTCDate()}`);
}

function dateObjectToIso_(value) {
  if (![value?.year,value?.month,value?.day].every(Number.isInteger)) return '';
  const date = `${String(value.year).padStart(4,'0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  return Number.isFinite(Date.parse(date + 'T00:00:00Z')) && new Date(date + 'T00:00:00Z').toISOString().slice(0,10) === date ? date : '';
}
