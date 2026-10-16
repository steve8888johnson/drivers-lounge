-- Drivers Lounge RC2 defense-in-depth for archived prototype tables.
-- The legacy schema is not exposed to PostgREST and browser roles have no
-- schema access. RLS and explicit table revocations add a second protection
-- layer while preserving the archived data.

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
    if to_regclass(format('legacy.%I', table_name)) is not null then
      execute format('alter table legacy.%I enable row level security', table_name);
      execute format('revoke all on table legacy.%I from public, anon, authenticated', table_name);
    end if;
  end loop;
end $$;

alter default privileges in schema legacy revoke all on tables from public;
alter default privileges in schema legacy revoke all on tables from anon;
alter default privileges in schema legacy revoke all on tables from authenticated;
