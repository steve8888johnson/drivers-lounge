import{test}from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('native runtime exposes only allowlisted privacy-safe app diagnostic events',async()=>{
 const source=await read('../src/runtime.mjs');
 for(const token of['guidance-start','guidance-stop','guidance-deviation-frozen','guidance-paused','guidance-error','recordAppEvent'])assert.match(source,new RegExp(token));
 assert.doesNotMatch(source,/DL_NATIVE_DIAGNOSTICS=.*record:diagnostics\.record/);
 assert.match(source,/voice-spoken/);
});

test('standard and permitted guidance emit lifecycle evidence without coordinates',async()=>{
 const routing=await read('../../src/assets/routing/app.mjs'),permits=await read('../../src/assets/permits/app.mjs');
 for(const token of['guidance-start','guidance-stop','guidance-deviation-frozen','guidance-error'])assert.match(routing,new RegExp(token));
 for(const token of['guidance-start','guidance-stop','guidance-paused'])assert.match(permits,new RegExp(token));
 for(const source of[routing,permits])assert.doesNotMatch(source,/recordAppEvent\?\.\([^\n]*(?:latitude|longitude|geometry|address)/i);
 assert.match(routing,/guidance-stop[^;]+;if\(state\.watchId/);
 assert.match(permits,/guidance-stop[^;]+; if \(watching !== null\)/);
});
