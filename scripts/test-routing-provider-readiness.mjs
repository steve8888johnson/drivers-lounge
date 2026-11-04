import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import healthHandler from'../api/truck-route-health.mjs';
import{inspectRoutingCredential,readRoutingProviderReadiness}from'../src/assets/routing/provider-readiness.mjs';

const HERE='here_abcdefghijklmnopqrstuvwxyz_123456789';
const TOMTOM='tomtom_abcdefghijklmnopqrstuvwxyz_987654321';
const policy=(overrides={})=>({environment:'preview',requireCrossCheck:false,globalDisabled:false,...overrides});

test('credential inspection rejects missing, placeholder, malformed and short values',()=>{
 assert.equal(inspectRoutingCredential('').state,'missing');
 assert.equal(inspectRoutingCredential('YOUR_HERE_API_KEY').state,'placeholder');
 assert.equal(inspectRoutingCredential('short').state,'malformed');
 assert.equal(inspectRoutingCredential(`valid-looking-key\nsecret`).state,'malformed');
 assert.equal(inspectRoutingCredential(HERE).valid,true);
});

test('missing providers remain fail-closed',()=>{
 const value=readRoutingProviderReadiness({},policy());
 assert.equal(value.status,'credentials_required');assert.equal(value.previewEligible,false);assert.equal(value.activeProviderCount,0);
});

test('single provider is preview-eligible but never release-eligible',()=>{
 const value=readRoutingProviderReadiness({TOMTOM_API_KEY:TOMTOM},policy());
 assert.equal(value.status,'single_provider_unverified');assert.equal(value.previewEligible,true);
 assert.equal(value.crossCheckConfigured,false);assert.equal(value.releaseEligible,false);
 assert.equal(value.primaryProvider.label,'TomTom Routing API v1');
});

test('two distinct valid providers satisfy the independent release gate',()=>{
 const value=readRoutingProviderReadiness({TRUCK_ROUTING_HERE_API_KEY:HERE,TRUCK_ROUTING_TOMTOM_API_KEY:TOMTOM},policy({requireCrossCheck:true}));
 assert.equal(value.crossCheckConfigured,true);assert.equal(value.releaseEligible,true);assert.equal(value.guidanceAllowed,true);
 assert.equal(value.independentProviderCount,2);assert.deepEqual(value.blockers,[]);
});

test('placeholder, conflicting aliases and duplicate provider values fail closed',()=>{
 const placeholder=readRoutingProviderReadiness({HERE_API_KEY:'YOUR_HERE_API_KEY'},policy());
 assert.equal(placeholder.previewEligible,false);assert.ok(placeholder.blockers.includes('invalid_provider_credentials'));
 const conflict=readRoutingProviderReadiness({TRUCK_ROUTING_HERE_API_KEY:HERE,HERE_API_KEY:TOMTOM},policy());
 assert.ok(conflict.blockers.includes('conflicting_provider_aliases'));assert.equal(conflict.previewEligible,false);
 const duplicate=readRoutingProviderReadiness({HERE_API_KEY:HERE,TOMTOM_API_KEY:HERE},policy());
 assert.ok(duplicate.blockers.includes('duplicate_provider_credentials'));assert.equal(duplicate.crossCheckConfigured,false);
});

test('provider disable policy removes that engine from operational readiness',()=>{
 const value=readRoutingProviderReadiness({HERE_API_KEY:HERE,TOMTOM_API_KEY:TOMTOM},policy({requireCrossCheck:true,disabledProviders:['here']}));
 assert.equal(value.validProviderCount,2);assert.equal(value.activeProviderCount,1);assert.equal(value.crossCheckConfigured,false);
 assert.ok(value.blockers.includes('routing_provider_disabled'));assert.ok(value.blockers.includes('independent_cross_check_required'));
});

test('production and kill-switch policy independently block unsafe guidance',()=>{
 const production=readRoutingProviderReadiness({TOMTOM_API_KEY:TOMTOM},policy({environment:'production',requireCrossCheck:true}));
 assert.equal(production.guidanceAllowed,false);assert.ok(production.blockers.includes('independent_cross_check_required'));
 const disabled=readRoutingProviderReadiness({HERE_API_KEY:HERE,TOMTOM_API_KEY:TOMTOM},policy({globalDisabled:true,requireCrossCheck:true}));
 assert.equal(disabled.guidanceAllowed,false);assert.ok(disabled.blockers.includes('kill_switch_active'));
});

function responseFixture(){
 const fixture={headers:{},statusCode:0,body:null,setHeader(name,value){this.headers[name]=value;},end(value){this.body=JSON.parse(value);}};
 return fixture;
}

test('health endpoint reports readiness without ever serializing credentials',()=>{
 const saved={...process.env};
 try{
  process.env.VERCEL_ENV='production';process.env.TRUCK_ROUTING_HERE_API_KEY=HERE;process.env.TRUCK_ROUTING_TOMTOM_API_KEY=TOMTOM;
  delete process.env.HERE_API_KEY;delete process.env.TOMTOM_API_KEY;
  const res=responseFixture();healthHandler({method:'GET'},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.crossCheckConfigured,true);assert.equal(res.body.readiness.releaseEligible,true);
  const serialized=JSON.stringify(res.body);assert.equal(serialized.includes(HERE),false);assert.equal(serialized.includes(TOMTOM),false);
 }finally{
  for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];
  for(const[key,value]of Object.entries(saved))process.env[key]=value;
 }
});

test('live benchmark uses consensus mode by default and permits explicit single-provider diagnostics',async()=>{
 const source=await readFile(new URL('./run-routing-benchmark.mjs',import.meta.url),'utf8');
 assert.match(source,/calculateConsensusTruckRoute/);assert.match(source,/ROUTING_BENCHMARK_MODE/);
 assert.match(source,/single-provider/);assert.match(source,/crossCheckStatus/);
});
