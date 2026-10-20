import{buildMaster}from'./core.mjs';
import{listTrips,verifyWallet}from'./storage.mjs';

const $=selector=>document.querySelector(selector);
let refreshTimer=null,refreshToken=0,lastDecision={allowed:false,reasons:['Permit guidance has not been evaluated.']},walletCache={key:'',verified:false,error:''};

export function permitGuidanceDecision({tripExists=false,masterReady=false,walletVerified=false,conditionsChecked=false,routeReadinessReady=false,visibleIssueCount=0,guidanceRunning=false,completed=false,pageBusy=false,statusError=false}={}){
 const reasons=[];
 if(!tripExists)reasons.push('Choose a saved permitted load.');
 if(completed)reasons.push('This single-trip movement is already marked complete.');
 if(pageBusy)reasons.push('A permit or wallet operation is still in progress.');
 if(statusError)reasons.push('Resolve the current permit-workflow error before guidance.');
 if(!masterReady)reasons.push('Permit order, confirmations, restrictions or route geometry still need review.');
 if(!walletVerified)reasons.push('Every original permit PDF or image must be present in this device wallet.');
 if(!routeReadinessReady)reasons.push('The current route review is not marked ready for departure checks.');
 if(Number(visibleIssueCount)>0)reasons.push(`${Number(visibleIssueCount)} visible route check${Number(visibleIssueCount)===1?' remains':'s remain'}.`);
 if(!conditionsChecked)reasons.push('Confirm current curfews, escorts, restrictions and travel conditions for this departure.');
 if(guidanceRunning)reasons.push('Permitted guidance is already running.');
 return{allowed:reasons.length===0,reasons};
}

function walletKey(trip){return`${trip?.id||''}|${trip?.revision||0}|${(trip?.permits||[]).flatMap(permit=>(permit.documents||[]).map(document=>document.id)).sort().join(',')}`;}
async function walletState(trip){
 const key=walletKey(trip);if(walletCache.key===key)return walletCache;
 try{await verifyWallet(trip);walletCache={key,verified:true,error:''};}
 catch(error){walletCache={key,verified:false,error:String(error?.message||'Original permit evidence is missing.')};}
 return walletCache;
}
function ensureBanner(){
 let banner=$('#permit-guidance-interlock');if(banner)return banner;
 const route=$('#panel-route'),conditions=$('#conditions-checked')?.closest('label');if(!route)return null;
 banner=document.createElement('div');banner.id='permit-guidance-interlock';banner.className='permit-guidance-interlock';banner.setAttribute('role','alert');
 if(conditions)conditions.insertAdjacentElement('beforebegin',banner);else route.querySelector('.guidance')?.insertAdjacentElement('afterend',banner);
 return banner;
}
function installStyles(){
 if($('#permit-guidance-interlock-styles'))return;const style=document.createElement('style');style.id='permit-guidance-interlock-styles';style.textContent=`
 .permit-guidance-interlock{margin:14px 0;padding:12px 14px;border:2px solid #d94a5a;border-radius:11px;background:#4e1520;color:#fff4f5;font-size:12px;font-weight:850;line-height:1.45}.permit-guidance-interlock strong{display:block;margin-bottom:3px;letter-spacing:.04em}.permit-guidance-interlock[hidden]{display:none}#panel-route[data-permit-guidance-locked="true"] #start-guidance{pointer-events:none;opacity:.42;filter:saturate(.35)}
 `;document.head.append(style);
}
function setAttributeIfChanged(element,name,value){if(element?.getAttribute(name)!==value)element?.setAttribute(name,value);}
function setDisabledIfChanged(element,value){if(element&&element.disabled!==value)element.disabled=value;}
function applyDecision(decision,extra=''){
 lastDecision=decision;const button=$('#start-guidance'),route=$('#panel-route'),banner=ensureBanner();if(!button||!route)return;
 const locked=!decision.allowed;
 setAttributeIfChanged(route,'data-permit-guidance-locked',locked?'true':'false');
 setAttributeIfChanged(button,'data-permit-safety-interlock',locked?'blocked':'clear');
 setDisabledIfChanged(button,locked);
 if(!locked){button.removeAttribute('aria-disabled');button.removeAttribute('title');if(banner&&!banner.hidden)banner.hidden=true;return;}
 setAttributeIfChanged(button,'aria-disabled','true');button.title='Resolve every permit-route safety check before starting guidance.';
 if(banner){
  if(banner.hidden)banner.hidden=false;
  const message=`${decision.reasons[0]||'Permit guidance is not ready.'}${extra?` ${extra}`:''}`;
  if(banner.dataset.message!==message){banner.dataset.message=message;banner.replaceChildren();const strong=document.createElement('strong');strong.textContent='GUIDANCE LOCKED';const text=document.createElement('span');text.textContent=message;banner.append(strong,text);}
 }
}
async function refresh(){
 const token=++refreshToken,button=$('#start-guidance');if(!button)return;
 const id=$('#trip-picker')?.value||'',trips=await listTrips();if(token!==refreshToken)return;
 const trip=trips.find(item=>item.id===id),master=trip?buildMaster(trip,{geometry:true}):{ready:false,issues:['Choose a permitted load.']};
 const wallet=trip?await walletState(trip):{verified:false,error:'Choose a permitted load.'};if(token!==refreshToken)return;
 const decision=permitGuidanceDecision({
  tripExists:Boolean(trip),masterReady:Boolean(master.ready),walletVerified:Boolean(wallet.verified),
  conditionsChecked:Boolean($('#conditions-checked')?.checked),routeReadinessReady:/^Ready for departure checks$/i.test($('#route-readiness')?.textContent?.trim()||''),
  visibleIssueCount:document.querySelectorAll('#route-checks .issue-list li').length,
  guidanceRunning:Boolean($('#stop-guidance')&&!$('#stop-guidance').disabled),completed:Boolean(trip?.completedAt),
  pageBusy:Boolean($('.layout')?.inert),statusError:$('#status')?.dataset.error==='true'
 });
 applyDecision(decision,wallet.error&&!wallet.verified?wallet.error:'');
}
function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh().catch(()=>applyDecision({allowed:false,reasons:['Permit readiness could not be verified. Guidance remains locked.']})),60);}
function blockUnsafeClick(event){
 if(lastDecision.allowed)return;event.preventDefault();event.stopImmediatePropagation();applyDecision(lastDecision);
 const status=$('#nav-status');if(status)status.textContent=lastDecision.reasons.join(' ');
}
function observeReadiness(){
 const targets=[$('#route-readiness'),$('#route-checks'),$('#status'),$('#stop-guidance'),$('.layout')].filter(Boolean);
 for(const target of targets)new MutationObserver(schedule).observe(target,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','data-error','inert','class']});
}
function mount(){
 if(!$('#panel-route')||!$('#start-guidance')||!$('#trip-picker')){setTimeout(mount,100);return;}
 installStyles();ensureBanner();$('#start-guidance').addEventListener('click',blockUnsafeClick,true);$('#conditions-checked')?.addEventListener('change',schedule);$('#trip-picker').addEventListener('change',()=>{walletCache={key:'',verified:false,error:''};schedule();});
 document.addEventListener('click',event=>{if(event.target.closest?.('[data-tab="route"],#save-trip,#confirm-permit,#confirm-geometry,#finish-trip,#cache-trip'))setTimeout(schedule,80);});
 observeReadiness();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
 setInterval(()=>{if(!$('#panel-route')?.hidden)schedule();},1000);schedule();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
