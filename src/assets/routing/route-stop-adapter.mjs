const SELECTION_KEYS=['selectedLat','selectedLng','selectedLabel','selectedType','selectedPrecise','selectedConfidence','selectedId'];

const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:null};
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();

export function selectedStopFromInput(input){
 if(!input)return null;
 const label=clean(input.value),selectedLabel=clean(input.dataset?.selectedLabel);
 if(!label||label!==selectedLabel||String(input.dataset?.selectedPrecise)!=='true')return null;
 const lat=finite(input.dataset?.selectedLat),lng=finite(input.dataset?.selectedLng);
 if(lat===null||lng===null||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 const confidence=Math.max(0,Math.min(1,Number(input.dataset?.selectedConfidence??1)||0));
 return{
  lat,lng,label,
  resultType:clean(input.dataset?.selectedType)||'coordinate',
  confidence,
  id:clean(input.dataset?.selectedId)
 };
}

export function clearSelectedStop(input){
 if(!input?.dataset)return;
 for(const key of SELECTION_KEYS)delete input.dataset[key];
}

export function writeSelectedStop(input,selection){
 clearSelectedStop(input);if(!input||!selection)return;
 input.dataset.selectedLat=String(selection.lat);
 input.dataset.selectedLng=String(selection.lng);
 input.dataset.selectedLabel=clean(selection.label);
 input.dataset.selectedType=clean(selection.resultType||'coordinate');
 input.dataset.selectedPrecise=String(selection.precise!==false);
 input.dataset.selectedConfidence=String(selection.confidence??1);
 if(selection.id)input.dataset.selectedId=clean(selection.id);
}

export function transformTruckRouteRequest(body,{originInput,destinationInput}={}){
 const request=body&&typeof body==='object'?structuredClone(body):{};
 const origin=selectedStopFromInput(originInput),destination=selectedStopFromInput(destinationInput);
 if(origin)request.origin=origin;
 if(destination)request.destination=destination;
 return request;
}

function routeRequestUrl(input){
 try{
  const value=typeof input==='string'||input instanceof URL?String(input):String(input?.url||'');
  return new URL(value,globalThis.location?.origin||'https://drivers-lounge.invalid');
 }catch{return null;}
}

export function installRouteStopRequestAdapter({root=globalThis.document,scope=globalThis}={}){
 if(!root||typeof scope.fetch!=='function'||scope.__dlRouteStopAdapterInstalled)return false;
 const nativeFetch=scope.fetch.bind(scope);scope.__dlRouteStopAdapterInstalled=true;
 scope.fetch=(input,init={})=>{
  const url=routeRequestUrl(input),method=String(init?.method||input?.method||'GET').toUpperCase();
  if(url?.pathname==='/api/truck-route'&&method==='POST'&&typeof init?.body==='string'){
   try{
    const parsed=JSON.parse(init.body),originInput=root.getElementById('origin'),destinationInput=root.getElementById('destination');
    init={...init,body:JSON.stringify(transformTruckRouteRequest(parsed,{originInput,destinationInput}))};
   }catch{/* The route endpoint performs its own JSON validation. */}
  }
  return nativeFetch(input,init);
 };
 return true;
}

export function installStopSwapAdapter({root=globalThis.document}={}){
 const button=root?.getElementById('swap-stops'),origin=root?.getElementById('origin'),destination=root?.getElementById('destination');
 if(!button||!origin||!destination||button.dataset.stopSwapAdapter==='true')return false;
 button.dataset.stopSwapAdapter='true';
 button.addEventListener('click',()=>{
  const originSelection=selectedStopFromInput(origin),destinationSelection=selectedStopFromInput(destination);
  queueMicrotask(()=>{
   if(destinationSelection&&clean(origin.value)===destinationSelection.label)writeSelectedStop(origin,destinationSelection);else clearSelectedStop(origin);
   if(originSelection&&clean(destination.value)===originSelection.label)writeSelectedStop(destination,originSelection);else clearSelectedStop(destination);
  });
 });
 return true;
}

export function installRouteStopAdapters(options={}){
 return{
  request:installRouteStopRequestAdapter(options),
  swap:installStopSwapAdapter(options)
 };
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const attach=()=>installRouteStopAdapters();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
}
