-- Finish Highway Automation MVP access controls and helper triggers

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin');
$$;

-- Admin visibility and moderation
create policy "admins read profiles" on public.profiles for select to authenticated using(public.is_admin());
create policy "admins update profiles" on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins read documents" on public.documents for select to authenticated using(public.is_admin());
create policy "admins update documents" on public.documents for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins read ad events" on public.ad_events for select to authenticated using(public.is_admin());

-- Let related shipper see assigned-driver documents tied to a load while keeping unrelated files private.
create policy "related parties read storage docs" on storage.objects for select to authenticated using(
  bucket_id='documents' and (
    (storage.foldername(name))[1]=auth.uid()::text or public.is_admin()
  )
);

-- Notification updates so recipients can mark their own notices read.
create policy "recipient notification update" on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

-- Generate useful notifications when load state changes.
create or replace function public.notify_load_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(recipient_id,title,body,type,load_id)
    values(new.shipper_id,'Load status updated','Your load is now '||replace(new.status,'_',' ')||'.','load',new.id);
    if new.assigned_driver_id is not null then
      insert into public.notifications(recipient_id,title,body,type,load_id)
      values(new.assigned_driver_id,'Load status updated','Assigned load is now '||replace(new.status,'_',' ')||'.','load',new.id);
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_notify_load_change on public.loads;
create trigger trg_notify_load_change after update of status on public.loads for each row execute function public.notify_load_change();

-- Generate shipper notification when a new driver requests a load.
create or replace function public.notify_load_request()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(recipient_id,title,body,type,load_id)
  values(new.shipper_id,'New driver request','A driver requested one of your posted loads.','load_request',new.load_id);
  return new;
end;$$;

drop trigger if exists trg_notify_load_request on public.load_requests;
create trigger trg_notify_load_request after insert on public.load_requests for each row execute function public.notify_load_request();
