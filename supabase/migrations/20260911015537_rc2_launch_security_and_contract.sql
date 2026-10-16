-- Additive RC2 repair. Preserves existing rows and the isolated ha_* application.
alter table public.profiles add column if not exists company_name text;

-- Profiles are created by the already-hardened auth trigger. Clients may update
-- personal details, never identity, administrator role, or verification status.
revoke insert, update on public.profiles from public, anon, authenticated;
grant update (display_name, home_state, avatar_url, phone, home_city,
  onboarding_complete, company_name, updated_at) on public.profiles to authenticated;

-- Remove overlapping legacy owner rules: both identity columns must agree.
do $$ declare p record; begin
  for p in select policyname from pg_policies
    where schemaname='public' and tablename='driver_passports'
  loop execute format('drop policy %I on public.driver_passports',p.policyname); end loop;
end $$;
create policy "passport owner read" on public.driver_passports for select to authenticated
  using (profile_id=(select auth.uid()) and user_id=(select auth.uid()));
create policy "passport owner insert" on public.driver_passports for insert to authenticated
  with check (profile_id=(select auth.uid()) and user_id=(select auth.uid()));
create policy "passport owner update" on public.driver_passports for update to authenticated
  using (profile_id=(select auth.uid()) and user_id=(select auth.uid()))
  with check (profile_id=(select auth.uid()) and user_id=(select auth.uid()));
create policy "passport owner delete" on public.driver_passports for delete to authenticated
  using (profile_id=(select auth.uid()) and user_id=(select auth.uid()));

-- Column grants also apply when a client bypasses the UI and calls REST directly.
do $$ declare item record; cols text; begin
  for item in select * from (values
    ('ad_campaigns',array['id','billing_status','payment_reference','source_type','source_url','verified_at','welcome_priority','created_at']::text[]),
    ('carrier_reviews',array['id','verification_status','moderation_status','created_at']::text[]),
    ('business_accounts',array['id','status','verified','verification_status','created_at']::text[])
  ) as protections(tbl,protected)
  loop
    select string_agg(quote_ident(column_name),', ' order by ordinal_position) into cols
      from information_schema.columns where table_schema='public'
        and table_name=item.tbl and not column_name=any(item.protected);
    execute format('revoke insert, update on public.%I from public, anon, authenticated',item.tbl);
    execute format('grant insert (%s), update (%s) on public.%I to authenticated',cols,cols,item.tbl);
  end loop;
end $$;

-- A review hidden by moderation must not be republished by its author.
alter policy "drivers update own carrier reviews" on public.carrier_reviews
  using (reviewer_user_id=(select auth.uid()) and moderation_status='published')
  with check (reviewer_user_id=(select auth.uid()) and moderation_status='published');

-- Remove a permissive duplicate that previously bypassed support validation.
drop policy if exists "users create support tickets" on public.support_tickets;

-- Private rooms must not leak their posts through a direct public REST request.
alter policy "community posts published read" on public.community_posts
  using (author_user_id=(select auth.uid()) or (status='published' and exists
    (select 1 from public.community_rooms r where r.id=room_id and r.visibility='public')));
alter policy "community_posts_insert" on public.community_posts
  with check (author_user_id=(select auth.uid()) and exists
    (select 1 from public.community_rooms r where r.id=room_id
      and (r.visibility='public' or r.creator_user_id=(select auth.uid()))));

-- Managed PostGIS grants require the supabase_admin owner to revoke. Keep that
-- separate from this migration: postgres REVOKE silently leaves those grants.

-- Aggregate each event source separately to avoid multiplying counts by joins.
create or replace view public.advertiser_campaign_metrics with (security_invoker=true) as
select c.id as campaign_id,c.submitted_by,c.advertiser_name,c.title,c.placement,
  c.review_status,c.billing_status,c.active,c.budget_cents,c.daily_budget_cents,
  coalesce(e.impressions,0)::integer as impressions,
  coalesce(e.audio_plays,0)::integer as audio_plays,
  coalesce(e.audio_completes,0)::integer as audio_completes,
  coalesce(e.saves,0)::integer as saves,
  coalesce(e.opens_later,0)::integer as opens_later,
  coalesce(r.redemptions,0)::integer as redemptions
from public.ad_campaigns c
left join (select campaign_id,
  count(*) filter(where event_type='impression') as impressions,
  count(*) filter(where event_type='audio_play') as audio_plays,
  count(*) filter(where event_type='audio_complete') as audio_completes,
  count(*) filter(where event_type='save') as saves,
  count(*) filter(where event_type='open_later') as opens_later
  from public.ad_events group by campaign_id) e on e.campaign_id=c.id
left join (select campaign_id,count(*) as redemptions from public.ad_redemptions group by campaign_id) r on r.campaign_id=c.id;

notify pgrst,'reload schema';
