-- Drivers Lounge RC2 bridge for early, untracked Supabase prototypes.
-- Run after 006 and before 007. This preserves incompatible empty tables
-- outside the API-exposed public schema so the canonical RC2 tables can be created.

create schema if not exists legacy_rc2;
revoke all on schema legacy_rc2 from public, anon, authenticated;

do $$
begin
  if to_regclass('public.carrier_reviews') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='carrier_reviews' and column_name='carrier_usdot'
     ) then
    if exists (select 1 from public.carrier_reviews limit 1) then
      raise exception 'Legacy carrier_reviews contains data; manual reconciliation is required';
    end if;
    alter table public.carrier_reviews set schema legacy_rc2;
  end if;

  if to_regclass('public.carriers') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='carriers' and column_name='physical_city'
     ) then
    if exists (select 1 from public.carriers limit 1) then
      raise exception 'Legacy carriers contains data; manual reconciliation is required';
    end if;
    alter table public.carriers set schema legacy_rc2;
  end if;

  if to_regclass('public.ad_campaigns') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='ad_campaigns' and column_name='advertiser_name'
     ) then
    if exists (select 1 from public.ad_campaigns limit 1) then
      raise exception 'Legacy ad_campaigns contains data; manual reconciliation is required';
    end if;
    alter table public.ad_campaigns set schema legacy_rc2;
  end if;
end $$;
