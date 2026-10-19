const $=selector=>document.querySelector(selector);

const rounded=value=>Number.isFinite(Number(value))?Math.round(Number(value)*10)/10:null;
const providerNames=crossCheck=>Array.isArray(crossCheck?.providers)?crossCheck.providers.filter(Boolean):[];

export function crossCheckPresentation(crossCheck={}){
 const status=String(crossCheck?.status||'unknown');
 const providers=providerNames(crossCheck),metrics=crossCheck?.metrics||{};
 if(status==='aligned'){
  const details=[];
  if(Number.isFinite(Number(metrics.distanceDeltaPct)))details.push(`distance difference ${rounded(metrics.distanceDeltaPct)}%`);
  if(Number.isFinite(Number(metrics.p95SeparationMeters)))details.push(`95% route separation within ${Math.round(Number(metrics.p95SeparationMeters)).toLocaleString()} m`);
  if(Number.isFinite(Number(metrics.roadNameOverlapPct)))details.push(`named-road overlap ${rounded(metrics.roadNameOverlapPct)}%`);
  return{tone:'good',eyebrow:'INDEPENDENT ROUTE CHECK',title:'Professional providers aligned',body:`${providers.join(' and ')||'Two configured providers'} produced route candidates within the current safety thresholds${details.length?`: ${details.join(' · ')}`:'.'}`,badge:'Cross-checked'};
 }
 if(status==='review')return{tone:'bad',eyebrow:'INDEPENDENT ROUTE CHECK',title:'Provider disagreement requires parked review',body:String(crossCheck?.reasons?.[0]||'The professional route candidates differ enough that unattended guidance is blocked.'),badge:'Guidance locked'};
 if(status==='blocked')return{tone:'bad',eyebrow:'INDEPENDENT ROUTE CHECK',title:'Independent route verification failed',body:String(crossCheck?.reasons?.[0]||crossCheck?.secondaryError||'A provider returned a critical restriction, disagreement or unavailable verification result.'),badge:'Guidance locked'};
 if(status==='single-provider')return{tone:'warning',eyebrow:'ROUTE VERIFICATION',title:'Single-provider route candidate',body:`${providers[0]||'The configured commercial engine'} produced this route, but an independent professional provider is not yet configured. Official restrictions and parked review still control.`,badge:'Not independently verified'};
 return{tone:'warning',eyebrow:'ROUTE VERIFICATION',title:'Cross-check status unavailable',body:'The app could not confirm an independent provider comparison for this route candidate.',badge:'Review required'};
}

function ensureCard(){
 let card=$('#route-cross-check');if(card)return card;
 const review=$('#route-review'),metrics=$('.route-metrics',review);if(!review)return null;
 card=document.createElement('section');card.id='route-cross-check';card.className='route-cross-check';card.hidden=true;
 card.innerHTML='<div><small id="cross-check-eyebrow">ROUTE VERIFICATION</small><strong id="cross-check-title">Verification pending</strong><p id="cross-check-body"></p></div><span id="cross-check-badge" class="status-chip warning">Pending</span>';
 if(metrics)metrics.insertAdjacentElement('afterend',card);else review.prepend(card);
 return card;
}

export function renderCrossCheck(crossCheck){
 const card=ensureCard();if(!card)return null;
 const view=crossCheckPresentation(crossCheck);card.className=`route-cross-check ${view.tone}`;card.hidden=false;
 $('#cross-check-eyebrow').textContent=view.eyebrow;$('#cross-check-title').textContent=view.title;$('#cross-check-body').textContent=view.body;
 const badge=$('#cross-check-badge');badge.textContent=view.badge;badge.className=`status-chip ${view.tone==='good'?'good':view.tone==='bad'?'bad':'warning'}`;
 return view;
}

function attach(){
 ensureCard();
 document.addEventListener('routing-route-response',event=>renderCrossCheck(event.detail?.crossCheck||event.detail?.route?.crossCheck||{}));
 const clear=()=>{const card=$('#route-cross-check');if(card)card.hidden=true;};
 $('#clear-route')?.addEventListener('click',clear);$('#origin')?.addEventListener('input',clear);$('#destination')?.addEventListener('input',clear);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();}
