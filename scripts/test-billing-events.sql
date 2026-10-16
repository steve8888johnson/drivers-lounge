begin;
select set_config('test.user',gen_random_uuid()::text,true),set_config('test.campaign',gen_random_uuid()::text,true),set_config('test.event','evt_'||gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values(current_setting('test.user')::uuid,'billing-'||current_setting('test.user')||'@example.invalid','{"display_name":"Billing QA"}');
insert into public.ad_campaigns(id,submitted_by,advertiser_name,title,destination_url) values(current_setting('test.campaign')::uuid,current_setting('test.user')::uuid,'QA','QA campaign','https://example.invalid');
set local role service_role;
do $$ declare u uuid:=current_setting('test.user')::uuid;c uuid:=current_setting('test.campaign')::uuid;e text:=current_setting('test.event');r text;begin
 r:=public.apply_ad_billing_event(e,c,100,'paid','pi_qa',u);if r<>'applied' then raise exception 'Payment not applied';end if;
 r:=public.apply_ad_billing_event(e,c,100,'paid','pi_qa',u);if r<>'duplicate' then raise exception 'Duplicate not suppressed';end if;
 perform public.apply_ad_billing_event(e||'_failed',c,110,'unpaid','pi_qa',u);
 if (select billing_status from public.ad_campaigns where id=c)<>'paid' then raise exception 'Failure overwrote payment';end if;
 perform public.apply_ad_billing_event(e||'_older',c,90,'pending','pi_qa',u);
 if (select billing_status from public.ad_campaigns where id=c)<>'paid' then raise exception 'Older event overwrote payment';end if;
 perform public.apply_ad_billing_event(e||'_other',c,111,'refunded','pi_other',u);
 if (select billing_status from public.ad_campaigns where id=c)<>'paid' then raise exception 'Different payment refunded campaign';end if;
 perform public.apply_ad_billing_event(e||'_refund',c,112,'refunded','pi_qa',u);
 perform public.apply_ad_billing_event(e||'_latepaid',c,120,'paid','pi_qa',u);
 if (select billing_status from public.ad_campaigns where id=c)<>'refunded' then raise exception 'Late event undid refund';end if;
end $$;
set local role authenticated;
do $$begin
 begin perform public.apply_ad_billing_event('evt_forged',current_setting('test.campaign')::uuid,130,'paid','pi_bad',current_setting('test.user')::uuid);raise exception 'Client called billing function';exception when insufficient_privilege then null;end;
end $$;
rollback;
