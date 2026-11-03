import{sha256Hex}from'./route-safety-record.mjs';

const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const round=(value,digits=5)=>{const number=Number(value);return Number.isFinite(number)?Number(number.toFixed(digits)):null;};
const safeDetails=value=>{
 const source=value&&typeof value==='object'?value:{};const out={};
 for(const[key,item]of Object.entries(source).slice(0,30)){
  if(/address|label|email|phone|vin|plate|name/i.test(key))continue;
  if(typeof item==='string')out[key]=clean(item).slice(0,240);
  else if(typeof item==='number'||typeof item==='boolean'||item===null)out[key]=item;
 }
 return out;
};
export function sanitizeIncidentPosition(position){
 const coords=position?.coords||position||{};return{lat:round(coords.latitude??coords.lat),lng:round(coords.longitude??coords.lng),accuracyMeters:round(coords.accuracy,1),speedMph:Number.isFinite(Number(coords.speed))?round(Number(coords.speed)*2.23694,1):null,heading:round(coords.heading,1)};
}
export async function createIncidentEvent({routeId='',type,position=null,details={},previousHash='',at=new Date(),sequence=1}={}){
 const core={schema:'dl-route-incident/v1',routeId:clean(routeId),sequence:Math.max(1,Math.round(Number(sequence)||1)),at:new Date(at).toISOString(),type:clean(type||'unknown').slice(0,80),position:position?sanitizeIncidentPosition(position):null,details:safeDetails(details),previousHash:clean(previousHash)};
 const eventHash=await sha256Hex(core);return Object.freeze({...core,eventHash});
}
export async function appendIncidentEvent(events=[],input={}){
 const list=Array.isArray(events)?events:[],previous=list.at(-1);const event=await createIncidentEvent({...input,previousHash:previous?.eventHash||'',sequence:list.length+1});return[...list,event];
}
export async function verifyIncidentChain(events=[]){
 let previous='';for(let index=0;index<events.length;index++){
  const event=events[index],copy={...event};delete copy.eventHash;
  if(copy.previousHash!==previous)return{valid:false,index,reason:'Previous-event hash mismatch.'};
  const expected=await sha256Hex(copy);if(expected!==event.eventHash)return{valid:false,index,reason:'Event integrity hash mismatch.'};previous=event.eventHash;
 }
 return{valid:true,count:events.length,lastHash:previous};
}
