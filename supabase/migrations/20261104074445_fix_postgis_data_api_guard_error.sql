-- PostgREST custom PGRST errors require DETAIL JSON to include a headers object.
-- Replace only the guard response formatting; preserve the established scope.

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
      detail = json_build_object(
        'status',403,
        'headers',json_build_object(),
        'status_text','Forbidden'
      )::text;
  end if;

  if request_path = 'rpc/st_estimatedextent'
     or request_path like 'rpc/st_estimatedextent/%' then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code','extension_rpc_blocked',
        'message','This managed extension function is not part of the public API.'
      )::text,
      detail = json_build_object(
        'status',404,
        'headers',json_build_object(),
        'status_text','Not Found'
      )::text;
  end if;
end
$$;

notify pgrst, 'reload schema';
