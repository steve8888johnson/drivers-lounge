import{blankPermit,orderPermits}from'./core.mjs';

const valuePresent=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
const normalized=value=>String(value??'').trim();

export function blankPermitForImport(permit){
 if(!permit)return false;
 return !normalized(permit.state)&&!normalized(permit.number)&&!normalized(permit.routeText)&&!(permit.documents||[]).length&&!(permit.qr||[]).length;
}

export function samePermitIdentity(existing,imported){
 const state=normalized(imported?.state).toUpperCase(),number=normalized(imported?.number).toUpperCase();
 if(!state||!number)return false;
 return normalized(existing?.state).toUpperCase()===state&&normalized(existing?.number).toUpperCase()===number;
}

export function choosePermitTarget(trip,imported,claimed=new Set()){
 const permits=Array.isArray(trip?.permits)?trip.permits:[];
 const exact=permits.find(permit=>!claimed.has(permit.id)&&samePermitIdentity(permit,imported));if(exact)return exact;
 const blank=permits.find(permit=>!claimed.has(permit.id)&&blankPermitForImport(permit));if(blank)return blank;
 const created=blankPermit();permits.push(created);return created;
}

export function applyImportedPermit(target,imported){
 if(!target||!imported)throw Error('Permit import target is missing.');
 for(const key of['state','number','kind','validFrom','validTo','timeZone','routeText','restrictions'])if(valuePresent(imported[key]))target[key]=imported[key];
 for(const side of['entry','exit'])for(const field of['label','state','road'])if(valuePresent(imported?.[side]?.[field]))target[side][field]=imported[side][field];
 if(Array.isArray(imported.steps)&&imported.steps.length){target.steps=structuredClone(imported.steps);target.geometrySource=structuredClone(imported.geometrySource||null);}
 if(imported.confidence&&typeof imported.confidence==='object')target.confidence=structuredClone(imported.confidence);
 if(imported.travelWindow)target.travelWindow=structuredClone(imported.travelWindow);
 if(imported.limits&&Object.keys(imported.limits).length)target.limits={...(target.limits||{}),...structuredClone(imported.limits)};
 target.complete=false;target.review=null;target.geometryReview=null;return target;
}

export function mergeTripProfileFromPacket(trip,packet){
 const conflicts=[...(packet?.conflicts||[])],applied=[];
 if(!trip?.profile||!packet?.trip?.profile)return{conflicts,applied};
 for(const key of['heightFt','widthFt','lengthFt','weightLb','axles','axleWeights','hazmat']){
  const incoming=normalized(packet.trip.profile[key]);if(!incoming)continue;
  const current=normalized(trip.profile[key]);
  if(!current){trip.profile[key]=incoming;applied.push(key);}
  else if(current!==incoming)conflicts.push(`${key}: saved load says ${current}; imported permits say ${incoming}. The saved value was not overwritten.`);
 }
 if(!normalized(trip.departure)&&normalized(packet.trip.departure))trip.departure=packet.trip.departure;
 if((!normalized(trip.name)||/^Untitled permitted load$/i.test(trip.name))&&normalized(packet.trip.name))trip.name=packet.trip.name;
 return{conflicts:[...new Set(conflicts)],applied};
}

export function orderTripPermits(trip){
 const ordered=orderPermits(trip.permits||[]);trip.permits=ordered.permits;return ordered;
}

export function summarizePdfBatch(records,packetResult,orderResult,mergeResult){
 const warnings=[],states=[];let qrCount=0;
 for(const record of records||[]){if(record.permit?.state)states.push(record.permit.state);qrCount+=record.qrCodes?.length||0;warnings.push(...(record.warnings||[]).map(message=>`${record.name}: ${message}`));}
 warnings.push(...(packetResult?.conflicts||[]),...(mergeResult?.conflicts||[]),...(orderResult?.issues||[]));
 return{fileCount:records?.length||0,stateChain:states.join(' → '),qrCount,warnings:[...new Set(warnings)],message:`Imported ${records?.length||0} permit PDF${records?.length===1?'':'s'} locally${states.length?` · ${states.join(' → ')}`:''}. Every extracted field, restriction page, QR route and border handoff still requires confirmation against the originals.`};
}
