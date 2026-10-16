import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('account setup database enforces private ownership, safe payloads, versioned writes and account deletion',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(readFileSync('supabase/migrations/20261014232938_private_truck_setups.sql','utf8'));
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  await db.query('insert into auth.users values($1),($2)',[a,b]);
  const actor=async id=>{await db.exec('reset role; set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
  const payload={heightFt:'14',widthFt:'12',lengthFt:'80',weightLb:'90000',axles:'6'};
  const insert='insert into public.dl_truck_setups(owner_id,kind,"values") values($1,\'permit\',$2) returning *';
  const update='update public.dl_truck_setups set "values"=$1,version=$2 where owner_id=$3 and kind=\'permit\' and version=$4 returning *';
  await actor(a);let row=(await db.query(insert,[a,payload])).rows[0];
  await assert.rejects(db.query(insert,[b,payload]));
  await assert.rejects(db.query('update public.dl_truck_setups set owner_id=$1',[b]));
  await assert.rejects(db.query('update public.dl_truck_setups set schema_version=2'));
  await assert.rejects(db.query('update public.dl_truck_setups set "values"=$1',[payload]));
  for(const invalid of [[],{}, {...payload,acknowledged:'true'}, {...payload,axles:6}, {...payload,widthFt:'x'.repeat(81)}])await assert.rejects(db.query(update,[invalid,crypto.randomUUID(),a,row.version]));
  await actor(b);assert.equal((await db.query('select * from public.dl_truck_setups')).rows.length,0);
  assert.equal((await db.query(update,[payload,crypto.randomUUID(),a,row.version])).rows.length,0);
  assert.equal((await db.query('delete from public.dl_truck_setups where owner_id=$1 returning *',[a])).rows.length,0);
  await actor(a);const old=row.version;row=(await db.query(update,[{...payload,widthFt:'13'},crypto.randomUUID(),a,old])).rows[0];assert.equal(row.values.widthFt,'13');
  assert.equal((await db.query(update,[payload,crypto.randomUUID(),a,old])).rows.length,0);
  await db.exec('reset role; set role anon');await assert.rejects(db.query('select * from public.dl_truck_setups'));await assert.rejects(db.query(insert,[a,payload]));
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[a]);assert.equal((await db.query('select * from public.dl_truck_setups')).rows.length,0);
 }finally{await db.close();}
});
