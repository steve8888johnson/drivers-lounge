import { requiredSupabaseTables } from './supabase-contract.mjs';

const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';

if(!url||!key){
  console.error('Supabase preflight requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. No database changes were attempted.');
  process.exit(2);
}

const headers={apikey:key,Authorization:`Bearer ${key}`};
const results=[];

async function request(label,target,options={}){
  const started=Date.now();
  try{
    const response=await fetch(target,{...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(10000)});
    const body=await response.text().catch(()=> '');
    return{label,response,body,ms:Date.now()-started};
  }catch(error){
    results.push({label,ok:false,status:0,ms:Date.now()-started});
    console.error(`✗ ${label}: ${error.message}`);
    return null;
  }
}

async function probe(label,target,options={}){
  const outcome=await request(label,target,options);if(!outcome)return false;
  const{response,body,ms}=outcome,ok=response.ok;
  results.push({label,ok,status:response.status,ms});
  if(!ok)console.error(`✗ ${label}: HTTP ${response.status}${body?` — ${body.slice(0,180)}`:''}`);
  else console.log(`✓ ${label} (${response.status}, ${ms}ms)`);
  return ok;
}

async function probeBlocked(label,target,{status,code,...options}){
  const outcome=await request(label,target,options);if(!outcome)return false;
  const{response,body,ms}=outcome,ok=response.status===status&&body.includes(code);
  results.push({label,ok,status:response.status,ms});
  if(!ok)console.error(`✗ ${label}: expected HTTP ${status} with ${code}, got HTTP ${response.status}${body?` — ${body.slice(0,180)}`:''}`);
  else console.log(`✓ ${label} blocked as designed (${response.status}, ${ms}ms)`);
  return ok;
}

console.log('Drivers Lounge RC2 Supabase preflight');
console.log(`Target: ${new URL(url).host}`);

await probe('Auth health',`${url}/auth/v1/health`,{method:'GET'});
for(const table of requiredSupabaseTables){
  await probe(`REST table ${table}`,`${url}/rest/v1/${table}?select=*&limit=0`,{method:'GET',headers:{Prefer:'count=none'}});
}

await probe('PostGIS reference table remains readable',`${url}/rest/v1/spatial_ref_sys?select=srid&limit=1`,{method:'GET'});
await probeBlocked(
  'PostGIS reference table rejects Data API mutation',
  `${url}/rest/v1/spatial_ref_sys?and=(srid.eq.0,srid.eq.1)`,
  {
    status:403,
    code:'extension_write_blocked',
    method:'PATCH',
    headers:{'Content-Type':'application/json',Prefer:'return=minimal'},
    body:JSON.stringify({auth_name:'IMPOSSIBLE_MATCH_SECURITY_PROBE'})
  }
);

const failed=results.filter(result=>!result.ok);
console.log(`\nPreflight checked ${results.length} endpoints: ${results.length-failed.length} passed, ${failed.length} failed.`);
if(failed.length){
  console.error('RC2 Supabase preflight FAILED. Apply/repair the required migrations and Data API guard before authenticated launch QA.');
  process.exit(1);
}
console.log('RC2 Supabase preflight PASSED. Required API tables respond and managed PostGIS writes are blocked.');
console.log('This is a connectivity and API-surface check. It does not replace signed-in multi-user RLS and physical-device QA.');
