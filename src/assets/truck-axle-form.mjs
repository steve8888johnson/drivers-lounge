import {reviewFederalAxleWeights} from './truck-axle-review.mjs';
import {measurementTimeToUtc,reviewLoadMeasurement} from './truck-load-measurement.mjs';
export const TRUCK_CONTEXT_FIELDS=['truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle','trailer-type','oversize','hazmat','vehicle-preset'];
const number=(value,{integer=false}={})=>{
 if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))return NaN;
 const n=Number(value);return Number.isFinite(n)&&(!integer||Number.isSafeInteger(n))?n:NaN;
};
export function reviewAxleForm(draft,profile,{now,revision='draft'}={}){
 const issues=[];const add=message=>issues.push({code:'AXLE_FORM_INVALID',message});
 const result=()=>({status:'HOLD',guidanceAllowed:false,issues,measurement:null,groups:[]});
 if(!draft||!profile){add('Enter truck details and current axle measurements.');return result();}
 if(draft.kind!=='individual'){add('Grouped-ticket totals are notes only. They cannot clear individual axle or interior bridge checks; do not split a group total.');return result();}
 const count=number(profile['truck-axles'],{integer:true}),weight=number(profile['truck-weight'],{integer:true}),length=number(profile['truck-length']);
 if(!Number.isInteger(count)||count<2||count>20||!Array.isArray(draft.axles)||draft.axles.length!==count){add('Axle rows must match the truck axle count (2–20).');return result();}
 if(profile.oversize!==false||profile.hazmat!==false)add('Use the separate permit workflow for oversize, overweight or placarded hazmat loads.');
 const allowed={'single-unit':['none'],'tractor-semitrailer':['semi-53','reefer','flatbed','tanker'],'truck-trailer':['hotshot']};
 if(!allowed[draft.configuration]?.includes(profile['trailer-type']))add('Select a configuration matching the attached trailer. Unlisted configurations need separate review.');
 const measurement={scope:'federal-interstate-baseline',configuration:draft.configuration,
  confirmed:draft.confirmed===true,exceptionClaimed:false,revision,loadedWeightLb:weight,
  measurementKind:draft.kind,loadReference:draft.loadReference,measuredAt:measurementTimeToUtc(draft.localTime,draft.offset),unchangedSinceWeighing:draft.confirmed===true,
  axles:Array.from(draft.axles,row=>({positionIn:number(row?.positionIn),weightLb:number(row?.weightLb,{integer:true}),measured:draft.confirmed===true}))};
 if(!Number.isFinite(length)||length<=0||measurement.axles.at(-1).positionIn>length*12)add('Axle span must fit within the overall vehicle length.');
 const freshness=reviewLoadMeasurement(measurement,{now});issues.push(...freshness.issues);
 const baseline=reviewFederalAxleWeights(measurement);issues.push(...baseline.issues);
 if(issues.length)return result();
 return {...baseline,issues,measurement,expiresAt:freshness.expiresAt};
}
