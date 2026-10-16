create table public.ad_billing_events (
 event_id text primary key,
 campaign_id uuid not null references public.ad_campaigns(id),
 event_created bigint not null,
 billing_status text not null,
 payment_reference text not null,
 received_at timestamptz not null default now()
);
alter table public.ad_billing_events enable row level security;
revoke all on public.ad_billing_events from public,anon,authenticated;
grant all on public.ad_billing_events to service_role;
alter table public.ad_campaigns add column billing_event_created bigint not null default 0;
revoke insert(billing_event_created),update(billing_event_created) on public.ad_campaigns from public,anon,authenticated;
create function public.apply_ad_billing_event(p_event_id text,p_campaign_id uuid,p_event_created bigint,p_billing_status text,p_payment_reference text,p_submitted_by uuid)
returns text language plpgsql set search_path='' as $$
declare campaign public.ad_campaigns%rowtype;
begin
 if p_event_id is null or p_event_created is null or p_payment_reference is null or p_billing_status not in ('pending','unpaid','paid','refunded') then raise exception 'Invalid billing event';end if;
 select * into campaign from public.ad_campaigns where id=p_campaign_id for update;
 if not found or campaign.submitted_by is distinct from p_submitted_by then raise exception 'Campaign owner mismatch';end if;
 if exists(select 1 from public.ad_billing_events where event_id=p_event_id) then return 'duplicate';end if;
 insert into public.ad_billing_events(event_id,campaign_id,event_created,billing_status,payment_reference) values(p_event_id,p_campaign_id,p_event_created,p_billing_status,p_payment_reference);
 if campaign.billing_status='comped' or campaign.billing_status='refunded' then return 'preserved-terminal-state';end if;
 if campaign.billing_status='paid' and (p_billing_status in ('pending','unpaid') or campaign.payment_reference is distinct from p_payment_reference) then return 'preserved-paid-state';end if;
 if p_event_created<campaign.billing_event_created and p_billing_status<>'refunded' then return 'older-event';end if;
 update public.ad_campaigns set billing_status=p_billing_status,payment_reference=p_payment_reference,billing_event_created=greatest(billing_event_created,p_event_created),active=case when p_billing_status='refunded' then false else active end where id=p_campaign_id;
 return 'applied';
end $$;
revoke all on function public.apply_ad_billing_event(text,uuid,bigint,text,text,uuid) from public,anon,authenticated;
grant execute on function public.apply_ad_billing_event(text,uuid,bigint,text,text,uuid) to service_role;
-- Paid creative/budgets must return through commercial review instead of client edits.
drop policy if exists "advertisers update own campaigns" on public.ad_campaigns;
create policy "advertisers update own campaigns" on public.ad_campaigns for update to authenticated using (
 submitted_by=(select auth.uid()) and active=false and billing_status='unpaid' and review_status in ('draft','submitted','rejected','paused')
) with check (submitted_by=(select auth.uid()) and active=false and billing_status='unpaid' and review_status in ('draft','submitted','rejected','paused'));
notify pgrst,'reload schema';
