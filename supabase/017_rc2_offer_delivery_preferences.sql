-- Drivers Lounge RC2 communications preferences for saved offers.
-- Email/SMS delivery is opt-in; in-app saving remains available without marketing consent.

create table if not exists communication_preferences (
  user_id uuid primary key,
  email_offers boolean not null default false,
  sms_offers boolean not null default false,
  mobile_phone text,
  updated_at timestamptz default now()
);

alter table communication_preferences enable row level security;
drop policy if exists "users manage own communication preferences" on communication_preferences;
create policy "users manage own communication preferences" on communication_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,insert,update,delete on communication_preferences to authenticated;

alter table saved_offers add column if not exists requested_delivery text not null default 'in_app' check(requested_delivery in ('in_app','email','sms'));
alter table saved_offers add column if not exists delivered_to text;
alter table saved_offers add column if not exists delivered_at timestamptz;