import test from'node:test';
import assert from'node:assert/strict';
import{attachRouteSafetyRecord,buildRouteSafetyRecord,canonicalJson,sha256Hex}from'../src/assets/routing/route-safety-record.mjs';

const input={profile:{heightInches:162,widthInches:102,currentWeightLb:80000,axleCount:5}};
const result=()=>({
 origin:{lat:41.17122,lng:-104.81908,label:'Private origin label',resultType:'Point Address',confidence:1},
 destination:{lat:39.78274,lng:-104.84711,label:'Private destination label',resultType:'Point Address',confidence:1},
 route:{provider:'TomTom Routing API v1',calculatedAt:'2026-11-03T12:00:00.000Z',distanceMeters:174158,durationSeconds:6137,guidanceEligible:true,geometry:[[41.17122,-104.81908],[39.78274,-104.84711]],steps:[{instruction:'Continue',road:'I-25',geometryIndex:0,lengthMeters:174158}],notices:[],criticalNotices:[],crossCheck:{status:'aligned',confidence:'verified',providers:['HERE','TomTom'],configuredProviders:[{label:'HERE'},{label:'TomTom'}]},policyDecision:{policyVersion:'test',environment:'test',requireCrossCheck:true}}
});
const policy={version:'test',environment:'test',requireCrossCheck:true,safetyRecordTtlMinutes:60};

test('safety records are deterministic, privacy-minimized and expiring',async()=>{
 const now=new Date('2026-11-03T12:00:00.000Z'),a=await buildRouteSafetyRecord({input,result:result(),policy,now,revision:'abc'}),b=await buildRouteSafetyRecord({input,result:result(),policy,now,revision:'abc'});
 assert.equal(a.recordHash,b.recordHash);assert.equal(a.recordId,b.recordId);assert.equal(a.decision,'allowed');assert.equal(a.expiresAt,'2026-11-03T13:00:00.000Z');
 const serialized=JSON.stringify(a);assert.equal(serialized.includes('Private origin label'),false);assert.equal(serialized.includes('Private destination label'),false);
 assert.match(a.profileHash,/^[a-f0-9]{64}$/);assert.match(a.routeHash,/^[a-f0-9]{64}$/);
});

test('blocked routes produce blocked records with blocker codes',async()=>{
 const blocked=result();blocked.route.guidanceEligible=false;blocked.route.criticalNotices=[{code:'routingKillSwitchActive',title:'Stopped',severity:'critical',blocking:true}];
 const record=await buildRouteSafetyRecord({input,result:blocked,policy,now:new Date('2026-11-03T12:00:00Z')});assert.equal(record.decision,'blocked');assert.deepEqual(record.blockers,['routingKillSwitchActive']);
});

test('record attaches to both route and top-level response',async()=>{
 const attached=await attachRouteSafetyRecord(result(),input,policy,{now:new Date('2026-11-03T12:00:00Z')});assert.equal(attached.route.safetyRecord.recordId,attached.safetyRecord.recordId);
});

test('canonical hashing ignores object key order',async()=>{
 assert.equal(canonicalJson({b:2,a:1}),canonicalJson({a:1,b:2}));assert.equal(await sha256Hex({b:2,a:1}),await sha256Hex({a:1,b:2}));
});
