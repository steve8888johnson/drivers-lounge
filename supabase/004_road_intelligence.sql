-- Drivers Lounge integrated road intelligence foundation
create table if not exists public.parking_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 location_name text not null, latitude double precision, longitude double precision,
 status text not null check (status in ('plenty','filling','almost_full','full','unknown')),
 estimated_spaces integer, notes text, observed_at timestamptz default now(), created_at timestamptz default now()
);
create table if not exists public.fuel_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 station_name text not null, latitude double precision, longitude double precision,
 diesel_price numeric(6,3), def_price numeric(6,3), cash_price numeric(6,3), credit_price numeric(6,3),
 observed_at timestamptz default now(), created_at timestamptz default now()
);
create table if not exists public.road_events (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 event_type text not null, title text not null, route text, latitude double precision, longitude double precision,
 severity text, notes text, expires_at timestamptz, created_at timestamptz default now()
);
create table if not exists public.commercial_locations (
 id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete set null,
 location_type text not null, name text not null, address text, city text, state text, phone text,
 latitude double precision, longitude double precision, hours jsonb default '{}'::jsonb,
 amenities jsonb default '[]'::jsonb, services jsonb default '[]'::jsonb, verified boolean default false,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.parking_reports enable row level security;
alter table public.fuel_reports enable row level security;
alter table public.road_events enable row level security;
alter table public.commercial_locations enable row level security;
create policy if not exists "public read parking" on public.parking_reports for select using (true);
create policy if not exists "authenticated add parking" on public.parking_reports for insert to authenticated with check (auth.uid()=user_id);
create policy if not exists "public read fuel" on public.fuel_reports for select using (true);
create policy if not exists "authenticated add fuel" on public.fuel_reports for insert to authenticated with check (auth.uid()=user_id);
create policy if not exists "public read road events" on public.road_events for select using (true);
create policy if not exists "authenticated add road events" on public.road_events for insert to authenticated with check (auth.uid()=user_id);
create policy if not exists "public read commercial locations" on public.commercial_locations for select using (true);
create policy if not exists "owners manage locations" on public.commercial_locations for all to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
