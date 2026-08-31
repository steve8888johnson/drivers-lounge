import { readFile } from 'node:fs/promises';

const [,,filePath]=process.argv;
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!filePath||!url||!key){console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-fmcsa-carriers.mjs <csv-or-json-file>');process.exit(1);}

const text=await readFile(filePath,'utf8');
function parseCSV(input){const rows=[];let row=[],cell='',quote=false;for(let i=0;i<input.length;i++){const c=input[i],n=input[i+1];if(c==='"'){if(quote&&n==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}const headers=rows.shift().map(h=>h.trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));}
const raw=filePath.toLowerCase().endsWith('.json')?JSON.parse(text):parseCSV(text);
const records=Array.isArray(raw)?raw:(raw.results||raw.data||[]);
const pick=(r,names)=>{for(const n of names){if(r[n]!==undefined&&r[n]!==null&&String(r[n]).trim()!=='')return r[n];}return null;};
const int=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.trunc(n):null;};
const normalized=records.map(r=>({
 usdot_number:int(pick(r,['DOT_NUMBER','USDOT','usdot_number','dot_number'])),
 legal_name:pick(r,['LEGAL_NAME','legal_name','NAME','name']),
 dba_name:pick(r,['DBA_NAME','dba_name']),
 mc_number:pick(r,['MC_MX_FF_NUMBER','MC_NUMBER','mc_number']),
 physical_city:pick(r,['PHY_CITY','physical_city','CITY']),
 physical_state:pick(r,['PHY_STATE','physical_state','STATE']),
 physical_country:pick(r,['PHY_COUNTRY','physical_country'])||'US',
 operating_status:pick(r,['OPERATING_STATUS','operating_status','STATUS']),
 entity_type:pick(r,['ENTITY_TYPE','entity_type']),
 power_units:int(pick(r,['POWER_UNITS','power_units'])),
 drivers:int(pick(r,['DRIVERS','drivers'])),
 safety_rating:pick(r,['SAFETY_RATING','safety_rating']),
 fmcsa_last_synced_at:new Date().toISOString(),
 updated_at:new Date().toISOString()
})).filter(r=>r.usdot_number&&r.legal_name);

async function upsert(batch){const res=await fetch(`${url.replace(/\/$/,'')}/rest/v1/carriers?on_conflict=usdot_number`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(batch)});if(!res.ok)throw new Error(`${res.status} ${await res.text()}`);}
for(let i=0;i<normalized.length;i+=500){await upsert(normalized.slice(i,i+500));console.log(`Imported ${Math.min(i+500,normalized.length)} / ${normalized.length}`);}
console.log(`FMCSA carrier import complete: ${normalized.length} records.`);