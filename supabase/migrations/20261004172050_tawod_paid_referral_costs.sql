-- Pair completed Riyadh calendar days and count each contact session once.
create or replace function public.tawod_paid_referral_costs(p_days integer default 30)
returns jsonb language sql stable security invoker set search_path = '' as $$
with
settings as (
  select greatest(7,least(coalesce(p_days,30),90))::int days,
    (now() at time zone 'Asia/Riyadh')::date today
),
tracking as (
  select min(occurred_at) first_seen from public.tawod_analytics_events
  where event_name='page_view' and nullif(session_id,'') is not null and occurred_at<=now()
    and not coalesce(click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
),
period as (
  select greatest(s.today-(s.days-1),(t.first_seen at time zone 'Asia/Riyadh')::date+1) start_date,
    least(s.today-1,(select max(report_date) from public.tawod_google_ads_daily where report_date<s.today)) end_date,
    s.today-(s.days-1) requested_start, t.first_seen tracking_since
  from settings s cross join tracking t
),
ads as (
  select d.* from public.tawod_google_ads_daily d cross join period p
  where p.tracking_since is not null and d.report_date between p.start_date and p.end_date
),
events as (
  select e.* from public.tawod_analytics_events e cross join period p
  where p.tracking_since is not null
    and e.occurred_at >= (p.start_date::timestamp at time zone 'Asia/Riyadh')
    and e.occurred_at < ((p.end_date+1)::timestamp at time zone 'Asia/Riyadh')
    and not coalesce(e.click_id,'') ~* '^(TEST|DUMMY|EXAMPLE|FAKE)(-|_|$)'
),
first_page as (
  select distinct on (session_id) session_id, utm_source, utm_medium, referrer_host, click_id, landing_path, utm_campaign
  from events where event_name='page_view' and nullif(session_id,'') is not null
  order by session_id, occurred_at, id
),
contacts as (
  select session_id, bool_or(event_name='call_click') called, bool_or(event_name='whatsapp_click') whatsapp
  from events where event_name in ('call_click','whatsapp_click') group by session_id
),
paid as (
  select f.session_id, coalesce(c.called,false) called, coalesce(c.whatsapp,false) whatsapp,
    coalesce(nullif(substring(coalesce(f.landing_path,'') from '[?&]gad_campaignid=([^&]+)'),''),nullif(btrim(f.utm_campaign),'')) campaign
  from first_page f left join contacts c using(session_id)
  where public.tawod_attribution_source(f.utm_source,f.utm_medium,f.referrer_host,f.click_id,f.landing_path)='google-ads'
),
campaign_keys as (select distinct campaign_id,campaign_name from ads),
mapped as (
  select p.*,case when m.candidates=1 then m.campaign_id end campaign_id
  from paid p cross join lateral (
    select count(distinct k.campaign_id) candidates,min(k.campaign_id) campaign_id
    from campaign_keys k where p.campaign=k.campaign_id::text or p.campaign=k.campaign_name
  ) m
),
campaign_contacts as (
  select campaign_id,count(*)::int sessions,count(*) filter(where called or whatsapp)::int referrals,
    count(*) filter(where called)::int calls,count(*) filter(where whatsapp)::int whatsapp
  from mapped where campaign_id is not null group by campaign_id
),
campaign_costs as (
  select campaign_id,round(sum(cost_micros)::numeric/1000000,2) cost from ads group by campaign_id
),
paired as (
  select a.*,coalesce(c.sessions,0) sessions,coalesce(c.referrals,0) referrals,
    coalesce(c.calls,0) calls,coalesce(c.whatsapp,0) whatsapp,
    round(a.cost/nullif(c.referrals,0),2) cost_per_referral
  from campaign_costs a left join campaign_contacts c using(campaign_id)
),
totals as (
  select coalesce(sum(cost),0) period_cost,coalesce(sum(cost) filter(where sessions>0),0) matched_cost,
    coalesce(sum(sessions),0) sessions,coalesce(sum(referrals),0) referrals,
    coalesce(sum(calls),0) calls,coalesce(sum(whatsapp),0) whatsapp,
    count(*) filter(where sessions>0) matched_campaigns,count(*) campaigns
  from paired
),
quality as (
  select count(distinct report_date)::int covered_days,count(distinct currency_code)::int currencies from ads
)
select jsonb_build_object(
  'available',p.tracking_since is not null and p.start_date<=p.end_date and q.covered_days=p.end_date-p.start_date+1 and q.currencies=1,
  'startDate',p.start_date,'endDate',p.end_date,'timeZone','Asia/Riyadh','completedDaysOnly',true,
  'trackingSince',p.tracking_since,'trackingWindowShortened',p.start_date>p.requested_start,
  'coveredDays',q.covered_days,'expectedDays',greatest(0,p.end_date-p.start_date+1),
  'missingDays',greatest(0,p.end_date-p.start_date+1-q.covered_days),
  'summary',jsonb_build_object(
    'periodCost',t.period_cost,'matchedCost',t.matched_cost,'sessions',t.sessions,'referrals',t.referrals,
    'calls',t.calls,'whatsapp',t.whatsapp,'matchedCampaigns',t.matched_campaigns,'campaigns',t.campaigns,
    'costPerReferral',case when q.currencies=1 then round(t.matched_cost/nullif(t.referrals,0),2) end,
    'spendCoverage',round(t.matched_cost/nullif(t.period_cost,0)*100,2),
    'unmatchedSessions',(select count(*) from mapped where campaign_id is null),
    'unmatchedReferrals',(select count(*) from mapped where campaign_id is null and (called or whatsapp))
  ),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object(
    'campaignId',campaign_id,'siteSessions',sessions,'siteReferrals',referrals,'siteCalls',calls,
    'siteWhatsapp',whatsapp,'pairedCost',cost,'siteCostPerReferral',case when q.currencies=1 then cost_per_referral end,
    'attributionMatched',sessions>0) order by cost desc) from paired),'[]'::jsonb)
)
from period p cross join totals t cross join quality q;
$$;
revoke all on function public.tawod_paid_referral_costs(integer) from public,anon,authenticated;
grant execute on function public.tawod_paid_referral_costs(integer) to service_role;

