import{writeFile,mkdir}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{calculateTruckRoute}from'../api/truck-route.mjs';
import{calculateConsensusTruckRoute}from'../api/truck-route-consensus.mjs';
import{validateTruckProfile}from'../src/assets/routing/core.mjs';
import{readRoutingPolicy}from'../src/assets/routing/routing-policy.mjs';
import{readRoutingProviderReadiness}from'../src/assets/routing/provider-readiness.mjs';
import{routingBenchmarkCases}from'./routing-benchmark-cases.mjs';

const fold=value=>String(value||'').toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const args=new Map(process.argv.slice(2).map(value=>{const[index,...rest]=value.replace(/^--/,'').split('=');return[index,rest.join('=')||true]}));
const live=String(process.env.ROUTING_BENCHMARK_LIVE||'').toLowerCase()==='true';
if(!live){
 console.error('Live routing benchmark is opt-in because it consumes provider requests. Set ROUTING_BENCHMARK_LIVE=true.');
 process.exit(2);
}

const modeInput=String(args.get('mode')||process.env.ROUTING_BENCHMARK_MODE||'consensus').trim().toLowerCase();
const mode=modeInput==='single'?'single-provider':modeInput;
if(!['consensus','single-provider'].includes(mode)){
 console.error('ROUTING_BENCHMARK_MODE must be consensus or single-provider.');process.exit(2);
}
const onlyCase=String(args.get('case')||process.env.ROUTING_BENCHMARK_CASE||'').trim();
const tier=String(args.get('tier')||process.env.ROUTING_BENCHMARK_TIER||'').trim();
const limit=Math.max(0,Number(args.get('limit')||process.env.ROUTING_BENCHMARK_LIMIT||0)||0);
const delay=Math.max(250,Number(process.env.ROUTING_BENCHMARK_DELAY_MS||500)||500);
let cases=routingBenchmarkCases.filter(item=>(!onlyCase||item.id===onlyCase)&&(!tier||item.tier===tier));
if(limit)cases=cases.slice(0,limit);
if(!cases.length){console.error('No benchmark cases match the requested filters.');process.exit(2);}

const providerCases=cases.filter(item=>!item.expectProfileBlocked);
const policy=readRoutingPolicy({...process.env,DL_REQUIRE_ROUTE_CROSS_CHECK:mode==='consensus'?'true':'false'});
const readiness=readRoutingProviderReadiness(process.env,policy);
if(providerCases.length&&mode==='consensus'&&!readiness.releaseEligible){
 console.error(`Consensus benchmark blocked: ${readiness.blockers.join(', ')||readiness.status}. Configure two distinct valid routing providers first.`);process.exit(2);
}
if(providerCases.length&&mode==='single-provider'&&!readiness.previewEligible){
 console.error(`Single-provider benchmark blocked: ${readiness.blockers.join(', ')||readiness.status}. Configure one valid routing provider first.`);process.exit(2);
}
if(mode==='single-provider')console.warn('Single-provider mode is diagnostic only and is not release evidence.');

const departure=new Date(Date.now()+24*60*60*1000);departure.setHours(10,0,0,0);
const startedAt=new Date().toISOString(),results=[];

function inspectCase(testCase,result){
 const roads=(result.route?.steps||[]).map(step=>String(step.road||'')).filter(Boolean),joined=fold(roads.join(' | '));
 const forbiddenMatches=(testCase.forbiddenRoads||[]).filter(road=>joined.includes(fold(road)));
 const critical=(result.route?.criticalNotices||[]).map(item=>({code:item.code||'',title:item.title||'',sourceId:item.sourceId||''}));
 const crossCheck=result.route?.crossCheck||result.crossCheck||{},crossCheckStatus=String(crossCheck.status||'not-requested');
 const failures=[];
 if(!result.route||!Array.isArray(result.route.geometry)||result.route.geometry.length<2)failures.push('No usable route geometry.');
 if(!(result.route?.steps||[]).length)failures.push('No turn-by-turn steps.');
 if(result.stopAudit?.status!=='clear')failures.push('Origin or destination did not resolve to a precise stop.');
 if(mode==='consensus'&&testCase.expectGuidance&&crossCheckStatus!=='aligned')failures.push(`Independent providers did not align: ${crossCheckStatus}.`);
 if(forbiddenMatches.length&&result.route?.guidanceEligible)failures.push(`Guidance remained eligible on forbidden road match: ${forbiddenMatches.join(', ')}.`);
 if(!forbiddenMatches.length&&critical.length)failures.push(`Unexpected critical notices: ${critical.map(item=>item.code||item.title).join(', ')}.`);
 if(!forbiddenMatches.length&&testCase.expectGuidance&&result.route?.guidanceEligible!==true)failures.push('Expected a reviewable guidance candidate but guidance was blocked.');
 if(forbiddenMatches.length&&!critical.length)failures.push('Forbidden road matched but no independent critical notice was produced.');
 return{
  status:failures.length?'failed':'passed',failures,forbiddenMatches,criticalNotices:critical,providerRequestMade:true,
  provider:result.route?.provider||'',providerFallback:result.route?.providerFallback||null,
  crossCheckStatus,crossCheckConfidence:String(crossCheck.confidence||'unknown'),
  guidanceEligible:Boolean(result.route?.guidanceEligible),distanceMeters:Number(result.route?.distanceMeters||0),durationSeconds:Number(result.route?.durationSeconds||0),
  geometryPoints:result.route?.geometry?.length||0,stepCount:result.route?.steps?.length||0,stopAudit:result.stopAudit||null
 };
}

