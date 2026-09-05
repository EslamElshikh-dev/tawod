declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const ADMIN_HASH = 'bbc662e02f9000a56d4cc600333105b192fcffa9f689e7084eabb00cbbb46481';
const ADMIN_USERNAME = 'admin';
const ALLOWED_ORIGINS = new Set(['https://tawodco.com', 'https://www.tawodco.com']);
const EVENT_NAMES = new Set([
  'page_view','call_click','whatsapp_click','form_submit_attempt','generate_lead',
  'article_view','article_50_scroll','article_90_scroll','article_service_click',
  'article_project_click','related_article_click','article_quote_click','article_hub_click'
]);
const ADMIN_TTL_MS = 4 * 60 * 60 * 1000;

function isPreviewOrigin(origin: string | null) {
  if (!origin) return false;
  try { const url = new URL(origin); return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app'); }
  catch { return false; }
}
function isAdminOrigin(origin: string | null) { return !!origin && (ALLOWED_ORIGINS.has(origin) || isPreviewOrigin(origin)); }
function cors(origin: string | null) {
  const allowed = isAdminOrigin(origin) ? origin! : 'https://tawodco.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(body: unknown, status = 200, origin: string | null = null, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
}
function text(value: unknown, max = 500) {
  if (typeof value !== 'string') return null;
  const v = value.trim(); return v ? v.slice(0, max) : null;
}
function finite(value: unknown, fallback = 0) {
  const n = Number(value); return Number.isFinite(n) ? n : fallback;
}
function cleanMeta(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) continue;
    if (raw === null || typeof raw === 'number' || typeof raw === 'boolean') safe[key] = raw;
    else if (typeof raw === 'string') safe[key] = raw.slice(0, 240);
  }
  return safe;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''; bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
