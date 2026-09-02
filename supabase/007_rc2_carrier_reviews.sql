-- Drivers Lounge RC2 carrier intelligence and driver reviews
-- Source carrier identity/safety data from authorized FMCSA public datasets.

create table if not exists carriers (
  usdot_number bigint primary key,
  legal_name text not null,
  dba_name text,
  mc_number text,
  physical_city text,
  physical_state text,
  physical_country text default 'US',
  operating_status text,
  entity_type text,
  power_units integer,
  drivers integer,
  safety_rating text,
  fmcsa_last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists carriers_legal_name_idx on carriers using btree (legal_name);
create index if not exists carriers_state_idx on carriers (physical_state);

create table if not exists carrier_reviews (
  id uuid primary key default gen_random_uuid(),
  carrier_usdot bigint not null references carriers(usdot_number) on delete cascade,
  reviewer_user_id uuid not null,
  employment_status text not null check (employment_status in ('current_driver','former_driver')),
  overall_experience smallint not null check (overall_experience between 1 and 5),
  pay_accuracy smallint not null check (pay_accuracy between 1 and 5),
  pay_level smallint not null check (pay_level between 1 and 5),
  miles_load_consistency smallint not null check (miles_load_consistency between 1 and 5),
  home_time_promises smallint not null check (home_time_promises between 1 and 5),
  dispatch_quality smallint not null check (dispatch_quality between 1 and 5),
  driver_respect smallint not null check (driver_respect between 1 and 5),
  equipment_condition smallint not null check (equipment_condition between 1 and 5),
  maintenance_response smallint not null check (maintenance_response between 1 and 5),
  safety_culture smallint not null check (safety_culture between 1 and 5),
  accessorial_pay smallint not null check (accessorial_pay between 1 and 5),
  benefits smallint not null check (benefits between 1 and 5),
  management_communication smallint not null check (management_communication between 1 and 5),
  hiring_promises smallint not null check (hiring_promises between 1 and 5),
  would_work_again smallint not null check (would_work_again between 1 and 5),
  review_text text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified')),
  moderation_status text not null default 'published' check (moderation_status in ('pending','published','hidden','removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(carrier_usdot, reviewer_user_id)
);

create index if not exists carrier_reviews_carrier_idx on carrier_reviews (carrier_usdot, moderation_status);

create table if not exists carrier_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references carrier_reviews(id) on delete cascade,
  business_account_id uuid references business_accounts(id),
  response_text text not null,
  moderation_status text not null default 'published' check (moderation_status in ('pending','published','hidden','removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists carrier_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references carrier_reviews(id) on delete cascade,
  reporter_user_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz default now(),
  unique(review_id, reporter_user_id)
);

alter table carriers enable row level security;
alter table carrier_reviews enable row level security;
alter table carrier_responses enable row level security;
alter table carrier_review_reports enable row level security;

drop policy if exists "carrier directory public read" on carriers;
create policy "carrier directory public read" on carriers for select using (true);

drop policy if exists "published carrier reviews public read" on carrier_reviews;
create policy "published carrier reviews public read" on carrier_reviews for select using (moderation_status = 'published' or reviewer_user_id = auth.uid());

drop policy if exists "drivers create own carrier reviews" on carrier_reviews;
create policy "drivers create own carrier reviews" on carrier_reviews for insert with check (reviewer_user_id = auth.uid());

drop policy if exists "drivers update own carrier reviews" on carrier_reviews;
create policy "drivers update own carrier reviews" on carrier_reviews for update using (reviewer_user_id = auth.uid()) with check (reviewer_user_id = auth.uid());

drop policy if exists "published carrier responses public read" on carrier_responses;
create policy "published carrier responses public read" on carrier_responses for select using (moderation_status = 'published');

drop policy if exists "authenticated users report reviews" on carrier_review_reports;
create policy "authenticated users report reviews" on carrier_review_reports for insert with check (reporter_user_id = auth.uid());

create or replace view carrier_review_scores as
select
  carrier_usdot,
  count(*)::integer as review_count,
  round(avg((overall_experience + pay_accuracy + pay_level + miles_load_consistency + home_time_promises + dispatch_quality + driver_respect + equipment_condition + maintenance_response + safety_culture + accessorial_pay + benefits + management_communication + hiring_promises + would_work_again) / 15.0)::numeric, 2) as driver_score
from carrier_reviews
where moderation_status = 'published'
group by carrier_usdot;
