-- Drivers Lounge 1.0 authentication and security groundwork.
-- Review carefully before production. Run after 005_rc1_platform_groundwork.sql.

alter table profiles enable row level security;
alter table driver_passports enable row level security;
alter table business_accounts enable row level security;
alter table road_reports enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table loads enable row level security;
alter table community_rooms enable row level security;
alter table community_posts enable row level security;
alter table marketplace_listings enable row level security;
alter table pilot_car_profiles enable row level security;
alter table pilot_car_jobs enable row level security;
alter table petitions enable row level security;
alter table petition_signatures enable row level security;

create policy "profiles read own" on profiles for select using (auth.uid() = id);
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);
create unique index if not exists driver_passports_user_id_key on driver_passports(user_id);
create policy "passport owner all" on driver_passports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "business owner all" on business_accounts for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "road reports public read" on road_reports for select using (true);
create policy "road reports authenticated insert" on road_reports for insert to authenticated with check (auth.uid() = user_id);
create policy "community rooms public read" on community_rooms for select using (visibility = 'public' or auth.uid() = creator_user_id);
create policy "community rooms authenticated insert" on community_rooms for insert to authenticated with check (auth.uid() = creator_user_id);
create policy "community posts public read" on community_posts for select using (true);
create policy "community posts author insert" on community_posts for insert to authenticated with check (auth.uid() = author_user_id);
create policy "marketplace public read" on marketplace_listings for select using (status = 'active' or auth.uid() = seller_user_id);
create policy "marketplace owner all" on marketplace_listings for all to authenticated using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);
create policy "pilot jobs public read" on pilot_car_jobs for select using (status = 'open' or auth.uid() = poster_user_id);
create policy "pilot jobs owner all" on pilot_car_jobs for all to authenticated using (auth.uid() = poster_user_id) with check (auth.uid() = poster_user_id);
create policy "jobs public active read" on jobs for select using (status = 'active');
create policy "loads public active read" on loads for select using (status = 'active');
