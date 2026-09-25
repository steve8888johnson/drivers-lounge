-- Development migration only. Apply to an isolated Supabase preview before enabling crew sync.
begin;
create schema if not exists dl_permit_private;
revoke all on schema dl_permit_private from public, anon;
grant usage on schema dl_permit_private to authenticated;

create table public.dl_permit_trips (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) < 1500000),
  revision integer not null default 1 check (revision > 0),
  closed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(id, owner_id)
);
create table public.dl_permit_members (
  trip_id uuid not null,
  owner_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('lead','chase')),
  accepted_revision integer,
  primary key(trip_id,user_id),
  foreign key(trip_id,owner_id) references public.dl_permit_trips(id,owner_id) on delete cascade,
  check(user_id <> owner_id)
);
create table public.dl_permit_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  owner_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  role text not null check (role in ('lead','chase')),
  expires_at timestamptz not null default now() + interval '12 hours',
  used_at timestamptz,
  foreign key(trip_id,owner_id) references public.dl_permit_trips(id,owner_id) on delete cascade
);
create table public.dl_permit_positions (
  trip_id uuid not null references public.dl_permit_trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  accuracy double precision not null check(accuracy between 0 and 50),
  progress_m double precision not null check(progress_m between 0 and 50000000),
  revision integer not null check(revision > 0),
  updated_at timestamptz not null default now(),
  primary key(trip_id,user_id)
);
create index dl_permit_members_user on public.dl_permit_members(user_id,trip_id);
create index dl_permit_invites_trip on public.dl_permit_invites(trip_id);
alter table public.dl_permit_trips enable row level security;
alter table public.dl_permit_members enable row level security;
alter table public.dl_permit_invites enable row level security;
alter table public.dl_permit_positions enable row level security;
revoke all on public.dl_permit_trips, public.dl_permit_members, public.dl_permit_invites, public.dl_permit_positions from public, anon, authenticated;
grant select,insert,delete on public.dl_permit_trips to authenticated;
grant update(snapshot,revision,closed) on public.dl_permit_trips to authenticated;
grant select,delete on public.dl_permit_members to authenticated;
grant update(accepted_revision) on public.dl_permit_members to authenticated;
grant select,insert,delete on public.dl_permit_invites to authenticated;
grant select,insert,delete on public.dl_permit_positions to authenticated;
grant update(latitude,longitude,accuracy,progress_m,revision) on public.dl_permit_positions to authenticated;

create policy trip_read on public.dl_permit_trips for select to authenticated using (
  owner_id = (select auth.uid()) or exists(select 1 from public.dl_permit_members m where m.trip_id = id and m.user_id = (select auth.uid()))
);
create policy trip_create on public.dl_permit_trips for insert to authenticated with check(owner_id = (select auth.uid()));
create policy trip_update on public.dl_permit_trips for update to authenticated using(owner_id = (select auth.uid())) with check(owner_id = (select auth.uid()));
create policy trip_delete on public.dl_permit_trips for delete to authenticated using(owner_id = (select auth.uid()));
-- Denormalized owner with a compound FK prevents recursive trip/member RLS.
create policy members_read on public.dl_permit_members for select to authenticated using(user_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy members_accept on public.dl_permit_members for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy members_leave on public.dl_permit_members for delete to authenticated using(user_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy invites_owner_read on public.dl_permit_invites for select to authenticated using(owner_id = (select auth.uid()));
create policy invites_owner_create on public.dl_permit_invites for insert to authenticated with check(
  owner_id = (select auth.uid()) and used_at is null and expires_at > now() and expires_at <= now() + interval '24 hours'
  and exists(select 1 from public.dl_permit_trips t where t.id = trip_id and t.owner_id = (select auth.uid()) and not t.closed)
);
create policy invites_owner_delete on public.dl_permit_invites for delete to authenticated using(owner_id = (select auth.uid()));
create policy positions_read on public.dl_permit_positions for select to authenticated using(
  updated_at > now() - interval '2 minutes' and exists(select 1 from public.dl_permit_trips t where t.id = trip_id and not t.closed)
);
create policy positions_insert on public.dl_permit_positions for insert to authenticated with check(
  user_id = (select auth.uid()) and exists(select 1 from public.dl_permit_trips t where t.id = trip_id and not t.closed and t.revision = dl_permit_positions.revision
    and (t.owner_id = (select auth.uid()) or exists(select 1 from public.dl_permit_members m where m.trip_id=t.id and m.user_id=(select auth.uid()) and m.accepted_revision=t.revision)))
);
create policy positions_update on public.dl_permit_positions for update to authenticated using(user_id = (select auth.uid())) with check(
  user_id = (select auth.uid()) and exists(select 1 from public.dl_permit_trips t where t.id = trip_id and not t.closed and t.revision = dl_permit_positions.revision
    and (t.owner_id = (select auth.uid()) or exists(select 1 from public.dl_permit_members m where m.trip_id=t.id and m.user_id=(select auth.uid()) and m.accepted_revision=t.revision)))
);
create policy positions_delete on public.dl_permit_positions for delete to authenticated using(user_id = (select auth.uid()));

create function dl_permit_private.touch_trip() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.snapshot is distinct from old.snapshot and new.revision <> old.revision + 1 then raise exception 'Route updates require the next revision'; end if;
  if new.snapshot is not distinct from old.snapshot and new.revision <> old.revision then raise exception 'Revision requires a new route snapshot'; end if;
  new.updated_at = now(); return new;
end $$;
create trigger dl_permit_trip_revision before update on public.dl_permit_trips for each row execute function dl_permit_private.touch_trip();
create function dl_permit_private.touch_position() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger dl_permit_position_time before insert or update on public.dl_permit_positions for each row execute function dl_permit_private.touch_position();

-- The only privileged operation consumes a secret invite under a row lock.
-- The private schema is not exposed by PostgREST. Identity never comes from a client field.
create function dl_permit_private.join_trip(invite_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.dl_permit_invites; actor uuid := auth.uid();
begin
  if actor is null or length(invite_token) <> 36 then raise exception 'Invalid invitation'; end if;
  select * into v from public.dl_permit_invites where token_hash = encode(sha256(convert_to(invite_token,'UTF8')),'hex') for update;
  if v.id is null or v.used_at is not null or v.expires_at <= now() or actor = v.owner_id then raise exception 'Invalid or expired invitation'; end if;
  if not exists(select 1 from public.dl_permit_trips where id = v.trip_id and not closed) then raise exception 'Trip is closed'; end if;
  insert into public.dl_permit_members(trip_id,owner_id,user_id,role) values(v.trip_id,v.owner_id,actor,v.role)
    on conflict(trip_id,user_id) do update set role = excluded.role, accepted_revision = null;
  update public.dl_permit_invites set used_at = now() where id = v.id;
  return v.trip_id;
end $$;
create function public.dl_join_permit_trip(invite_token text) returns uuid language sql security invoker set search_path = '' as $$ select dl_permit_private.join_trip(invite_token) $$;
revoke all on function dl_permit_private.touch_trip(), dl_permit_private.touch_position(), dl_permit_private.join_trip(text), public.dl_join_permit_trip(text) from public, anon;
grant execute on function dl_permit_private.join_trip(text), public.dl_join_permit_trip(text) to authenticated;
commit;
