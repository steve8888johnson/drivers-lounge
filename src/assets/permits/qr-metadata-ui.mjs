import{blankPermit}from'./core.mjs';
import{classifyPermitQrSupplement}from'./qr-metadata.mjs';
import{mergePermitQrSupplement,safeQrEvidence}from'./qr-metadata-wallet.mjs';
import{listTrips,saveTrip}from'./storage.mjs';

const hasDocument=typeof document!=='undefined';
const RESULT_KEY='dl-permit-qr-supplement-result-v1';
const $=selector=>hasDocument?document.querySelector(selector):null;
let handling=false;

function currentTripId(){
 if(typeof location==='undefined')return'';
 const params=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
 return params.get('trip')||localStorage.getItem('dl-last-permit-trip')||'';
}
function selectedPermitId(){return $('#permit-list .permit-item.selected')?.dataset?.permit||'';}
function setStatus(message,error=false){const status=$('#status');if(status){status.textContent=message;status.dataset.error=String(error);}}
function safeMarker(tripId,permitId,supplement,conflicts){
 return{
  tripId,permitId,kind:supplement.kind,
  title:supplement.kind==='permit-metadata'?'QR metadata saved — route still required':'Official lookup requires authorized access',
  message:supplement.message,
  summary:supplement.safeSummary||[supplement.state?`${supplement.state} permit ${supplement.permitNumber}`:'Official permit reference'],
  evidence:safeQrEvidence(supplement),conflicts
 };
}
function storeMarker(marker){try{sessionStorage.setItem(RESULT_KEY,JSON.stringify(marker))}catch{/* The permit data is already in IndexedDB. */}}
function readMarker(){try{return JSON.parse(sessionStorage.getItem(RESULT_KEY)||'null')}catch{return null}}
function clearMarker(){try{sessionStorage.removeItem(RESULT_KEY)}catch{/* no-op */}}

async function saveSupplement(raw,supplement){
 const trips=await listTrips();const tripId=currentTripId();
 const trip=trips.find(item=>item.id===tripId)||(trips.length===1?trips[0]:null);
 if(!trip)throw Error('Create or choose a permitted load before reading this QR.');
 let permit=trip.permits.find(item=>item.id===selectedPermitId())||trip.permits[0];
 if(!permit){permit=blankPermit();trip.permits.push(permit);}
 const result=mergePermitQrSupplement(permit,supplement);
 trip.revision=Math.max(1,Number(trip.revision||0)+1);
 await saveTrip(trip);
 storeMarker(safeMarker(trip.id,permit.id,supplement,result.conflicts));
 try{localStorage.setItem('dl-last-permit-trip',JSON.stringify(trip.id))}catch{/* IndexedDB remains authoritative. */}
 return{trip,permit,result};
}

function renderMarker(){
 const marker=readMarker(),results=$('#qr-results');if(!marker||!results)return false;
 const activeTrip=currentTripId();if(marker.tripId&&activeTrip&&marker.tripId!==activeTrip)return false;
 let card=results.querySelector('[data-qr-supplement-result]');
 if(!card){
  card=document.createElement('div');card.className=`info qr-supplement-result ${marker.kind||''}`;card.dataset.qrSupplementResult='true';
  const heading=document.createElement('strong');heading.textContent=marker.title||'Permit QR reviewed';
  const message=document.createElement('p');message.textContent=marker.message||'';card.append(heading,message);
  if(Array.isArray(marker.summary)&&marker.summary.length){const list=document.createElement('ul');for(const item of marker.summary){const li=document.createElement('li');li.textContent=String(item);list.append(li);}card.append(list);}
  if(Array.isArray(marker.conflicts)&&marker.conflicts.length){const conflict=document.createElement('p');conflict.className='qr-supplement-warning';conflict.textContent=`Existing fields were not overwritten: ${marker.conflicts.join('; ')}`;card.append(conflict);}
  const preview=document.createElement('pre');preview.className='qr-data';preview.dataset.redacted='true';preview.textContent=marker.evidence||'Sensitive QR contents retained only as sanitized local evidence.';preview.setAttribute('aria-label','Sensitive QR values hidden from this preview');card.append(preview);
  results.append(card);
 }
 const statusMessage=marker.kind==='permit-metadata'?'QR identity and dates saved as an unconfirmed draft. Import the complete original permit for the route and restrictions.':'Official permit reference saved. Drivers Lounge did not sign in or bypass the issuing system; import the complete original permit.';
 setStatus(statusMessage,false);return true;
}
function restoreMarker(){
 const marker=readMarker();if(!marker)return;
 let attempts=0;const draw=()=>{attempts++;renderMarker();if(attempts>=20){observer?.disconnect();clearInterval(timer);clearMarker();}};
 const results=$('#qr-results'),observer=results?new MutationObserver(()=>queueMicrotask(draw)):null;observer?.observe(results,{childList:true,subtree:true});
 const timer=setInterval(draw,150);draw();
}
function installStyles(){
 if(!hasDocument||$('#qr-metadata-styles'))return;const style=document.createElement('style');style.id='qr-metadata-styles';style.textContent=`.qr-supplement-result{margin:10px 0;padding:12px;border:1px solid #bdcad9;border-radius:10px;background:#eef5ff;color:#17324e}.qr-supplement-result strong{display:block}.qr-supplement-result p{margin:6px 0;font-size:12px;line-height:1.45}.qr-supplement-result ul{margin:7px 0;padding-left:19px;font-size:12px}.qr-supplement-result.official-authenticated{border-color:#c78b32;background:#fff3dc;color:#5f3b00}.qr-supplement-warning{color:#8b1f2d!important;font-weight:800}.qr-data[data-redacted="true"]{border-color:#9fb1c4;background:#f6f8fb;color:#44586c;white-space:pre-wrap}`;document.head.append(style);
}
async function intercept(event){
 if(handling)return;const input=$('#qr-contents'),raw=String(input?.value||'').trim(),supplement=classifyPermitQrSupplement(raw);if(!supplement)return;
 event.preventDefault();event.stopImmediatePropagation();handling=true;
 const button=event.currentTarget,prior=button.textContent;button.disabled=true;button.textContent='Saving safe permit reference…';input.value='';
 try{await saveSupplement(raw,supplement);location.reload();}
 catch(error){setStatus(String(error?.message||'Unable to save permit QR metadata.'),true);button.disabled=false;button.textContent=prior;handling=false;}
}
function mount(){
 installStyles();const button=$('#decode-qr');if(!button)return;
 button.addEventListener('click',intercept,true);restoreMarker();
}
if(hasDocument){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
