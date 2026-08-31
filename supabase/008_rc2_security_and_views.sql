-- Drivers Lounge RC2 security follow-up.
-- Run after 006_v1_auth_and_rls.sql and 007_rc2_carrier_reviews.sql.

alter view if exists carrier_review_scores set (security_invoker = true);
grant select on carrier_review_scores to anon, authenticated;
grant select on carriers to anon, authenticated;
grant select on carrier_reviews to anon, authenticated;
grant select on carrier_responses to anon, authenticated;

drop policy if exists "community rooms owner update" on community_rooms;
create policy "community rooms owner update" on community_rooms for update to authenticated using (auth.uid() = creator_user_id) with check (auth.uid() = creator_user_id);
drop policy if exists "community rooms owner delete" on community_rooms;
create policy "community rooms owner delete" on community_rooms for delete to authenticated using (auth.uid() = creator_user_id);
drop policy if exists "community posts author update" on community_posts;
create policy "community posts author update" on community_posts for update to authenticated using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id);
drop policy if exists "community posts author delete" on community_posts;
create policy "community posts author delete" on community_posts for delete to authenticated using (auth.uid() = author_user_id);

-- 005_rc1_platform_groundwork.sql defines road_reports.reporter_user_id.
drop policy if exists "road reports author update" on road_reports;
create policy "road reports author update" on road_reports for update to authenticated using (auth.uid() = reporter_user_id) with check (auth.uid() = reporter_user_id);
drop policy if exists "road reports author delete" on road_reports;
create policy "road reports author delete" on road_reports for delete to authenticated using (auth.uid() = reporter_user_id);

-- Carrier responses may only be created by the owner of the linked business account.
drop policy if exists "carrier business response insert" on carrier_responses;
create policy "carrier business response insert" on carrier_responses for insert to authenticated with check (exists (select 1 from business_accounts b where b.id = business_account_id and b.owner_user_id = auth.uid()));

-- Review reports can be read by the reporting user; admin moderation remains server-side/service-role.
drop policy if exists "reporter reads own review reports" on carrier_review_reports;
create policy "reporter reads own review reports" on carrier_review_reports for select to authenticated using (reporter_user_id = auth.uid());