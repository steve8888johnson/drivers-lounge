-- Drivers Lounge: enforce a Data API boundary around managed PostGIS objects.
--
-- PostGIS is owned by supabase_admin. Project migrations run as the restricted
-- postgres role, so owner-level REVOKE statements on extension objects can be
-- accepted with warnings yet leave the supabase_admin grants unchanged. This
-- PostgREST pre-request hook is therefore the enforceable boundary for the Data
-- API. It does not alter PostGIS data, ownership, schema placement, or behavior.

do $$
declare
  configured_hook text;
begin
  select split_part(setting, '=', 2)
    into configured_hook
  from unnest(coalesce((select rolconfig from pg_roles where rolname='authenticator'), array[]::text[])) setting
  where setting like 'pgrst.db_pre_request=%'
  limit 1;

  if configured_hook is not null and configured_hook <> 'private.guard_data_api' then
    raise exception 'A different PostgREST pre-request hook is already configured: %', configured_hook;
  end if;
end
$$;

create or replace function private.guard_data_api()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_path text := lower(trim(both '/' from coalesce(current_setting('request.path', true), '')));
  request_method text := upper(coalesce(current_setting('request.method', true), ''));
begin
  if request_path = 'spatial_ref_sys'
     and request_method in ('POST','PUT','PATCH','DELETE') then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code','extension_write_blocked',
        'message','This managed extension table is read-only through the Data API.'
      )::text,
      detail = json_build_object('status',403,'status_text','Forbidden')::text;
  end if;

  if request_path = 'rpc/st_estimatedextent'
     or request_path like 'rpc/st_estimatedextent/%' then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code','extension_rpc_blocked',
        'message','This managed extension function is not part of the public API.'
      )::text,
      detail = json_build_object('status',404,'status_text','Not Found')::text;
  end if;
end
$$;

revoke all on function private.guard_data_api() from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.guard_data_api() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'private.guard_data_api';
notify pgrst, 'reload config';
