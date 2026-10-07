-- Run through an administrative SQL connection. Every fixture is rolled back.
begin;
select set_config('dl.test_user',gen_random_uuid()::text,true);
select set_config('dl.other_user',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values
  (current_setting('dl.test_user')::uuid,'dl-qa-'||current_setting('dl.test_user')||'@example.invalid','{"display_name":"Rollback QA","role":"admin"}'),
  (current_setting('dl.other_user')::uuid,'dl-qa-'||current_setting('dl.other_user')||'@example.invalid','{"display_name":"Rollback QA Other","role":"driver"}');
do $$ begin
 if (select role from public.profiles where id=current_setting('dl.test_user')::uuid) <> 'driver' then raise exception 'Signup privilege escalation'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('dl.test_user'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; begin
 update public.profiles set display_name='Rollback verified',company_name='QA' where id=auth.uid();
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Own profile edit failed'; end if;
 begin
  update public.profiles set role='admin' where id=auth.uid();
  raise exception 'Role escalation was allowed';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.profiles where id=current_setting('dl.other_user')::uuid) then raise exception 'Other profile visible'; end if;
 insert into public.driver_passports(profile_id,user_id,cdl_class,preferences)
 values(auth.uid(),auth.uid(),'Class A','{"availability":"Available"}');
 begin
  insert into public.driver_passports(profile_id,user_id) values(current_setting('dl.other_user')::uuid,auth.uid());
  raise exception 'Cross-user passport allowed';
 exception when insufficient_privilege then null; end;
 insert into public.marketplace_listings(seller_user_id,category,title,status)
 values(auth.uid(),'Equipment','Rollback-only listing','published');
 insert into public.ad_campaigns(submitted_by,advertiser_name,title,destination_url,review_status,active)
 values(auth.uid(),'Rollback QA','Rollback-only advertisement','https://example.com','submitted',false);
 begin
  update public.ad_campaigns set billing_status='paid' where submitted_by=auth.uid();
  raise exception 'Billing forgery allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.carrier_reviews set verification_status='verified' where reviewer_user_id=auth.uid();
  raise exception 'Review self-verification allowed';
 exception when insufficient_privilege then null; end;
 insert into public.community_rooms(creator_user_id,name,topic,visibility)
 values(auth.uid(),'Rollback private room','Rollback test','private');
 insert into public.community_posts(room_id,author_user_id,body,status)
 select id,auth.uid(),'Rollback private post','published' from public.community_rooms where creator_user_id=auth.uid() and name='Rollback private room';
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if not exists(select 1 from public.marketplace_listings where title='Rollback-only listing') then raise exception 'Published listing not visible'; end if;
 if exists(select 1 from public.community_posts where body='Rollback private post') then raise exception 'Private-room post exposed'; end if;
 if exists(select 1 from public.driver_passports) then raise exception 'Private passport exposed'; end if;
 insert into public.support_tickets(email,subject,message,category)
 values('qa@example.invalid','Rollback support test','Rollback-only support request','technical');
 begin
  insert into public.support_tickets(email,subject,message,category) values('x','x','x','technical');
  raise exception 'Invalid support request accepted';
 exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role;
rollback;
