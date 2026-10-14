import {createHash} from 'node:crypto';
import {prepareHereRequest,reviewHereCandidate} from '../src/assets/truck-provider-review.mjs';
const hold=code=>({status:'HOLD',guidanceAllowed:false,reasons:[{code}]});
// Server-only building block, not an HTTP endpoint. Caller must enforce identity,
// rate limits, spending approval and trusted current-trip ownership before enabling.
export async function requestTruckCandidate(input,{enabled=false,apiKey,fetchImpl=fetch,clock=Date.now,currentInput=()=>input,timeoutMs=10000,maxBytes=1048576}={}){
 if(enabled!==true)return hold('CONNECTION_DISABLED');
 if(typeof apiKey!=='string'||!apiKey.trim())return hold('PROVIDER_NOT_CONFIGURED');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>1048576)return hold('INVALID_SERVER_LIMITS');
 let prepared,fingerprint,trip;const createdAt=clock();
 const signature=x=>{const candidate=prepareHereRequest({...x,now:createdAt});return createHash('sha256').update(JSON.stringify([candidate.query,candidate.vehicleReviewBinding])).digest('hex');};
 try{
  prepared=prepareHereRequest({...input,now:createdAt});fingerprint=signature(input);
  // Snapshot from the validated outgoing request, not mutable browser-supplied review evidence.
  const query=new URLSearchParams(prepared.query);
  trip=Object.fromEntries(['origin','destination'].map(name=>{const [lat,lng]=query.get(name).split(',').map(Number);return [name,{lat,lng}];}));
 }catch{return hold('INVALID_TRUCK_OR_TRIP');}
 const controller=new AbortController();let timer;
 const run=async()=>{
  const url=new URL(prepared.endpoint);url.search=prepared.query;url.searchParams.set('apiKey',apiKey);
  const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok||response.redirected)return hold('PROVIDER_UNAVAILABLE');
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))return hold('INVALID_PROVIDER_RESPONSE');
  const length=response.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))return hold('RESPONSE_TOO_LARGE');
  if(!response.body)return hold('INVALID_PROVIDER_RESPONSE');
  const reader=response.body.getReader();const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();return hold('RESPONSE_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
  let payload;try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{return hold('INVALID_PROVIDER_RESPONSE');}
  let currentFingerprint;try{currentFingerprint=signature(currentInput());}catch{return hold('REQUEST_CHANGED');}
  return reviewHereCandidate(payload,{fingerprint,trip,transportMode:'truck',scope:'standard-nonhazmat',createdAt,expiresAt:createdAt+timeoutMs},{fingerprint:currentFingerprint,now:clock()});
 };
 try{return await Promise.race([run(),new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(hold('PROVIDER_TIMEOUT'));},timeoutMs);})]);}
 catch{return hold('PROVIDER_UNAVAILABLE');}
 finally{clearTimeout(timer);controller.abort();}
}
