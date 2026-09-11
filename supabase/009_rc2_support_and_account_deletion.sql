-- RC2 support + account deletion workflow
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  category text not null check (category in ('technical','account','data_correction','safety','other')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  reason text,
  status text not null default 'requested' check (status in ('requested','verified','processing','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table support_tickets enable row level security;
alter table account_deletion_requests enable row level security;

drop policy if exists "users create support tickets" on support_tickets;
create policy "users create support tickets" on support_tickets for insert with check (user_id is null or user_id = auth.uid());

drop policy if exists "users read own support tickets" on support_tickets;
create policy "users read own support tickets" on support_tickets for select using (user_id = auth.uid());

drop policy if exists "users request own deletion" on account_deletion_requests;
create policy "users request own deletion" on account_deletion_requests for insert with check (user_id = auth.uid());

drop policy if exists "users read own deletion request" on account_deletion_requests;
create policy "users read own deletion request" on account_deletion_requests for select using (user_id = auth.uid());

drop policy if exists "users cancel own deletion request" on account_deletion_requests;
create policy "users cancel own deletion request" on account_deletion_requests for update using (user_id = auth.uid()) with check (user_id = auth.uid());
