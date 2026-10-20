const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();

export function safeQrEvidence(supplement){
 if(supplement?.kind==='permit-metadata'){
  const permit=supplement.permit||{};
  return[
   'DLQR-METADATA/v1',
   `State: ${clean(permit.state)}`,
   `Permit: ${clean(permit.number)}`,
   permit.validFrom?`Effective: ${clean(permit.validFrom)}`:'',
   permit.validTo?`Expires: ${clean(permit.validTo)}`:'',
   `Route data: not supplied by QR`
  ].filter(Boolean).join('\n');
 }
 if(supplement?.kind==='official-authenticated')return clean(supplement.url);
 return'';
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
 }
 const evidence=safeQrEvidence(supplement);
 permit.qr=Array.isArray(permit.qr)?permit.qr:[];
 if(evidence&&!permit.qr.includes(evidence)){permit.qr.push(evidence);changed=true;}
 permit.complete=false;permit.review=null;permit.geometryReview=null;
 return{permit,changed,conflicts,evidence};
}
