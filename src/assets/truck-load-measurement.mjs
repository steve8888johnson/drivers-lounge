// Internal freshness policy for a preliminary diagnostic, not a legal reweigh interval.
export const MAX_MEASUREMENT_AGE_MS=24*60*60*1000;
const canonicalTime=value=>{
 if(typeof value!=='string')return NaN;
 const time=Date.parse(value);
 return Number.isFinite(time)&&new Date(time).toISOString()===value?time:NaN;
};
export function measurementTimeToUtc(local,offset){
 if(typeof local!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)||typeof offset!=='string'||!/^[-+]\d{2}:\d{2}$/.test(offset)||offset==='-00:00')return null;
 const hour=Number(offset.slice(1,3)),minute=Number(offset.slice(4));
 if(hour>14||minute>59||(hour===14&&minute!==0))return null;
 // Validate the wall-clock calendar before applying an offset (no host timezone).
 const wall=canonicalTime(local+':00.000Z');if(!Number.isFinite(wall))return null;
 const time=wall-(offset[0]==='-'?-1:1)*(hour*60+minute)*60000;
 return new Date(time).toISOString();
}
export function reviewLoadMeasurement(input,{now,departure=now}={}){
 const issues=[];const add=(code,message)=>issues.push({code,message});
 const measured=canonicalTime(input?.measuredAt);
 if(input?.measurementKind!=='individual')add('INDIVIDUAL_MEASUREMENTS_REQUIRED','Group totals cannot establish individual axle weights. Keep the ticket and obtain individual measurements; do not divide a group total.');
 if(typeof input?.loadReference!=='string'||!input.loadReference.trim()||input.loadReference.length>80)add('LOAD_REFERENCE_REQUIRED','Enter an internal reference for this exact load and vehicle setup.');
 if(input?.unchangedSinceWeighing!==true)add('LOAD_CHANGED_OR_UNCONFIRMED','Confirm that the load, fuel, trailer, axle positions and vehicle setup still match the measurements. Changes require new measurements.');
 if(!Number.isFinite(now)||!Number.isFinite(departure)||departure<now||!Number.isFinite(measured)||measured>now||now-measured>=MAX_MEASUREMENT_AGE_MS||departure>=measured+MAX_MEASUREMENT_AGE_MS)
  add('MEASUREMENT_TIME_INVALID','Enter a real weighing time with its time zone. Future times, measurements 24 hours old, or departure after that review window stay on hold.');
 return {status:issues.length?'HOLD':'REVIEW_REQUIRED',guidanceAllowed:false,issues,
  expiresAt:issues.length?null:measured+MAX_MEASUREMENT_AGE_MS,
  binding:issues.length?null:JSON.stringify([input.measurementKind,input.loadReference,input.measuredAt,input.unchangedSinceWeighing])};
}

// Keep reviewed state in memory only. Input edits invalidate it even if edited back.
export function createLoadReviewSession({clock=Date.now}={}){
 let accepted=null,revision=0;
 return {
  invalidate(){accepted=null;revision++;},
  confirm(measurement,context){
   const check=reviewLoadMeasurement(measurement,{now:clock()});
   accepted=check.status==='HOLD'?null:{measurement:structuredClone(measurement),context:JSON.stringify(context),expiresAt:check.expiresAt,revision};
   return check;
  },
  snapshot(context){
   if(!accepted||accepted.revision!==revision||accepted.context!==JSON.stringify(context)||reviewLoadMeasurement(accepted.measurement,{now:clock()}).status==='HOLD'){
    accepted=null;return null;
   }
   return structuredClone(accepted.measurement);
  }
 };
}
