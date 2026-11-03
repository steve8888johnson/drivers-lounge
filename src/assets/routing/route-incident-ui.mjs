import{appendIncidentEvent,verifyIncidentChain}from'./route-incident-log.mjs';
const KEY='dl-route-incident-log-v1',ROUTE_KEY='dl-routing-last-candidate-v1';
let queue=Promise.resolve(),currentRouteId='';
const $=selector=>document.querySelector(selector);
function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
function write(events){localStorage.setItem(KEY,JSON.stringify(events.slice(-500)));}
function routeId(){
 if(currentRouteId)return currentRouteId;try{return JSON.parse(localStorage.getItem(ROUTE_KEY)||'null')?.route?.safetyRecord?.recordId||''}catch{return''}
}
function log(type,{position=null,details={}}={}){
 queue=queue.then(async()=>{const events=await appendIncidentEvent(read(),{routeId:routeId(),type,position,details});write(events);updateStatus(events);}).catch(()=>{});return queue;
}
function ensure(){
 const packet=$('#offline-route-packet');if(!packet||$('#route-incident-controls'))return;
 const controls=document.createElement('div');controls.id='route-incident-controls';controls.className='route-incident-controls';controls.innerHTML='<button id="export-route-incidents" type="button">Export route audit log</button><small id="route-incident-status">No route events recorded.</small>';packet.insertAdjacentElement('afterend',controls);
 $('#export-route-incidents').addEventListener('click',exportLog);updateStatus(read());
}
async function updateStatus(events){const status=$('#route-incident-status');if(!status)return;const verified=await verifyIncidentChain(events);status.textContent=verified.valid?`${verified.count} chained route event${verified.count===1?'':'s'} stored on this device.`:`Audit log integrity problem at event ${verified.index+1}.`;}
async function exportLog(){
 const events=read(),verified=await verifyIncidentChain(events),payload={schema:'dl-route-incident-export/v1',exportedAt:new Date().toISOString(),verified,events},blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`drivers-lounge-route-audit-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function installStyles(){if($('#route-incident-styles'))return;const style=document.createElement('style');style.id='route-incident-styles';style.textContent='.route-incident-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 14px}.route-incident-controls button{min-height:38px}.route-incident-controls small{color:#8ea9ba;font-size:9px;text-align:right}@media(max-width:520px){.route-incident-controls{align-items:stretch;flex-direction:column}.route-incident-controls button{width:100%}.route-incident-controls small{text-align:left}}';document.head.append(style);}
function attach(){
 installStyles();ensure();
 document.addEventListener('routing-route-response',event=>{currentRouteId=event.detail?.route?.safetyRecord?.recordId||'';void log('route-reviewed',{details:{decision:event.detail?.route?.safetyRecord?.decision||'',provider:event.detail?.route?.provider||'',crossCheckStatus:event.detail?.crossCheck?.status||event.detail?.route?.crossCheck?.status||''}});});
 document.addEventListener('routing-departure-preflight',event=>void log(event.detail?.ok?'departure-preflight-passed':'departure-preflight-blocked',{position:event.detail?.position,details:event.detail?.result||{}}));
 document.addEventListener('routing-progress-match',event=>{const result=event.detail||{};if(!result.accept||['forward-reanchored','anchored'].includes(result.status))void log(result.accept?'route-match-reanchored':'route-match-held',{position:result.position,details:result});});
 document.addEventListener('routing-guidance-started',event=>void log('guidance-started',{position:event.detail?.position,details:event.detail||{}}));
 document.addEventListener('routing-guidance-stopped',event=>void log('guidance-stopped',{details:event.detail||{}}));
 document.addEventListener('routing-route-deviation',event=>void log('route-deviation',{position:event.detail?.position,details:event.detail||{}}));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&document.body?.classList.contains('drive-mode'))void log('guidance-backgrounded',{details:{visibility:'hidden'}});});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();}
