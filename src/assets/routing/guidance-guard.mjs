const $=selector=>document.querySelector(selector);
let enforcing=false,intervalId=null;

export function hasCriticalNoticeInReview(root=document){
 return Boolean(root.querySelector('#route-notices .route-notice.critical,#route-notices [data-blocking="true"],#route-notices [data-severity="critical"]'));
}

function ensureBanner(review){
 let banner=$('#route-interlock-banner');
 if(!banner&&review){banner=document.createElement('div');banner.id='route-interlock-banner';banner.className='route-interlock-banner';banner.setAttribute('role','alert');banner.textContent='GUIDANCE LOCKED · Resolve every critical route notice and calculate a fresh route before movement.';const notices=$('#route-notices');notices?.insertAdjacentElement('afterend',banner);}
 return banner;
}

export function enforceGuidanceInterlock(){
 if(enforcing)return hasCriticalNoticeInReview();
 enforcing=true;
 try{
  const review=$('#route-review'),button=$('#start-guidance'),confirmed=$('#route-confirmed');if(!button)return false;
  const blocked=hasCriticalNoticeInReview(),banner=ensureBanner(review);
  review?.classList.toggle('guidance-blocked',blocked);if(review)review.dataset.guidanceBlocked=blocked?'true':'false';
  if(banner)banner.hidden=!blocked;
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

function blockConfirmation(event){
 if(!hasCriticalNoticeInReview())return;
 event.preventDefault();event.stopImmediatePropagation();
 const confirmed=$('#route-confirmed');if(confirmed)confirmed.checked=false;
 explainBlock(event);
}

function scheduleEnforcement(){
 enforceGuidanceInterlock();queueMicrotask(enforceGuidanceInterlock);requestAnimationFrame(enforceGuidanceInterlock);
}

function attach(){
 const review=$('#route-review'),notices=$('#route-notices'),confirmed=$('#route-confirmed'),button=$('#start-guidance');if(!review||!notices||!button)return;
 new MutationObserver(scheduleEnforcement).observe(review,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-blocking','data-severity','disabled','hidden']});
 button.addEventListener('click',explainBlock,true);
 confirmed?.addEventListener('click',blockConfirmation,true);
 confirmed?.addEventListener('change',scheduleEnforcement);
 document.addEventListener('routing-review-rendered',scheduleEnforcement);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleEnforcement();});
 if(intervalId===null)intervalId=window.setInterval(()=>{if(!review.hidden||hasCriticalNoticeInReview())enforceGuidanceInterlock();},125);
 scheduleEnforcement();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
