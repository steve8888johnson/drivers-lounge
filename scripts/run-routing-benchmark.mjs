import{writeFile,mkdir}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{calculateTruckRoute}from'../api/truck-route.mjs';
import{routingBenchmarkCases}from'./routing-benchmark-cases.mjs';

const fold=value=>String(value||'').toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const args=new Map(process.argv.slice(2).map(value=>{const[index,...rest]=value.replace(/^--/,'').split('=');return[index,rest.join('=')||true]}));
const live=String(process.env.ROUTING_BENCHMARK_LIVE||'').toLowerCase()==='true';
if(!live){
 console.error('Live routing benchmark is opt-in because it consumes provider requests. Set ROUTING_BENCHMARK_LIVE=true.');
 process.exit(2);
}

const onlyCase=String(args.get('case')||process.env.ROUTING_BENCHMARK_CASE||'').trim();
const tier=String(args.get('tier')||process.env.ROUTING_BENCHMARK_TIER||'').trim();
const limit=Math.max(0,Number(args.get('limit')||process.env.ROUTING_BENCHMARK_LIMIT||0)||0);
const delay=Math.max(250,Number(process.env.ROUTING_BENCHMARK_DELAY_MS||500)||500);
let cases=routingBenchmarkCases.filter(item=>(!onlyCase||item.id===onlyCase)&&(!tier||item.tier===tier));
if(limit)cases=cases.slice(0,limit);
if(!cases.length){console.error('No benchmark cases match the requested filters.');process.exit(2);}

const departure=new Date(Date.now()+24*60*60*1000);departure.setHours(10,0,0,0);
const startedAt=new Date().toISOString(),results=[];

function inspectCase(testCase,result){
 const roads=(result.route?.steps||[]).map(step=>String(step.road||'')).filter(Boolean),joined=fold(roads.join(' | '));
 const forbiddenMatches=(testCase.forbiddenRoads||[]).filter(road=>joined.includes(fold(road)));
 const critical=(result.route?.criticalNotices||[]).map(item=>({code:item.code||'',title:item.title||'',sourceId:item.sourceId||''}));
 const failures=[];
 if(!result.route||!Array.isArray(result.route.geometry)||result.route.geometry.length<2)failures.push('No usable route geometry.');
 if(!(result.route?.steps||[]).length)failures.push('No turn-by-turn steps.');
 if(result.stopAudit?.status!=='clear')failures.push('Origin or destination did not resolve to a precise stop.');
 if(forbiddenMatches.length&&result.route?.guidanceEligible)failures.push(`Guidance remained eligible on forbidden road match: ${forbiddenMatches.join(', ')}.`);
 if(!forbiddenMatches.length&&critical.length)failures.push(`Unexpected critical notices: ${critical.map(item=>item.code||item.title).join(', ')}.`);
 if(!forbiddenMatches.length&&testCase.expectGuidance&&result.route?.guidanceEligible!==true)failures.push('Expected a reviewable guidance candidate but guidance was blocked.');
 if(forbiddenMatches.length&&!critical.length)failures.push('Forbidden road matched but no independent critical notice was produced.');
 return{
  status:failures.length?'failed':'passed',failures,forbiddenMatches,criticalNotices:critical,
  provider:result.route?.provider||'',providerFallback:result.route?.providerFallback||null,
  guidanceEligible:Boolean(result.route?.guidanceEligible),distanceMeters:Number(result.route?.distanceMeters||0),durationSeconds:Number(result.route?.durationSeconds||0),
  geometryPoints:result.route?.geometry?.length||0,stepCount:result.route?.steps?.length||0,namedRoads:roads,
  origin:result.origin,destination:result.destination,profileWarnings:result.profileWarnings||[],audit:result.route?.independentAudit||null
 };
}

for(const[testIndex,testCase]of cases.entries()){
 const row={id:testCase.id,tier:testCase.tier,origin:testCase.origin,destination:testCase.destination,startedAt:new Date().toISOString()};
 process.stdout.write(`[${testIndex+1}/${cases.length}] ${testCase.id} ... `);
 try{
  const result=await calculateTruckRoute({origin:{address:testCase.origin},destination:{address:testCase.destination},departureTime:departure.toISOString(),profile:testCase.profile});
  Object.assign(row,inspectCase(testCase,result));
  console.log(row.status.toUpperCase());
 }catch(error){row.status='failed';row.failures=[String(error?.message||error)];row.errorStatus=Number(error?.statusCode||0);console.log('FAILED');}
 row.finishedAt=new Date().toISOString();results.push(row);
 if(testIndex<cases.length-1)await wait(delay);
}

const summary={
 schema:'dl-routing-benchmark/v1',startedAt,finishedAt:new Date().toISOString(),providerKeysPresent:{here:Boolean(process.env.TRUCK_ROUTING_HERE_API_KEY||process.env.HERE_API_KEY),tomtom:Boolean(process.env.TRUCK_ROUTING_TOMTOM_API_KEY||process.env.TOMTOM_API_KEY)},
 caseCount:results.length,passed:results.filter(item=>item.status==='passed').length,failed:results.filter(item=>item.status==='failed').length,results
};
const output=resolve(String(args.get('output')||process.env.ROUTING_BENCHMARK_OUTPUT||`/tmp/drivers-lounge-routing-benchmark-${Date.now()}.json`));
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(summary,null,2));
console.log(`Benchmark: ${summary.passed}/${summary.caseCount} passed; ${summary.failed} failed.`);console.log(`Results: ${output}`);
if(summary.failed)process.exitCode=1;
