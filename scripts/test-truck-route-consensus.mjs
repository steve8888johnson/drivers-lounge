import test from'node:test';
import assert from'node:assert/strict';
import{calculateConsensusTruckRoute}from'../api/truck-route-consensus.mjs';

const providers=[{id:'here',label:'HERE Routing API v8',key:'here-secret'},{id:'tomtom',label:'TomTom Routing API v1',key:'tomtom-secret'}];
const geometry=[[41.14,-104.82],[40.5,-104.9],[39.78,-104.85]];
const makeResult=(provider,overrides={})=>({
 origin:{lat:41.14,lng:-104.82,label:'Exact origin',resultType:'coordinate',confidence:1},
 destination:{lat:39.78,lng:-104.85,label:'Exact destination',resultType:'coordinate',confidence:1},
 profileWarnings:[],
 route:{provider,guidanceEligible:true,distanceMeters:100000,durationSeconds:5400,geometry,steps:[{road:'I-25',instruction:'Continue',geometryIndex:0}],notices:[],criticalNotices:[],...overrides}
});

test('single configured provider returns an explicit unverified cross-check state',async()=>{
 const calculator=async()=>makeResult('TomTom Routing API v1');
 const result=await calculateConsensusTruckRoute({origin:{address:'A'},destination:{address:'B'}},{calculator,providers:[providers[1]]});
 assert.equal(result.crossCheck.status,'single-provider');
 assert.equal(result.route.guidanceEligible,true);
 assert.equal(result.route.notices.at(-1).code,'singleProviderRoute');
 assert.equal(JSON.stringify(result).includes('tomtom-secret'),false);
});

test('two aligned providers return a high-confidence route candidate',async()=>{
 const calls=[];
 const calculator=async(input,{providers:selected})=>{
  calls.push({input,provider:selected[0].id});
  if(selected[0].id==='here')return makeResult('HERE Routing API v8');
  return makeResult('TomTom Routing API v1',{distanceMeters:102000,durationSeconds:5500,geometry:geometry.map(([lat,lng],index)=>[lat+(index?0.0003:0),lng])});
 };
 const result=await calculateConsensusTruckRoute({origin:{address:'A'},destination:{address:'B'},profile:{}},{calculator,providers});
 assert.equal(calls.length,2);
 assert.equal(calls[1].input.origin.lat,41.14);
 assert.equal(calls[1].input.destination.lng,-104.85);
 assert.equal(result.crossCheck.status,'aligned');
 assert.equal(result.route.guidanceEligible,true);
 assert.equal(JSON.stringify(result).includes('here-secret'),false);
});

test('provider disagreement fails closed',async()=>{
 const calculator=async(input,{providers:selected})=>selected[0].id==='here'?makeResult('HERE Routing API v8'):makeResult('TomTom Routing API v1',{distanceMeters:190000,durationSeconds:9000,geometry:[[41.14,-104.82],[40.4,-99],[39.78,-104.85]],steps:[{road:'US-287'}]});
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
