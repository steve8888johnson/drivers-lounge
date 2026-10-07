-- Drivers Lounge RC2 community safety / app-store UGC moderation groundwork.
-- Run after 005 and 006 in the development Supabase project.

alter table community_posts add column if not exists status text not null default 'published';
alter table community_posts add column if not exists updated_at timestamptz default now();

create table if not exists community_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_user_id uuid not null,
 post_id uuid not null,
 reason text not null check(reason in ('spam','harassment','hate','threat','scam','unsafe','personal_information','other')),
 details text,
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 created_at timestamptz default now(),
 unique(reporter_user_id,post_id)
);

alter table community_reports enable row level security;
drop policy if exists "community reports own insert" on community_reports;
create policy "community reports own insert" on community_reports for insert to authenticated with check(reporter_user_id=auth.uid() and length(coalesce(details,''))<=1000);
drop policy if exists "community reports own read" on community_reports;
create policy "community reports own read" on community_reports for select to authenticated using(reporter_user_id=auth.uid());
grant insert,select on community_reports to authenticated;

-- Replace the original unrestricted public-post read policy so moderated posts disappear.
drop policy if exists "community posts public read" on community_posts;
create policy "community posts published read" on community_posts for select using(status='published' or author_user_id=auth.uid());

-- Authors can remove their own content from public view without destroying moderation history.
drop policy if exists "community posts author update" on community_posts;
create policy "community posts author update" on community_posts for update to authenticated using(author_user_id=auth.uid()) with check(author_user_id=auth.uid() and status in ('published','removed'));
grant update on community_posts to authenticated;