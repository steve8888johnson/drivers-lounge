-- Drivers Lounge RC2 support intake and privacy controls.
create table if not exists support_tickets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid,
 email text not null,
 category text not null check(category in ('technical','account','data_correction','safety','privacy','carrier_review','advertising','other')),
 subject text not null,
 message text not null,
 status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);
alter table support_tickets enable row level security;
drop policy if exists "public support ticket insert" on support_tickets;
create policy "public support ticket insert" on support_tickets for insert to anon,authenticated with check ((user_id is null or user_id=auth.uid()) and length(email) between 3 and 320 and length(subject) between 3 and 160 and length(message) between 5 and 5000);
drop policy if exists "users read own support tickets" on support_tickets;
create policy "users read own support tickets" on support_tickets for select to authenticated using(user_id=auth.uid());
grant insert on support_tickets to anon,authenticated;
grant select on support_tickets to authenticated;