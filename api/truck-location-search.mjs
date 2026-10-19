import{providerSequenceFromOptions}from'./truck-route.mjs';
import{classifyResolvedStop}from'../src/assets/routing/stop-quality.mjs';

const send=(res,status,body)=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};
const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:null};
const clean=value=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
const retryable=status=>[401,403,404,408,425,429].includes(Number(status))||Number(status)>=500;

function normalized(stop){
 const lat=finite(stop.lat),lng=finite(stop.lng);if(lat===null||lng===null||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 const label=clean(stop.label);if(!label)return null;
 const resultType=clean(stop.resultType||'unknown'),confidence=Math.max(0,Math.min(1,Number(stop.confidence??1)||0));
 const quality=classifyResolvedStop({label,resultType,confidence});
 return{label,resultType,lat,lng,confidence,id:clean(stop.id),precise:quality.precise,precisionReason:quality.reason};
}

export function normalizeTomTomSearch(payload){
 return(payload?.results||[]).map(item=>{
  const position=item?.entryPoints?.[0]?.position||item?.position;
  return normalized({
   label:item?.address?.freeformAddress||item?.poi?.name,
   resultType:item?.type||item?.entityType,
   lat:position?.lat,lng:position?.lon,
   confidence:item?.matchConfidence?.score??1,id:item?.id
  });
 }).filter(Boolean);
}

export function normalizeHereSearch(payload){
 return(payload?.items||[]).map(item=>{
  const position=item?.access?.[0]||item?.position;
  return normalized({
   label:item?.title||item?.address?.label,
   resultType:item?.resultType,
   lat:position?.lat,lng:position?.lng,
   confidence:item?.scoring?.queryScore??item?.scoring?.fieldScore?.city??1,id:item?.id
  });
 }).filter(Boolean);
}

function dedupe(results){
 const seen=new Set();return results.filter(result=>{const key=`${result.label.toLowerCase()}|${result.lat.toFixed(5)}|${result.lng.toFixed(5)}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,6);
}

async function request(url,selected,fetcher){
 let response;
 try{response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json','Tracking-ID':crypto.randomUUID(),'X-Request-ID':crypto.randomUUID()}})}
 catch(error){throw Object.assign(Error(error?.name==='TimeoutError'||error?.name==='AbortError'?`${selected.label} location search timed out.`:`${selected.label} location search could not be reached.`),{retryable:true,statusCode:503});}
 if(!response.ok)throw Object.assign(Error(response.status===429?'Location search is busy. Wait and try again.':'Location search is temporarily unavailable.'),{retryable:retryable(response.status),statusCode:response.status===429?429:retryable(response.status)?503:422});
 let payload;try{payload=await response.json()}catch{throw Object.assign(Error('Location search returned an unreadable response.'),{retryable:true,statusCode:503});}
 return selected.id==='tomtom'?normalizeTomTomSearch(payload):normalizeHereSearch(payload);
}

export async function searchTruckLocations(query,{fetcher=fetch,providers}={}){
 const text=clean(query);if(text.length<3||text.length>200)throw Object.assign(Error('Enter at least three characters of a U.S. address, facility or place.'),{statusCode:422});
 const sequence=providerSequenceFromOptions({providers});if(!sequence.length)throw Object.assign(Error('Commercial location search is not configured yet.'),{statusCode:503});
 let lastError;
 for(let index=0;index<sequence.length;index++){
  const selected=sequence[index],url=selected.id==='tomtom'?new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(text)}.json`):new URL('https://geocode.search.hereapi.com/v1/geocode');
  if(selected.id==='tomtom'){
   url.searchParams.set('key',selected.key);url.searchParams.set('limit','6');url.searchParams.set('countrySet','US');url.searchParams.set('language','en-US');url.searchParams.set('typeahead','true');
  }else{
   url.searchParams.set('q',text);url.searchParams.set('limit','6');url.searchParams.set('lang','en-US');url.searchParams.set('in','countryCode:USA');url.searchParams.set('apiKey',selected.key);
  }
  try{return{provider:selected.label,query:text,results:dedupe(await request(url,selected,fetcher))}}
  catch(error){lastError=error;if(index<sequence.length-1&&error.retryable)continue;throw error;}
 }
 throw lastError||Object.assign(Error('Location search failed.'),{statusCode:503});
}

async function readBody(req){
 let body=req.body;if(body&&typeof body==='object')return body;let raw=typeof body==='string'?body:'';
 if(!raw){for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw Error('Request too large.')}}
 if(raw.length>2048)throw Error('Request too large.');return JSON.parse(raw||'{}');
}

export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST.'});}
 const origin=req.headers.origin,host=req.headers.host;let sameOrigin=false;try{sameOrigin=!origin||new URL(origin).host===host}catch{/* Reject malformed origin. */}
 if(!sameOrigin)return send(res,403,{error:'Same-origin request required.'});
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Send JSON.'});
 if(Number(req.headers['content-length']||0)>2048)return send(res,413,{error:'Request too large.'});
 try{const body=await readBody(req);return send(res,200,await searchTruckLocations(body?.query))}
 catch(error){return send(res,Number(error?.statusCode)||(/Unexpected token|JSON/.test(error?.message||'')?400:422),{error:String(error?.message||'Unable to search locations.')});}
}
