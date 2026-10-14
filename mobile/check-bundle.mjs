import {readFile,readdir,access} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);const text=await readFile(new URL('www/config.js',root),'utf8');
const cfg=JSON.parse(text.replace(/^window.DRIVERS_LOUNGE_CONFIG=/,'').replace(/;\s*$/,''));
assert.equal(cfg.readOnlyBeta,true);assert.equal(cfg.permitGuidanceEnabled,false);assert.equal(cfg.supabaseAnonKey,'');
const config=JSON.parse(await readFile(new URL('capacitor.config.json',root),'utf8'));assert.equal(config.appId,'app.driverslounge.mobile');assert.equal(config.server.url,undefined);assert.equal(config.server.cleartext,undefined);
let checked=0;const pages=await readdir(new URL('www/',root));
for(const name of pages.filter(x=>x.endsWith('.html'))){const html=await readFile(new URL('www/'+name,root),'utf8');for(const m of html.matchAll(/(?:src|href)=["'](\/[^"'#?]*)(?:[?#][^"']*)?["']/g)){if(m[1]==='/'||m[1].startsWith('/api/'))continue;await access(new URL('www'+m[1],root));checked++;}}
console.log(`Bundled page/asset references checked: ${checked}. Native permissions and device behavior still require device QA.`);
