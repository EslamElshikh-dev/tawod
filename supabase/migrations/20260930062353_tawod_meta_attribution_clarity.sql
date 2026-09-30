-- Meta without a Facebook/Instagram placement is not attributed to either platform.
-- One attribution vocabulary across website, social cohorts and reviewed opportunities.
create or replace function public.tawod_attribution_source(p_source text,p_medium text,p_referrer text,p_click_id text,p_landing text)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare
  raw_source text:=replace(lower(btrim(coalesce(p_source,''))),'_','-');
  medium text:=replace(lower(btrim(coalesce(p_medium,''))),'_','-');
  host text:=lower(btrim(coalesce(p_referrer,'')));
  base text; paid boolean;
  google_click boolean:=nullif(btrim(p_click_id),'') is not null or coalesce(p_landing,'') ~* '[?&](gclid|gbraid|wbraid|gad_campaignid)=' or coalesce(p_landing,'') ~* '[?&]gad_source=1([&#]|$)';
begin
  paid:=medium in ('cpc','ppc','paid','paid-social','paid-social-media','paidsocial','paidsearch','ads','ad','display','retargeting') or raw_source ~ '-(ads|paid)$';
  base:=regexp_replace(raw_source,'-(ads|paid)$','');
  if base in ('ig','instagram','insta') then base:='instagram';
  elsif base in ('fb','facebook') then base:='facebook';
  elsif base in ('tt','tiktok','tik-tok') then base:='tiktok';
  elsif base in ('x','twitter','x.com','twitter.com','t.co') then base:='x';
  elsif base in ('google','google-ads','adwords') then base:='google'; end if;
  if google_click and base in ('instagram','facebook','tiktok','x') then return 'attribution-conflict'; end if;
  if google_click then return 'google-ads'; end if;
  if base<>'' then
    if base='google' and not paid then return 'google-organic'; end if;
    return base || case when paid then '-ads' else '' end;
  end if;
  if coalesce(p_landing,'') ~* '[?&]ttclid=' then return 'tiktok-ads'; end if;
  if host ~ '(^|\.)instagram\.com$' then return 'instagram'; end if;
  if host ~ '(^|\.)facebook\.com$' or host in ('fb.com','fb.me') then return 'facebook'; end if;
  if host ~ '(^|\.)tiktok\.com$' then return 'tiktok'; end if;
  if host ~ '(^|\.)(twitter|x)\.com$' or host='t.co' then return 'x'; end if;
  if host ~ '(^|\.)google\.' then return 'google-organic'; end if;
  if host='' or host in ('tawodco.com','www.tawodco.com') then return 'direct'; end if;
  return host;
end $$;
revoke all on function public.tawod_attribution_source(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.tawod_attribution_source(text,text,text,text,text) to service_role;

