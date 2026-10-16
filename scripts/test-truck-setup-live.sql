-- Rollback-only smoke test. No Auth email requests; no persistent test users.
begin;
select set_config('test.setup_a',gen_random_uuid()::text,true),set_config('test.setup_b',gen_random_uuid()::text,true);
insert into auth.users(id,raw_user_meta_data) values
 (current_setting('test.setup_a')::uuid,'{"display_name":"Setup QA rollback only"}'),
 (current_setting('test.setup_b')::uuid,'{"display_name":"Setup QA rollback only"}');
select set_config('request.jwt.claim.sub',current_setting('test.setup_a'),true);
set local role authenticated;
insert into public.dl_truck_setups(kind,values) values('permit','{"heightFt":"14","widthFt":"12","lengthFt":"80","weightLb":"90000","axles":"6"}');
do $$ begin
 if (select count(*) from public.dl_truck_setups)<>1 then raise exception 'own read failed';end if;
 begin update public.dl_truck_setups set owner_id=current_setting('test.setup_b')::uuid;raise exception 'owner edit allowed';exception when insufficient_privilege then null;end;
 begin update public.dl_truck_setups set values=values||'{"acknowledged":"true"}',version=gen_random_uuid();raise exception 'approval field allowed';exception when check_violation then null;end;
 update public.dl_truck_setups set values=values||'{"widthFt":"13"}',version=gen_random_uuid();
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.setup_b'),true);
do $$ begin
 if (select count(*) from public.dl_truck_setups)<>0 then raise exception 'cross account read';end if;
 begin insert into public.dl_truck_setups(owner_id,kind,values) values(current_setting('test.setup_a')::uuid,'permit','{"heightFt":"14","widthFt":"12","lengthFt":"80","weightLb":"90000","axles":"6"}');raise exception 'cross account insert';exception when insufficient_privilege then null;end;
 delete from public.dl_truck_setups where owner_id=current_setting('test.setup_a')::uuid;
 if found then raise exception 'cross account delete';end if;
end $$;
reset role;set local role anon;
do $$ begin
 begin perform * from public.dl_truck_setups;raise exception 'anon can read';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: own read/update, owner edit denied, approval payload denied, other-user read/insert/delete denied, anon denied; fixtures rolled back' as result;
rollback;
