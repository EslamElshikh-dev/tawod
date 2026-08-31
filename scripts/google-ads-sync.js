/*
 * Tawod Google Ads -> Supabase reporting sync.
 * Install in Google Ads > Tools > Bulk actions > Scripts.
 * Replace SYNC_KEY once, authorize, run once, then schedule hourly or daily.
 */
const TAWOD_SYNC_URL = 'https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/tawod-analytics';
const TAWOD_SYNC_KEY = 'PASTE_TAWOD_SYNC_KEY_HERE';
const LOOKBACK_DAYS = 90;

function main() {
  if (TAWOD_SYNC_KEY === 'PASTE_TAWOD_SYNC_KEY_HERE') {
    throw new Error('Set TAWOD_SYNC_KEY before running the script.');
  }

  const account = AdsApp.currentAccount();
  const timeZone = account.getTimeZone();
  const customerId = account.getCustomerId().replace(/\D/g, '');
  const currency = account.getCurrencyCode();
  const end = new Date();
  const start = new Date(end.getTime() - (LOOKBACK_DAYS - 1) * 24 * 60 * 60 * 1000);
  const fromDate = Utilities.formatDate(start, timeZone, 'yyyy-MM-dd');
  const toDate = Utilities.formatDate(end, timeZone, 'yyyy-MM-dd');

  const campaigns = [];
  const campaignRows = AdsApp.search(`
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.all_conversions,
      metrics.conversions_value,
      metrics.phone_calls,
      metrics.phone_impressions,
      metrics.phone_through_rate
    FROM campaign
    WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
  `);

  while (campaignRows.hasNext()) {
    const row = campaignRows.next();
    campaigns.push({
      date: row.segments.date,
      campaignId: Number(row.campaign.id),
      campaignName: row.campaign.name,
      campaignStatus: String(row.campaign.status || ''),
      channelType: String(row.campaign.advertisingChannelType || ''),
      impressions: Number(row.metrics.impressions || 0),
      clicks: Number(row.metrics.clicks || 0),
      costMicros: Number(row.metrics.costMicros || 0),
      conversions: Number(row.metrics.conversions || 0),
      allConversions: Number(row.metrics.allConversions || 0),
      conversionsValue: Number(row.metrics.conversionsValue || 0),
      phoneCalls: Number(row.metrics.phoneCalls || 0),
      phoneImpressions: Number(row.metrics.phoneImpressions || 0),
      phoneThroughRate: Number(row.metrics.phoneThroughRate || 0)
    });
  }

  const conversions = [];
  const conversionRows = AdsApp.search(`
    SELECT
      segments.date,
      segments.conversion_action_name,
      campaign.id,
      campaign.name,
      metrics.conversions,
      metrics.all_conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
      AND metrics.all_conversions > 0
  `);

  while (conversionRows.hasNext()) {
    const row = conversionRows.next();
    conversions.push({
      date: row.segments.date,
      campaignId: Number(row.campaign.id),
      campaignName: row.campaign.name,
      conversionActionName: String(row.segments.conversionActionName || 'Unnamed conversion'),
      conversions: Number(row.metrics.conversions || 0),
      allConversions: Number(row.metrics.allConversions || 0),
      conversionsValue: Number(row.metrics.conversionsValue || 0)
    });
  }

  if (!campaigns.length) {
    console.log(`No campaign rows found between ${fromDate} and ${toDate}.`);
    return;
  }

  const response = UrlFetchApp.fetch(TAWOD_SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      mode: 'google_ads_sync',
      syncKey: TAWOD_SYNC_KEY,
      customerId,
      currency,
      campaigns,
      conversions
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  console.log(`Tawod Ads sync: HTTP ${code} | campaigns=${campaigns.length} | conversions=${conversions.length}`);
  console.log(body);
  if (code < 200 || code >= 300) throw new Error(`Tawod sync failed: HTTP ${code} ${body}`);
}
