import{test}from'node:test';
import assert from'node:assert/strict';
import{backgroundLocationError,browserPosition,createBackgroundNavigationGeolocation}from'../src/background-geolocation.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({notification=true,clock=()=>1_000_000}={}){
 let callback,resolveWatcher,foregroundCallback;const removals=[],foregroundRemovals=[],counts=[],modes=[];
 const foregroundPlugin={
  getCurrentPosition:async()=>({coords:{latitude:1},timestamp:clock()}),
  watchPosition:async(options,cb)=>{foregroundCallback=cb;return'foreground-1';},
  clearWatch:async({id})=>foregroundRemovals.push(id)
 };
 const backgroundPlugin={
  addWatcher:async(options,cb)=>{callback=cb;return await new Promise(resolve=>resolveWatcher=resolve);},
  removeWatcher:async({id})=>removals.push(id),openSettings:async()=>{}
 };
 const gps=createBackgroundNavigationGeolocation({foregroundPlugin,backgroundPlugin,ensureBackgroundNotification:async()=>notification,shouldUseBackground:options=>options?.dlBackgroundGuidance===true,onWatchChange:value=>counts.push(value),onAppModeChange:value=>modes.push(value),clock});
 return{gps,callback:()=>callback,registered:id=>resolveWatcher(id),removals,foregroundRemovals,foregroundCallback:()=>foregroundCallback,counts,modes};
}

test('background fixes map to the browser geolocation contract',()=>{
 const position=browserPosition({latitude:32.1,longitude:-102.2,accuracy:8,altitude:900,altitudeAccuracy:3,bearing:180,speed:22,time:1234});
 assert.deepEqual(position,{coords:{latitude:32.1,longitude:-102.2,accuracy:8,altitude:900,altitudeAccuracy:3,heading:180,speed:22},timestamp:1234});
});

test('navigation watch remains registered when the native app backgrounds',async()=>{
 const f=fixture(),seen=[];f.gps.watchPosition(value=>seen.push(value),error=>assert.fail(error.message),{dlBackgroundGuidance:true});await tick();f.registered('native-1');await tick();
 f.gps.setAppActive(false);f.callback()({latitude:32,longitude:-102,accuracy:7,time:1_000_000});
 assert.equal(f.gps.watchCount,1);assert.equal(seen.length,1);assert.deepEqual(f.removals,[]);assert.equal(f.modes.at(-1).active,false);
});

test('stop during permission or watcher registration removes the eventual native watcher',async()=>{
 const f=fixture(),id=f.gps.watchPosition(()=>assert.fail(),undefined,{dlBackgroundGuidance:true});await tick();f.gps.clearWatch(id);f.registered('native-late');await tick();
 assert.deepEqual(f.removals,['native-late']);assert.equal(f.gps.watchCount,0);
});

test('notification denial fails closed before native background tracking starts',async()=>{
 const f=fixture({notification:false}),errors=[];f.gps.watchPosition(()=>assert.fail(),error=>errors.push(error),{dlBackgroundGuidance:true});await tick();await tick();
 assert.equal(f.gps.watchCount,0);assert.equal(errors.length,1);assert.equal(errors[0].code,1);assert.match(errors[0].message,/notification permission/i);
});

test('simulated and stale background locations are rejected',async()=>{
 const f=fixture({clock:()=>1_000_000}),errors=[];f.gps.watchPosition(()=>assert.fail(),error=>errors.push(error),{dlBackgroundGuidance:true});await tick();f.registered('native-2');await tick();
 f.callback()({latitude:32,longitude:-102,accuracy:4,time:1_000_000,simulated:true});
 f.callback()({latitude:32,longitude:-102,accuracy:4,time:900_000});
 assert.equal(errors.length,2);assert.match(errors[0].message,/simulated/i);assert.match(errors[1].message,/stale/i);
});

test('stopAll removes every registered background watcher',async()=>{
 let index=0;const removals=[];
 const gps=createBackgroundNavigationGeolocation({
  foregroundPlugin:{getCurrentPosition:async()=>({}),watchPosition:async()=>`f${++index}`,clearWatch:async({id})=>removals.push(id)},
  backgroundPlugin:{addWatcher:async()=>`n${++index}`,removeWatcher:async({id})=>removals.push(id)},
  ensureBackgroundNotification:async()=>true,
  shouldUseBackground:options=>options?.dlBackgroundGuidance===true
 });
 gps.watchPosition(()=>{},undefined,{dlBackgroundGuidance:true});gps.watchPosition(()=>{},undefined,{dlBackgroundGuidance:true});await tick();await tick();gps.stopAll();await tick();
 assert.deepEqual(removals.sort(),['n1','n2']);assert.equal(gps.watchCount,0);
});

test('ordinary location watches remain foreground-only and never request background permission',async()=>{
 const f=fixture({notification:false}),seen=[];f.gps.watchPosition(value=>seen.push(value),error=>assert.fail(error.message),{enableHighAccuracy:true});await tick();await tick();
 f.foregroundCallback()({coords:{latitude:31},timestamp:1_000_000});
 assert.equal(seen.length,1);assert.equal(f.callback(),undefined);
 f.gps.setAppActive(false);await tick();assert.deepEqual(f.foregroundRemovals,['foreground-1']);
});

test('native callback errors use browser-style geolocation codes',()=>{
 assert.equal(backgroundLocationError({code:'NOT_AUTHORIZED'}).code,1);
 assert.equal(backgroundLocationError({code:'TIMEOUT'}).code,3);
 assert.equal(backgroundLocationError({code:'SOMETHING_ELSE'}).code,2);
});
