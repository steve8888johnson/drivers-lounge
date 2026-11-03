import{createOfflineRoutePacket,routePacketFileName,serializeRoutePacket,validateOfflineRoutePacket}from'./route-packet.mjs';

const CACHE_KEY='dl-offline-route-packet-v1';
const $=selector=>document.querySelector(selector);
let latest=null,busy=false;
function ensureControls(){
 const start=$('#start-guidance'),review=$('#route-review');if(!start||!review)return null;
 let box=$('#offline-route-packet');if(box)return box;
 box=document.createElement('section');box.id='offline-route-packet';box.className='offline-route-packet';box.innerHTML='<div><small>OFFLINE ROUTE EVIDENCE</small><strong>Reviewed route packet</strong><p id="offline-route-status">Calculate and review a fresh route before downloading.</p></div><button id="download-route-packet" type="button" disabled>Download route packet</button>';
 start.insertAdjacentElement('afterend',box);$('#download-route-packet').addEventListener('click',download);return box;
}
async function cache(payload){
 latest=payload;const box=ensureControls(),button=$('#download-route-packet'),status=$('#offline-route-status');if(!box||!button||!status)return;
 try{
  const packet=await createOfflineRoutePacket({route:payload.route,origin:payload.origin,destination:payload.destination,profile:payload.route?.profile});
  localStorage.setItem(CACHE_KEY,JSON.stringify(packet));latest={...payload,offlinePacket:packet};button.disabled=false;status.textContent=`Packet ${packet.packetId} cached on this device until ${new Date(packet.expiresAt).toLocaleString()}. It preserves the reviewed route; it does not calculate detours.`;
 }catch(error){button.disabled=true;status.textContent=String(error?.message||'Offline packet unavailable.');}
}
async function download(){
 if(busy||!latest?.offlinePacket)return;busy=true;const button=$('#download-route-packet');button.disabled=true;
 try{const packet=latest.offlinePacket,validation=await validateOfflineRoutePacket(packet);if(!validation.valid)throw Error(validation.reasons[0]);const blob=new Blob([serializeRoutePacket(packet)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=routePacketFileName(packet);anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 catch(error){const status=$('#offline-route-status');if(status)status.textContent=String(error?.message||'Unable to download route packet.');}
 finally{busy=false;button.disabled=!latest?.offlinePacket;}
}
async function restore(){
 ensureControls();try{const packet=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(!packet)return;const validation=await validateOfflineRoutePacket(packet);const status=$('#offline-route-status'),button=$('#download-route-packet');if(validation.valid){latest={offlinePacket:packet};button.disabled=false;status.textContent=`A valid cached route packet is available until ${new Date(validation.expiresAt).toLocaleString()}.`; }else{localStorage.removeItem(CACHE_KEY);status.textContent=`Cached route packet unavailable: ${validation.reasons[0]}`;}}
 catch{localStorage.removeItem(CACHE_KEY);}
}
function clear(){latest=null;localStorage.removeItem(CACHE_KEY);const button=$('#download-route-packet'),status=$('#offline-route-status');if(button)button.disabled=true;if(status)status.textContent='Calculate and review a fresh route before downloading.';}
function installStyles(){if($('#route-packet-styles'))return;const style=document.createElement('style');style.id='route-packet-styles';style.textContent='.offline-route-packet{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:12px;border:1px solid #315b75;border-radius:12px;background:rgba(12,43,62,.72)}.offline-route-packet div{min-width:0}.offline-route-packet small{display:block;color:#8fb3ca;font-size:9px;font-weight:900;letter-spacing:.08em}.offline-route-packet strong{display:block;margin-top:2px;color:#f4fbff}.offline-route-packet p{margin:4px 0 0;color:#b5cbd9;font-size:10px;line-height:1.45}.offline-route-packet button{flex:none;min-height:42px}.offline-route-packet button:disabled{opacity:.45}@media(max-width:520px){.offline-route-packet{align-items:stretch;flex-direction:column}.offline-route-packet button{width:100%}}';document.head.append(style);}
function attach(){installStyles();ensureControls();void restore();document.addEventListener('routing-route-response',event=>void cache(event.detail||{}));$('#clear-route')?.addEventListener('click',clear);$('#origin')?.addEventListener('input',clear);$('#destination')?.addEventListener('input',clear);}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();}
