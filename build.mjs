import { cp, rm, mkdir, access, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const required=['src/index.html','src/dashboard.html','src/navigation.html','src/road-tools.html','src/carriers.html','src/community.html','src/account.html','src/privacy.html','src/terms.html','src/support.html','src/manifest.webmanifest','src/sw.js','src/assets/backend.js','src/assets/rc1-design-system.css','src/assets/rc1-design-system.js','src/assets/carriers-rc2.js','src/assets/community-rc2.js'];
for(const file of required)await access(file);
const manifest=JSON.parse(await readFile('src/manifest.webmanifest','utf8'));
if(manifest.name!=='Drivers Lounge'||manifest.display!=='standalone')throw new Error('Store-ready manifest validation failed.');

await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('src','dist',{recursive:true});

const mobileHeadTags=[
  '<meta name="application-name" content="Drivers Lounge">',
  '<meta name="theme-color" content="#071522">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Drivers Lounge">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<link rel="apple-touch-icon" href="/assets/drivers-lounge-logo.png">'
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
  let html=await readFile(file,'utf8');
  if(!/<head[\s>]/i.test(html)||!/<\/head>/i.test(html))throw new Error(`Missing <head> in ${file}`);
  const additions=mobileHeadTags.filter(tag=>{
    const name=tag.match(/name="([^"]+)"/)?.[1];
    const rel=tag.match(/rel="([^"]+)"/)?.[1];
    if(name)return !new RegExp(`<meta[^>]+name=["']${name}["']`,'i').test(html);
    if(rel)return !new RegExp(`<link[^>]+rel=["']${rel}["']`,'i').test(html);
    return true;
  });
  if(additions.length){
    html=html.replace(/<\/head>/i,`${additions.join('')}</head>`);
    await writeFile(file,html);
  }
  const requiredMarkers=['application-name','mobile-web-app-capable','apple-mobile-web-app-capable','apple-mobile-web-app-title','apple-touch-icon'];
  for(const marker of requiredMarkers)if(!html.includes(marker))throw new Error(`Mobile metadata injection failed for ${file}: ${marker}`);
  enhanced++;
}

console.log(`Drivers Lounge RC2 build complete. Validated ${required.length} launch-critical assets and enhanced ${enhanced} HTML pages for mobile install readiness.`);
