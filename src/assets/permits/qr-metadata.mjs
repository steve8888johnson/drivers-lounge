import{blankPermit}from'./core.mjs';
import{permitTimeZoneConfidence,permitTimeZoneForState}from'./state-meta.mjs';

const MAX_QR_LENGTH=20000;
const clean=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').replace(/[ \t]+/g,' ').trim();
const isoDate=value=>{
 const raw=clean(value);if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
 const match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return match?`${match[3]}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`:'';
};
const lineMap=raw=>{
 const entries=new Map();
 for(const line of String(raw||'').replace(/\r/g,'\n').split(/\n+/).slice(0,80)){
  const match=line.match(/^\s*([^:]{2,40})\s*:\s*(.{0,500})\s*$/);if(!match)continue;
  entries.set(clean(match[1]).toLowerCase(),clean(match[2]));
 }
 return entries;
};
const first=(map,keys)=>keys.map(key=>map.get(key)).find(Boolean)||'';
const timeZoneName=value=>({
 'America/New_York':'Eastern','America/Chicago':'Central','America/Denver':'Mountain','America/Phoenix':'Arizona','America/Los_Angeles':'Pacific','America/Anchorage':'Alaska','Pacific/Honolulu':'Hawaii'
}[value]||value||'Unconfirmed');
const permitKindName=value=>value==='single-trip'?'Single trip':value==='multi-trip'?'Multiple trips':value==='annual'?'Annual / other':value||'Unconfirmed';

export function parseInlinePermitMetadataQR(raw){
 const source=String(raw||'');if(!source.trim()||source.length>MAX_QR_LENGTH||/^https?:/i.test(source.trim()))return null;
 const values=lineMap(source),number=first(values,['permit no','permit number','permit #']),start=isoDate(first(values,['start date','effective date','date effective'])),end=isoDate(first(values,['end date','expiration date','date expires','expires'])),type=first(values,['permit type']);
 if(!number||(!start&&!end))return null;
 const state=/^NM[A-Z0-9-]+$/i.test(number)?'NM':'';
 if(!state)return null;
 const permit=blankPermit();permit.state=state;permit.number=clean(number).slice(0,100);permit.validFrom=start;permit.validTo=end;permit.timeZone=permitTimeZoneForState(state);
 permit.kind=/single\s*trip/i.test(type)?'single-trip':/multi|multiple/i.test(type)?'multi-trip':/annual/i.test(type)?'annual':'single-trip';
 permit.complete=false;permit.routeText='';permit.restrictions='';permit.steps=[];
 const sourceLabel='Inline QR permit metadata only; the QR did not supply the authorized route or restrictions. Confirm against the complete original permit.';
 permit.confidence={
  state:{score:.9,source:sourceLabel},number:{score:.9,source:sourceLabel},
  validFrom:{score:start?.85:0,source:sourceLabel},validTo:{score:end?.85:0,source:sourceLabel},
  timeZone:permitTimeZoneConfidence(state),entry:{score:0,source:'Not supplied by QR metadata'},exit:{score:0,source:'Not supplied by QR metadata'},
  routeText:{score:0,source:'Not supplied by QR metadata'},restrictions:{score:0,source:'Not supplied by QR metadata'}
 };
 return{
  kind:'permit-metadata',permit,
  safeSummary:[`${state} permit ${permit.number}`,start?`Effective ${start}`:'',end?`Expires ${end}`:'',`Permit time zone: ${timeZoneName(permit.timeZone)}`,`Permit type: ${permitKindName(permit.kind)}`].filter(Boolean),
  message:'The complete original permit is still required. This QR supplied identity and dates only—not the authorized route, restrictions, dimensions, axle data, escort requirements or permission to move.'
 };
}

export function authenticatedOfficialPermitReference(raw){
 try{
  const url=new URL(String(raw||'').trim());
  if(url.protocol!=='https:'||url.hostname.toLowerCase()!=='utcview.com'||url.port||url.username||url.password||url.hash||url.pathname!=='/Permit/index')return null;
  const allowed=new Set(['VIN','Plate','permit_number','State','iftaOnly']);
  for(const[key]of url.searchParams)if(!allowed.has(key))return null;
  const number=url.searchParams.get('permit_number')||'';
  if(!/^\d{6,20}$/.test(number)||!/^no$/i.test(url.searchParams.get('iftaOnly')||'No'))return null;
  const normalized=new URL('https://utcview.com/Permit/index');normalized.searchParams.set('permit_number',number);normalized.searchParams.set('iftaOnly','No');
  return{
   kind:'official-authenticated',state:'UT',permitNumber:number,url:normalized.href,
   message:'Utah permit lookup detected. The issuing system requires an authorized account, so Drivers Lounge will retain the sanitized reference but will not sign in, send stored credentials or bypass access controls. Import the complete original PDF for the route and restrictions.'
  };
 }catch{return null;}
}

export function classifyPermitQrSupplement(raw){
 return parseInlinePermitMetadataQR(raw)||authenticatedOfficialPermitReference(raw)||null;
}
