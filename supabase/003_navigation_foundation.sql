-- Drivers Lounge navigation foundation
create table if not exists public.vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  vehicle_type text not null,
  trailer_type text,
  height_inches integer,
  width_inches integer,
  length_inches integer,
  gross_weight_lbs integer,
  axle_count integer,
  axle_weights jsonb default '[]'::jsonb,
  hazmat_classes text[] default '{}',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_profile_id uuid references public.vehicle_profiles(id) on delete set null,
  origin_label text not null,
  destination_label text not null,
  route_mode text not null default 'safest',
  route_geometry jsonb,
  route_metadata jsonb default '{}'::jsonb,
  hazmat_enabled boolean default false,
  oversize_enabled boolean default false,
  permit_notes text,
  created_at timestamptz default now()
);
create table if not exists public.road_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  report_type text not null,
  latitude double precision not null,
  longitude double precision not null,
  heading integer,
  details text,
  confidence integer default 50 check (confidence between 0 and 100),
  confirmations integer default 0,
  denials integer default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create table if not exists public.scale_status_reports (
  id uuid primary key default gen_random_uuid(),
  scale_location_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('open','closed','pulling','unknown')),
  direction text,
  notes text,
  created_at timestamptz default now()
);
alter table public.vehicle_profiles enable row level security;
alter table public.saved_trips enable row level security;
alter table public.road_reports enable row level security;
alter table public.scale_status_reports enable row level security;
create policy "vehicle profiles owned by user" on public.vehicle_profiles for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "saved trips owned by user" on public.saved_trips for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "road reports readable" on public.road_reports for select using (expires_at > now());
create policy "authenticated users create road reports" on public.road_reports for insert with check (auth.uid()=user_id);
create policy "scale reports readable" on public.scale_status_reports for select using (true);
create policy "authenticated users create scale reports" on public.scale_status_reports for insert with check (auth.uid()=user_id);
create index if not exists road_reports_active_idx on public.road_reports(report_type,expires_at);
create index if not exists saved_trips_user_idx on public.saved_trips(user_id,created_at desc);
