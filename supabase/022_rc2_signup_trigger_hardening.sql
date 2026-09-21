-- Drivers Lounge RC2 signup trigger enum and privilege hardening.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data->>'role', 'driver'));
  safe_role public.user_role;
begin
  safe_role := case requested_role
    when 'pilot_car' then 'pilot_car'::public.user_role
    when 'carrier' then 'carrier'::public.user_role
    when 'business' then 'business'::public.user_role
    when 'shipper' then 'business'::public.user_role
    when 'fleet' then 'business'::public.user_role
    when 'service_provider' then 'business'::public.user_role
    else 'driver'::public.user_role
  end;

  insert into public.profiles(id, auth_user_id, display_name, role)
  values(
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    safe_role
  )
  on conflict(id) do update
    set auth_user_id = excluded.auth_user_id;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
