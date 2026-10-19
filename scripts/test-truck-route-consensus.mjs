import test from'node:test';
import assert from'node:assert/strict';
import{calculateConsensusTruckRoute}from'../api/truck-route-consensus.mjs';
import{distanceMeters}from'../src/assets/routing/core.mjs';

const providers=[{id:'here',label:'HERE Routing API v8',key:'here-secret'},{id:'tomtom',label:'TomTom Routing API v1',key:'tomtom-secret'}];
const start=[41.14,-104.82],end=[39.78,-104.85];
const geometry=Array.from({length:20},(_,index)=>{const ratio=index/19;return[start[0]+(end[0]-start[0])*ratio,start[1]+(end[1]-start[1])*ratio]});
const routeDistance=Math.round(geometry.slice(1).reduce((sum,point,index)=>sum+distanceMeters(geometry[index],point),0));
const makeResult=(provider,overrides={})=>({
 origin:{lat:start[0],lng:start[1],label:'Exact origin',resultType:'coordinate',confidence:1},
 destination:{lat:end[0],lng:end[1],label:'Exact destination',resultType:'coordinate',confidence:1},
 profileWarnings:[],
 route:{provider,calculatedAt:new Date().toISOString(),guidanceEligible:true,distanceMeters:routeDistance,durationSeconds:7200,geometry,steps:[{road:'I-25',instruction:'Depart',geometryIndex:0},{road:'I-25',instruction:'Continue',geometryIndex:10},{road:'I-25',instruction:'Arrive',geometryIndex:19}],notices:[],criticalNotices:[],...overrides}
});

test('single configured provider returns an explicit unverified cross-check state',async()=>{
 const calculator=async()=>makeResult('TomTom Routing API v1');
 const result=await calculateConsensusTruckRoute({origin:{address:'A'},destination:{address:'B'}},{calculator,providers:[providers[1]]});
 assert.equal(result.crossCheck.status,'single-provider');
 assert.equal(result.route.guidanceEligible,true);
 assert.equal(result.route.notices.at(-1).code,'singleProviderRoute');
 assert.equal(result.integrityAudit.status,'clear');
 assert.equal(JSON.stringify(result).includes('tomtom-secret'),false);
});

test('two aligned providers return a high-confidence route candidate',async()=>{
 const calls=[];
 const calculator=async(input,{providers:selected})=>{
  calls.push({input,provider:selected[0].id});
  if(selected[0].id==='here')return makeResult('HERE Routing API v8');
  const secondaryGeometry=geometry.map(([lat,lng],index)=>index===0||index===geometry.length-1?[lat,lng]:[lat+0.0003,lng]);
  return makeResult('TomTom Routing API v1',{distanceMeters:Math.round(routeDistance*1.02),durationSeconds:7350,geometry:secondaryGeometry});
 };
 const result=await calculateConsensusTruckRoute({origin:{address:'A'},destination:{address:'B'},profile:{}},{calculator,providers});
 assert.equal(calls.length,2);
 assert.equal(calls[1].input.origin.lat,start[0]);
 assert.equal(calls[1].input.destination.lng,end[1]);
 assert.equal(result.crossCheck.status,'aligned');
 assert.equal(result.route.guidanceEligible,true);
 assert.equal(result.crossCheck.primaryIntegrity.status,'clear');
 assert.equal(result.crossCheck.secondaryIntegrity.status,'clear');
 assert.equal(JSON.stringify(result).includes('here-secret'),false);
});

test('provider disagreement fails closed',async()=>{
 const calculator=async(input,{providers:selected})=>selected[0].id==='here'?makeResult('HERE Routing API v8'):makeResult('TomTom Routing API v1',{distanceMeters:190000,durationSeconds:9000,geometry:[[start[0],start[1]],[40.4,-99],[end[0],end[1]]],steps:[{road:'US-287',geometryIndex:0},{road:'US-287',geometryIndex:2}]});
 const result=await calculateConsensusTruckRoute({origin:{address:'A'},destination:{address:'B'}},{calculator,providers});
 assert.equal(result.crossCheck.status,'blocked');
 assert.equal(result.route.guidanceEligible,false);
 assert.ok(result.route.criticalNotices.some(item=>item.code==='providerRouteDisagreement'));
});

test('secondary provider outage blocks guidance instead of silently accepting primary',async()=>{
 const calculator=async(input,{providers:selected})=>{if(selected[0].id==='tomtom')throw Object.assign(Error('secondary timeout'),{statusCode:503});return makeResult('HERE Routing API v8');};
 const result=await calculateConsensusTruckRoute({origin:{address:'A'},destination:{address:'B'}},{calculator,providers});
 assert.equal(result.crossCheck.status,'blocked');
 assert.equal(result.route.guidanceEligible,false);
 assert.equal(result.route.criticalNotices.at(-1).code,'secondaryProviderUnavailable');
});

test('no configured provider fails closed',async()=>{
 await assert.rejects(()=>calculateConsensusTruckRoute({}, {providers:[],calculator:async()=>null}),/not configured/i);
});
