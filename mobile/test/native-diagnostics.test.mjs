import{test}from'node:test';
import assert from'node:assert/strict';
import{createNativeDiagnostics,summarizeNativeDiagnostics}from'../src/native-diagnostics.mjs';

function memoryStorage(initial=''){
 let value=initial;return{getItem:()=>value||null,setItem:(key,next)=>{value=next;},value:()=>value};
}

test('diagnostics strip coordinates, addresses, routes, permits and account identifiers',()=>{
 const storage=memoryStorage(),diagnostics=createNativeDiagnostics({storage,clock:()=>1_000,platform:'android',revision:'abc123'});
 diagnostics.record('unsafe-input',{latitude:32.1,longitude:-102.2,address:'private address',route:'secret route',permitNumber:'private permit',userId:'private user',accuracy:8,page:'/navigation'});
 const text=diagnostics.exportText();
 for(const forbidden of['32.1','-102.2','private address','secret route','private permit','private user','latitude','longitude','permitNumber','userId'])assert.doesNotMatch(text,new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
 assert.match(text,/"accuracyM": 8/);assert.match(text,/"page": "\/navigation"/);
});

test('GPS fixes are sampled on first fix, state or quality change, long gap and one-minute heartbeat',()=>{
 let now=10_000;const diagnostics=createNativeDiagnostics({storage:memoryStorage(),clock:()=>now});
 diagnostics.recordFix({background:false,accuracy:10,ageMs:100});
 now+=1_000;diagnostics.recordFix({background:false,accuracy:11,ageMs:100});
 now+=1_000;diagnostics.recordFix({background:true,accuracy:11,ageMs:100});
 now+=16_000;diagnostics.recordFix({background:true,accuracy:12,ageMs:100});
 now+=60_000;diagnostics.recordFix({background:true,accuracy:12,ageMs:100});
 const fixes=diagnostics.snapshot().events.filter(event=>event.type==='gps-fix');
 assert.equal(fixes.length,4);assert.equal(fixes[1].details.background,true);assert.equal(fixes[2].details.gapMs,16000);assert.equal(fixes[3].details.gapMs,60000);
});

test('summary reports field-test health without reconstructing movement',()=>{
 const summary=summarizeNativeDiagnostics([
  {at:'2026-01-01T00:00:00.000Z',type:'watch-count',details:{watchCount:1}},
  {at:'2026-01-01T00:00:10.000Z',type:'gps-fix',details:{background:true,accuracyBand:'weak',gapMs:18000}},
  {at:'2026-01-01T00:00:11.000Z',type:'gps-error',details:{code:'TIMEOUT'}},
  {at:'2026-01-01T00:00:12.000Z',type:'voice-unavailable',details:{}},
  {at:'2026-01-01T00:00:13.000Z',type:'network-state',details:{online:false}}
 ]);
 assert.deepEqual({...summary},{eventCount:5,gpsFixes:1,backgroundGpsFixes:1,weakOrPoorFixes:1,gpsErrors:1,voiceFailures:1,offlineTransitions:1,maxGpsGapMs:18000,maxWatchCount:1,firstEventAt:'2026-01-01T00:00:00.000Z',lastEventAt:'2026-01-01T00:00:13.000Z'});
});

test('event storage is bounded and corrupt prior data is ignored safely',()=>{
 let now=0;const storage=memoryStorage('{broken');const diagnostics=createNativeDiagnostics({storage,clock:()=>++now,limit:50});
 for(let index=0;index<80;index++)diagnostics.record('event',{code:String(index)});
 const report=diagnostics.snapshot();assert.equal(report.events.length,50);assert.equal(report.events[0].details.code,'30');assert.doesNotThrow(()=>JSON.parse(storage.value()));
 diagnostics.clear();assert.equal(diagnostics.snapshot().events.length,0);
});

test('blocked global local storage cannot break navigation diagnostics',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('storage blocked');}});
 try{
  let diagnostics;
  assert.doesNotThrow(()=>{diagnostics=createNativeDiagnostics({clock:()=>2_000});});
  assert.doesNotThrow(()=>diagnostics.record('runtime-start',{online:true,page:'/navigation'}));
  assert.equal(diagnostics.snapshot().events.length,1);
 }finally{
  if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
 }
});
