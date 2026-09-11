-- Drivers Lounge RC2 cleanup after migrations 007-017.
-- Removes permissive prototype policies that overlap RC2 policies and
-- expands the support categories used by the shipping support form.

drop policy if exists "loads_insert_own" on loads;
drop policy if exists "loads_public_read" on loads;
drop policy if exists "loads_update_own" on loads;

drop policy if exists "community_posts_read" on community_posts;

alter table support_tickets drop constraint if exists support_tickets_category_check;
alter table support_tickets
  add constraint support_tickets_category_check
  check (category in (
    'technical','account','data_correction','safety','privacy',
    'carrier_review','advertising','other'
  ));

alter table support_tickets alter column email set not null;

-- The archived prototype tables are retained for rollback/inspection but
-- must not be reachable by app roles.
revoke all on all tables in schema legacy_rc2 from public, anon, authenticated;
