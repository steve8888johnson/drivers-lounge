import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const path=process.env.DL_WALLET_SCHEMA||`supabase/migrations/${readdirSync('supabase/migrations').find(n=>n.endsWith('_private_permit_wallet_sync.sql'))}`;
test('wallet database enforces owner isolation, immutable originals, quotas, versioned updates and recoverable cleanup',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
    create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema storage to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated,anon;
    alter table storage.objects enable row level security;`);
  await db.exec(readFileSync(path,'utf8'));
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',id=crypto.randomUUID();
  await db.query('insert into auth.users values($1),($2)',[a,b]);
  const actor=async user=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);};
  const read=()=>db.query('select * from public.dl_permit_wallets');
  const insert=(owner,trip=crypto.randomUUID())=>db.query('insert into public.dl_permit_wallets(id,owner_id) values($1,$2) returning *',[trip,owner]);
  const write=(values,version)=>db.query('update public.dl_permit_wallets set snapshot=$1,manifest=$2,version=$3 where id=$4 and version=$5 returning *',[values.snapshot,values.manifest,crypto.randomUUID(),id,version]);
  const upload=(owner,trip=id,hash='a'.repeat(64))=>db.query('insert into storage.objects(bucket_id,name) values(\'permit-wallet\',$1)',[`${owner}/${trip}/${hash}.pdf`]);
  await actor(a);let row=(await insert(a,id)).rows[0];assert.equal(row.ready,false);
  await assert.rejects(insert(b));await assert.rejects(db.query('update public.dl_permit_wallets set owner_id=$1',[b]));await assert.rejects(db.query('update public.dl_permit_wallets set schema_version=2'));
  await assert.rejects(db.query("update public.dl_permit_wallets set name='bad'"),/new wallet version/);
  await upload(a);await assert.rejects(upload(b));await assert.rejects(upload(a,crypto.randomUUID()));
  await assert.rejects(upload(a,id,'../bad'));
  assert.equal((await db.query('update storage.objects set name=\'replacement\' returning *')).rows.length,0);
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);
  const manifest=[{id:crypto.randomUUID(),name:'permit.pdf',type:'application/pdf',size:123,sha256:'a'.repeat(64),path:`${a}/${id}/${'a'.repeat(64)}.pdf`}],snapshot={schema:'dl-permit-trip/v1',permits:[]};
  for(const bad of [{snapshot:[],manifest:[]},{snapshot,manifest:[{...manifest[0],path:`${b}/${id}/${'a'.repeat(64)}.pdf`}]},{snapshot,manifest:[{...manifest[0],size:15728641}]},{snapshot,manifest:[{...manifest[0],type:'text/html'}]},{snapshot,manifest:[{...manifest[0],sha256:null}]},{snapshot,manifest:[manifest[0],manifest[0]]}])await assert.rejects(write(bad,row.version));
  const old=row.version;row=(await write({snapshot,manifest},old)).rows[0];assert.equal(row.ready,true);assert.equal((await write({snapshot,manifest},old)).rows.length,0);
  await actor(b);assert.equal((await read()).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);assert.equal((await write({snapshot,manifest},row.version)).rows.length,0);assert.equal((await db.query('delete from public.dl_permit_wallets returning *')).rows.length,0);
  await db.exec('reset role;set role anon');await assert.rejects(read());assert.equal((await db.query('select * from storage.objects')).rows.length,0);await assert.rejects(upload(a));
  await actor(a);for(let i=1;i<20;i++)await insert(a);await assert.rejects(insert(a),/20 permit trips/);
  assert.equal((await db.query('delete from public.dl_permit_wallets where id=$1 returning *',[id])).rows.length,0);
  row=(await db.query('update public.dl_permit_wallets set archived=true,version=$1 where id=$2 returning *',[crypto.randomUUID(),id])).rows[0];
  await assert.rejects(upload(a));await assert.rejects(db.query('update public.dl_permit_wallets set archived=false,version=$1 where id=$2',[crypto.randomUUID(),id]),/cannot be republished/);
  await assert.rejects(db.query('delete from public.dl_permit_wallets where id=$1',[id]),/Storage API/);
  assert.equal((await db.query('select * from storage.objects')).rows.length,1); // listing needed for retryable deletion
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length,1);
  assert.equal((await db.query('delete from public.dl_permit_wallets where id=$1 returning *',[id])).rows.length,1);await insert(a);
  await db.exec('reset role');const bucket=(await db.query("select * from storage.buckets where id='permit-wallet'")).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),15728640);
  await db.query('delete from auth.users where id=$1',[a]);assert.equal((await read()).rows.length,0);
 }finally{await db.close();}
});
