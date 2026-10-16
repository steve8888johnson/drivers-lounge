import { createHash } from 'node:crypto';
import { prepareTomTomRequest, reviewTomTomCandidate } from './tomtom-candidate.mjs';
import { reviewTomTomGuidance } from './tomtom-guidance.mjs';
const hold = code => ({status:'HOLD',guidanceAllowed:false,provider:'tomtom',reasons:[{code}]});

// Not an HTTP endpoint. Only a trusted server caller may supply account evidence,
// the current trip and the key. The account must remain Free with no paid usage.
export async function requestTomTomCandidate(input, {
  enabled=false, freePlanVerified=false, apiKey, fetchImpl=fetch,
  currentInput=()=>input, clock=Date.now, timeoutMs=10000, maxBytes=1048576,
  includeInstructionDiagnostics=false
} = {}) {
  if (enabled !== true) return hold('CONNECTION_DISABLED');
  if (freePlanVerified !== true) return hold('FREE_PLAN_NOT_VERIFIED');
  // Secret form pastes can include outer whitespace; never alter the key itself.
  const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!normalizedKey || /\s/.test(normalizedKey)) return hold('PROVIDER_NOT_CONFIGURED');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>10000 || !Number.isSafeInteger(maxBytes) || maxBytes<1 || maxBytes>1048576) return hold('INVALID_SERVER_LIMITS');
  let prepared, fingerprint, trip, departure;
  const createdAt = clock();
  const signature = candidate => createHash('sha256').update(JSON.stringify([candidate.endpoint,candidate.query,candidate.vehicleReviewBinding])).digest('hex');
  try {
    prepared = prepareTomTomRequest({...input,now:createdAt},{instructions:includeInstructionDiagnostics===true}); fingerprint = signature(prepared);
    trip = structuredClone({origin:input.origin,destination:input.destination}); departure = input.departure;
  } catch { return hold('INVALID_TRUCK_OR_TRIP'); }
  const controller = new AbortController(); let timer;
  const run = async () => {
    const url = new URL(prepared.endpoint); url.search = prepared.query; url.searchParams.set('key',normalizedKey);
    const response = await fetchImpl(url,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
    // No retry, alternate key, paid top-up or car fallback on exhausted free quota.
    if (response.status === 429) return hold('FREE_QUOTA_OR_RATE_LIMIT');
    if ([401,403].includes(response.status)) return hold('PROVIDER_ACCESS_REJECTED');
    if (!response.ok || response.redirected) return hold('PROVIDER_UNAVAILABLE');
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'') || !response.body) return hold('INVALID_PROVIDER_RESPONSE');
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length)>maxBytes)) return hold('RESPONSE_TOO_LARGE');
    const reader=response.body.getReader(), chunks=[];let size=0;
    try {
      while(true) {
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;if(size>maxBytes){await reader.cancel();return hold('RESPONSE_TOO_LARGE');}chunks.push(value);
      }
    } finally {reader.releaseLock();}
    let payload;
    try {payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{return hold('INVALID_PROVIDER_RESPONSE');}
    const finishedAt=clock();
    if (!Number.isFinite(finishedAt) || finishedAt<createdAt || finishedAt>=createdAt+timeoutMs) return hold('REQUEST_EXPIRED');
    try {if(signature(prepareTomTomRequest({...currentInput(),now:finishedAt},{instructions:includeInstructionDiagnostics===true}))!==fingerprint)return hold('REQUEST_CHANGED');}
    catch{return hold('REQUEST_CHANGED');}
    const result=reviewTomTomCandidate(payload,{query:prepared.query,trip,departure});
    if(includeInstructionDiagnostics===true && result.structurePassed===true) {
      const guidance=reviewTomTomGuidance(payload.routes[0]);
      if(guidance.structurePassed===true) result.instructionCount=guidance.instructions.length;
    }
    return result;
  };
  try {
    return await Promise.race([run(),new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(hold('PROVIDER_TIMEOUT'));},timeoutMs);})]);
  } catch {return hold('PROVIDER_UNAVAILABLE');}
  finally {clearTimeout(timer);controller.abort();}
}
