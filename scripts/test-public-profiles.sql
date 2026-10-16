begin;
select set_config('test.user',gen_random_uuid()::text,true),set_config('test.other',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values(current_setting('test.user')::uuid,'public-qa-'||current_setting('test.user')||'@example.invalid','{"display_name":"Profile QA"}'),(current_setting('test.other')::uuid,'public-qa-'||current_setting('test.other')||'@example.invalid','{"display_name":"Other QA"}');
insert into public.business_accounts(owner_user_id,account_type,business_name,email,status) values(current_setting('test.user')::uuid,'service_provider','Verified QA','qa@example.invalid','verified');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.user'),'role','authenticated')::text,true);
insert into public.pilot_car_profiles(profile_id,user_id,business_name,profile_visibility) values(auth.uid(),auth.uid(),'QA pilot','private');
insert into public.pilot_car_profiles(profile_id,user_id,business_name,profile_visibility) values(auth.uid(),auth.uid(),'QA pilot updated','public') on conflict(profile_id) do update set profile_id=excluded.profile_id,user_id=excluded.user_id,business_name=excluded.business_name,profile_visibility=excluded.profile_visibility;
update public.business_accounts set business_name='Changed identity' where owner_user_id=auth.uid();
do $$begin
 if exists(select 1 from public.business_accounts where owner_user_id=auth.uid() and status='verified')then raise exception 'Identity change retained verification';end if;
 begin update public.pilot_car_profiles set verified_credentials=true where user_id=auth.uid();raise exception 'Pilot forged credentials';exception when insufficient_privilege then null;end;
 begin update public.pilot_car_profiles set profile_id=current_setting('test.other')::uuid where user_id=auth.uid();raise exception 'Cross-owner pilot association';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$begin
 if not exists(select 1 from public.pilot_car_profiles where profile_id=current_setting('test.user')::uuid)then raise exception 'Explicit public profile hidden';end if;
 if has_table_privilege('anon','public.petition_signatures','select') and exists(select 1 from public.petition_signatures)then raise exception 'Public signature leak';end if;
end $$;
rollback;
