import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const aclMigration=await readFile(new URL('../supabase/migrations/20261104073514_harden_postgis_api_surface.sql',import.meta.url),'utf8');
const guardMigration=await readFile(new URL('../supabase/migrations/20261104074246_guard_postgis_data_api.sql',import.meta.url),'utf8');
const errorFix=await readFile(new URL('../supabase/migrations/20261104074445_fix_postgis_data_api_guard_error.sql',import.meta.url),'utf8');
const preflight=await readFile(new URL('./check-supabase-preflight.mjs',import.meta.url),'utf8');

test('first migration requests least-privilege ACLs without structural extension changes',()=>{
  assert.match(aclMigration,/revoke all privileges on table public\.spatial_ref_sys from anon, authenticated/i);
  assert.match(aclMigration,/grant select on table public\.spatial_ref_sys to public/i);
  assert.doesNotMatch(aclMigration,/alter\s+extension/i);
  assert.doesNotMatch(aclMigration,/alter\s+table\s+public\.spatial_ref_sys/i);
  assert.doesNotMatch(aclMigration,/enable\s+row\s+level\s+security/i);
  assert.doesNotMatch(aclMigration,/drop\s+(?:table|extension|function)/i);
});

test('all exposed security-definer extent overloads are included in defense-in-depth revocation',()=>{
  for(const signature of[
    'public.st_estimatedextent(text,text)',
    'public.st_estimatedextent(text,text,text)',
    'public.st_estimatedextent(text,text,text,boolean)'
  ])assert.ok(aclMigration.includes(signature),`missing ${signature}`);
  assert.match(aclMigration,/revoke execute on function %s from public, anon, authenticated/i);
});

test('PostgREST guard blocks only managed extension writes and the unsafe RPC path',()=>{
  assert.match(guardMigration,/request_path = 'spatial_ref_sys'/);
  assert.match(guardMigration,/request_method in \('POST','PUT','PATCH','DELETE'\)/);
  assert.match(guardMigration,/extension_write_blocked/);
  assert.match(guardMigration,/rpc\/st_estimatedextent/);
  assert.match(guardMigration,/extension_rpc_blocked/);
  assert.match(guardMigration,/security invoker/i);
  assert.match(guardMigration,/set search_path = ''/i);
  assert.doesNotMatch(guardMigration,/security definer/i);
});

test('guard refuses to replace an unrelated existing pre-request hook',()=>{
  assert.match(guardMigration,/configured_hook is not null and configured_hook <> 'private\.guard_data_api'/i);
  assert.match(guardMigration,/A different PostgREST pre-request hook is already configured/i);
});

test('custom PostgREST errors include the required headers object',()=>{
  assert.match(errorFix,/'headers',json_build_object\(\)/);
  assert.match(errorFix,/'status',403/);
  assert.match(errorFix,/'status',404/);
  assert.match(errorFix,/extension_write_blocked/);
  assert.match(errorFix,/extension_rpc_blocked/);
  assert.doesNotMatch(errorFix,/security definer/i);
});

test('release preflight proves reads remain available and impossible-match writes are denied',()=>{
  assert.match(preflight,/spatial_ref_sys\?select=srid&limit=1/);
  assert.match(preflight,/and=\(srid\.eq\.0,srid\.eq\.1\)/);
  assert.match(preflight,/method:'PATCH'/);
  assert.match(preflight,/status:403/);
  assert.match(preflight,/extension_write_blocked/);
  assert.match(preflight,/does not replace signed-in multi-user RLS and physical-device QA/);
});
