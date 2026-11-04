-- Drivers Lounge: reduce the exposed PostGIS API surface without modifying
-- extension ownership, schema placement, data, or behavior.
--
-- public.spatial_ref_sys contains public coordinate-system reference data.
-- Keep it readable, but browser roles must never be able to mutate it.
-- The table is owned by supabase_admin as part of PostGIS, so this migration
-- intentionally does not ALTER the table, enable RLS, or move the extension.

do $$
begin
  if to_regclass('public.spatial_ref_sys') is null then
    raise exception 'PostGIS spatial_ref_sys is missing; refusing an uncertain security migration.';
  end if;

  execute 'revoke all privileges on table public.spatial_ref_sys from anon, authenticated';
  execute 'grant select on table public.spatial_ref_sys to public';
end
$$;

-- These PostGIS overloads are SECURITY DEFINER functions owned by
-- supabase_admin. They are not used by Drivers Lounge and must not be callable
-- through the anonymous or authenticated Data API. Existing explicit grants to
-- postgres and service_role are preserved.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.st_estimatedextent(text,text)',
    'public.st_estimatedextent(text,text,text)',
    'public.st_estimatedextent(text,text,text,boolean)'
  ]
  loop
    if to_regprocedure(signature) is not null then
      execute format(
        'revoke execute on function %s from public, anon, authenticated',
        signature
      );
    end if;
  end loop;
end
$$;
