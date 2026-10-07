import {readdir,readFile,writeFile} from 'node:fs/promises';
const origin=process.argv[2];if(!origin||!/^https:\/\//.test(origin))throw new Error('Pass the deployed HTTPS origin.');
const paths=(await readdir('src')).filter(x=>x.endsWith('.html')).map(x=>x==='index.html'?'/':'/'+x.slice(0,-5));
const results=[];let cursor=0;
async function worker(){while(cursor<paths.length){const route=paths[cursor++];try{const r=await fetch(origin+route,{signal:AbortSignal.timeout(20000)});const html=await r.text();results.push({route,status:r.status,ok:r.ok&&/<title>[^<]+<\/title>/i.test(html),title:html.match(/<title>([^<]+)<\/title>/i)?.[1]||''})}catch(e){results.push({route,ok:false,error:e.message})}}}
await Promise.all(Array.from({length:4},worker));
const config=await fetch(origin+'/config.js',{signal:AbortSignal.timeout(10000)}).then(r=>r.text());
const cfg=JSON.parse(config.replace(/^window\.DRIVERS_LOUNGE_CONFIG\s*=\s*/,'').replace(/;\s*$/,''));
const key=String(cfg.supabaseAnonKey||'');let keyRole='';try{keyRole=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url')).role||''}catch{}
const configuration={supabaseConfigured:!!cfg.supabaseUrl&&!!key,publicKeySafe:!key.startsWith('sb_secret_')&&keyRole!=='service_role',environment:cfg.environment};
const apis=[];for(const route of ['/api/stripe/webhook','/api/stripe/create-checkout-session']){const response=await fetch(origin+route);const data=await response.json();apis.push({route,status:response.status,...data})}
const missing=await fetch(origin+'/this-route-must-not-exist-dl-qa');
const report={origin,checkedAt:new Date().toISOString(),pages:results.sort((a,b)=>a.route.localeCompare(b.route)),configuration,apis,unknownRouteStatus:missing.status};
await writeFile(process.argv[3]||'deployed-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({origin,pagesChecked:results.length,pagesPassed:results.filter(x=>x.ok).length,failures:results.filter(x=>!x.ok),configuration,unknownRouteStatus:missing.status},null,2));
if(results.some(x=>!x.ok)||!configuration.supabaseConfigured||!configuration.publicKeySafe||missing.status!==404)process.exitCode=1;
