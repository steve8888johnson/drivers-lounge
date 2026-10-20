import{blankPermit,clean}from'./core.mjs';
import{permitTimeZoneConfidence,permitTimeZoneForState}from'./state-meta.mjs';

const safeToken=(value,max=120)=>clean(value,max).trim();
const isoDate=value=>{
 const raw=safeToken(value,20);if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
 const match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return match?`${match[3]}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`:'';
};
const line=(text,label)=>String(text||'').match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n\\r]+)`,'i'))?.[1]?.trim()||'';
const stateFromNumber=number=>{
 const match=String(number||'').toUpperCase().match(/^([A-Z]{2})[A-Z0-9-]*$/);return match?.[1]||'';
};
const permitKind=value=>{
 const text=String(value||'').toLowerCase();
 if(/annual/.test(text))return'annual';
 if(/multi(?:ple)?[ -]?trip|multiple trips/.test(text))return'multi-trip';
 if(/hazmat|hazardous/.test(text)&&/route/.test(text))return'hazmat-route-plan';
 return'single-trip';
};

export function parsePermitSummaryQR(raw){
 const text=String(raw||'').replace(/\r/g,'').trim();if(text.length<12||text.length>50000)return null;
 const number=safeToken(line(text,'Permit(?: No\\.?| Number)?'),100),validFrom=isoDate(line(text,'(?:Start|Effective) Date')),validTo=isoDate(line(text,'(?:End|Expiration|Expires) Date')),type=safeToken(line(text,'Permit Type'),160);
 if(!number||(!validFrom&&!validTo)||!/^([A-Z]{2})?[A-Z0-9-]{5,}$/i.test(number))return null;
 const state=stateFromNumber(number);if(!state||!permitTimeZoneForState(state))return null;
 const permit=blankPermit();permit.state=state;permit.number=number;permit.validFrom=validFrom;permit.validTo=validTo;permit.kind=permitKind(type);permit.timeZone=permitTimeZoneForState(state);permit.complete=false;
 permit.confidence={
  state:{score:.9,source:'State prefix in permit-summary QR; confirm against the original permit'},
  number:{score:.9,source:'Permit-summary QR; confirm against the original permit'},
  validFrom:{score:validFrom?.85:0,source:validFrom?'Permit-summary QR; confirm against the original permit':'Not supplied'},
  validTo:{score:validTo?.85:0,source:validTo?'Permit-summary QR; confirm against the original permit':'Not supplied'},
  timeZone:permitTimeZoneConfidence(state),
  routeText:{score:0,source:'This QR contains permit summary metadata, not the authorized route'},
  restrictions:{score:0,source:'Restrictions must be read from every original permit page'}
 };
 return{permit,summaryType:type,routeData:false,message:'Permit-summary QR detected. Permit metadata was drafted, but this QR does not contain the authorized route or restriction pages. Review the original permit.'};
}

const allowedKeys=(url,keys)=>[...url.searchParams.keys()].every(key=>keys.includes(key));
const cleanUrl=url=>!url.username&&!url.password&&!url.port&&!url.hash;
function referencePermit(state,number=''){
 const permit=blankPermit();permit.state=state;permit.number=number;permit.timeZone=permitTimeZoneForState(state);permit.complete=false;
 permit.confidence={state:{score:.95,source:'Official issuing-agency verification reference; confirm against original'},number:{score:number?.9:0,source:number?'Official verification reference; confirm against original':'The verification record ID is not assumed to be the permit number'},timeZone:permitTimeZoneConfidence(state),routeText:{score:0,source:'Official verification link does not supply authorized route geometry'},restrictions:{score:0,source:'Read every restriction page in the original permit'}};
 return permit;
}

export function officialPermitReference(raw){
 let url;try{url=new URL(String(raw||'').trim());}catch{return null;}
 const host=url.hostname.toLowerCase(),path=url.pathname.toLowerCase();if(!cleanUrl(url))return null;
 if(host==='utcview.com'&&url.protocol==='https:'&&path==='/permit/index'&&allowedKeys(url,['VIN','Plate','permit_number','State','iftaOnly'])){
  const permitNumber=safeToken(url.searchParams.get('permit_number'),100);if(!/^\d{6,20}$/.test(permitNumber))return null;
  return{kind:'official-permit-reference',state:'UT',issuer:'Utah permit verification',permitNumber,recordId:permitNumber,url:url.href,secure:true,routeData:false,permit:referencePermit('UT',permitNumber),message:'Official Utah permit-verification reference detected. It verifies permit information but does not provide an authorized route geometry. Keep and review the complete original PDF.'};
 }
 if(host==='coopr.codot.gov'&&url.protocol==='https:'&&path==='/mobile/lookup.aspx'&&allowedKeys(url,['PermitID'])){
  const recordId=safeToken(url.searchParams.get('PermitID'),100);if(!/^\d{4,20}$/.test(recordId))return null;
  return{kind:'official-permit-reference',state:'CO',issuer:'Colorado permit lookup',permitNumber:'',recordId,url:url.href,secure:true,routeData:false,permit:referencePermit('CO'),message:'Official Colorado permit-lookup reference detected. Its PermitID is an external record identifier, not assumed to be the state permit number, and it does not provide authorized route geometry. Review the original PDF.'};
 }
 if(host==='txpros.txdmv.gov'&&['http:','https:'].includes(url.protocol)&&path==='/permitdetails02.aspx'&&allowedKeys(url,['PermitID','QRUSER'])){
  const recordId=safeToken(url.searchParams.get('PermitID'),100),qrUser=safeToken(url.searchParams.get('QRUSER'),10);if(!/^\d{4,20}$/.test(recordId)||qrUser!=='1')return null;
  const secure=url.protocol==='https:';
  return{kind:'official-permit-reference',state:'TX',issuer:'Texas permit lookup',permitNumber:'',recordId,url:url.href,secure,routeData:false,permit:referencePermit('TX'),message:`Official Texas permit-lookup reference detected${secure?'':' over an unencrypted HTTP link'}. Its PermitID is an external record identifier, not assumed to be the state permit number, and it does not provide authorized route geometry. Review the original PDF.`};
 }
 return null;
}
