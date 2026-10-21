import{blankPermit}from'./core.mjs';

const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const upper=value=>clean(value).toUpperCase();

export function safeQrEvidence(supplement){
 if(supplement?.kind==='permit-metadata'){
  const permit=supplement.permit||{};
  return[
   'DLQR-METADATA/v1',
   `State: ${clean(permit.state)}`,
   `Permit: ${clean(permit.number)}`,
   permit.validFrom?`Effective: ${clean(permit.validFrom)}`:'',
   permit.validTo?`Expires: ${clean(permit.validTo)}`:'',
   permit.timeZone?`Permit time zone: ${clean(permit.timeZone)}`:'',
   permit.kind?`Permit type: ${clean(permit.kind)}`:'',
   'Route data: not supplied by QR',
   'Complete original permit: required'
  ].filter(Boolean).join('\n');
 }
 if(supplement?.kind==='official-authenticated')return[
  'DLQR-OFFICIAL-REFERENCE/v1',
  `State: ${clean(supplement.state)}`,
  `Permit: ${clean(supplement.permitNumber)}`,
  supplement.timeZone?`Permit time zone: ${clean(supplement.timeZone)}`:'',
  'Authorized account access: required',
  'Remote import or sign-in: disabled',
  'Route data: not supplied by QR',
  'Complete original permit: required',
  `Sanitized reference: ${clean(supplement.url)}`
 ].filter(Boolean).join('\n');
 return'';
}

export function supplementPermitIdentity(supplement){
 if(supplement?.kind==='permit-metadata')return{state:upper(supplement.permit?.state),number:upper(supplement.permit?.number)};
 if(supplement?.kind==='official-authenticated')return{state:upper(supplement.state),number:upper(supplement.permitNumber)};
 return{state:'',number:''};
}

export function blankPermitForQr(permit){
 return Boolean(permit)&&!clean(permit.state)&&!clean(permit.number)&&!clean(permit.routeText)&&!clean(permit.restrictions)&&!(permit.documents||[]).length&&!(permit.qr||[]).length&&!(permit.steps||[]).length;
}

function sameIdentity(permit,identity){return upper(permit?.state)===identity.state&&upper(permit?.number)===identity.number;}
function compatibleSelected(permit,identity){
 if(!permit)return false;
 const state=upper(permit.state),number=upper(permit.number);
 return(!state||state===identity.state)&&(!number||number===identity.number);
}

export function choosePermitForQrSupplement(trip,selectedPermitId,supplement){
 if(!trip||!Array.isArray(trip.permits))throw Error('Permit trip is missing.');
 const identity=supplementPermitIdentity(supplement);
 if(!identity.state||!identity.number)throw Error('The QR did not provide a supported state and permit identity.');
 const exact=trip.permits.find(permit=>sameIdentity(permit,identity));
 if(exact)return{permit:exact,created:false,reused:'exact',identity};
 const selected=trip.permits.find(permit=>permit.id===selectedPermitId);
 if(compatibleSelected(selected,identity))return{permit:selected,created:false,reused:'selected',identity};
 const blank=trip.permits.find(blankPermitForQr);
 if(blank)return{permit:blank,created:false,reused:'blank',identity};
 const permit=blankPermit();trip.permits.push(permit);
 return{permit,created:true,reused:'created',identity};
}

function mergeField(permit,key,value,conflicts){
 const incoming=clean(value),current=clean(permit?.[key]);
 if(!incoming)return false;
 if(current&&current!==incoming){conflicts.push(`${key} already contains ${current}`);return false;}
 if(current===incoming)return false;
 permit[key]=incoming;return true;
}

export function mergePermitQrSupplement(permit,supplement){
 if(!permit||!supplement)throw Error('Permit QR wallet target is missing.');
 const conflicts=[];let changed=false;
 if(supplement.kind==='permit-metadata'){
  const imported=supplement.permit||{};
  for(const key of['state','number','kind','validFrom','validTo','timeZone'])changed=mergeField(permit,key,imported[key],conflicts)||changed;
  permit.confidence={...(permit.confidence||{}),...(imported.confidence||{})};
 }else if(supplement.kind==='official-authenticated'){
  changed=mergeField(permit,'state',supplement.state,conflicts)||changed;
  changed=mergeField(permit,'number',supplement.permitNumber,conflicts)||changed;
  changed=mergeField(permit,'timeZone',supplement.timeZone,conflicts)||changed;
  permit.confidence={...(permit.confidence||{}),state:{score:.95,source:'Official issuing-system reference; confirm against the complete original permit'},number:{score:.9,source:'Official issuing-system permit reference; confirm against the complete original permit'},timeZone:{score:.7,source:'Default issuing-state time zone; confirm against the original permit and actual route'}};
 }
 const evidence=safeQrEvidence(supplement);
 permit.qr=Array.isArray(permit.qr)?permit.qr:[];
 if(evidence&&!permit.qr.includes(evidence)){permit.qr.push(evidence);changed=true;}
 permit.complete=false;permit.review=null;permit.geometryReview=null;
 return{permit,changed,conflicts,evidence};
}
