
-- Drivers Lounge RC1 groundwork schema.
-- Review in a development Supabase project before production use.

create table if not exists profiles (
  id uuid primary key,
  role text not null default 'driver',
  display_name text,
  company_name text,
  created_at timestamptz default now()
);

create table if not exists driver_passports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  cdl_class text,
  endorsements text[],
  equipment_experience text[],
  availability text,
  profile_visibility text default 'private',
  created_at timestamptz default now()
);

create table if not exists business_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  account_type text not null check (account_type in ('carrier','shipper','fleet','service_provider','advertiser')),
  business_name text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists road_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  report_type text not null,
  latitude numeric,
  longitude numeric,
  note text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid,
  title text not null,
  job_type text,
  pay_text text,
  region text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid,
  driver_user_id uuid,
  stage text default 'submitted',
  created_at timestamptz default now()
);

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  shipper_account_id uuid,
  origin text,
  destination text,
  equipment_type text,
  rate numeric,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists community_rooms (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid,
  name text not null,
  topic text,
  visibility text default 'public',
  created_at timestamptz default now()
);

create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid,
  author_user_id uuid,
  body text,
  created_at timestamptz default now()
);

create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid,
  category text,
  title text not null,
  price numeric,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists pilot_car_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  certifications text[],
  equipment text[],
  regions text[],
  availability text,
  created_at timestamptz default now()
);

create table if not exists pilot_car_jobs (
  id uuid primary key default gen_random_uuid(),
  poster_user_id uuid,
  origin text,
  destination text,
  escort_type text,
  load_dimensions text,
  pay numeric,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists petitions (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid,
  title text not null,
  body text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists petition_signatures (
  id uuid primary key default gen_random_uuid(),
  petition_id uuid,
  signer_user_id uuid,
  created_at timestamptz default now(),
  unique(petition_id, signer_user_id)
);
