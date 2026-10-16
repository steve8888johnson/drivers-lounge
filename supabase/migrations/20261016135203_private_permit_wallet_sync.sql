-- Private scan-once wallet; independent of crew/location sharing.
create schema if not exists private;
create function private.dl_wallet_shape(owner uuid, trip uuid, packet jsonb, files jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare f jsonb; bytes bigint := 0; ids text[] := array[]::text[]; suffix text;
begin
  if jsonb_typeof(files) is distinct from 'array' or jsonb_array_length(files)>200 then return false; end if;
  if packet is null then return files='[]'::jsonb; end if;
  if jsonb_typeof(packet) is distinct from 'object' or packet->>'schema' is distinct from 'dl-permit-trip/v1'
    or jsonb_typeof(packet->'permits') is distinct from 'array' or jsonb_array_length(packet->'permits')>60
    or octet_length(packet::text)>4194304 then return false; end if;
  for f in select value from jsonb_array_elements(files) loop
    suffix := case f->>'type' when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end;
    if suffix is null or jsonb_typeof(f->'size') is distinct from 'number' or (f->>'size') !~ '^[0-9]{1,8}$'
      or (f->>'size')::bigint not between 1 and 15728640
      or (f->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or f->>'id' is null or f->>'id'=any(ids)
      or jsonb_typeof(f->'name') is distinct from 'string' or length(f->>'name')>200
      or f->>'sha256' is null or (f->>'sha256') !~ '^[a-f0-9]{64}$'
      or f->>'path' is distinct from owner::text||'/'||trip::text||'/'||(f->>'sha256')||'.'||suffix then return false; end if;
    ids := array_append(ids,f->>'id'); bytes := bytes+(f->>'size')::bigint;
  end loop;
  return bytes<=47185920 and octet_length(files::text)<=262144;
end $$;
revoke all on function private.dl_wallet_shape(uuid,uuid,jsonb,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.dl_wallet_shape(uuid,uuid,jsonb,jsonb) to authenticated;

create table public.dl_permit_wallets (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check(schema_version=1),
  name text not null default '' check(length(name)<=120),
  snapshot jsonb,
  manifest jsonb not null default '[]',
  version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  archived boolean not null default false,
  ready boolean generated always as (snapshot is not null) stored,
  check(private.dl_wallet_shape(owner_id,id,snapshot,manifest))
);
create index dl_permit_wallets_owner_updated on public.dl_permit_wallets(owner_id,updated_at desc);
alter table public.dl_permit_wallets enable row level security;
create policy "wallet read own" on public.dl_permit_wallets for select to authenticated using(owner_id=(select auth.uid()));
create policy "wallet create own" on public.dl_permit_wallets for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "wallet update own" on public.dl_permit_wallets for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "wallet delete archived own" on public.dl_permit_wallets for delete to authenticated using(owner_id=(select auth.uid()) and archived);
revoke all on public.dl_permit_wallets from public,anon,authenticated;
grant select,delete on public.dl_permit_wallets to authenticated;
grant insert(id,owner_id) on public.dl_permit_wallets to authenticated;
grant update(name,snapshot,manifest,version,archived) on public.dl_permit_wallets to authenticated;

create function private.dl_wallet_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  -- Invoker rights retain owner RLS. Serialize quota checks for this account.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,73691));
  if tg_op='INSERT' then
    if (select count(*) from public.dl_permit_wallets where owner_id=new.owner_id)>=20 then
      raise exception 'Account limit is 20 permit trips. Remove an account copy before saving another.';
    end if;
  else
    if new.owner_id<>old.owner_id or new.id<>old.id or new.schema_version<>old.schema_version then raise exception 'Wallet identity cannot change'; end if;
    if new.version=old.version then raise exception 'A new wallet version is required'; end if;
    if old.archived and (not new.archived or new.snapshot is distinct from old.snapshot or new.manifest is distinct from old.manifest) then raise exception 'Archived wallet cannot be republished'; end if;
  end if;
  new.updated_at:=now();return new;
end $$;
revoke all on function private.dl_wallet_guard() from public,anon,authenticated;
create trigger dl_wallet_guard before insert or update on public.dl_permit_wallets for each row execute function private.dl_wallet_guard();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('permit-wallet','permit-wallet',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp']);

-- Every path belongs to an existing owner wallet; immutable object uploads only.
create policy "wallet originals read own" on storage.objects for select to authenticated
using(bucket_id='permit-wallet' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.dl_permit_wallets w where w.owner_id=(select auth.uid()) and w.id::text=(storage.foldername(storage.objects.name))[2]));
create policy "wallet originals insert own" on storage.objects for insert to authenticated
with check(bucket_id='permit-wallet' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[a-f0-9]{64}\.(pdf|jpg|png|webp)$'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.dl_permit_wallets w where w.owner_id=(select auth.uid()) and w.id::text=(storage.foldername(storage.objects.name))[2] and not w.archived));
create policy "wallet originals delete archived own" on storage.objects for delete to authenticated
using(bucket_id='permit-wallet' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.dl_permit_wallets w where w.owner_id=(select auth.uid()) and w.id::text=(storage.foldername(storage.objects.name))[2] and w.archived));
create function private.dl_wallet_delete_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from storage.objects where bucket_id='permit-wallet' and (storage.foldername(name))[1]=old.owner_id::text and (storage.foldername(name))[2]=old.id::text) then
    raise exception 'Remove account originals with the Storage API before deleting this wallet';
  end if;
  return old;
end $$;
revoke all on function private.dl_wallet_delete_guard() from public,anon,authenticated;
create trigger dl_wallet_delete_guard before delete on public.dl_permit_wallets for each row execute function private.dl_wallet_delete_guard();
-- SELECT also permits listing archived objects so interrupted removal can finish.
-- The app refuses to open archived trips. No public URLs or object UPDATE policy.
comment on table public.dl_permit_wallets is 'Private owner permit originals and route snapshots. Explicit versioned saves, not route approval. Use Storage API to delete originals before removing an archived row or auth user.';
