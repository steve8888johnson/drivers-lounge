import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const policyContext={};vm.runInNewContext(readFileSync('src/assets/map-planning-safety.js','utf8'),policyContext);
const policy=policyContext.DLMapPlanningSafety;
const now=1791957600000;
const position=(coords={},timestamp=now)=>({coords:{latitude:32,longitude:-102,accuracy:20,...coords},timestamp});
test('position validates uncertainty, age, type and bounds without coercion',()=>{
 assert.equal(policy.assessPosition(position(),now).usable,true);
 for(const coords of [{latitude:91},{longitude:-181},{latitude:'32'},{longitude:null},{accuracy:NaN},{accuracy:0},{accuracy:-1},{accuracy:100.001},{accuracy:'10'}])assert.equal(policy.assessPosition(position(coords),now).usable,false,JSON.stringify(coords));
 for(const timestamp of [now-60000,now+1,NaN,'1791957600000',null])assert.equal(policy.assessPosition(position({},timestamp),now).usable,false,String(timestamp));
 assert.equal(policy.assessPosition(position({accuracy:100},now-59999),now).usable,true);
 assert.equal(policy.assessPosition(position({latitude:0,longitude:0}),now).usable,true);
});
test('network location rejects missing, coerced and out of range coordinates',()=>{
 for(const latitude of [null,'',false,91,'32',NaN])assert.equal(policy.assessNetwork({ok:true,latitude,longitude:0}).usable,false);
 assert.equal(policy.assessNetwork({ok:1,latitude:0,longitude:0}).usable,false);
 assert.equal(policy.assessNetwork({ok:true,latitude:0,longitude:0}).usable,true);
});
test('tile completion cannot erase missing roads; reconnect requires explicit retry',()=>{
 let state='loading';const event=e=>state=policy.mapState(state,e);
 event('error');event('loaded');assert.equal(state,'failed');
 event('loading');assert.equal(state,'failed');
 event('offline');event('loaded');event('error');assert.equal(state,'offline');
 event('online');event('loaded');assert.equal(state,'retry');
 event('retry');event('loaded');assert.equal(state,'ready');
 event('loading');event('timeout');event('loaded');assert.equal(state,'failed');
});
function harness({positions=[],network={ok:true,latitude:32,longitude:-102}}={}){
 const source=readFileSync('src/assets/navigation-v5.js','utf8');
 const block=source.slice(source.indexOf('// Map failures remain visible'),source.indexOf("$('#calculate-route').onclick=calc"));
 const elements=new Map();const $=selector=>{if(!elements.has(selector))elements.set(selector,{textContent:'',value:'',hidden:false,disabled:false,dataset:{},handlers:{},addEventListener(e,f){this.handlers[e]=f;}});return elements.get(selector)};
 const layers=[];let requests=0,reads=0,clock=now;
 const layer=()=>({handlers:{},on(e,f){this.handlers[e]=f;},isLoading(){return true;},redraw(){this.redrawn=true;}});
 const base=layer(),dark=layer();const timers=new Map();let nextTimer=0;
 const docEvents={},winEvents={};
 const context=vm.createContext({planning:policy,$,base,dark,isDark:false,currentLocation:null,currentLocationApproximate:false,
  Date:{now:()=>clock},Math,Promise,Error,setTimeout(f){timers.set(++nextTimer,f);return nextTimer;},clearTimeout(id){timers.delete(id);},
  map:{hasLayer:l=>l===base,setView(){},removeLayer(l){l.removed=true;}},
  L:{circleMarker:makeLayer,circle:makeLayer},syncGeneralNavigation(){},
  requestJson:async()=>{requests++;return network;},
  document:{visibilityState:'visible',addEventListener(e,f){docEvents[e]=f;}},
  window:{addEventListener(e,f){winEvents[e]=f;}},
  navigator:{onLine:true,geolocation:{getCurrentPosition(ok,fail){const p=positions[reads++];p?.error?fail(p.error):ok(p);}}}
 });
 function makeLayer(ll,options){const l={ll,options,addTo(){layers.push(this);return this;},bindPopup(message){this.message=message;return this;}};return l;}
 // Bind policy to the simulated clock without weakening production defaults.
 context.planning={...policy,assessPosition:(p,t=clock)=>policy.assessPosition(p,t)};
 vm.runInContext(block,context);
 return {context,$,layers,base,winEvents,docEvents,timers,requests:()=>requests,reads:()=>reads,advance(ms){clock+=ms;},run:code=>vm.runInContext(code,context)};
}
test('fresh device marker displays accuracy and expires with both stored endpoint aliases cleared',async()=>{
 const h=harness({positions:[position()]});assert.equal(await h.context.locate(),true);
 assert.match(h.$('#location-health').textContent,/about 20 m/);
 assert.equal(h.layers[1].options.radius,20);
 h.$('#origin').value='Current location';h.$('#destination').value='Current location';
 h.advance(60000);h.docEvents.visibilitychange();
 assert.equal(h.context.currentLocation,null);assert.ok(h.layers.every(l=>l.removed));
 assert.equal(h.$('#origin').value,'');assert.equal(h.$('#destination').value,'');
 assert.match(h.$('#location-health').textContent,/expired/);
});
test('coarse or stale device readings cannot become an origin; network fallback stays approximate',async()=>{
 const h=harness({positions:[position({accuracy:800}),position({},now-60000)]});
 assert.equal(await h.context.locate(),false);assert.equal(h.requests(),1);
 assert.equal(h.context.currentLocationApproximate,true);
 assert.match(h.$('#location-health').textContent,/cannot be used as an origin/);
 assert.equal(h.layers.length,1);assert.equal(h.$('#origin').value,'');
});
test('denied location clears old fix, does not call network fallback and restores buttons',async()=>{
 const h=harness({positions:[position(),{error:{code:1}}]});await h.context.locate();
 assert.equal(await h.context.locate(),false);assert.equal(h.requests(),0);assert.equal(h.context.currentLocation,null);
 assert.match(h.$('#location-health').textContent,/permission is blocked/);
 assert.equal(h.$('#use-location').disabled,false);
});
test('real map event wiring retains a tile error until a successful deliberate redraw',()=>{
 const h=harness();h.base.handlers.tileerror();h.base.handlers.load();
 assert.match(h.$('#map-health').textContent,/Map incomplete/);assert.equal(h.$('#retry-map').hidden,false);
 h.winEvents.offline();assert.equal(h.$('#retry-map').disabled,true);
 h.winEvents.online();h.base.handlers.load();assert.match(h.$('#map-health').textContent,/Retry/);
 h.$('#retry-map').onclick();assert.equal(h.base.redrawn,true);h.base.handlers.load();
 assert.equal(h.$('#retry-map').hidden,true);assert.match(h.$('#map-health').textContent,/restrictions are not verified/);
});
test('a late location lookup cannot overwrite a typed origin, including a clear-and-retype',async()=>{
 const h=harness();let callback;
 h.context.navigator.geolocation.getCurrentPosition=ok=>{callback=ok;};
 const pending=h.context.useCurrentOrigin();
 h.$('#origin').value='New address';h.$('#origin').handlers.input();
 callback(position());await pending;assert.equal(h.$('#origin').value,'New address');
 const second=h.context.useCurrentOrigin();callback(position());await second;
 assert.equal(h.$('#origin').value,'Current location');
 const third=h.context.useCurrentOrigin();callback(position());await third;
 assert.equal(h.$('#origin').value,'Current location');
});
