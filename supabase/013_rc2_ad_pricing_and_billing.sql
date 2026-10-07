create table if not exists ad_rate_cards (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 placement text not null,
 billing_model text not null check (billing_model in ('flat','cpm','cpc','cps')),
 unit_price_cents integer not null check(unit_price_cents>=0),
 minimum_spend_cents integer not null default 0,
 active boolean not null default true,
 created_at timestamptz default now()
);

alter table ad_campaigns add column if not exists placement text default 'driver_card';
alter table ad_campaigns add column if not exists budget_cents integer;
alter table ad_campaigns add column if not exists daily_budget_cents integer;
alter table ad_campaigns add column if not exists billing_status text not null default 'unpaid' check (billing_status in ('unpaid','pending','paid','comped','refunded'));
alter table ad_campaigns add column if not exists payment_reference text;

create table if not exists ad_redemptions (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references ad_campaigns(id) on delete cascade,
 user_id uuid,
 redemption_code text,
 redeemed_at timestamptz default now()
);

alter table ad_rate_cards enable row level security;
alter table ad_redemptions enable row level security;
create policy "public reads active rate cards" on ad_rate_cards for select using(active=true);
create policy "authenticated records redemption" on ad_redemptions for insert to authenticated with check(user_id=auth.uid());
grant select on ad_rate_cards to anon,authenticated;
grant insert on ad_redemptions to authenticated;

insert into ad_rate_cards(name,placement,billing_model,unit_price_cents,minimum_spend_cents)
select * from (values
 ('Sponsored Driver Card','driver_card','cpm',1500,10000),
 ('Audio Sponsored Offer','audio_offer','cpm',2500,15000),
 ('Featured Coupon','coupon','flat',9900,9900),
 ('Carrier Recruiting Spotlight','carrier_recruiting','flat',19900,19900),
 ('Featured Marketplace Listing','marketplace_featured','flat',4900,4900)
) v(name,placement,billing_model,unit_price_cents,minimum_spend_cents)
where not exists(select 1 from ad_rate_cards);