async function adminSigningKey() {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) throw new Error('Supabase runtime credentials unavailable');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`${serviceKey}:${ADMIN_HASH}:tawod-admin-v1`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function issueAdminToken() {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ scope: 'tawod-admin', exp: Date.now() + ADMIN_TTL_MS, nonce: crypto.randomUUID() })));
  const key = await adminSigningKey();
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return `${payload}.${bytesToBase64Url(signature)}`;
}
async function verifyAdminToken(token: unknown) {
  if (typeof token !== 'string' || token.length > 1200) return false;
  const [payload, signature] = token.split('.'); if (!payload || !signature) return false;
  try {
    const key = await adminSigningKey();
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlToBytes(signature), new TextEncoder().encode(payload));
    if (!valid) return false;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return parsed?.scope === 'tawod-admin' && Number(parsed?.exp || 0) > Date.now();
  } catch { return false; }
}
async function supabase(path: string, init: RequestInit = {}) {
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase runtime credentials unavailable');
  return fetch(`${url}${path}`, { ...init, headers: { 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init.headers || {}) } });
}
async function verifySyncKey(value: unknown, name: 'google_ads' | 'business_profile') {
  if (typeof value !== 'string' || value.length < 32 || value.length > 200) return false;
  const response = await supabase(`/rest/v1/tawod_sync_keys?name=eq.${name}&select=key_hash,enabled`);
  if (!response.ok) return false;
  const rows = await response.json(); const row = rows?.[0];
  if (!row?.enabled || !row?.key_hash) return false;
  return (await sha256(value)) === row.key_hash;
}
function validDate(value: unknown) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }
function cleanCampaignRows(body: any) {
  const customerId = text(body?.customerId, 40); const currency = text(body?.currency, 8) || 'SAR';
  if (!customerId) return [];
  return (Array.isArray(body?.campaigns) ? body.campaigns : []).slice(0, 6000).flatMap((row: any) => {
    const date = validDate(row?.date), campaignName = text(row?.campaignName, 300), campaignId = Math.trunc(finite(row?.campaignId, -1));
    if (!date || !campaignName || campaignId < 0) return [];
    return [{ report_date: date, customer_id: customerId, currency_code: currency, campaign_id: campaignId, campaign_name: campaignName,
      campaign_status: text(row?.campaignStatus, 40), channel_type: text(row?.channelType, 60),
      impressions: Math.max(0, Math.trunc(finite(row?.impressions))), clicks: Math.max(0, Math.trunc(finite(row?.clicks))),
      cost_micros: Math.max(0, Math.trunc(finite(row?.costMicros))), conversions: Math.max(0, finite(row?.conversions)),
      all_conversions: Math.max(0, finite(row?.allConversions)), conversions_value: finite(row?.conversionsValue),
      phone_calls: Math.max(0, Math.trunc(finite(row?.phoneCalls))), phone_impressions: Math.max(0, Math.trunc(finite(row?.phoneImpressions))),
      phone_through_rate: Math.max(0, finite(row?.phoneThroughRate)),
      daily_budget_micros: Math.max(0, Math.trunc(finite(row?.dailyBudgetMicros))),
      total_budget_micros: Math.max(0, Math.trunc(finite(row?.totalBudgetMicros))),
      synced_at: new Date().toISOString() }];
  });
}
function cleanConversionRows(body: any) {
  const customerId = text(body?.customerId, 40); if (!customerId) return [];
  return (Array.isArray(body?.conversions) ? body.conversions : []).slice(0, 12000).flatMap((row: any) => {
    const date = validDate(row?.date), campaignName = text(row?.campaignName, 300), action = text(row?.conversionActionName, 300), campaignId = Math.trunc(finite(row?.campaignId, -1));
    if (!date || !campaignName || !action || campaignId < 0) return [];
    return [{ report_date: date, customer_id: customerId, campaign_id: campaignId, campaign_name: campaignName, conversion_action_name: action,
      conversions: Math.max(0, finite(row?.conversions)), all_conversions: Math.max(0, finite(row?.allConversions)), conversions_value: finite(row?.conversionsValue), synced_at: new Date().toISOString() }];
  });
}
function validTimestamp(value: unknown) {
  if (typeof value !== 'string' || value.length > 60) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function cleanCallRows(body: any) {
  const customerId = text(body?.customerId, 40); if (!customerId) return [];
  return (Array.isArray(body?.calls) ? body.calls : []).slice(0, 5000).flatMap((row: any) => {
    const resourceName = text(row?.resourceName, 300);
    const startedAt = validTimestamp(row?.startedAt);
    if (!resourceName || !startedAt) return [];
    const campaignId = Math.trunc(finite(row?.campaignId, -1));
    return [{
      resource_name: resourceName, customer_id: customerId,
      campaign_id: campaignId >= 0 ? campaignId : null,
      campaign_name: text(row?.campaignName, 300), started_at: startedAt,
      ended_at: validTimestamp(row?.endedAt),
      duration_seconds: Math.max(0, Math.trunc(finite(row?.durationSeconds))),
      call_status: text(row?.status, 40), tracking_location: text(row?.trackingLocation, 120),
      call_type: text(row?.callType, 80), synced_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }];
  });
}
async function syncGoogleAds(body: any, origin: string | null) {
  if (!await verifySyncKey(body?.syncKey, 'google_ads')) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return json({ error: 'unauthorized' }, 401, origin);
  }
  const campaigns = cleanCampaignRows(body), conversions = cleanConversionRows(body), calls = cleanCallRows(body);
  if (!campaigns.length && !calls.length) return json({ error: 'no_sync_rows' }, 400, origin);
  if (campaigns.length) {
    const campaignResponse = await supabase('/rest/v1/tawod_google_ads_daily?on_conflict=report_date,customer_id,campaign_id', {
      method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(campaigns)
    });
    if (!campaignResponse.ok) return json({ error: 'campaign_sync_failed', detail: await campaignResponse.text() }, 500, origin);
  }
  if (conversions.length) {
    const conversionResponse = await supabase('/rest/v1/tawod_google_ads_conversion_daily?on_conflict=report_date,customer_id,campaign_id,conversion_action_name', {
      method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(conversions)
    });
    if (!conversionResponse.ok) return json({ error: 'conversion_sync_failed', detail: await conversionResponse.text() }, 500, origin);
  }
  if (calls.length) {
    const callResponse = await supabase('/rest/v1/tawod_google_ads_calls?on_conflict=resource_name', {
      method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(calls)
    });
    if (!callResponse.ok) return json({ error: 'call_sync_failed', detail: await callResponse.text() }, 500, origin);
  }
  await supabase('/rest/v1/tawod_sync_keys?name=eq.google_ads', { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ last_used_at: new Date().toISOString() }) });
  return json({ ok: true, campaigns: campaigns.length, conversions: conversions.length, calls: calls.length, syncedAt: new Date().toISOString() }, 200, origin);
}

