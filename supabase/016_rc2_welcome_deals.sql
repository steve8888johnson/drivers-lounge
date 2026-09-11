-- Drivers Lounge RC2 welcome-deal layer.
-- Curated public offers are not paid sponsorships and must retain source/verification metadata.
alter table ad_campaigns add column if not exists source_type text not null default 'paid' check(source_type in ('paid','curated_public'));
alter table ad_campaigns add column if not exists source_url text;
alter table ad_campaigns add column if not exists verified_at timestamptz;
alter table ad_campaigns add column if not exists offer_terms text;
alter table ad_campaigns add column if not exists welcome_priority integer not null default 0;

-- Only active, currently valid campaigns are publicly readable. Existing policy remains compatible.
-- Curated offers should be inserted/admin-reviewed with active=true only after verifying the official source and expiration.
create index if not exists ad_campaigns_welcome_idx on ad_campaigns(source_type,welcome_priority desc,ends_at desc) where active=true;
