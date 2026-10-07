-- Keep old records intact; tighten new writes and reconcile the load status contract.
drop policy if exists "loads public active read" on public.loads;
create policy "loads published or owned read" on public.loads for select to anon,authenticated using (
  (status='published' and exists(select 1 from public.business_accounts b where b.id=shipper_account_id and b.status='verified'))
  or created_by=(select auth.uid()) or private.is_admin()
);
drop policy if exists "shipper load insert" on public.loads;
drop policy if exists "shipper load update" on public.loads;
create policy "shipper load insert" on public.loads for insert to authenticated with check (
  created_by=(select auth.uid()) and exists(select 1 from public.business_accounts b
  where b.id=shipper_account_id and b.owner_user_id=(select auth.uid()) and b.account_type='shipper'
  and b.status<>'suspended' and (loads.status='draft' or b.status='verified'))
);
create policy "shipper load update" on public.loads for update to authenticated using (
  created_by=(select auth.uid()) and exists(select 1 from public.business_accounts b where b.id=shipper_account_id and b.owner_user_id=(select auth.uid()) and b.account_type='shipper' and b.status<>'suspended')
) with check (
  created_by=(select auth.uid()) and exists(select 1 from public.business_accounts b where b.id=shipper_account_id and b.owner_user_id=(select auth.uid()) and b.account_type='shipper' and b.status<>'suspended' and (loads.status in ('draft','cancelled') or b.status='verified'))
);
revoke insert(verified_at),update(verified_at) on public.business_accounts from authenticated,anon;

revoke insert,update on public.driver_documents from public,anon,authenticated;
grant insert(profile_id,document_type,storage_path,expires_on,sharing_scope),update(document_type,expires_on) on public.driver_documents to authenticated;
drop policy if exists "drivers create own documents" on public.driver_documents;
create policy "drivers create own documents" on public.driver_documents for insert to authenticated with check (
  profile_id=(select auth.uid()) and sharing_scope='private' and split_part(storage_path,'/',1)=(select auth.uid())::text
  and length(document_type) between 1 and 100
);
-- These counters are server-maintained; reports must belong to a signed-in author.
revoke insert,update on public.road_reports from public,anon,authenticated;
grant insert(user_id,report_type,latitude,longitude,route_name,city,state,note,expires_at),update(report_type,latitude,longitude,route_name,city,state,note,expires_at,status) on public.road_reports to authenticated;
drop policy if exists road_reports_insert_auth on public.road_reports;
create policy road_reports_insert_auth on public.road_reports for insert to authenticated with check (
  user_id=(select auth.uid()) and coalesce(length(note),0)<=500
  and (latitude is null or latitude between -90 and 90) and (longitude is null or longitude between -180 and 180)
  and expires_at>now() and expires_at<=now()+interval '24 hours'
);
drop policy if exists "road reports author update" on public.road_reports;
create policy "road reports author update" on public.road_reports for update to authenticated using (user_id=(select auth.uid())) with check (
  user_id=(select auth.uid()) and coalesce(length(note),0)<=500
  and (latitude is null or latitude between -90 and 90) and (longitude is null or longitude between -180 and 180)
  and expires_at<=now()+interval '24 hours'
);
-- Sponsored placement is a commercial/admin decision, never a client flag.
revoke insert,update on public.jobs from public,anon,authenticated;
grant insert(created_by,poster_id,job_type,title,description,origin,destination,route_states,compensation,requirements,active,city,state,equipment,endorsements,status),
update(job_type,title,description,origin,destination,route_states,compensation,requirements,active,city,state,equipment,endorsements,status,updated_at) on public.jobs to authenticated;
drop policy if exists jobs_insert_own on public.jobs;
create policy jobs_insert_own on public.jobs for insert to authenticated with check (
 created_by=(select auth.uid()) and poster_id=(select auth.uid()) and status in ('draft','published') and length(title) between 5 and 160 and length(description) between 20 and 10000
);
drop policy if exists jobs_update_own on public.jobs;
create policy jobs_update_own on public.jobs for update to authenticated using (created_by=(select auth.uid()) and status<>'removed') with check (
 created_by=(select auth.uid()) and poster_id=(select auth.uid()) and status in ('draft','published','closed') and length(title) between 5 and 160 and length(description) between 20 and 10000
);
notify pgrst,'reload schema';
