-- Temporary QA fixtures; the entire transaction rolls back.
begin;
select set_config('test.driver',gen_random_uuid()::text,true),set_config('test.other',gen_random_uuid()::text,true),set_config('test.business',gen_random_uuid()::text,true),set_config('test.load',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
 (current_setting('test.driver')::uuid,'workspace-'||current_setting('test.driver')||'@example.invalid','{"display_name":"Workspace QA","role":"shipper"}'),
 (current_setting('test.other')::uuid,'workspace-'||current_setting('test.other')||'@example.invalid','{"display_name":"Other QA"}');
insert into public.business_accounts(id,owner_user_id,account_type,business_name) values(current_setting('test.business')::uuid,current_setting('test.driver')::uuid,'shipper','QA shipper');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.driver'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.driver'),'role','authenticated')::text,true);
insert into public.loads(id,created_by,shipper_account_id,origin_city,origin_state,destination_city,destination_state,equipment_type,status) values(current_setting('test.load')::uuid,current_setting('test.driver')::uuid,current_setting('test.business')::uuid,'Dallas','TX','Tulsa','OK','Dry van','draft');
do $$ begin
 begin update public.loads set status='published' where id=current_setting('test.load')::uuid; raise exception 'Pending shipper published'; exception when insufficient_privilege then null; end;
 begin update public.business_accounts set verified_at=now() where id=current_setting('test.business')::uuid; raise exception 'Forged business verification'; exception when insufficient_privilege then null; end;
 begin insert into public.driver_documents(profile_id,document_type,storage_path,verified) values(current_setting('test.driver')::uuid,'CDL',current_setting('test.driver')||'/test.pdf',true);raise exception 'Forged document verification';exception when insufficient_privilege then null;end;
 begin insert into public.driver_documents(profile_id,document_type,storage_path) values(current_setting('test.driver')::uuid,'CDL',current_setting('test.other')||'/test.pdf');raise exception 'Cross-owner document';exception when insufficient_privilege then null;end;
 begin insert into public.road_reports(user_id,report_type,note,expires_at,confidence) values(current_setting('test.driver')::uuid,'weather','QA',now()+interval '1 hour',100);raise exception 'Forged confidence';exception when insufficient_privilege then null;end;
 begin insert into public.jobs(created_by,poster_id,job_type,title,description,sponsored,status) values(current_setting('test.driver')::uuid,current_setting('test.driver')::uuid,'carrier_driver','QA driver job','An example job description for testing',true,'published');raise exception 'Forged sponsorship';exception when insufficient_privilege then null;end;
end $$;
insert into public.driver_documents(profile_id,document_type,storage_path) values(current_setting('test.driver')::uuid,'CDL',current_setting('test.driver')||'/test.pdf');
insert into storage.objects(bucket_id,name,owner_id) values('driver-documents',current_setting('test.driver')||'/test.pdf',current_setting('test.driver'));
insert into public.jobs(created_by,poster_id,job_type,title,description,status) values(current_setting('test.driver')::uuid,current_setting('test.driver')::uuid,'carrier_driver','QA driver job','An example job description for testing','published');
insert into public.road_reports(user_id,report_type,note,expires_at) values(current_setting('test.driver')::uuid,'weather','QA',now()+interval '1 hour');
reset role;
update public.business_accounts set status='verified' where id=current_setting('test.business')::uuid;
set local role authenticated;
update public.loads set status='published' where id=current_setting('test.load')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.other'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other'),'role','authenticated')::text,true);
do $$ begin
 if exists(select 1 from public.driver_documents where profile_id=current_setting('test.driver')::uuid) then raise exception 'Cross-owner document read';end if;
 if exists(select 1 from storage.objects where bucket_id='driver-documents' and name=current_setting('test.driver')||'/test.pdf') then raise exception 'Cross-owner storage read';end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 if not exists(select 1 from public.loads where id=current_setting('test.load')::uuid and status='published') then raise exception 'Verified freight hidden';end if;
 if exists(select 1 from public.driver_documents where profile_id=current_setting('test.driver')::uuid) then raise exception 'Anonymous document exposure';end if;
end $$;
rollback;
