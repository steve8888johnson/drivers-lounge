-- Drivers Lounge RC2 account and vehicle-profile RLS completion.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, auth_user_id, display_name, role)
  values(
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'driver')
  )
  on conflict(id) do update
    set auth_user_id = excluded.auth_user_id;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

alter function private.is_admin() set search_path = '';

drop policy if exists "vehicle profiles select own" on public.vehicle_profiles;
create policy "vehicle profiles select own"
on public.vehicle_profiles for select
to authenticated
using (profile_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "vehicle profiles insert own" on public.vehicle_profiles;
create policy "vehicle profiles insert own"
on public.vehicle_profiles for insert
to authenticated
with check (profile_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "vehicle profiles update own" on public.vehicle_profiles;
create policy "vehicle profiles update own"
on public.vehicle_profiles for update
to authenticated
using (profile_id = (select auth.uid()) or (select private.is_admin()))
with check (profile_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "vehicle profiles delete own" on public.vehicle_profiles;
create policy "vehicle profiles delete own"
on public.vehicle_profiles for delete
to authenticated
using (profile_id = (select auth.uid()) or (select private.is_admin()));

revoke all on public.vehicle_profiles from anon;
revoke all on public.vehicle_profiles from authenticated;
grant select, insert, update, delete on public.vehicle_profiles to authenticated;
