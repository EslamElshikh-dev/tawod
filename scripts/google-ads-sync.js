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
      campaign_budget.amount_micros,
      campaign_budget.total_amount_micros,
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
      dailyBudgetMicros: Number((row.campaignBudget || {}).amountMicros || 0),
      totalBudgetMicros: Number((row.campaignBudget || {}).totalAmountMicros || 0),
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

  const calls = [];
  try {
    const callRows = AdsApp.search(`
      SELECT
        call_view.resource_name,
        call_view.start_call_date_time,
        call_view.end_call_date_time,
        call_view.call_duration_seconds,
        call_view.call_status,
        call_view.call_tracking_display_location,
        call_view.type,
        campaign.id,
        campaign.name
      FROM call_view
      WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
    `);

    while (callRows.hasNext()) {
      const row = callRows.next();
      calls.push({
        resourceName: String(row.callView.resourceName || ''),
        startedAt: String(row.callView.startCallDateTime || ''),
        endedAt: String(row.callView.endCallDateTime || ''),
        durationSeconds: Number(row.callView.callDurationSeconds || 0),
        status: String(row.callView.callStatus || ''),
        trackingLocation: String(row.callView.callTrackingDisplayLocation || ''),
        callType: String(row.callView.type || ''),
        campaignId: Number((row.campaign || {}).id || 0),
        campaignName: String((row.campaign || {}).name || '')
      });
    }
  } catch (error) {
    console.log(`Call reporting unavailable: ${error && error.message ? error.message : error}`);
  }

  if (!campaigns.length && !calls.length) {
    console.log(`No campaign or call rows found between ${fromDate} and ${toDate}.`);
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
      conversions,
      calls
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  console.log(`Tawod Ads sync: HTTP ${code} | campaigns=${campaigns.length} | conversions=${conversions.length} | calls=${calls.length}`);
  console.log(body);
  if (code < 200 || code >= 300) throw new Error(`Tawod sync failed: HTTP ${code} ${body}`);
}
