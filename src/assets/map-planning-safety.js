(function(root){
 'use strict';
 // Planning UX limits, not navigation certification or proof of a truck entrance.
 const MAX_AGE_MS=60000, MAX_ACCURACY_M=100;
 const coordinate=(value,max)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=max;
 function assessPosition(position,now=Date.now()){
  const c=position?.coords;
  if(!coordinate(c?.latitude,90)||!coordinate(c?.longitude,180)||
     !Number.isFinite(c?.accuracy)||c.accuracy<=0||
     !Number.isFinite(position?.timestamp)||!Number.isFinite(now)||
     position.timestamp>now||now-position.timestamp>=MAX_AGE_MS){
   return {usable:false,message:'Location is missing, invalid or out of date. Try again or type your starting address.'};
  }
  if(c.accuracy>MAX_ACCURACY_M)return {usable:false,message:'Location is too uncertain to use as your starting point. Type the exact address or try again outdoors while parked.'};
  return {usable:true,latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,
   timestamp:position.timestamp,expiresAt:position.timestamp+MAX_AGE_MS,
   message:'Device location: reported accuracy about '+Math.ceil(c.accuracy)+' m. This does not confirm the road or truck entrance.'};
 }
 function assessNetwork(data){
  return data?.ok===true&&coordinate(data.latitude,90)&&coordinate(data.longitude,180)
   ? {usable:true,latitude:data.latitude,longitude:data.longitude}: {usable:false};
 }
 // A load-complete event can follow tile errors. It must not erase the warning.
 function mapState(previous,event){
  if(event==='offline')return 'offline';
  if(event==='online')return 'retry';
  if(previous==='offline')return previous;
  if(event==='retry')return 'loading';
  if(event==='error'||event==='timeout')return 'failed';
  if(previous==='failed'||previous==='retry')return previous;
  if(event==='loading')return 'loading';
  if(event==='loaded')return 'ready';
  return previous;
 }
 root.DLMapPlanningSafety=Object.freeze({MAX_AGE_MS,MAX_ACCURACY_M,assessPosition,assessNetwork,mapState});
})(typeof window==='undefined'?globalThis:window);
