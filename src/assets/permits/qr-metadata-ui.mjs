import{classifyPermitQrSupplement}from'./qr-metadata.mjs';
import{choosePermitForQrSupplement,mergePermitQrSupplement,safeQrEvidence}from'./qr-metadata-wallet.mjs';
import{listTrips,saveTrip}from'./storage.mjs';

const hasDocument=typeof document!=='undefined';
const RESULT_KEY='dl-permit-qr-supplement-result-v1';
const $=selector=>hasDocument?document.querySelector(selector):null;
let handling=false,selectionRequested='';

function storedTripId(){
 try{return JSON.parse(localStorage.getItem('dl-last-permit-trip')||'null')||'';}catch{return String(localStorage.getItem('dl-last-permit-trip')||'').replace(/^"|"$/g,'');}
}
function currentTripId(){
 if(typeof location==='undefined')return'';
 const params=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
 return params.get('trip')||storedTripId();
}
function selectedPermitId(){return $('#permit-list .permit-item.selected')?.dataset?.permit||'';}
function setStatus(message,error=false){const status=$('#status');if(status){status.textContent=message;status.dataset.error=String(error);}}
function safeMarker(tripId,permitId,supplement,conflicts,choice){
 return{
  tripId,permitId,kind:supplement.kind,
  title:supplement.kind==='permit-metadata'?'QR metadata saved — complete original still required':'Official lookup requires authorized access',
  message:supplement.message,
  summary:supplement.safeSummary||[supplement.state?`${supplement.state} permit ${supplement.permitNumber}`:'Official permit reference'],
  evidence:safeQrEvidence(supplement),conflicts,
  target:choice?.reused||'selected'
 };
}
function storeMarker(marker){try{sessionStorage.setItem(RESULT_KEY,JSON.stringify(marker))}catch{/* The permit data is already in IndexedDB. */}}
function readMarker(){try{return JSON.parse(sessionStorage.getItem(RESULT_KEY)||'null')}catch{return null}}
function clearMarker(){try{sessionStorage.removeItem(RESULT_KEY)}catch{/* no-op */}}

async function saveSupplement(supplement){
 const trips=await listTrips(),tripId=currentTripId();
 const trip=trips.find(item=>item.id===tripId)||(trips.length===1?trips[0]:null);
 if(!trip)throw Error('Create or choose a permitted load before reading this QR.');
 const choice=choosePermitForQrSupplement(trip,selectedPermitId(),supplement),permit=choice.permit;
 const result=mergePermitQrSupplement(permit,supplement);
 trip.revision=Math.max(1,Number(trip.revision||0)+1);
 await saveTrip(trip);
 storeMarker(safeMarker(trip.id,permit.id,supplement,result.conflicts,choice));
 try{localStorage.setItem('dl-last-permit-trip',JSON.stringify(trip.id))}catch{/* IndexedDB remains authoritative. */}
 return{trip,permit,result,choice};
}

