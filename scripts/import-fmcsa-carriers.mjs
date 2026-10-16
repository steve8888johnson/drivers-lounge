import { readFile } from 'node:fs/promises';

const args=process.argv.slice(2);
const dryRun=args.includes('--dry-run');
const filePath=args.find(a=>!a.startsWith('--'));
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!filePath||(!dryRun&&(!url||!key))){console.error('Usage: node scripts/import-fmcsa-carriers.mjs <csv-or-json-file> [--dry-run]');console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required unless --dry-run is used.');process.exit(1);}

const text=await readFile(filePath,'utf8');
function parseCSV(input){const rows=[];let row=[],cell='',quote=false;for(let i=0;i<input.length;i++){const c=input[i],n=input[i+1];if(c==='"'){if(quote&&n==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}if(!rows.length)return[];const headers=rows.shift().map(h=>h.trim().replace(/^\uFEFF/,''));return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));}
const raw=filePath.toLowerCase().endsWith('.json')?JSON.parse(text):parseCSV(text);
const records=Array.isArray(raw)?raw:(raw.results||raw.data||[]);
if(!Array.isArray(records)||!records.length){console.error('No carrier records found in input.');process.exit(1);}
const pick=(r,names)=>{for(const n of names){if(r[n]!==undefined&&r[n]!==null&&String(r[n]).trim()!=='')return r[n];}return null;};
const int=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.trunc(n):null;};
const clean=v=>v==null?null:String(v).trim()||null;
const stamp=new Date().toISOString();
const normalized=records.map(r=>({
 usdot_number:int(pick(r,['DOT_NUMBER','USDOT','usdot_number','dot_number'])),
 legal_name:clean(pick(r,['LEGAL_NAME','legal_name','NAME','name'])),
 dba_name:clean(pick(r,['DBA_NAME','dba_name'])),
 mc_number:clean(pick(r,['MC_MX_FF_NUMBER','MC_NUMBER','mc_number'])),
 physical_city:clean(pick(r,['PHY_CITY','physical_city','CITY'])),
 physical_state:clean(pick(r,['PHY_STATE','physical_state','STATE'])),
 physical_country:clean(pick(r,['PHY_COUNTRY','physical_country']))||'US',
 operating_status:clean(pick(r,['OPERATING_STATUS','operating_status','STATUS'])),
 entity_type:clean(pick(r,['ENTITY_TYPE','entity_type'])),
 power_units:int(pick(r,['POWER_UNITS','power_units'])),
 drivers:int(pick(r,['DRIVERS','drivers'])),
 safety_rating:clean(pick(r,['SAFETY_RATING','safety_rating'])),
 fmcsa_last_synced_at:stamp,
 updated_at:stamp
})).filter(r=>Number.isInteger(r.usdot_number)&&r.usdot_number>0&&r.legal_name);

const byDot=new Map();for(const r of normalized)byDot.set(r.usdot_number,r);const deduped=[...byDot.values()];
const rejected=records.length-normalized.length,duplicates=normalized.length-deduped.length;
console.log(`Input records: ${records.length}`);console.log(`Valid carrier records: ${deduped.length}`);console.log(`Rejected: ${rejected}`);console.log(`Duplicate USDOT rows collapsed: ${duplicates}`);
if(!deduped.length){console.error('No valid carrier rows remain after validation.');process.exit(1);}
if(dryRun){console.log('Dry run complete. No database writes performed.');console.log(JSON.stringify(deduped.slice(0,3),null,2));process.exit(0);}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function upsert(batch,attempt=1){const res=await fetch(`${url.replace(/\/$/,'')}/rest/v1/carriers?on_conflict=usdot_number`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(batch)});if(res.ok)return;const body=await res.text();if((res.status===429||res.status>=500)&&attempt<4){const wait=attempt*1500;console.warn(`FMCSA import retry ${attempt}/3 after HTTP ${res.status}; waiting ${wait}ms.`);await sleep(wait);return upsert(batch,attempt+1);}throw new Error(`${res.status} ${body}`);}
for(let i=0;i<deduped.length;i+=500){await upsert(deduped.slice(i,i+500));console.log(`Imported ${Math.min(i+500,deduped.length)} / ${deduped.length}`);}
console.log(`FMCSA carrier import complete: ${deduped.length} records.`);