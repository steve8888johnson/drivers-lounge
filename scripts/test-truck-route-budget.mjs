import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('shared route budget enforces identity, proof expiry, duplicate protection and hard attempt caps', async t => {
  const db = new PGlite(), owner = '11111111-1111-4111-8111-111111111111', session = '22222222-2222-4222-8222-222222222222';
  const other = '33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,banned_until timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz);`);
    await db.exec(readFileSync('supabase/migrations/20261016212531_truck_route_budget.sql','utf8'));
    await db.query('insert into auth.users(id) values($1),($2)', [owner, other]);
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [session, owner]);
    const reserve = async (id = crypto.randomUUID(), actor = owner, sessionId = session, hash = 'a'.repeat(64)) => {
      await db.exec('set role service_role');
      try { return (await db.query('select public.dl_reserve_truck_route($1,$2,$3,$4) as result', [actor, sessionId, id, hash])).rows[0].result; }
      finally { await db.exec('reset role'); }
    };
    const enable = async () => {
      await db.exec(`update private.dl_truck_route_control set enabled=true,paid_billing_disabled=true,free_verified_at=now()-interval '1 minute',free_verified_until=now()+interval '1 day';`);
      await db.query("insert into private.dl_truck_route_testers values($1,now()+interval '1 day') on conflict(owner_id) do update set valid_until=excluded.valid_until", [owner]);
    };
    const code = async expected => assert.equal((await reserve()).code, expected);
    await t.test('default closed; public and signed-in users cannot invoke or edit budget', async () => {
      await code('FREE_PLAN_NOT_VERIFIED');
      for (const role of ['anon','authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query('select public.dl_reserve_truck_route($1,$2,$3,$4)', [owner,session,crypto.randomUUID(),'a'.repeat(64)]), /permission denied/);
        await assert.rejects(db.exec('select * from private.dl_truck_route_requests'), /permission denied/);
        await assert.rejects(db.exec('update private.dl_truck_route_control set enabled=true'), /permission denied/);
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      await assert.rejects(db.exec('delete from private.dl_truck_route_requests'), /permission denied/);
      await db.exec('reset role');
      assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'dl_truck_route_%' and c.relkind='r' and c.relrowsecurity")).rows[0].n,3);
    });
    await t.test('no tester, expired/future proof, disabled paid protection and banned/deleted sessions hold', async () => {
      await enable(); await db.exec('delete from private.dl_truck_route_testers'); await code('TESTER_NOT_ENABLED');
      await enable(); await db.exec("update private.dl_truck_route_control set free_verified_at=now()-interval '2 days',free_verified_until=now()-interval '1 day'"); await code('FREE_PLAN_NOT_VERIFIED');
      await enable(); await db.exec("update private.dl_truck_route_control set free_verified_at=now()+interval '1 hour'"); await code('FREE_PLAN_NOT_VERIFIED');
      await enable(); await assert.rejects(db.exec('update private.dl_truck_route_control set paid_billing_disabled=false'),/check constraint/);
      await assert.rejects(db.exec("update private.dl_truck_route_control set free_verified_until=now()+interval '8 days'"),/check constraint/);
      await db.exec("update private.dl_truck_route_testers set valid_until=now()-interval '1 second'"); await code('TESTER_NOT_ENABLED');
      await enable(); await db.exec("update auth.users set banned_until=now()+interval '1 day'"); await code('SESSION_NOT_ACTIVE');
      await db.exec('update auth.users set banned_until=null');
      assert.equal((await reserve(undefined,owner,crypto.randomUUID())).code,'SESSION_NOT_ACTIVE');
      await db.exec("update auth.sessions set not_after=now()-interval '1 second'"); await code('SESSION_NOT_ACTIVE');
      await db.exec("update auth.sessions set not_after=now()+interval '5 seconds'"); await code('APPROVAL_EXPIRING');
      await db.exec('update auth.sessions set not_after=null');
      await db.query("insert into private.dl_truck_route_testers values($1,now()+interval '1 day')",[other]);
      assert.equal((await reserve(undefined,other)).code,'SESSION_NOT_ACTIVE');
    });
    await t.test('reservation is short lived, duplicates and retries never refund an attempt', async () => {
      await enable(); const id=crypto.randomUUID(), r=await reserve(id);
      assert.equal(r.allowed,true); assert.equal(r.code,'RESERVED');
      assert(Date.parse(r.expires_at)>Date.now()+10000 && Date.parse(r.expires_at)<=Date.now()+31000);
      assert.equal((await reserve(id)).code,'REQUEST_ALREADY_USED');
      assert.equal((await reserve(id,owner,session,'b'.repeat(64))).code,'REQUEST_ALREADY_USED');
      await code('REQUEST_TOO_SOON');
      assert.equal((await db.query('select count(*)::int n from private.dl_truck_route_requests')).rows[0].n,1);
      assert.equal((await reserve(undefined,owner,session,'not-a-hash')).code,'INVALID_RESERVATION');
    });
    await t.test('per-account, shared daily and shared monthly limits are independent', async () => {
      await db.exec('truncate private.dl_truck_route_requests');
      const seed=async(n,actor,time)=>db.query(`insert into private.dl_truck_route_requests select $1::uuid,gen_random_uuid(),repeat('a',64),${time} from generate_series(1,$2::int)`,[actor,n]);
      await seed(10,owner,"date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'"); await code('ACCOUNT_DAILY_LIMIT');
      await db.exec('truncate private.dl_truck_route_requests'); await seed(100,other,'now()'); await code('DAILY_LIMIT');
      await db.exec('truncate private.dl_truck_route_requests'); await seed(1000,other,"date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'"); await code('MONTHLY_LIMIT');
      await db.query('delete from auth.users where id=$1',[other]); await code('MONTHLY_LIMIT');
      assert.equal((await db.query('select count(*)::int n from private.dl_truck_route_requests')).rows[0].n,1000);
    });
    await t.test('month boundaries use UTC and old usage expires without clearing current counts', async () => {
      await db.exec(`truncate private.dl_truck_route_requests; set timezone='America/Los_Angeles';`);
      await db.query("insert into private.dl_truck_route_requests values($1,$2,$3,date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'-interval '1 second'),($1,$4,$3,now()-interval '100 days')",[owner,crypto.randomUUID(),'a'.repeat(64),crypto.randomUUID()]);
      assert.equal((await reserve()).allowed,true);
      assert.equal((await db.query('select count(*)::int n from private.dl_truck_route_requests')).rows[0].n,2);
    });
    await t.test('queued simultaneous reservations cannot both consume the last allowance', async () => {
      // PGlite serializes calls; this tests transactional behavior, not multi-process PostgreSQL contention.
      await db.exec('truncate private.dl_truck_route_requests');
      await db.query("insert into private.dl_truck_route_requests select $1::uuid,gen_random_uuid(),repeat('a',64),now() from generate_series(1,99)",[other]);
      await db.exec('set role service_role');
      const results=await Promise.all([1,2].map(()=>db.query('select public.dl_reserve_truck_route($1,$2,$3,$4) as result',[owner,session,crypto.randomUUID(),'a'.repeat(64)])));
      await db.exec('reset role');
      assert.equal(results.filter(r=>r.rows[0].result.allowed).length,1);
      assert.equal((await db.query('select count(*)::int n from private.dl_truck_route_requests')).rows[0].n,100);
      const definition=(await db.query("select pg_get_functiondef('public.dl_reserve_truck_route(uuid,uuid,uuid,text)'::regprocedure) as body")).rows[0].body;
      assert.match(definition,/pg_advisory_xact_lock/);
    });
  } finally { await db.close(); }
});
