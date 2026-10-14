import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';

// Package only the reviewed build probe and its static local dependencies. This
// intentionally excludes app/API files, dist, credentials and original env files.
const root=process.cwd(),seen=new Set(),files=[];
function collect(relativePath){
 const full=resolve(root,relativePath),name=relative(root,full).split(sep).join('/');
 if(!/^(scripts|server|src\/assets)\/[a-zA-Z0-9_./-]+\.mjs$/.test(name)||name.includes('..'))throw Error('Unexpected evaluation dependency');
 if(seen.has(name))return;
 seen.add(name);
 const data=readFileSync(full,'utf8');files.push({file:name,data,encoding:'utf-8'});
 for(const match of data.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
  if(match[1].startsWith('node:'))continue;
  if(!match[1].startsWith('.'))throw Error('External evaluation dependency');
  collect(relative(root,resolve(dirname(full),match[1])));
 }
}
collect('scripts/evaluate-tomtom.mjs');
files.push({file:'package.json',data:JSON.stringify({name:'drivers-lounge-tomtom-evaluation',private:true,engines:{node:'22.x'}}),encoding:'utf-8'});
files.push({file:'vercel.json',data:JSON.stringify({buildCommand:'node scripts/evaluate-tomtom.mjs --free-account-verified --one-request',installCommand:'',outputDirectory:'evaluation-output',public:false,headers:[{source:'/(.*)',headers:[{key:'Cache-Control',value:'no-store'},{key:'Content-Security-Policy',value:"default-src 'none'; frame-ancestors 'none'"},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]}),encoding:'utf-8'});
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
writeFileSync('../../outputs/tomtom-evaluation-deployment.json',JSON.stringify({sourceCommit,files}));
console.log(JSON.stringify({sourceCommit,files:files.map(file=>file.file),bytes:files.reduce((sum,file)=>sum+Buffer.byteLength(file.data),0)}));
