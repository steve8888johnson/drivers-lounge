-- Convenience defaults only: no permits, cargo, locations, proof or approval.
create schema if not exists private;
create function private.dl_setup_shape(kind text, payload jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare expected text[]; k text; v jsonb;
begin
  expected := case kind
    when 'standard' then array['truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle','trailer-type']
    when 'permit' then array['heightFt','widthFt','lengthFt','weightLb','axles'] end;
  if expected is null or jsonb_typeof(payload) <> 'object' then return false; end if;
  if not (payload ?& expected) then return false; end if;
  for k,v in select * from jsonb_each(payload) loop
    if not (k = any(expected)) or jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 80 then return false; end if;
  end loop;
  return true;
end $$;
revoke all on function private.dl_setup_shape(text,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.dl_setup_shape(text,jsonb) to authenticated;

create table public.dl_truck_setups (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('standard','permit')),
  schema_version integer not null default 1 check (schema_version = 1),
  values jsonb not null check (private.dl_setup_shape(kind,values)),
  version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  primary key(owner_id,kind)
);
alter table public.dl_truck_setups enable row level security;
create policy "read own setup" on public.dl_truck_setups for select to authenticated using (owner_id=(select auth.uid()));
create policy "insert own setup" on public.dl_truck_setups for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "update own setup" on public.dl_truck_setups for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "delete own setup" on public.dl_truck_setups for delete to authenticated using (owner_id=(select auth.uid()));
revoke all on public.dl_truck_setups from public,anon,authenticated;
grant select,delete on public.dl_truck_setups to authenticated;
grant insert(owner_id,kind,values) on public.dl_truck_setups to authenticated;
grant update(values,version) on public.dl_truck_setups to authenticated;

create function private.dl_setup_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.version = old.version then raise exception 'A new setup version is required'; end if;
  new.updated_at := now(); return new;
end $$;
revoke all on function private.dl_setup_touch() from public,anon,authenticated;
create trigger dl_setup_touch before update on public.dl_truck_setups for each row execute function private.dl_setup_touch();
comment on table public.dl_truck_setups is 'Private reusable measurements; never evidence of current load, permit or route approval. Client writes compare the last observed version.';
