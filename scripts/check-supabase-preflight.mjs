import { requiredSupabaseTables } from './supabase-contract.mjs';

const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';

if(!url||!key){
  console.error('Supabase preflight requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. No database changes were attempted.');
  process.exit(2);
}

const headers={apikey:key,Authorization:`Bearer ${key}`};

const results=[];
async function probe(label,target,options={}){
  const started=Date.now();
  try{
    const response=await fetch(target,{...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(10000)});
    const ok=response.ok;
    results.push({label,ok,status:response.status,ms:Date.now()-started});
    if(!ok){
      const body=await response.text().catch(()=> '');
      console.error(`✗ ${label}: HTTP ${response.status}${body?` — ${body.slice(0,180)}`:''}`);
    }else console.log(`✓ ${label} (${response.status}, ${Date.now()-started}ms)`);
    return ok;
  }catch(error){
    results.push({label,ok:false,status:0,ms:Date.now()-started});
    console.error(`✗ ${label}: ${error.message}`);
    return false;
  }
}

console.log('Drivers Lounge RC2 Supabase preflight (read-only)');
console.log(`Target: ${new URL(url).host}`);

await probe('Auth health',`${url}/auth/v1/health`,{method:'GET'});
for(const table of requiredSupabaseTables){
  await probe(`REST table ${table}`,`${url}/rest/v1/${table}?select=*&limit=0`,{method:'GET',headers:{Prefer:'count=none'}});
}

const failed=results.filter(r=>!r.ok);
console.log(`\nPreflight checked ${results.length} endpoints: ${results.length-failed.length} passed, ${failed.length} failed.`);
if(failed.length){
  console.error('RC2 Supabase preflight FAILED. Apply/repair the required migrations before authenticated launch QA.');
  process.exit(1);
}
console.log('RC2 Supabase preflight PASSED. Required Auth/REST surfaces are reachable.');
console.log('This check is intentionally read-only; it does not prove RLS behavior for individual authenticated roles.');