function inspectProfileGate(testCase){
 const validation=validateTruckProfile(testCase.profile),errors=validation.errors||[],combined=errors.join(' '),expected=String(testCase.expectedError||'').trim();
 const failures=[];
 if(validation.ready)failures.push('Profile unexpectedly passed the standard-route safety gate.');
 if(expected&&!new RegExp(expected,'i').test(combined))failures.push(`Expected profile error matching ${expected}, received: ${combined||'none'}.`);
 return{
  status:failures.length?'failed':'passed',failures,providerRequestMade:false,
  guidanceEligible:false,profileErrors:errors,profileWarnings:validation.warnings||[],
  criticalNotices:[],forbiddenMatches:[],provider:'none — local safety gate',crossCheckStatus:'not-requested',
  geometryPoints:0,stepCount:0,distanceMeters:0,durationSeconds:0
 };
}

for(const[testIndex,testCase]of cases.entries()){
 const row={id:testCase.id,tier:testCase.tier,origin:testCase.origin,destination:testCase.destination,startedAt:new Date().toISOString()};
 process.stdout.write(`[${testIndex+1}/${cases.length}] ${testCase.id} ... `);
 try{
  if(testCase.expectProfileBlocked)Object.assign(row,inspectProfileGate(testCase));
  else{
   const input={origin:{address:testCase.origin},destination:{address:testCase.destination},departureTime:departure.toISOString(),profile:testCase.profile};
   const result=mode==='consensus'?await calculateConsensusTruckRoute(input,{policy}):await calculateTruckRoute(input);
   Object.assign(row,inspectCase(testCase,result));
  }
  console.log(row.status.toUpperCase());
 }catch(error){row.status='failed';row.failures=[String(error?.message||error)];row.errorStatus=Number(error?.statusCode||0);row.providerRequestMade=!testCase.expectProfileBlocked;console.log('FAILED');}
 row.finishedAt=new Date().toISOString();results.push(row);
 if(testIndex<cases.length-1&&!testCase.expectProfileBlocked)await wait(delay);
}

const summary={
 schema:'dl-routing-benchmark/v2',mode,startedAt,finishedAt:new Date().toISOString(),
 providerReadiness:{status:readiness.status,validProviderCount:readiness.validProviderCount,activeProviderCount:readiness.activeProviderCount,independentProviderCount:readiness.independentProviderCount,crossCheckConfigured:readiness.crossCheckConfigured,releaseEligible:readiness.releaseEligible,providers:readiness.providers.map(({id,label,state,source,disabled,active,issues})=>({id,label,state,source,disabled,active,issues})),blockers:readiness.blockers},
 providerKeysPresent:Object.fromEntries(readiness.providers.map(item=>[item.id,item.configured])),
 caseCount:results.length,providerRequestCases:results.filter(item=>item.providerRequestMade).length,profileGateCases:results.filter(item=>!item.providerRequestMade).length,
 passed:results.filter(item=>item.status==='passed').length,failed:results.filter(item=>item.status==='failed').length,results
};
const output=resolve(String(args.get('output')||process.env.ROUTING_BENCHMARK_OUTPUT||`/tmp/drivers-lounge-routing-benchmark-${Date.now()}.json`));
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(summary,null,2));
console.log(`Benchmark (${mode}): ${summary.passed}/${summary.caseCount} passed; ${summary.failed} failed.`);console.log(`Provider calls: ${summary.providerRequestCases}; local profile gates: ${summary.profileGateCases}.`);console.log(`Results: ${output}`);
if(summary.failed)process.exitCode=1;