function activateMarkerPermit(marker){
 const target=[...document.querySelectorAll('#permit-list [data-permit]')].find(button=>button.dataset.permit===marker.permitId);
 if(!target)return false;
 if(target.classList.contains('selected')){selectionRequested='';return true;}
 if(selectionRequested!==marker.permitId){selectionRequested=marker.permitId;target.click();}
 return false;
}
function renderMarker(){
 const marker=readMarker(),results=$('#qr-results');if(!marker||!results)return false;
 const activeTrip=currentTripId();if(marker.tripId&&activeTrip&&marker.tripId!==activeTrip)return false;
 if(!activateMarkerPermit(marker))return false;
 let card=results.querySelector('[data-qr-supplement-result]');
 if(!card){
  card=document.createElement('div');card.className=`info qr-supplement-result ${marker.kind||''}`;card.dataset.qrSupplementResult='true';card.dataset.remoteAction='disabled';
  const heading=document.createElement('strong');heading.textContent=marker.title||'Permit QR reviewed';
  const message=document.createElement('p');message.textContent=marker.message||'';card.append(heading,message);
  if(Array.isArray(marker.summary)&&marker.summary.length){const list=document.createElement('ul');for(const item of marker.summary){const li=document.createElement('li');li.textContent=String(item);list.append(li);}card.append(list);}
  if(marker.kind==='official-authenticated'){
   const disabled=document.createElement('p');disabled.className='qr-remote-disabled';disabled.textContent='Remote import, fetch, open and sign-in actions are disabled for this authenticated reference.';card.append(disabled);
  }
  if(Array.isArray(marker.conflicts)&&marker.conflicts.length){const conflict=document.createElement('p');conflict.className='qr-supplement-warning';conflict.textContent=`Existing fields were not overwritten: ${marker.conflicts.join('; ')}`;card.append(conflict);}
  const preview=document.createElement('pre');preview.className='qr-data';preview.dataset.redacted='true';preview.textContent=marker.evidence||'Sensitive QR contents retained only as sanitized local evidence.';preview.setAttribute('aria-label','Sensitive QR values hidden from this preview');card.append(preview);
  card.querySelectorAll('button,a[href]').forEach(element=>element.remove());results.append(card);
 }
 const statusMessage=marker.kind==='permit-metadata'?'QR identity and dates saved as an unconfirmed draft. The complete original permit is still required for route and restrictions.':'Official permit reference saved in a separate state record. Authorized access and the complete original permit are required; no remote import was attempted.';
 setStatus(statusMessage,false);return true;
}
function restoreMarker(){
 const marker=readMarker();if(!marker)return;
 let attempts=0,rendered=false;
 const draw=()=>{
  attempts++;rendered=renderMarker()||rendered;
  if((rendered&&attempts>=8)||attempts>=50){observer?.disconnect();clearInterval(timer);clearMarker();}
 };
 const results=$('#qr-results'),observer=results?new MutationObserver(()=>queueMicrotask(draw)):null;observer?.observe(results,{childList:true,subtree:true});
 const timer=setInterval(draw,150);draw();
}
function installStyles(){
 if(!hasDocument||$('#qr-metadata-styles'))return;const style=document.createElement('style');style.id='qr-metadata-styles';style.textContent=`.qr-supplement-result{margin:10px 0;padding:12px;border:1px solid #bdcad9;border-radius:10px;background:#eef5ff;color:#17324e}.qr-supplement-result strong{display:block}.qr-supplement-result p{margin:6px 0;font-size:12px;line-height:1.45}.qr-supplement-result ul{margin:7px 0;padding-left:19px;font-size:12px}.qr-supplement-result.official-authenticated{border-color:#c78b32;background:#fff3dc;color:#5f3b00}.qr-supplement-warning{color:#8b1f2d!important;font-weight:800}.qr-remote-disabled{padding:8px;border-radius:8px;background:#ffe7bd;font-weight:900}.qr-data[data-redacted="true"]{border-color:#9fb1c4;background:#f6f8fb;color:#44586c;white-space:pre-wrap}`;document.head.append(style);
}
async function intercept(event){
 if(handling)return;const input=$('#qr-contents'),raw=String(input?.value||'').trim(),supplement=classifyPermitQrSupplement(raw);if(!supplement)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();handling=true;
 const button=event.currentTarget,prior=button.textContent;button.disabled=true;button.textContent='Saving safe permit reference…';input.value='';
 try{
  const{trip}=await saveSupplement(supplement);
  location.hash=`trip=${encodeURIComponent(trip.id)}&tab=review`;location.reload();
 }catch(error){setStatus(String(error?.message||'Unable to save permit QR metadata.'),true);button.disabled=false;button.textContent=prior;handling=false;}
}
function mount(){
 installStyles();const button=$('#decode-qr');if(!button)return;
 button.addEventListener('click',intercept,true);restoreMarker();
}
if(hasDocument){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
