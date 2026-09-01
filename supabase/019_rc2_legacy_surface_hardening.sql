-- Drivers Lounge RC2 legacy-surface and privileged-function hardening.
-- Empty prototype tables are preserved in a non-exposed schema instead of deleted.

create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;
grant usage on schema legacy to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'places',
    'rooms',
    'room_members',
    'advertisers',
    'commercial_locations',
    'commercial_location_reviews',
    'broker_reviews',
    'parking_observations'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I set schema legacy', table_name);
    end if;
  end loop;
end $$;

-- PostGIS owns spatial_ref_sys. Keep read compatibility but remove direct writes.
alter table public.spatial_ref_sys enable row level security;
drop policy if exists "spatial reference read only" on public.spatial_ref_sys;
create policy "spatial reference read only"
on public.spatial_ref_sys for select
to anon, authenticated
using (true);
revoke all on public.spatial_ref_sys from anon, authenticated;
grant select on public.spatial_ref_sys to anon, authenticated;

-- Legacy ownership policies need only the authenticated user's UUID, not a
-- privileged lookup through profiles.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid()
$$;
revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to anon, authenticated;

-- Keep SECURITY DEFINER helpers out of the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    alter function public.is_admin() set schema private;
  end if;
  if to_regprocedure('public.handle_new_user()') is not null then
    alter function public.handle_new_user() set schema private;
  end if;
  if to_regprocedure('public.set_updated_at()') is not null then
    alter function public.set_updated_at() set schema private;
  end if;
end $$;

alter function private.is_admin() set search_path = public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

alter function private.handle_new_user() set search_path = public;
revoke all on function private.handle_new_user() from public, anon, authenticated;

alter function private.set_updated_at() set search_path = '';
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- Prevent future functions in public from becoming callable by default.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
