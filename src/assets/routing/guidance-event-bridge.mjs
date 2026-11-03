const ROUTE_KEY='dl-routing-last-candidate-v1';
const $=selector=>document.querySelector(selector);
let driving=false,lastDeviation='';
function route(){try{return JSON.parse(localStorage.getItem(ROUTE_KEY)||'null')?.route||null}catch{return null}}
function dispatch(type,detail={}){document.dispatchEvent(new CustomEvent(type,{detail}));}
function checkDriving(){
 const active=Boolean(document.body?.classList.contains('drive-mode'));if(active===driving)return;
 driving=active;const current=route();dispatch(active?'routing-guidance-started':'routing-guidance-stopped',active?{routeId:current?.safetyRecord?.recordId||'',provider:current?.provider||''}:{message:'Guidance stopped or interrupted.'});
}
function checkWarning(){
 const text=String($('#drive-warning')?.textContent||'').trim();if(!/^ROUTE DEVIATION:/i.test(text)||text===lastDeviation)return;lastDeviation=text;
 const distance=Number(text.match(/ROUTE DEVIATION:\s*(\d+)/i)?.[1]||0),accuracy=Number(text.match(/GPS\s*±(\d+)/i)?.[1]||0);dispatch('routing-route-deviation',{distanceMeters:distance,accuracyMeters:accuracy,message:text});
}
function attach(){
 driving=Boolean(document.body?.classList.contains('drive-mode'));
 new MutationObserver(()=>{checkDriving();checkWarning();}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});
 window.addEventListener('beforeunload',()=>{if(driving)dispatch('routing-guidance-stopped',{message:'Navigation page closed during guidance.'});});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();}
