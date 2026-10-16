-- Closed by default. No subscription, credentials, tester or live-routing enablement.
-- A shared ledger limits attempts across deployments; failed provider requests still count.
create schema if not exists private;
create table private.dl_truck_route_control (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  paid_billing_disabled boolean not null default false,
  free_verified_at timestamptz,
  free_verified_until timestamptz,
  check (not enabled or (paid_billing_disabled and free_verified_at is not null
    and free_verified_until is not null and free_verified_until > free_verified_at
    and free_verified_until <= free_verified_at + interval '7 days'))
);
insert into private.dl_truck_route_control(singleton) values(true);
create table private.dl_truck_route_testers (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  valid_until timestamptz not null
);
-- Deliberately no cascading user FK: deleting an account must not refund global usage.
-- No trip coordinates, vehicle details, provider keys or route response are stored here.
create table private.dl_truck_route_requests (
  owner_id uuid not null,
  request_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  primary key(owner_id,request_id)
);
create index dl_truck_route_requests_created on private.dl_truck_route_requests(created_at);
create index dl_truck_route_requests_owner_created on private.dl_truck_route_requests(owner_id,created_at);
alter table private.dl_truck_route_control enable row level security;
alter table private.dl_truck_route_testers enable row level security;
alter table private.dl_truck_route_requests enable row level security;
revoke all on private.dl_truck_route_control,private.dl_truck_route_testers,private.dl_truck_route_requests from public,anon,authenticated,service_role;

-- SECURITY DEFINER narrowly checks auth.sessions without granting session-table access
-- to the web role. Only the server service role can invoke this fixed, non-dynamic RPC.
create function public.dl_reserve_truck_route(p_owner uuid,p_session uuid,p_request uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz; day_start timestamptz; month_start timestamptz;
  control private.dl_truck_route_control%rowtype;
  tester_until timestamptz; session_until timestamptz; expires timestamptz;
begin
  if p_owner is null or p_session is null or p_request is null
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('allowed',false,'code','INVALID_RESERVATION');
  end if;
  -- Serializes all reservations, including simultaneous requests on different instances.
  perform pg_advisory_xact_lock(1464189778,1);
  t := clock_timestamp();
  select * into control from private.dl_truck_route_control where singleton for update;
  if not found or not control.enabled or not control.paid_billing_disabled
    or control.free_verified_at is null or control.free_verified_at > t
    or control.free_verified_until is null or control.free_verified_until <= t then
    return jsonb_build_object('allowed',false,'code','FREE_PLAN_NOT_VERIFIED');
  end if;
  select valid_until into tester_until from private.dl_truck_route_testers where owner_id=p_owner;
  if not found or tester_until <= t then
    return jsonb_build_object('allowed',false,'code','TESTER_NOT_ENABLED');
  end if;
  select s.not_after into session_until from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=p_session and s.user_id=p_owner and (s.not_after is null or s.not_after>t)
      and (u.banned_until is null or u.banned_until<=t);
  if not found then return jsonb_build_object('allowed',false,'code','SESSION_NOT_ACTIVE'); end if;
  expires := least(control.free_verified_until,tester_until,coalesce(session_until,t+interval '30 seconds'),t+interval '30 seconds');
  if expires <= t+interval '10 seconds' then
    return jsonb_build_object('allowed',false,'code','APPROVAL_EXPIRING');
  end if;
  if exists(select 1 from private.dl_truck_route_requests where owner_id=p_owner and request_id=p_request) then
    return jsonb_build_object('allowed',false,'code','REQUEST_ALREADY_USED');
  end if;
  day_start := date_trunc('day',t at time zone 'UTC') at time zone 'UTC';
  month_start := date_trunc('month',t at time zone 'UTC') at time zone 'UTC';
  -- Fixed conservative caps below the published allowance; no client-supplied quota.
  if (select count(*) from private.dl_truck_route_requests where created_at>=month_start)>=1000 then
    return jsonb_build_object('allowed',false,'code','MONTHLY_LIMIT');
  end if;
  if (select count(*) from private.dl_truck_route_requests where created_at>=day_start)>=100 then
    return jsonb_build_object('allowed',false,'code','DAILY_LIMIT');
  end if;
  if (select count(*) from private.dl_truck_route_requests where owner_id=p_owner and created_at>=day_start)>=10 then
    return jsonb_build_object('allowed',false,'code','ACCOUNT_DAILY_LIMIT');
  end if;
  if exists(select 1 from private.dl_truck_route_requests where owner_id=p_owner and created_at>t-interval '10 seconds') then
    return jsonb_build_object('allowed',false,'code','REQUEST_TOO_SOON');
  end if;
  insert into private.dl_truck_route_requests(owner_id,request_id,fingerprint,created_at) values(p_owner,p_request,p_fingerprint,t);
  delete from private.dl_truck_route_requests where created_at<t-interval '90 days';
  return jsonb_build_object('allowed',true,'code','RESERVED','expires_at',expires);
end $$;
revoke all on function public.dl_reserve_truck_route(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.dl_reserve_truck_route(uuid,uuid,uuid,text) to service_role;
comment on function public.dl_reserve_truck_route(uuid,uuid,uuid,text) is 'Server-only evaluation budget; does not authorize driving guidance. Caps attempts, not provider billing outside this service.';
