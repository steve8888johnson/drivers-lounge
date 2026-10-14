import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),source=join(root,'../src'),out=join(root,'www');
await mkdir(out,{recursive:true});await cp(source,out,{recursive:true});
const pages=(await readdir(source)).filter(x=>x.endsWith('.html')).map(x=>x.slice(0,-5));
// Bundled WebViews have no Vercel clean-URL rewrites. Keep local page links explicit.
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory()){await walk(p);continue;}if(!/\.(html|js|mjs)$/.test(entry.name))continue;let text=await readFile(p,'utf8');for(const page of pages){const pattern=new RegExp('(["\x27`])/'+page+'(?=["\x27`?#])','g');text=text.replace(pattern,`$1/${page}.html`);}await writeFile(p,text);}}
await walk(out);
await writeFile(join(out,'config.js'),'window.DRIVERS_LOUNGE_CONFIG='+JSON.stringify({readOnlyBeta:true,permitGuidanceEnabled:false,supabaseUrl:'',supabaseAnonKey:'',highwayAutomationUrl:'https://highway.atlasdigital.dev',environment:'native-development',appName:'Drivers Lounge'})+';\n');
console.log(`Prepared ${pages.length} bundled pages. Accounts, payments and driving guidance remain disabled.`);
