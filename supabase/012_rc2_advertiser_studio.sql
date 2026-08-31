alter table ad_campaigns add column if not exists audio_script text;
alter table ad_campaigns add column if not exists coupon_code text;
alter table ad_campaigns add column if not exists offer_expires_at timestamptz;
alter table ad_campaigns add column if not exists submitted_by uuid;
alter table ad_campaigns add column if not exists review_status text not null default 'draft' check (review_status in ('draft','submitted','approved','rejected','paused'));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('ad-images','ad-images',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('ad-audio','ad-audio',true,26214400,array['audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/x-m4a']) on conflict (id) do nothing;

drop policy if exists "advertisers submit campaigns" on ad_campaigns;
create policy "advertisers submit campaigns" on ad_campaigns for insert to authenticated with check (submitted_by=auth.uid() and active=false and review_status in ('draft','submitted'));
drop policy if exists "advertisers read own campaigns" on ad_campaigns;
create policy "advertisers read own campaigns" on ad_campaigns for select to authenticated using (submitted_by=auth.uid());

drop policy if exists "authenticated upload ad images" on storage.objects;
create policy "authenticated upload ad images" on storage.objects for insert to authenticated with check (bucket_id='ad-images');
drop policy if exists "authenticated upload ad audio" on storage.objects;
create policy "authenticated upload ad audio" on storage.objects for insert to authenticated with check (bucket_id='ad-audio');

grant insert on ad_campaigns to authenticated;