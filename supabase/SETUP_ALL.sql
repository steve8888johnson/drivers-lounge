create extension if not exists postgis;
create extension if not exists pgcrypto;

create type user_role as enum ('driver','pilot_car','carrier','business','moderator','admin');
create type visibility_type as enum ('public','private','invite_only');
create type report_status as enum ('open','closed','pulling_trucks','unknown');
create type moderation_status as enum ('pending','published','rejected','removed');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  role user_role not null default 'driver',
  display_name text not null,
  home_state char(2),
  avatar_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  vehicle_type text not null,
  height_ft numeric(5,2), width_ft numeric(5,2), length_ft numeric(6,2), gross_weight_lbs integer,
  axles integer, trailer_type text, hazmat_classes text[],
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table places (
  id uuid primary key default gen_random_uuid(),
  place_type text not null check (place_type in ('scale_house','truck_stop','cat_scale','truck_wash','parking','repair','attorney','permit_service')),
  name text not null,
  address text, city text, state char(2), postal_code text, phone text, website text,
  location geography(point,4326) not null,
  hours jsonb, amenities jsonb not null default '{}'::jsonb,
  claimed_by uuid references profiles(id), verified boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index places_location_gix on places using gist(location);

create table scale_reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  status report_status not null,
  note text,
  location geography(point,4326),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);

create table carriers (
  id uuid primary key default gen_random_uuid(),
  usdot_number bigint unique not null,
  mc_number text,
  legal_name text not null,
  dba_name text,
  operating_status text,
  safety_rating text,
  power_units integer,
  drivers integer,
  cargo_carried text[],
  official_data jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table carrier_reviews (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references carriers(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null,
  employment_type text,
  pay_structure text,
  pay_accuracy smallint check (pay_accuracy between 1 and 5),
  dispatch_rating smallint check (dispatch_rating between 1 and 5),
  equipment_rating smallint check (equipment_rating between 1 and 5),
  home_time_rating smallint check (home_time_rating between 1 and 5),
  safety_culture_rating smallint check (safety_culture_rating between 1 and 5),
  average_weekly_gross numeric(12,2),
  structured_answers jsonb not null default '{}'::jsonb,
  feedback text,
  verified_driver boolean not null default false,
  moderation moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles(id) on delete set null,
  name text not null,
  description text,
  topic text,
  visibility visibility_type not null default 'public',
  created_at timestamptz not null default now()
);
create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  member_role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key(room_id, profile_id)
);
create table room_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  moderation moderation_status not null default 'published',
  created_at timestamptz not null default now()
);

create table pilot_car_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  business_name text,
  service_states text[],
  certifications jsonb not null default '{}'::jsonb,
  equipment jsonb not null default '{}'::jsonb,
  insured boolean not null default false,
  verified_credentials boolean not null default false,
  availability_status text,
  available_from timestamptz,
  available_to timestamptz
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid references profiles(id) on delete set null,
  job_type text not null check(job_type in ('carrier_driver','pilot_car')),
  title text not null,
  description text not null,
  origin text, destination text,
  route_states text[],
  compensation jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '{}'::jsonb,
  sponsored boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table petitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  body text not null,
  target_signatures integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table petition_signatures (
  id uuid primary key default gen_random_uuid(),
  petition_id uuid not null references petitions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  signer_name text not null,
  email_hash text not null,
  state char(2),
  is_driver boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(petition_id,email_hash)
);

create table advertisers (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete set null,
  business_name text not null,
  category text not null,
  verified boolean not null default false,
  license_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers(id) on delete cascade,
  format text not null check(format in ('banner','full_page','map_pin','audio','sponsored_listing','job_posting')),
  headline text not null,
  body text,
  media_url text,
  target_context jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  category text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'under_review',
  created_at timestamptz not null default now()
);

-- MVP integrity controls
create index if not exists scale_reports_place_created_idx on scale_reports(place_id, created_at desc);
create index if not exists carriers_name_idx on carriers using gin(to_tsvector('english', coalesce(legal_name,'') || ' ' || coalesce(dba_name,'')));
create index if not exists carrier_reviews_carrier_idx on carrier_reviews(carrier_id, created_at desc);
create index if not exists jobs_active_type_idx on jobs(active, job_type, created_at desc);
create index if not exists petition_signatures_petition_idx on petition_signatures(petition_id, created_at desc);

