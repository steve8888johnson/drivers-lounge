-- Drivers Lounge RC2 direct-shipper load marketplace groundwork.
-- Run after 005 and 006.

alter table loads add column if not exists pickup_date date;
alter table loads add column if not exists commodity text;
alter table loads add column if not exists weight_lbs integer;
alter table loads add column if not exists notes text;
alter table loads add column if not exists updated_at timestamptz default now();

create index if not exists loads_status_pickup_idx on loads(status,pickup_date);
create index if not exists loads_equipment_idx on loads(equipment_type);

drop policy if exists "shipper load insert" on loads;
create policy "shipper load insert" on loads for insert to authenticated with check (
  exists (
    select 1 from business_accounts b
    where b.id = shipper_account_id
      and b.owner_user_id = auth.uid()
      and b.account_type = 'shipper'
  )
);

drop policy if exists "shipper load update" on loads;
create policy "shipper load update" on loads for update to authenticated using (
  exists (select 1 from business_accounts b where b.id = shipper_account_id and b.owner_user_id = auth.uid() and b.account_type = 'shipper')
) with check (
  exists (select 1 from business_accounts b where b.id = shipper_account_id and b.owner_user_id = auth.uid() and b.account_type = 'shipper')
);

drop policy if exists "shipper load delete" on loads;
create policy "shipper load delete" on loads for delete to authenticated using (
  exists (select 1 from business_accounts b where b.id = shipper_account_id and b.owner_user_id = auth.uid() and b.account_type = 'shipper')
);

-- Drivers can browse only loads intentionally published as active.
drop policy if exists "loads public active read" on loads;
create policy "loads public active read" on loads for select using (
  status = 'active' or exists (
    select 1 from business_accounts b where b.id = shipper_account_id and b.owner_user_id = auth.uid()
  )
);