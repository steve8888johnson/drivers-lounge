const $=selector=>document.querySelector(selector);
let enforcing=false;

export function hasCriticalNoticeInReview(root=document){
 return Boolean(root.querySelector('#route-notices .route-notice.critical,#route-notices [data-blocking="true"],#route-notices [data-severity="critical"]'));
}

export function enforceGuidanceInterlock(){
 if(enforcing)return hasCriticalNoticeInReview();
 enforcing=true;
 try{
  const review=$('#route-review'),button=$('#start-guidance'),confirmed=$('#route-confirmed');if(!button)return false;
  const blocked=hasCriticalNoticeInReview();
  review?.classList.toggle('guidance-blocked',blocked);
  button.dataset.safetyInterlock=blocked?'blocked':'clear';
  if(blocked){
   button.disabled=true;button.setAttribute('aria-disabled','true');button.title='Resolve every critical route notice and calculate a fresh route before guidance.';
   if(confirmed){confirmed.checked=false;confirmed.disabled=true;confirmed.setAttribute('aria-disabled','true');confirmed.title='Critical route notices must be resolved before this review can be confirmed.';}
  }else{
   button.removeAttribute('aria-disabled');button.removeAttribute('title');
   if(confirmed){confirmed.disabled=false;confirmed.removeAttribute('aria-disabled');confirmed.removeAttribute('title');}
  }
  return blocked;
 }finally{enforcing=false;}
}

function explainBlock(event){
 if(!hasCriticalNoticeInReview())return;
 event.preventDefault();event.stopImmediatePropagation();
 const status=$('#route-status');if(status){status.textContent='Live guidance is blocked until every critical route notice is resolved and a fresh route is calculated.';status.className='inline-status bad';}
 const message=$('#map-message');if(message){message.textContent='Critical route notice: guidance remains disabled. Correct the stop, profile or route and calculate again.';message.className='map-message bad';message.hidden=false;}
 enforceGuidanceInterlock();
}

function scheduleEnforcement(){
 enforceGuidanceInterlock();queueMicrotask(enforceGuidanceInterlock);requestAnimationFrame(enforceGuidanceInterlock);
}

function attach(){
 const notices=$('#route-notices'),confirmed=$('#route-confirmed'),button=$('#start-guidance');if(!notices||!button)return;
 new MutationObserver(scheduleEnforcement).observe(notices,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-blocking','data-severity']});
 new MutationObserver(()=>{if(hasCriticalNoticeInReview()&&!button.disabled)scheduleEnforcement();}).observe(button,{attributes:true,attributeFilter:['disabled','aria-disabled','data-safety-interlock']});
 confirmed?.addEventListener('change',scheduleEnforcement);
 document.addEventListener('click',event=>{if(event.target===button)explainBlock(event);},true);
 document.addEventListener('routing-review-rendered',scheduleEnforcement);
 scheduleEnforcement();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