alter table profiles enable row level security;
alter table vehicle_profiles enable row level security;
alter table carrier_reviews enable row level security;
alter table room_posts enable row level security;
alter table pilot_car_profiles enable row level security;
alter table feedback enable row level security;

-- Public read policies for moderated/public content.
create policy "public carrier reviews" on carrier_reviews for select using (moderation = 'published');
create policy "public room posts" on room_posts for select using (moderation = 'published');
-- Production deployments should add auth.uid()-based ownership policies after linking profiles.auth_user_id to auth.users.

-- Driver Passport and application network
create table driver_passports (
  profile_id uuid primary key references profiles(id) on delete cascade,
  cdl_class text, cdl_state char(2), cdl_expires date, years_experience numeric(4,1),
  endorsements text[] not null default '{}', equipment_experience text[] not null default '{}',
  employment_history jsonb not null default '[]'::jsonb,
  driving_history jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  professional_summary text,
  discoverable boolean not null default false,
  updated_at timestamptz not null default now()
);
create table driver_documents (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade,
  document_type text not null, storage_path text, expires_on date, verified boolean not null default false,
  sharing_scope text not null default 'private' check(sharing_scope in ('private','application_only','public_badge')),
  created_at timestamptz not null default now()
);
create table job_applications (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references jobs(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  passport_snapshot jsonb not null, company_answers jsonb not null default '{}'::jsonb,
  status text not null default 'submitted', submitted_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);

-- My Truck, maintenance and expense tools
create table equipment_assets (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id) on delete cascade,
  asset_type text not null check(asset_type in ('truck','trailer','pilot_car','other')),
  unit_number text, year integer, make text, model text, vin text, mileage integer,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table maintenance_records (
  id uuid primary key default gen_random_uuid(), asset_id uuid not null references equipment_assets(id) on delete cascade,
  service_type text not null, service_date date not null, mileage integer, vendor text, cost numeric(12,2), notes text,
  next_due_date date, next_due_mileage integer, created_at timestamptz not null default now()
);
create table fuel_entries (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete cascade,
  asset_id uuid references equipment_assets(id) on delete set null, place_id uuid references places(id) on delete set null,
  purchased_at timestamptz not null, gallons numeric(10,3), price_per_gallon numeric(8,3), def_gallons numeric(8,3),
  discounts numeric(10,2) default 0, odometer integer, created_at timestamptz not null default now()
);

-- Freight intelligence and review system
create table commercial_locations (
  id uuid primary key default gen_random_uuid(), location_type text not null check(location_type in ('shipper','receiver','port','warehouse','repair_shop','broker')),
  name text not null, address text, city text, state char(2), location geography(point,4326),
  official_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table commercial_location_reviews (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references commercial_locations(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null, rating smallint check(rating between 1 and 5),
  wait_minutes integer, overnight_parking boolean, restroom_access boolean, lumper_required boolean,
  structured_answers jsonb not null default '{}'::jsonb, feedback text,
  moderation moderation_status not null default 'pending', created_at timestamptz not null default now()
);
create table broker_reviews (
  id uuid primary key default gen_random_uuid(), carrier_or_broker_name text not null, mc_number text,
  reviewer_id uuid references profiles(id) on delete set null, payment_days integer,
  detention_rating smallint check(detention_rating between 1 and 5), communication_rating smallint check(communication_rating between 1 and 5),
  load_accuracy_rating smallint check(load_accuracy_rating between 1 and 5), feedback text,
  moderation moderation_status not null default 'pending', created_at timestamptz not null default now()
);
create table parking_observations (
  id uuid primary key default gen_random_uuid(), place_id uuid not null references places(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null, occupancy_percent smallint check(occupancy_percent between 0 and 100),
  observed_at timestamptz not null default now(), created_at timestamptz not null default now()
);

alter table driver_passports enable row level security;
alter table driver_documents enable row level security;
alter table job_applications enable row level security;
alter table equipment_assets enable row level security;
alter table maintenance_records enable row level security;
alter table fuel_entries enable row level security;
-- Run after schema.sql in the Supabase SQL editor.
-- Links application profiles to Supabase Auth and protects private driver data.

alter table profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete cascade;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path=public
as $$ select id from profiles where auth_user_id=auth.uid() limit 1 $$;

grant execute on function public.current_profile_id() to authenticated;

-- Profiles
create policy "users read own profile" on profiles for select to authenticated using (auth_user_id=auth.uid());
create policy "users create own profile" on profiles for insert to authenticated with check (auth_user_id=auth.uid());
create policy "users update own profile" on profiles for update to authenticated using (auth_user_id=auth.uid()) with check (auth_user_id=auth.uid());

-- Driver Passport
create policy "drivers read own passport" on driver_passports for select to authenticated using (profile_id=current_profile_id());
create policy "drivers create own passport" on driver_passports for insert to authenticated with check (profile_id=current_profile_id());
create policy "drivers update own passport" on driver_passports for update to authenticated using (profile_id=current_profile_id()) with check (profile_id=current_profile_id());
create policy "drivers delete own passport" on driver_passports for delete to authenticated using (profile_id=current_profile_id());

-- Document metadata. Actual files should live in a private Supabase Storage bucket.
create policy "drivers read own documents" on driver_documents for select to authenticated using (profile_id=current_profile_id());
create policy "drivers create own documents" on driver_documents for insert to authenticated with check (profile_id=current_profile_id());
create policy "drivers update own documents" on driver_documents for update to authenticated using (profile_id=current_profile_id()) with check (profile_id=current_profile_id());
create policy "drivers delete own documents" on driver_documents for delete to authenticated using (profile_id=current_profile_id());

-- Equipment and maintenance
create policy "owners read own equipment" on equipment_assets for select to authenticated using (owner_id=current_profile_id());
create policy "owners create own equipment" on equipment_assets for insert to authenticated with check (owner_id=current_profile_id());
create policy "owners update own equipment" on equipment_assets for update to authenticated using (owner_id=current_profile_id()) with check (owner_id=current_profile_id());
create policy "owners delete own equipment" on equipment_assets for delete to authenticated using (owner_id=current_profile_id());

create policy "owners read maintenance" on maintenance_records for select to authenticated using (exists(select 1 from equipment_assets e where e.id=asset_id and e.owner_id=current_profile_id()));
create policy "owners create maintenance" on maintenance_records for insert to authenticated with check (exists(select 1 from equipment_assets e where e.id=asset_id and e.owner_id=current_profile_id()));
create policy "owners update maintenance" on maintenance_records for update to authenticated using (exists(select 1 from equipment_assets e where e.id=asset_id and e.owner_id=current_profile_id()));
create policy "owners delete maintenance" on maintenance_records for delete to authenticated using (exists(select 1 from equipment_assets e where e.id=asset_id and e.owner_id=current_profile_id()));

-- Fuel records
create policy "drivers read own fuel" on fuel_entries for select to authenticated using (profile_id=current_profile_id());
create policy "drivers create own fuel" on fuel_entries for insert to authenticated with check (profile_id=current_profile_id());
create policy "drivers update own fuel" on fuel_entries for update to authenticated using (profile_id=current_profile_id()) with check (profile_id=current_profile_id());
create policy "drivers delete own fuel" on fuel_entries for delete to authenticated using (profile_id=current_profile_id());

-- Applications: applicants can see and submit their own records.
create policy "drivers read own applications" on job_applications for select to authenticated using (applicant_id=current_profile_id());
create policy "drivers submit own applications" on job_applications for insert to authenticated with check (applicant_id=current_profile_id());
create policy "drivers update own applications" on job_applications for update to authenticated using (applicant_id=current_profile_id()) with check (applicant_id=current_profile_id());

-- Feedback ownership
create policy "drivers read own feedback" on feedback for select to authenticated using (profile_id=current_profile_id());
create policy "drivers submit feedback" on feedback for insert to authenticated with check (profile_id=current_profile_id());

-- Optional private storage bucket for uploaded credentials.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('driver-documents','driver-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "drivers upload own document files" on storage.objects for insert to authenticated
with check (bucket_id='driver-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "drivers read own document files" on storage.objects for select to authenticated
using (bucket_id='driver-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "drivers update own document files" on storage.objects for update to authenticated
using (bucket_id='driver-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "drivers delete own document files" on storage.objects for delete to authenticated
using (bucket_id='driver-documents' and (storage.foldername(name))[1]=auth.uid()::text);
