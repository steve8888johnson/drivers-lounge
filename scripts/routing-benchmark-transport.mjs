const ROUTE_PATH='/api/truck-route-consensus';
const HEALTH_PATH='/api/truck-route-health';
const MAX_RESPONSE_BYTES=2_000_000;
const PREVIEW_HOST=/^drivers-lounge-[a-z0-9-]+-steves-projects-c46af6ff\.vercel\.app$/i;

const clean=value=>String(value??'').trim();
const allowedHost=host=>host==='driverslounge.app'||host.endsWith('.driverslounge.app')||PREVIEW_HOST.test(host);

export function normalizeBenchmarkEndpoint(value){
 const raw=clean(value);if(!raw)throw Error('A deployed benchmark endpoint is required.');
 let url;try{url=new URL(raw)}catch{throw Error('ROUTING_BENCHMARK_ENDPOINT must be a valid HTTPS URL.');}
 if(url.protocol!=='https:')throw Error('ROUTING_BENCHMARK_ENDPOINT must use HTTPS.');
 if(url.username||url.password)throw Error('ROUTING_BENCHMARK_ENDPOINT must not contain credentials.');
 if(url.search||url.hash)throw Error('ROUTING_BENCHMARK_ENDPOINT must not contain a query string or fragment.');
 if(!allowedHost(url.hostname))throw Error('ROUTING_BENCHMARK_ENDPOINT must be a Drivers Lounge beta or preview host.');
 const path=url.pathname.replace(/\/+$/,'')||'/';
 if(path!=='/'&&path!==ROUTE_PATH)throw Error(`ROUTING_BENCHMARK_ENDPOINT path must be ${ROUTE_PATH} or /.`);
 const origin=url.origin;
 return Object.freeze({
  schema:'dl-routing-benchmark-endpoint/v1',origin,
  routeUrl:`${origin}${ROUTE_PATH}`,healthUrl:`${origin}${HEALTH_PATH}`,
  host:url.hostname,path:ROUTE_PATH
 });
}

async function readJsonResponse(response,{maxBytes=MAX_RESPONSE_BYTES}={}){
 const length=Number(response.headers?.get?.('content-length')||0);
 if(length>maxBytes)throw Object.assign(Error('Benchmark endpoint response is too large.'),{statusCode:502});
 const type=String(response.headers?.get?.('content-type')||'').toLowerCase();
 if(!type.includes('application/json'))throw Object.assign(Error('Benchmark endpoint did not return JSON.'),{statusCode:502});
 const text=await response.text();
 if(Buffer.byteLength(text)>maxBytes)throw Object.assign(Error('Benchmark endpoint response is too large.'),{statusCode:502});
 let body;try{body=JSON.parse(text)}catch{throw Object.assign(Error('Benchmark endpoint returned invalid JSON.'),{statusCode:502});}
 if(!response.ok){
  const message=clean(body?.error||body?.message||`Benchmark endpoint failed with HTTP ${response.status}.`).slice(0,500);
  throw Object.assign(Error(message||'Benchmark endpoint request failed.'),{statusCode:response.status});
 }
 return body;
}

async function requestJson(url,init={},fetchImpl=globalThis.fetch){
 if(typeof fetchImpl!=='function')throw Error('Fetch is unavailable for deployed routing benchmarks.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90_000);
 try{
  const headers={Accept:'application/json',...(init.headers||{})};
  const response=await fetchImpl(url,{...init,headers,redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal});
  return await readJsonResponse(response);
 }catch(error){
  if(error?.name==='AbortError')throw Object.assign(Error('Benchmark endpoint timed out.'),{statusCode:504});
  throw error;
 }finally{clearTimeout(timeout);}
}

export async function fetchDeployedRoutingHealth(endpoint,{fetchImpl=globalThis.fetch}={}){
 const target=typeof endpoint==='string'?normalizeBenchmarkEndpoint(endpoint):endpoint;
 const body=await requestJson(target.healthUrl,{method:'GET'},fetchImpl);
 if(body?.readiness?.schema!=='dl-routing-provider-readiness/v1')throw Object.assign(Error('Benchmark endpoint returned an unsupported readiness schema.'),{statusCode:502});
 return body;
}

export async function calculateDeployedTruckRoute(input,{endpoint,fetchImpl=globalThis.fetch}={}){
 const target=typeof endpoint==='string'?normalizeBenchmarkEndpoint(endpoint):endpoint;
 if(!target?.routeUrl)throw Error('A normalized deployed benchmark endpoint is required.');
 return requestJson(target.routeUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)},fetchImpl);
}

export const routingBenchmarkTransportConstants=Object.freeze({ROUTE_PATH,HEALTH_PATH,MAX_RESPONSE_BYTES});
