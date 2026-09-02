create table if not exists public.account_entitlements(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entitlement_type text not null check(entitlement_type in('load_credit','load_pack','unlimited_posting','featured_load','ad_campaign')),
  quantity int not null default 0,
  active boolean not null default true,
  source text not null default 'stripe',
  source_reference text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source,source_reference,entitlement_type)
);

create table if not exists public.payment_events(
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null unique,
  event_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  product_code text,
  amount_total bigint,
  currency text,
  status text not null default 'received',
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_entitlements enable row level security;
alter table public.payment_events enable row level security;

create policy "users read own entitlements" on public.account_entitlements for select to authenticated using(user_id=auth.uid());
create policy "admins read payment events" on public.payment_events for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admins read all entitlements" on public.account_entitlements for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create index if not exists entitlement_user_active_idx on public.account_entitlements(user_id,active,ends_at);
create index if not exists payment_events_user_idx on public.payment_events(user_id,created_at desc);
