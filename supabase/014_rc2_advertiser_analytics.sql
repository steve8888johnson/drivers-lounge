-- Advertiser self-service campaign management and analytics.

-- Advertisers may edit their own campaigns until approved/active.
drop policy if exists "advertisers update own campaigns" on ad_campaigns;
create policy "advertisers update own campaigns" on ad_campaigns
for update to authenticated
using (submitted_by = auth.uid() and active = false and review_status in ('draft','submitted','rejected','paused'))
with check (submitted_by = auth.uid() and active = false and review_status in ('draft','submitted','rejected','paused'));

-- Advertisers can read event rows only for campaigns they submitted.
drop policy if exists "advertisers read campaign events" on ad_events;
create policy "advertisers read campaign events" on ad_events
for select to authenticated
using (exists (
  select 1 from ad_campaigns c
  where c.id = campaign_id and c.submitted_by = auth.uid()
));

grant update on ad_campaigns to authenticated;
grant select on ad_events to authenticated;

create or replace view advertiser_campaign_metrics
with (security_invoker = true)
as
select
 c.id as campaign_id,
 c.submitted_by,
 c.advertiser_name,
 c.title,
 c.placement,
 c.review_status,
 c.billing_status,
 c.active,
 c.budget_cents,
 c.daily_budget_cents,
 count(e.id) filter (where e.event_type='impression')::integer as impressions,
 count(e.id) filter (where e.event_type='audio_play')::integer as audio_plays,
 count(e.id) filter (where e.event_type='audio_complete')::integer as audio_completes,
 count(e.id) filter (where e.event_type='save')::integer as saves,
 count(e.id) filter (where e.event_type='open_later')::integer as opens_later,
 count(r.id)::integer as redemptions
from ad_campaigns c
left join ad_events e on e.campaign_id=c.id
left join ad_redemptions r on r.campaign_id=c.id
group by c.id;

grant select on advertiser_campaign_metrics to authenticated;