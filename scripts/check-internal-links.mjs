import { readdir, readFile, access } from 'node:fs/promises';
import { extname, join } from 'node:path';

const SRC='src';
const errors=[];
const files=await readdir(SRC,{withFileTypes:true});
const htmlFiles=files.filter(f=>f.isFile()&&extname(f.name)==='.html').map(f=>f.name);

function candidates(url){
  const clean=url.split(/[?#]/)[0];
  if(!clean||clean==='/'||clean.startsWith('http:')||clean.startsWith('https:')||clean.startsWith('mailto:')||clean.startsWith('tel:')||clean.startsWith('javascript:')||clean.startsWith('data:')||clean.startsWith('#'))return [];
  const rel=clean.startsWith('/')?clean.slice(1):clean;
  if(!rel)return ['index.html'];
  if(extname(rel))return [rel];
  return [`${rel}.html`,join(rel,'index.html'),rel];
}

async function exists(path){try{await access(join(SRC,path));return true}catch{return false}}

let checked=0;
for(const file of htmlFiles){
  const text=await readFile(join(SRC,file),'utf8');
  const attrs=[...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const url of attrs){
    const opts=candidates(url);
    if(!opts.length)continue;
    checked++;
    let ok=false;
    for(const candidate of opts){if(await exists(candidate)){ok=true;break}}
    if(!ok)errors.push(`${file}: unresolved local reference ${url}`);
  }
}

if(errors.length){
  console.error('\nDrivers Lounge internal-link check FAILED:\n');
  errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));
  process.exit(1);
}
console.log(`✓ Internal-link check passed: ${htmlFiles.length} pages, ${checked} local references validated.`);
