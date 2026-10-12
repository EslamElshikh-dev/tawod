-- Authenticated Edge ingestion uses one transaction for observations and verification.
-- The primary location remains private configuration; never mix another branch here.
create or replace function public.tawod_business_profile_ingest(
  p_location_id text, p_daily jsonb default '[]'::jsonb, p_keywords jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  r jsonb;
  field text;
  daily_written integer;
  keywords_written integer;
  days integer;
  analytics jsonb;
  expected jsonb;
  window_receipts jsonb := '{}'::jsonb;
  expected_days integer;
  expected_keywords integer;
  source_fetched_at timestamptz;
begin
  if p_location_id is null or p_location_id !~ '^locations/[0-9]{1,30}$'
     or p_location_id is distinct from (select location_id from public.tawod_business_profile_connection where slot = 'primary') then
    raise exception 'invalid_profile_location' using errcode = '22023';
  end if;
  if jsonb_typeof(p_daily) is distinct from 'array' or jsonb_typeof(p_keywords) is distinct from 'array'
     or jsonb_array_length(p_daily) > 400 or jsonb_array_length(p_keywords) > 2000 then
    raise exception 'invalid_profile_batch' using errcode = '22023';
  end if;
  -- Validate the entire request before any writes, including the source timestamp.
  for r in select value from jsonb_array_elements(p_daily || p_keywords) loop
    if jsonb_typeof(r) is distinct from 'object' or (r->>'location_id') is distinct from p_location_id
       or jsonb_typeof(r->'synced_at') is distinct from 'string'
       or (r->>'synced_at') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$' then
      raise exception 'invalid_profile_observation' using errcode = '22023';
    end if;
    perform (r->>'synced_at')::timestamptz;
  end loop;
  for r in select value from jsonb_array_elements(p_daily) loop
    if (r->>'report_date') is null or (r->>'report_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or (r->>'report_date')::date >= (now() at time zone 'Asia/Riyadh')::date
       or (r->>'profile_name') is distinct from 'شركة تعاود للمقاولات · الرياض' or r ? 'conversations' then
      raise exception 'invalid_daily_observation' using errcode = '22023';
    end if;
    foreach field in array array['search_desktop_impressions','search_mobile_impressions','maps_desktop_impressions','maps_mobile_impressions','call_clicks','website_clicks','direction_requests','bookings'] loop
      if jsonb_typeof(r->field) is distinct from 'number' or (r->>field) !~ '^(0|[1-9][0-9]*)$' or (r->>field)::numeric > 9007199254740991 then
        raise exception 'invalid_daily_metric' using errcode = '22023';
      end if;
    end loop;
  end loop;
  for r in select value from jsonb_array_elements(p_keywords) loop
    if (r->>'report_month') is null or (r->>'report_month') !~ '^[0-9]{4}-[0-9]{2}-01$'
       or (r->>'report_month')::date > date_trunc('month',now() at time zone 'Asia/Riyadh')::date
       or (r->>'search_keyword') is null or btrim(r->>'search_keyword') = '' or length(r->>'search_keyword') > 300 then
      raise exception 'invalid_monthly_observation' using errcode = '22023';
    end if;
    perform (r->>'report_month')::date;
    if not ((jsonb_typeof(r->'impressions') = 'number' and r->>'impressions' ~ '^(0|[1-9][0-9]*)$' and (r->>'impressions')::numeric <= 9007199254740991 and r->'threshold' = 'null'::jsonb)
         or (r->'impressions' = 'null'::jsonb and jsonb_typeof(r->'threshold') = 'number' and r->>'threshold' ~ '^[1-9][0-9]*$' and (r->>'threshold')::numeric <= 9007199254740991)) is true then
      raise exception 'invalid_monthly_count' using errcode = '22023';
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_daily) group by value->>'report_date' having count(*) > 1)
     or exists(select 1 from jsonb_array_elements(p_keywords) group by value->>'report_month',value->>'search_keyword' having count(*) > 1) then
    raise exception 'duplicate_profile_observation' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('tawod_gbp:' || p_location_id, 0));
  insert into public.tawod_business_profile_daily as d
    (report_date,location_id,profile_name,search_desktop_impressions,search_mobile_impressions,maps_desktop_impressions,maps_mobile_impressions,call_clicks,website_clicks,direction_requests,bookings,synced_at)
  select report_date,location_id,profile_name,search_desktop_impressions,search_mobile_impressions,maps_desktop_impressions,maps_mobile_impressions,call_clicks,website_clicks,direction_requests,bookings,synced_at
  from jsonb_populate_recordset(null::public.tawod_business_profile_daily,p_daily)
  on conflict(report_date,location_id) do update set
    profile_name=excluded.profile_name,search_desktop_impressions=excluded.search_desktop_impressions,search_mobile_impressions=excluded.search_mobile_impressions,
    maps_desktop_impressions=excluded.maps_desktop_impressions,maps_mobile_impressions=excluded.maps_mobile_impressions,
    call_clicks=excluded.call_clicks,website_clicks=excluded.website_clicks,direction_requests=excluded.direction_requests,bookings=excluded.bookings,synced_at=excluded.synced_at
  where excluded.synced_at >= d.synced_at;
  get diagnostics daily_written = row_count;
  insert into public.tawod_business_profile_keywords_monthly as k
    (report_month,location_id,search_keyword,impressions,threshold,synced_at)
  select report_month,location_id,search_keyword,impressions,threshold,synced_at
  from jsonb_populate_recordset(null::public.tawod_business_profile_keywords_monthly,p_keywords)
  on conflict(report_month,location_id,search_keyword) do update set
    impressions=excluded.impressions,threshold=excluded.threshold,synced_at=excluded.synced_at
  where excluded.synced_at >= k.synced_at;
  get diagnostics keywords_written = row_count;
  -- An older cached response is intentionally skipped. Equal/newer observations
  -- must match every stored value; a failure rolls back both writes.
  if exists (
    select 1 from jsonb_populate_recordset(null::public.tawod_business_profile_daily,p_daily) s
    left join public.tawod_business_profile_daily d using(report_date,location_id)
    where d.synced_at is null or d.synced_at < s.synced_at or (d.synced_at = s.synced_at and
      row(d.profile_name,d.search_desktop_impressions,d.search_mobile_impressions,d.maps_desktop_impressions,d.maps_mobile_impressions,d.call_clicks,d.website_clicks,d.direction_requests,d.bookings)
      is distinct from row(s.profile_name,s.search_desktop_impressions,s.search_mobile_impressions,s.maps_desktop_impressions,s.maps_mobile_impressions,s.call_clicks,s.website_clicks,s.direction_requests,s.bookings))
  ) or exists (
    select 1 from jsonb_populate_recordset(null::public.tawod_business_profile_keywords_monthly,p_keywords) s
    left join public.tawod_business_profile_keywords_monthly k using(report_month,location_id,search_keyword)
    where k.synced_at is null or k.synced_at < s.synced_at or (k.synced_at = s.synced_at and row(k.impressions,k.threshold) is distinct from row(s.impressions,s.threshold))
  ) then raise exception 'profile_totals_mismatch'; end if;
  foreach days in array array[7,30,90] loop
    analytics := public.tawod_business_profile_analytics(days);
    select count(*)::integer,jsonb_build_object(
      'searchDesktopImpressions',coalesce(sum(search_desktop_impressions),0),'searchMobileImpressions',coalesce(sum(search_mobile_impressions),0),
      'mapsDesktopImpressions',coalesce(sum(maps_desktop_impressions),0),'mapsMobileImpressions',coalesce(sum(maps_mobile_impressions),0),
      'calls',coalesce(sum(call_clicks),0),'websiteClicks',coalesce(sum(website_clicks),0),'directions',coalesce(sum(direction_requests),0),'bookings',coalesce(sum(bookings),0)
    ) into expected_days,expected from public.tawod_business_profile_daily
    where location_id=p_location_id and report_date between (now() at time zone 'Asia/Riyadh')::date-(days-1) and (now() at time zone 'Asia/Riyadh')::date;
    select count(*)::integer into expected_keywords from public.tawod_business_profile_keywords_monthly
    where location_id=p_location_id and report_month between date_trunc('month',(now() at time zone 'Asia/Riyadh')::date-(days-1))::date and date_trunc('month',now() at time zone 'Asia/Riyadh')::date;
    if not coalesce((analytics->'summary') @> expected,false) or (analytics->>'locationId') is distinct from p_location_id
       or (analytics->>'reportingDays')::integer is distinct from expected_days or jsonb_array_length(analytics->'daily') is distinct from expected_days
       or jsonb_array_length(analytics->'keywords') is distinct from expected_keywords
       or exists (
         select 1 from jsonb_array_elements(analytics->'keywords') a
         left join public.tawod_business_profile_keywords_monthly k on k.location_id=p_location_id and k.report_month=(a->>'month')::date and k.search_keyword=a->>'keyword'
         where k.search_keyword is null or k.impressions is distinct from (a->>'impressions')::bigint or k.threshold is distinct from (a->>'threshold')::bigint
       ) then raise exception 'profile_analytics_mismatch'; end if;
    window_receipts := window_receipts || jsonb_build_object(days::text,jsonb_build_object('rangeStart',analytics->'rangeStart','rangeEnd',analytics->'rangeEnd','reportingDays',expected_days,'lastReportDate',analytics->'lastReportDate','summary',analytics->'summary','keywordRows',expected_keywords));
  end loop;
  select max((value->>'synced_at')::timestamptz) into source_fetched_at from jsonb_array_elements(p_daily || p_keywords);
  return jsonb_build_object('verified',true,'locationId',p_location_id,'sourceFetchedAt',to_char(source_fetched_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'dailyReceived',jsonb_array_length(p_daily),'dailyWritten',daily_written,'dailySkippedOlder',jsonb_array_length(p_daily)-daily_written,
    'keywordsReceived',jsonb_array_length(p_keywords),'keywordsWritten',keywords_written,'keywordsSkippedOlder',jsonb_array_length(p_keywords)-keywords_written,
    'receivedMonthlyCounts',(select jsonb_build_object('exactRows',count(*) filter(where impressions is not null),'thresholdRows',count(*) filter(where threshold is not null),'exactImpressions',coalesce(sum(impressions),0)) from jsonb_populate_recordset(null::public.tawod_business_profile_keywords_monthly,p_keywords)),
    'windows',window_receipts);
end;
$function$;
revoke all on function public.tawod_business_profile_ingest(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.tawod_business_profile_ingest(text,jsonb,jsonb) to service_role;
comment on function public.tawod_business_profile_ingest(text,jsonb,jsonb) is 'Strict atomic GBP ingestion for the privately configured primary location; preserves cached fetch times and keyword bounds.';