function cleanProfileRows(body: any) {
  const locationId = text(body?.locationId, 180), profileName = text(body?.profileName, 300);
  if (!locationId) return [];
  return (Array.isArray(body?.daily) ? body.daily : []).slice(0, 400).flatMap((row: any) => {
    const date = validDate(row?.date); if (!date) return [];
    return [{ report_date: date, location_id: locationId, profile_name: profileName,
      search_desktop_impressions: Math.max(0, Math.trunc(finite(row?.searchDesktopImpressions))),
      search_mobile_impressions: Math.max(0, Math.trunc(finite(row?.searchMobileImpressions))),
      maps_desktop_impressions: Math.max(0, Math.trunc(finite(row?.mapsDesktopImpressions))),
      maps_mobile_impressions: Math.max(0, Math.trunc(finite(row?.mapsMobileImpressions))),
      conversations: Math.max(0, Math.trunc(finite(row?.conversations))),
      direction_requests: Math.max(0, Math.trunc(finite(row?.directionRequests))),
      call_clicks: Math.max(0, Math.trunc(finite(row?.callClicks))),
      website_clicks: Math.max(0, Math.trunc(finite(row?.websiteClicks))),
      bookings: Math.max(0, Math.trunc(finite(row?.bookings))), synced_at: new Date().toISOString() }];
  });
}
function cleanKeywordRows(body: any) {
  const locationId = text(body?.locationId, 180); if (!locationId) return [];
  return (Array.isArray(body?.keywords) ? body.keywords : []).slice(0, 2000).flatMap((row: any) => {
    const month = validDate(row?.month), keyword = text(row?.keyword, 300); if (!month || !keyword) return [];
    return [{ report_month: month.slice(0, 7) + '-01', location_id: locationId, search_keyword: keyword,
      impressions: Math.max(0, Math.trunc(finite(row?.impressions))),
      threshold: row?.threshold == null ? null : Math.max(0, Math.trunc(finite(row.threshold))),
      synced_at: new Date().toISOString() }];
  });
}
async function syncBusinessProfile(body: any, origin: string | null) {
  if (!await verifySyncKey(body?.syncKey, 'business_profile')) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return json({ error: 'unauthorized' }, 401, origin);
  }
  const daily = cleanProfileRows(body), keywords = cleanKeywordRows(body);
  if (!daily.length && !keywords.length) return json({ error: 'no_sync_rows' }, 400, origin);
  if (daily.length) {
    const response = await supabase('/rest/v1/tawod_business_profile_daily?on_conflict=report_date,location_id', {
      method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(daily)
    });
    if (!response.ok) return json({ error: 'profile_sync_failed', detail: await response.text() }, 500, origin);
  }
  if (keywords.length) {
    const response = await supabase('/rest/v1/tawod_business_profile_keywords_monthly?on_conflict=report_month,location_id,search_keyword', {
      method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(keywords)
    });
    if (!response.ok) return json({ error: 'keyword_sync_failed', detail: await response.text() }, 500, origin);
  }
  await supabase('/rest/v1/tawod_sync_keys?name=eq.business_profile', { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ last_used_at: new Date().toISOString() }) });
  return json({ ok: true, daily: daily.length, keywords: keywords.length, syncedAt: new Date().toISOString() }, 200, origin);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);
  let body: any; try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400, origin); }

  if (body?.mode === 'google_ads_sync') return syncGoogleAds(body, origin);
  if (body?.mode === 'business_profile_sync') return syncBusinessProfile(body, origin);

  if (body?.mode === 'admin_login') {
    if (!isAdminOrigin(origin)) return json({ error: 'origin_not_allowed' }, 403, origin);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (username !== ADMIN_USERNAME || !password || await sha256(password) !== ADMIN_HASH) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      return json({ error: 'unauthorized' }, 401, origin, { 'Retry-After': '1' });
    }
    return json({ token: await issueAdminToken(), expiresIn: ADMIN_TTL_MS / 1000 }, 200, origin);
  }

  if (body?.mode === 'admin') {
    if (!isAdminOrigin(origin)) return json({ error: 'origin_not_allowed' }, 403, origin);
    let authorized = await verifyAdminToken(body.token);
    if (!authorized && typeof body.password === 'string' && body.password) authorized = await sha256(body.password) === ADMIN_HASH;
    if (!authorized) return json({ error: 'unauthorized' }, 401, origin);
    const days = Math.max(7, Math.min(Number(body.days) || 30, 90));
    const [siteResponse, adsResponse, profileResponse] = await Promise.all([
      supabase('/rest/v1/rpc/tawod_admin_analytics', { method: 'POST', body: JSON.stringify({ p_days: days }) }),
      supabase('/rest/v1/rpc/tawod_google_ads_analytics', { method: 'POST', body: JSON.stringify({ p_days: days }) }),
      supabase('/rest/v1/rpc/tawod_business_profile_analytics', { method: 'POST', body: JSON.stringify({ p_days: days }) })
    ]);
    if (!siteResponse.ok) return json({ error: 'analytics_query_failed' }, 500, origin);
    const site = await siteResponse.json();
    const googleAds = adsResponse.ok ? await adsResponse.json() : { connected: false, error: 'google_ads_query_failed' };
    const businessProfile = profileResponse.ok ? await profileResponse.json() : { connected: false, error: 'business_profile_query_failed' };
    return json({ ...site, googleAds, businessProfile }, 200, origin);
  }

  if (body?.mode === 'call_qualification_update') {
    if (!isAdminOrigin(origin)) return json({ error: 'origin_not_allowed' }, 403, origin);
    if (!await verifyAdminToken(body.token)) return json({ error: 'unauthorized' }, 401, origin);
    const resourceName = text(body.resourceName, 300);
    if (!resourceName) return json({ error: 'invalid_call' }, 400, origin);
    const repeatContacts = Math.max(1, Math.min(20, Math.trunc(finite(body.repeatContacts, 1))));
    const visitRequested = body.visitRequested === true;
    const query = new URLSearchParams({ resource_name: `eq.${resourceName}` });
    const response = await supabase(`/rest/v1/tawod_google_ads_calls?${query.toString()}`, {
      method: 'PATCH', headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ repeat_contacts: repeatContacts, visit_requested: visitRequested, updated_at: new Date().toISOString() })
    });
    if (!response.ok) return json({ error: 'qualification_update_failed' }, 500, origin);
    const rows = await response.json();
    if (!rows.length) return json({ error: 'call_not_found' }, 404, origin);
    return json({ ok: true }, 200, origin);
  }

  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: 'origin_not_allowed' }, 403, origin);
  const rawEvents = Array.isArray(body?.events) ? body.events.slice(0, 20) : [];
  if (!rawEvents.length) return json({ ok: true, inserted: 0 }, 200, origin);
  const rows = rawEvents.flatMap((event: any) => {
    const name = text(event?.event_name, 60); const pagePath = text(event?.page_path, 500) || '/';
    if (!name || !EVENT_NAMES.has(name)) return [];
    return [{ event_name: name, visitor_id: text(event.visitor_id, 80), session_id: text(event.session_id, 80), page_path: pagePath,
      page_title: text(event.page_title, 300), landing_path: text(event.landing_path, 500), referrer_host: text(event.referrer_host, 255),
      device_type: ['mobile','tablet','desktop'].includes(event.device_type) ? event.device_type : null, contact_method: text(event.contact_method, 30),
      form_name: text(event.form_name, 120), form_source_path: text(event.form_source_path, 500), service_type: text(event.service_type, 200),
      article_slug: text(event.article_slug, 200), utm_source: text(event.utm_source, 120), utm_medium: text(event.utm_medium, 120),
      utm_campaign: text(event.utm_campaign, 180), utm_term: text(event.utm_term, 180), utm_content: text(event.utm_content, 180),
      click_id: text(event.click_id, 300), metadata: cleanMeta(event.metadata) }];
  });
  if (!rows.length) return json({ ok: true, inserted: 0 }, 200, origin);
  const response = await supabase('/rest/v1/tawod_analytics_events', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(rows) });
  if (!response.ok) return json({ error: 'insert_failed' }, 500, origin);
  return json({ ok: true, inserted: rows.length }, 200, origin);
});
