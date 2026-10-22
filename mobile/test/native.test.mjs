import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeolocation, locationError } from '../src/geolocation.mjs';
import { createApiFetch, apiOrigin } from '../src/api.mjs';
import { rewriteLocalRoutes } from '../scripts/routes.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function geoFixture() {
 let resolveWatch, callback, resolvePosition;
 const clears=[], counts=[];
 const plugin={watchPosition:async(options,cb)=>{callback=cb;return await new Promise(r=>resolveWatch=r)},
  clearWatch:async({id})=>clears.push(id),getCurrentPosition:()=>new Promise(r=>resolvePosition=r)};
 const gps=createGeolocation(plugin,count=>counts.push(count));
 return {gps,clears,counts,position:value=>resolvePosition(value),registered:id=>resolveWatch(id),
  emit:(...args)=>callback(...args)};
}
test('clearWatch before native registration prevents starting a watcher',async()=>{
 const f=geoFixture(); const id=f.gps.watchPosition(()=>assert.fail()); f.gps.clearWatch(id);await tick();
 assert.equal(f.gps.watchCount,0);assert.deepEqual(f.clears,[]);
});
test('stop during permission prompt clears the eventual native watch exactly once',async()=>{
 const f=geoFixture();const id=f.gps.watchPosition(()=>assert.fail());await tick();
 f.gps.clearWatch(id);f.registered('native-7');await tick();f.emit({coords:{}});
 f.gps.clearWatch(id);assert.deepEqual(f.clears,['native-7']);assert.equal(f.gps.watchCount,0);
});
test('active GPS delivers fixes and stops callbacks after clear',async()=>{
 const f=geoFixture(), seen=[];const id=f.gps.watchPosition(value=>seen.push(value));
 await tick();f.registered('native-8');await tick();f.emit({coords:{latitude:32}});
 f.gps.clearWatch(id);f.emit({coords:{latitude:33}});
 assert.equal(seen.length,1);assert.deepEqual(f.clears,['native-8']);
});
test('backgrounding cancels pending watches and ignores late single fixes',async()=>{
 const f=geoFixture();f.gps.watchPosition(()=>assert.fail());f.gps.getCurrentPosition(()=>assert.fail());
 await tick();f.gps.pause();f.registered('native-9');f.position({coords:{}});await tick();
 assert.deepEqual(f.clears,['native-9']);assert.equal(f.gps.watchCount,0);assert.equal(f.counts.at(-1),0);
 f.gps.resume();assert.equal(f.gps.watchCount,0);
});
test('native watch rejection reaches the error callback and releases wake state',async()=>{
 let error;const counts=[];const gps=createGeolocation({watchPosition:async()=>{throw {code:'OS-PLUG-GLOC-0003'}}},n=>counts.push(n));
 gps.watchPosition(()=>assert.fail(),e=>error=e);await tick();
 assert.equal(error.code,1);assert.equal(gps.watchCount,0);assert.equal(counts.at(-1),0);
});
test('native location errors retain browser error meanings',()=>{
 assert.equal(locationError({code:'OS-PLUG-GLOC-0010'}).code,3);
 assert.equal(locationError({message:'GPS off'}).code,2);
});
function apiFixture(localOrigin='https://localhost') {
 const native=[],web=[];
 const fetch=createApiFetch({localOrigin,backendOrigin:'https://driverslounge.app',
 nativeHttp:{request:async r=>{native.push(r);return {status:200,headers:{'content-type':'application/json'},data:'{"ok":true}'}}},
 webFetch:async(...args)=>{web.push(args);return new Response('web')}});
 return {fetch,native,web};
}
for(const origin of ['https://localhost','capacitor://localhost']) {
 test('API JSON transport supports '+origin,async()=>{
  const f=apiFixture(origin);const r=await f.fetch('/api/truck-route',{method:'POST',
  headers:{'content-type':'application/json',authorization:'Bearer fixture'},body:'{"profile":{"height":4}}'});
  assert.deepEqual(await r.json(),{ok:true});assert.equal(f.native[0].url,'https://driverslounge.app/api/truck-route');
  assert.deepEqual(f.native[0].data,{profile:{height:4}});assert.equal(f.native[0].disableRedirects,true);
  assert.equal(f.web.length,0);
 });
}
test('Supabase, map tiles and local files keep normal web fetch',async()=>{
 const f=apiFixture();for(const url of ['https://fixture.supabase.co/rest/v1/trips','/assets/test.json','https://example.com/api/test'])await f.fetch(url);
 assert.equal(f.native.length,0);assert.equal(f.web.length,3);
});
test('abort before API request prevents network activity',async()=>{
 const f=apiFixture(),controller=new AbortController();controller.abort();
 await assert.rejects(f.fetch('/api/truck-route',{signal:controller.signal}),{name:'AbortError'});
 assert.equal(f.native.length,0);
});
test('API request preserves status errors and Request headers',async()=>{
 const calls=[];const fetch=createApiFetch({localOrigin:'https://localhost',backendOrigin:'https://driverslounge.app',
 webFetch:()=>assert.fail(),nativeHttp:{request:async r=>{calls.push(r);return {status:422,data:'{"error":"invalid profile"}',headers:{}}}}});
 const r=await fetch(new Request('https://localhost/api/test',{headers:{authorization:'Bearer fixture'}}));
 assert.equal(r.status,422);assert.equal(r.ok,false);assert.equal(calls[0].headers.authorization,'Bearer fixture');
});
test('aborting native request rejects and ignores late completion',async()=>{
 let resolve;const fetch=createApiFetch({localOrigin:'https://localhost',backendOrigin:'https://driverslounge.app',
 webFetch:()=>assert.fail(),nativeHttp:{request:()=>new Promise(r=>resolve=r)}});
 const controller=new AbortController();const response=fetch('/api/test',{signal:controller.signal});
 await tick();controller.abort();await assert.rejects(response,{name:'AbortError'});
 resolve({status:200,data:'late',headers:{}});await tick();
});
test('API redirects cannot forward credentials to another host',async()=>{
 const fetch=createApiFetch({localOrigin:'https://localhost',backendOrigin:'https://driverslounge.app',webFetch:()=>assert.fail(),
 nativeHttp:{request:async()=>({status:302,data:'',headers:{location:'https://example.com'}})}});
 await assert.rejects(fetch('/api/test'),/redirect/);
});
test('backend origin rejects lookalikes, credentials, cleartext and paths',()=>{
 for(const value of ['http://driverslounge.app','https://driverslounge.app.evil.test','https://driverslounge.app/path',
 'https://user:pass@driverslounge.app','https://unrelated.vercel.app','https://driverslounge.app:444'])
  assert.throws(()=>apiOrigin(value));
 assert.equal(apiOrigin('https://drivers-lounge-test-steves-projects-c46af6ff.vercel.app'),'https://drivers-lounge-test-steves-projects-c46af6ff.vercel.app');
});
test('native page links preserve query/hash without rewriting APIs or external links',()=>{
 const source='<a href="/navigation?truck=1#review">Go</a><a href="/">Home</a> fetch("/api/truck-route"); location.href="/account"; const site="https://driverslounge.app/navigation";';
 const out=rewriteLocalRoutes(source,['index.html','navigation.html','account.html']);
 assert.match(out,/navigation\.html\?truck=1#review/);assert.match(out,/href="\/index\.html"/);
 assert.match(out,/fetch\("\/api\/truck-route"\)/);assert.match(out,/href="\/account\.html"/);
 assert.match(out,/"https:\/\/driverslounge\.app\/navigation"/);
});