-- Latest budget/status and bounded Riyadh calendar reporting.
CREATE OR REPLACE FUNCTION public.tawod_google_ads_analytics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
with
params as (select greatest(7, least(coalesce(p_days, 30), 90))::int as days, (now() at time zone 'Asia/Riyadh')::date as today),
window_rows as (
  select d.* from public.tawod_google_ads_daily d, params p
  where d.report_date between p.today - (p.days - 1) and p.today
),
window_conv as (
  select c.* from public.tawod_google_ads_conversion_daily c, params p
  where c.report_date between p.today - (p.days - 1) and p.today
),
window_calls as (
  select c.* from public.tawod_google_ads_calls c, params p
  where c.started_at >= ((p.today-(p.days-1))::timestamp at time zone 'Asia/Riyadh') and c.started_at<=now()
),
latest_campaign_budget as (
  select distinct on (customer_id, campaign_id)
    customer_id, campaign_id, campaign_name, campaign_status,
    daily_budget_micros, total_budget_micros
  from window_rows order by customer_id, campaign_id, report_date desc, synced_at desc
),
summary as (
  select coalesce(sum(impressions),0)::bigint as impressions,
    coalesce(sum(clicks),0)::bigint as clicks,
    coalesce(sum(cost_micros),0)::bigint as cost_micros,
    coalesce(sum(conversions),0)::numeric as conversions,
    coalesce(sum(all_conversions),0)::numeric as all_conversions,
    coalesce(sum(phone_calls),0)::bigint as phone_calls,
    max(currency_code) as currency_code
  from window_rows
),
budget as (
  select coalesce(sum(daily_budget_micros) filter (where lower(coalesce(campaign_status,'')) like '%enable%'),0)::bigint as daily_budget_micros,
    coalesce(sum(total_budget_micros),0)::bigint as total_budget_micros
  from latest_campaign_budget
),
call_summary as (
  select count(*)::int as tracked_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED')::int as received_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'MISSED')::int as missed_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60)::int as potential_customers,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60 and (repeat_contacts > 1 or visit_requested))::int as confirmed_customers,
    coalesce(round(avg(duration_seconds) filter (where upper(coalesce(call_status,'')) = 'RECEIVED'),1),0) as avg_duration_seconds
  from window_calls
),
classified_conv as (
  select
    coalesce(sum(conversions) filter (where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric as whatsapp_conversions,
    coalesce(sum(conversions) filter (where lower(conversion_action_name) ~ '(call|phone|مكال|اتصال)'),0)::numeric as call_conversions
  from window_conv
),
campaign_conv as (
  select customer_id, campaign_id,
    coalesce(sum(conversions) filter (where lower(conversion_action_name) ~ '(whatsapp|واتساب|واتس)'),0)::numeric as whatsapp_conversions
  from window_conv group by customer_id, campaign_id
),
campaign_call as (
  select customer_id, campaign_id,
    count(*)::int as tracked_calls,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60)::int as potential_customers,
    count(*) filter (where upper(coalesce(call_status,'')) = 'RECEIVED' and duration_seconds > 60 and (repeat_contacts > 1 or visit_requested))::int as confirmed_customers
  from window_calls group by customer_id, campaign_id
),
campaigns as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaignId', q.campaign_id, 'name', q.name, 'status', q.status,
    'impressions', q.impressions, 'clicks', q.clicks, 'cost', q.cost,
    'dailyBudget', q.daily_budget, 'totalBudget', q.total_budget,
    'conversions', q.conversions, 'phoneCalls', q.phone_calls,
    'whatsappConversions', q.whatsapp_conversions,
    'trackedCalls', q.tracked_calls, 'potentialCustomers', q.potential_customers,
    'confirmedCustomers', q.confirmed_customers,
    'ctr', q.ctr, 'avgCpc', q.avg_cpc, 'cpa', q.cpa
  ) order by q.cost desc, q.name), '[]'::jsonb) as data
  from (
    select d.customer_id, d.campaign_id, b.campaign_name as name,
      b.campaign_status as status, sum(d.impressions)::bigint as impressions,
      sum(d.clicks)::bigint as clicks, round(sum(d.cost_micros)::numeric / 1000000,2) as cost,
      round(b.daily_budget_micros::numeric / 1000000,2) as daily_budget,
      round(b.total_budget_micros::numeric / 1000000,2) as total_budget,
      sum(d.conversions)::numeric as conversions, sum(d.phone_calls)::bigint as phone_calls,
      coalesce(cv.whatsapp_conversions,0) as whatsapp_conversions,
      coalesce(cc.tracked_calls,0) as tracked_calls,
      coalesce(cc.potential_customers,0) as potential_customers,
      coalesce(cc.confirmed_customers,0) as confirmed_customers,
      coalesce(round(sum(d.clicks)::numeric / nullif(sum(d.impressions),0) * 100,2),0) as ctr,
      coalesce(round(sum(d.cost_micros)::numeric / 1000000 / nullif(sum(d.clicks),0),2),0) as avg_cpc,
      coalesce(round(sum(d.cost_micros)::numeric / 1000000 / nullif(sum(d.conversions),0),2),0) as cpa
    from window_rows d
    join latest_campaign_budget b using(customer_id,campaign_id)
    left join campaign_conv cv using (customer_id, campaign_id)
    left join campaign_call cc using (customer_id, campaign_id)
    group by d.customer_id, d.campaign_id, b.campaign_name, b.campaign_status, b.daily_budget_micros, b.total_budget_micros, cv.whatsapp_conversions, cc.tracked_calls, cc.potential_customers, cc.confirmed_customers
    order by sum(d.cost_micros) desc limit 30
  ) q
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', q.report_date, 'impressions', q.impressions, 'clicks', q.clicks,
    'cost', q.cost, 'conversions', q.conversions, 'phoneCalls', q.phone_calls
  ) order by q.report_date), '[]'::jsonb) as data
  from (
    select report_date, sum(impressions)::bigint as impressions, sum(clicks)::bigint as clicks,
      round(sum(cost_micros)::numeric / 1000000,2) as cost,
      sum(conversions)::numeric as conversions, sum(phone_calls)::bigint as phone_calls
    from window_rows group by report_date order by report_date
  ) q
),
action_performance as (
  select customer_id, conversion_action_name as name,
    sum(conversions)::numeric as conversions, sum(conversions_value)::numeric as value
  from window_conv group by customer_id, conversion_action_name
),
action_catalog as (
  select a.customer_id, a.conversion_action_id, a.name, a.status, a.action_type,
    a.origin, a.category, a.primary_for_goal, a.include_in_conversions_metric,
    a.counting_type, a.phone_call_duration_seconds, true as configured,
    coalesce(p.conversions,0)::numeric as conversions, coalesce(p.value,0)::numeric as value
  from public.tawod_google_ads_conversion_actions a
  left join action_performance p on p.customer_id = a.customer_id and p.name = a.name
  where upper(coalesce(a.status,'')) <> 'REMOVED'
  union all
  select p.customer_id, null::bigint, p.name, null::text, null::text,
    null::text, null::text, false, false, null::text, 0, false,
    p.conversions, p.value
  from action_performance p
  where not exists (
    select 1 from public.tawod_google_ads_conversion_actions a
    where a.customer_id = p.customer_id and a.name = p.name
  )
),
actions as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.conversion_action_id, 'name', q.name, 'status', q.status,
    'type', q.action_type, 'origin', q.origin, 'category', q.category,
    'primaryForGoal', q.primary_for_goal,
    'includedInConversionsMetric', q.include_in_conversions_metric,
    'countingType', q.counting_type,
    'phoneCallDurationSeconds', q.phone_call_duration_seconds,
    'configured', q.configured, 'conversions', q.conversions, 'value', q.value
  ) order by q.primary_for_goal desc, q.include_in_conversions_metric desc, q.conversions desc, q.name), '[]'::jsonb) as data
  from (select * from action_catalog order by primary_for_goal desc, conversions desc, name limit 50) q
),
goal_health as (
  select count(*) filter (where upper(coalesce(status,'')) = 'ENABLED')::int as enabled_actions,
    count(*) filter (where upper(coalesce(status,'')) = 'ENABLED' and primary_for_goal and include_in_conversions_metric)::int as primary_actions,
    count(*) filter (where upper(coalesce(status,'')) = 'ENABLED' and not (primary_for_goal and include_in_conversions_metric))::int as secondary_actions,
    count(*) filter (where upper(coalesce(status,'')) = 'ENABLED' and category in ('CONTACT','PHONE_CALL_LEAD','SUBMIT_LEAD_FORM','QUALIFIED_LEAD','CONVERTED_LEAD'))::int as lead_actions,
    count(*) filter (where upper(coalesce(status,'')) = 'ENABLED' and category in ('CONTACT','PHONE_CALL_LEAD','SUBMIT_LEAD_FORM','QUALIFIED_LEAD','CONVERTED_LEAD') and primary_for_goal and include_in_conversions_metric)::int as primary_lead_actions
  from public.tawod_google_ads_conversion_actions
),
calls as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'resourceName', q.resource_name, 'startedAt', q.started_at, 'durationSeconds', q.duration_seconds,
    'status', q.call_status, 'campaignId', q.campaign_id, 'campaignName', q.campaign_name,
    'trackingLocation', q.tracking_location, 'callType', q.call_type,
    'repeatContacts', q.repeat_contacts, 'visitRequested', q.visit_requested,
    'potential', upper(coalesce(q.call_status,'')) = 'RECEIVED' and q.duration_seconds > 60,
    'confirmed', upper(coalesce(q.call_status,'')) = 'RECEIVED' and q.duration_seconds > 60 and (q.repeat_contacts > 1 or q.visit_requested)
  ) order by q.started_at desc), '[]'::jsonb) as data
  from (select * from window_calls order by started_at desc limit 100) q
),
connection as (
  select exists(select 1 from public.tawod_google_ads_daily) as connected,
    (select max(synced_at) from public.tawod_google_ads_daily) as last_sync_at,
    (select max(customer_id) from public.tawod_google_ads_daily) as customer_id,
    exists(select 1 from public.tawod_google_ads_conversion_actions) as action_metadata_connected,
    (select max(synced_at) from public.tawod_google_ads_conversion_actions) as action_metadata_last_sync_at
),
current7 as (
  select coalesce(sum(impressions),0)::bigint as impressions, coalesce(sum(clicks),0)::bigint as clicks,
    round(coalesce(sum(cost_micros),0)::numeric / 1000000,2) as cost,
    coalesce(sum(conversions),0)::numeric as conversions, coalesce(sum(phone_calls),0)::bigint as phone_calls
  from public.tawod_google_ads_daily where report_date between (select today from params)-6 and (select today from params)
),
previous7 as (
  select coalesce(sum(impressions),0)::bigint as impressions, coalesce(sum(clicks),0)::bigint as clicks,
    round(coalesce(sum(cost_micros),0)::numeric / 1000000,2) as cost,
    coalesce(sum(conversions),0)::numeric as conversions, coalesce(sum(phone_calls),0)::bigint as phone_calls
  from public.tawod_google_ads_daily where report_date between (select today from params)-13 and (select today from params)-7
)
select jsonb_build_object(
  'connected', cn.connected, 'lastSyncAt', cn.last_sync_at, 'customerId', cn.customer_id,
  'currency', coalesce(s.currency_code, 'SAR'), 'periodDays', (select days from params), 'timeZone','Asia/Riyadh',
  'startDate',(select today-(days-1) from params),'endDate',(select today from params),
  'callReportingConnected', cs.tracked_calls > 0,
  'conversionActionMetadataConnected', cn.action_metadata_connected,
  'conversionActionLastSyncAt', cn.action_metadata_last_sync_at,
  'goalHealth', jsonb_build_object(
    'enabledActions', gh.enabled_actions, 'primaryActions', gh.primary_actions,
    'secondaryActions', gh.secondary_actions, 'leadActions', gh.lead_actions,
    'primaryLeadActions', gh.primary_lead_actions
  ),
  'summary', jsonb_build_object(
    'impressions', s.impressions, 'clicks', s.clicks, 'cost', round(s.cost_micros::numeric / 1000000,2),
    'conversions', s.conversions, 'allConversions', s.all_conversions,
    'phoneCalls', s.phone_calls, 'whatsappConversions', cv.whatsapp_conversions,
    'callConversions', cv.call_conversions,
    'dailyBudget', round(b.daily_budget_micros::numeric / 1000000,2),
    'totalBudget', round(b.total_budget_micros::numeric / 1000000,2),
    'plannedPeriodBudget', round(b.daily_budget_micros::numeric / 1000000 * (select days from params),2),
    'budgetUseRate', coalesce(round(s.cost_micros::numeric / nullif(b.daily_budget_micros * (select days from params),0) * 100,2),0),
    'ctr', coalesce(round(s.clicks::numeric / nullif(s.impressions,0) * 100,2),0),
    'avgCpc', coalesce(round(s.cost_micros::numeric / 1000000 / nullif(s.clicks,0),2),0),
    'cpa', coalesce(round(s.cost_micros::numeric / 1000000 / nullif(s.conversions,0),2),0),
    'trackedCalls', cs.tracked_calls, 'receivedCalls', cs.received_calls, 'missedCalls', cs.missed_calls,
    'potentialCustomers', cs.potential_customers, 'confirmedCustomers', cs.confirmed_customers,
    'avgCallDurationSeconds', cs.avg_duration_seconds
  ),
  'comparison7d', jsonb_build_object('current',to_jsonb(c),'previous',to_jsonb(p)),
  'campaigns', ca.data, 'daily', dy.data, 'conversionActions', ac.data, 'calls', cl.data
)
from summary s cross join budget b cross join call_summary cs cross join classified_conv cv
cross join campaigns ca cross join daily dy cross join actions ac cross join calls cl
cross join connection cn cross join current7 c cross join previous7 p cross join goal_health gh;
$function$;
revoke all on function public.tawod_google_ads_analytics(integer) from public,anon,authenticated;
grant execute on function public.tawod_google_ads_analytics(integer) to service_role;
