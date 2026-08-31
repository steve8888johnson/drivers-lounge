import { cp, rm, mkdir, access, readFile } from 'node:fs/promises';
const required=['src/index.html','src/dashboard.html','src/navigation.html','src/road-tools.html','src/carriers.html','src/community.html','src/account.html','src/privacy.html','src/terms.html','src/support.html','src/manifest.webmanifest','src/sw.js','src/assets/backend.js','src/assets/rc1-design-system.css','src/assets/rc1-design-system.js','src/assets/carriers-rc2.js','src/assets/community-rc2.js'];
for(const file of required)await access(file);
const manifest=JSON.parse(await readFile('src/manifest.webmanifest','utf8'));
if(manifest.name!=='Drivers Lounge'||manifest.display!=='standalone')throw new Error('Store-ready manifest validation failed.');
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('src','dist',{recursive:true});
console.log(`Drivers Lounge RC2 build complete. Validated ${required.length} launch-critical assets.`);