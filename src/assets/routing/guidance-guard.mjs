const $=selector=>document.querySelector(selector);

export function hasCriticalNoticeInReview(root=document){
 return Boolean(root.querySelector('#route-notices .route-notice.critical'));
}

export function enforceGuidanceInterlock(){
 const button=$('#start-guidance'),confirmed=$('#route-confirmed');if(!button)return false;
 const blocked=hasCriticalNoticeInReview();
 if(blocked){button.disabled=true;button.setAttribute('aria-disabled','true');if(confirmed)confirmed.checked=false;}
 else button.removeAttribute('aria-disabled');
 return blocked;
}

function explainBlock(event){
 if(!hasCriticalNoticeInReview())return;
 event.preventDefault();event.stopImmediatePropagation();
 const status=$('#route-status');if(status){status.textContent='Live guidance is blocked until every critical route notice is resolved and a fresh route is calculated.';status.className='inline-status bad';}
 const message=$('#map-message');if(message){message.textContent='Critical route notice: guidance remains disabled. Correct the stop, profile or route and calculate again.';message.className='map-message bad';message.hidden=false;}
}

function attach(){
 const notices=$('#route-notices'),confirmed=$('#route-confirmed'),button=$('#start-guidance');if(!notices||!button)return;
 new MutationObserver(enforceGuidanceInterlock).observe(notices,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 confirmed?.addEventListener('change',()=>queueMicrotask(enforceGuidanceInterlock));
 button.addEventListener('click',explainBlock,true);
 enforceGuidanceInterlock();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
