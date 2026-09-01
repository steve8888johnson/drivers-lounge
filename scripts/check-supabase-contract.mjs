import { readFile } from 'node:fs/promises';
import { supabaseTableGroups } from './supabase-contract.mjs';

const errors=[];
const seen=new Set();

for(const {migration,tables} of supabaseTableGroups){
  const sql=await readFile(new URL(`../supabase/${migration}`,import.meta.url),'utf8');
  for(const table of tables){
    if(seen.has(table))errors.push(`Duplicate table in Supabase contract: ${table}`);
    seen.add(table);
    const escaped=table.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const creates=new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${escaped}\\s*\\(`,'i');
    if(!creates.test(sql))errors.push(`${migration} does not create required table: ${table}`);
  }
}

const retiredAliases=['support_requests','load_listings','community_post_reports'];
for(const alias of retiredAliases){
  if(seen.has(alias))errors.push(`Retired table alias returned to Supabase contract: ${alias}`);
}

if(errors.length){
  console.error('\nDrivers Lounge Supabase contract gate FAILED:\n');
  errors.forEach((error,index)=>console.error(`${index+1}. ${error}`));
  process.exit(1);
}

console.log(`✓ Supabase contract matches ${seen.size} tables across ${supabaseTableGroups.length} schema migrations`);
