import { cp, rm, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { apiOrigin } from '../src/api.mjs';
import { rewriteLocalRoutes } from './routes.mjs';
const mobile = fileURLToPath(new URL('../', import.meta.url)), root = resolve(mobile, '..');
const backend = apiOrigin(process.env.DL_API_ORIGIN || 'https://driverslounge.app');
const release = process.env.DL_RELEASE === '1';
const sourceRevision=/^[0-9a-f]{40}$/i.test(process.env.GITHUB_SHA||'')?process.env.GITHUB_SHA:'local';
if (release && backend !== 'https://driverslounge.app') throw Error('Store builds must use the production API.');
const healthResponse = await fetch(backend + '/api/truck-route-health', {signal:AbortSignal.timeout(20000)});
if (!healthResponse.ok) throw Error('The selected API has no healthy truck-routing endpoint.');
const health = await healthResponse.json();
if (!health.configured) throw Error('Configure the selected routing API before building the mobile app.');
// This is public browser configuration, not server-side credentials.
const configResponse = await fetch(backend + '/config.js', {signal:AbortSignal.timeout(20000)});
if (!configResponse.ok) throw Error('Public app configuration is unavailable.');
const configText = await configResponse.text();
const config = JSON.parse(configText.slice(configText.indexOf('{'), configText.lastIndexOf('}') + 1));
execFileSync(process.execPath, ['build.mjs'], {cwd:root,stdio:'inherit',env:{...process.env,
  NEXT_PUBLIC_SUPABASE_URL:config.supabaseUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:config.supabaseAnonKey}});
const www = join(mobile,'www');
await rm(www,{recursive:true,force:true}); await cp(join(root,'dist'),www,{recursive:true});
async function walk(directory) {
  const items = await readdir(directory,{withFileTypes:true}), files=[];
  for(const item of items) { const path=join(directory,item.name); files.push(...(item.isDirectory()?await walk(path):[path])); }
  return files;
}
const files=await walk(www), pages=files.filter(p=>p.endsWith('.html')).map(p=>relative(www,p).replaceAll('\\','/'));
const replacements = new Map([
 ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0','/assets/native-vendor/supabase.js'],
 ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','/assets/native-vendor/leaflet/leaflet.css'],
 ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','/assets/native-vendor/leaflet/leaflet.js']
]);
for(const path of files.filter(p=>/\.(html|js|mjs)$/.test(p))) {
  let text=await readFile(path,'utf8');
  // Email links deliberately target the public website.
  if(!path.endsWith('/assets/backend.js')) text=rewriteLocalRoutes(text,pages);
  for(const [url,local] of replacements) text=text.replaceAll(url,local);
  if(path.endsWith('.html')) {
    // Blocking script: install native APIs before page scripts execute.
    text=text.replace(/<head([^>]*)>/i,'<head$1><script src="/assets/native-runtime.js"></script>');
    if(/<(script|link)\b[^>]*(?:src|href)=["']https?:\/\/[^>]+(?:\.js|\.css|supabase-js)/i.test(text))
      throw Error('Remote executable dependency remains in '+relative(www,path));
  }
  if(path.endsWith('/assets/permits/pdf-import.mjs')) {
    text=text.replace('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs','/assets/native-vendor/pdf/pdf.mjs')
      .replace('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs','/assets/native-vendor/pdf/pdf.worker.mjs')
      .replace('useSystemFonts:true',"useSystemFonts:true,cMapUrl:'/assets/native-vendor/pdf/cmaps/',cMapPacked:true,standardFontDataUrl:'/assets/native-vendor/pdf/standard_fonts/',wasmUrl:'/assets/native-vendor/pdf/wasm/'");
  }
  await writeFile(path,text);
}
const vendor=join(www,'assets/native-vendor'); await mkdir(vendor,{recursive:true});
await build({stdin:{contents:"import * as api from '@supabase/supabase-js'; window.supabase=api;",resolveDir:mobile},
 bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,outfile:join(vendor,'supabase.js')});
await cp(join(mobile,'node_modules/leaflet/dist'),join(vendor,'leaflet'),{recursive:true});
await cp(join(mobile,'node_modules/pdfjs-dist/build'),join(vendor,'pdf'),{recursive:true});
for(const name of ['cmaps','standard_fonts','wasm']) await cp(join(mobile,'node_modules/pdfjs-dist',name),join(vendor,'pdf',name),{recursive:true});
await build({entryPoints:[join(mobile,'src/runtime.mjs')],bundle:true,format:'iife',platform:'browser',target:'es2022',
 minify:true,define:{DL_API_ORIGIN:JSON.stringify(backend),DL_PREVIEW_BUILD:JSON.stringify(!release),DL_BUILD_REVISION:JSON.stringify(sourceRevision.slice(0,8))},outfile:join(www,'assets/native-runtime.js')});
await rm(join(www,'sw.js'),{force:true});
await writeFile(join(www,'native-build.json'),JSON.stringify({channel:release?'release':'preview',apiOrigin:backend,
 appId:release?'dev.atlasdigital.driverslounge':'dev.atlasdigital.driverslounge.preview',sourceRevision,foregroundGuidanceOnly:true},null,2)+'\n');
let references=0;
const all=new Set((await walk(www)).map(p=>'/'+relative(www,p).replaceAll('\\','/')));
for(const page of pages) {
 const html=await readFile(join(www,page),'utf8');
 for(const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["'](\/[^"'?#]+)(?:[?#][^"']*)?["']/g)) {
  if(!all.has(match[1])) throw Error('Missing bundled asset '+match[1]+' in '+page);
  references++;
 }
}
console.log('Native web bundle ready: '+pages.length+' pages, '+references+' local asset references; API '+backend);
