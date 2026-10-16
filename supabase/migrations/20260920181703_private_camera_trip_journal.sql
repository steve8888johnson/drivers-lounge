create table if not exists public.driver_trip_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text,
  origin text,
  destination text,
  status text not null default 'active' check (status in ('active','completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(coalesce(title,'')) <= 120),
  check (char_length(coalesce(origin,'')) <= 240),
  check (char_length(coalesce(destination,'')) <= 240)
);

create table if not exists public.driver_trip_points (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.driver_trip_journals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m real check (accuracy_m is null or accuracy_m between 0 and 10000),
  speed_mps real check (speed_mps is null or speed_mps between 0 and 200),
  heading_deg real check (heading_deg is null or heading_deg between 0 and 360)
);

create table if not exists public.driver_camera_crossings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.driver_trip_journals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  camera_source_id text not null,
  detected_at timestamptz not null default now(),
  vehicle_latitude double precision not null check (vehicle_latitude between -90 and 90),
  vehicle_longitude double precision not null check (vehicle_longitude between -180 and 180),
  camera_latitude double precision not null check (camera_latitude between -90 and 90),
  camera_longitude double precision not null check (camera_longitude between -180 and 180),
  distance_m real not null check (distance_m between 0 and 1000),
  heading_deg real check (heading_deg is null or heading_deg between 0 and 360),
  camera_brand text,
  camera_operator text,
  source text not null default 'deflock_osm',
  classification text not null default 'estimated_crossing' check (classification = 'estimated_crossing'),
  created_at timestamptz not null default now(),
  unique (trip_id,camera_source_id)
);

create index if not exists driver_trip_journals_user_started_idx on public.driver_trip_journals(user_id,started_at desc);
create index if not exists driver_trip_points_trip_recorded_idx on public.driver_trip_points(trip_id,recorded_at);
create index if not exists driver_trip_points_user_idx on public.driver_trip_points(user_id);
create index if not exists driver_camera_crossings_trip_detected_idx on public.driver_camera_crossings(trip_id,detected_at);
create index if not exists driver_camera_crossings_user_idx on public.driver_camera_crossings(user_id);

alter table public.driver_trip_journals enable row level security;
alter table public.driver_trip_points enable row level security;
alter table public.driver_camera_crossings enable row level security;

revoke all on public.driver_trip_journals,public.driver_trip_points,public.driver_camera_crossings from public,anon;
grant select,insert,update,delete on public.driver_trip_journals to authenticated;
grant select,insert,delete on public.driver_trip_points to authenticated;
grant select,insert,delete on public.driver_camera_crossings to authenticated;
grant usage,select on sequence public.driver_trip_points_id_seq to authenticated;

drop policy if exists "drivers own trip journals" on public.driver_trip_journals;
create policy "drivers own trip journals" on public.driver_trip_journals for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "drivers own trip points" on public.driver_trip_points;
create policy "drivers own trip points" on public.driver_trip_points for all to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.driver_trip_journals t where t.id=trip_id and t.user_id=(select auth.uid())))
with check ((select auth.uid())=user_id and exists(select 1 from public.driver_trip_journals t where t.id=trip_id and t.user_id=(select auth.uid())));

drop policy if exists "drivers own camera crossings" on public.driver_camera_crossings;
create policy "drivers own camera crossings" on public.driver_camera_crossings for all to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.driver_trip_journals t where t.id=trip_id and t.user_id=(select auth.uid())))
with check ((select auth.uid())=user_id and exists(select 1 from public.driver_trip_journals t where t.id=trip_id and t.user_id=(select auth.uid())));
