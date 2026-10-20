import { cp, rm, mkdir, access, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const required=['src/index.html','src/dashboard.html','src/navigation.html','src/road-tools.html','src/carriers.html','src/community.html','src/account.html','src/privacy.html','src/terms.html','src/support.html','src/manifest.webmanifest','src/sw.js','src/assets/backend.js','src/assets/rc1-design-system.css','src/assets/rc1-design-system.js','src/assets/carriers-rc2.js','src/assets/community-rc2.js','src/assets/permits/pdf-import.mjs','src/assets/permits/pdf-batch-core.mjs','src/assets/permits/pdf-batch-ui.mjs','src/assets/permits/route-text.mjs','src/assets/permits/official-provider.mjs','src/assets/permits/route-review.mjs','src/assets/permits/route-review-ui.mjs'];
for(const file of required)await access(file);
const manifest=JSON.parse(await readFile('src/manifest.webmanifest','utf8'));
if(manifest.name!=='Drivers Lounge'||manifest.display!=='standalone')throw new Error('Store-ready manifest validation failed.');

await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('src','dist',{recursive:true});

const normalizeEnv=value=>String(value||'').trim().replace(/^['"]|['"]$/g,'').replace(/\/$/,'');
const supabaseUrl=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_URL]
  .map(normalizeEnv)
  .find(value=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value))||'';
const supabaseAnonKey=normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY);
if(!supabaseUrl||!supabaseAnonKey)throw new Error('Valid public Supabase configuration is missing.');
let keyRole='';try{keyRole=JSON.parse(Buffer.from(supabaseAnonKey.split('.')[1]||'','base64url').toString()).role}catch(_){}
if(!supabaseAnonKey.startsWith('sb_publishable_')&&keyRole!=='anon')throw new Error('The browser requires a public publishable or anon key; privileged keys are forbidden.');
const publicConfig=`window.DRIVERS_LOUNGE_CONFIG = ${JSON.stringify({
  supabaseUrl,
  supabaseAnonKey,
  environment:process.env.VERCEL_ENV||'development',
  appName:'Drivers Lounge'
},null,2)};\n`;
await writeFile('dist/config.js',publicConfig,'utf8');

const mobileHeadTags=[
  '<meta name="application-name" content="Drivers Lounge">',
  '<meta name="theme-color" content="#071522">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Drivers Lounge">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<link rel="apple-touch-icon" href="/assets/drivers-lounge-logo.png">'
];
const permitModules=[
  '<script type="module" src="/assets/permits/pdf-batch-ui.mjs"></script>',
  '<script type="module" src="/assets/permits/route-review-ui.mjs"></script>'
];

async function htmlFiles(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const path=join(dir,entry.name);
    if(entry.isDirectory())files.push(...await htmlFiles(path));
    else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);
  }
  return files;
}

let enhanced=0;
for(const file of await htmlFiles('dist')){
  let html=await readFile(file,'utf8'),changed=false;
  if(!/<head[\s>]/i.test(html)||!/<\/head>/i.test(html))throw new Error(`Missing <head> in ${file}`);
  const additions=mobileHeadTags.filter(tag=>{
    const name=tag.match(/name="([^"]+)"/)?.[1];
    const rel=tag.match(/rel="([^"]+)"/)?.[1];
    if(name)return !new RegExp(`<meta[^>]+name=["']${name}["']`,'i').test(html);
    if(rel)return !new RegExp(`<link[^>]+rel=["']${rel}["']`,'i').test(html);
    return true;
  });
  if(additions.length){html=html.replace(/<\/head>/i,`${additions.join('')}</head>`);changed=true;}
  if(file.endsWith('permitted-loads.html')){
    if(!/<\/body>/i.test(html))throw new Error('Missing </body> in permitted-loads.html');
    for(const module of permitModules){const source=module.match(/src="([^"]+)"/)?.[1];if(source&&!html.includes(source)){html=html.replace(/<\/body>/i,`${module}</body>`);changed=true;}}
  }
  if(changed)await writeFile(file,html);
  const requiredMarkers=['application-name','mobile-web-app-capable','apple-mobile-web-app-capable','apple-mobile-web-app-title','apple-touch-icon'];
  for(const marker of requiredMarkers)if(!html.includes(marker))throw new Error(`Mobile metadata injection failed for ${file}: ${marker}`);
  if(file.endsWith('permitted-loads.html'))for(const module of permitModules){const source=module.match(/src="([^"]+)"/)?.[1];if(source&&!html.includes(source))throw new Error(`Private permit module injection failed: ${source}`);}
  enhanced++;
}

console.log(`Drivers Lounge RC2 build complete. Validated ${required.length} launch-critical assets and enhanced ${enhanced} HTML pages for mobile install readiness.`);
