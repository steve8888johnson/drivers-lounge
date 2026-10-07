-- Prevent disclosure of signer identity and forged profile/verification associations.
drop policy if exists petition_signatures_read on public.petition_signatures;
create policy petition_signatures_read on public.petition_signatures for select to authenticated using (signer_user_id=(select auth.uid()) or private.is_admin());
revoke insert,update on public.petition_signatures from public,anon,authenticated;
grant insert(petition_id,profile_id,signer_user_id,signer_name,state,is_driver) on public.petition_signatures to authenticated;
drop policy if exists petition_signatures_insert on public.petition_signatures;
create policy petition_signatures_insert on public.petition_signatures for insert to authenticated with check (
 signer_user_id=(select auth.uid()) and profile_id=(select auth.uid()) and exists(select 1 from public.petitions p where p.id=petition_id and p.status='published' and p.active)
);
drop policy if exists pilot_profiles_write on public.pilot_car_profiles;
create policy pilot_profiles_insert on public.pilot_car_profiles for insert to authenticated with check (user_id=(select auth.uid()) and profile_id=(select auth.uid()));
create policy pilot_profiles_update on public.pilot_car_profiles for update to authenticated using (user_id=(select auth.uid()) and profile_id=(select auth.uid())) with check (user_id=(select auth.uid()) and profile_id=(select auth.uid()));
create policy pilot_profiles_delete on public.pilot_car_profiles for delete to authenticated using (user_id=(select auth.uid()) and profile_id=(select auth.uid()));
revoke insert,update on public.pilot_car_profiles from public,anon,authenticated;
grant insert(profile_id,user_id,business_name,service_states,certifications,equipment,insured,availability_status,available_from,available_to,high_pole,phone,profile_visibility),update(business_name,service_states,certifications,equipment,insured,availability_status,available_from,available_to,high_pole,phone,profile_visibility,updated_at) on public.pilot_car_profiles to authenticated;
grant update(profile_id,user_id) on public.pilot_car_profiles to authenticated;
create function private.recheck_business_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and (new.business_name is distinct from old.business_name or new.email is distinct from old.email or new.website is distinct from old.website or new.account_type is distinct from old.account_type) then
  new.status:='pending';new.verified_at:=null;
 end if;
 return new;
end $$;
create trigger recheck_business_identity before update on public.business_accounts for each row execute function private.recheck_business_identity();
revoke all on function private.recheck_business_identity() from public,anon,authenticated;
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id in ('avatars','community-media','marketplace-media');
notify pgrst,'reload schema';
