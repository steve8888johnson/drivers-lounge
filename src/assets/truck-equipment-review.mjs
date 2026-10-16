import {reviewFederalAxleWeights} from './truck-axle-review.mjs';
import {reviewLoadMeasurement} from './truck-load-measurement.mjs';

// Preliminary comparisons of supplied measurements and installed-equipment ratings.
// No VIN decoder, tire-table lookup, engineering approval or authenticated evidence.
// GVWR/GAWR/GCWR: 49 CFR571.3. Tire loading/inflation: 49 CFR393.75(g),(i).
const positive=value=>Number.isSafeInteger(value)&&value>0&&value<=1000000;
const reference=value=>typeof value==='string'&&value.trim().length>0&&value.length<=200;
const psi=value=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=300;
const canonicalTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString()===value;
export function reviewEquipmentLimits(measurement,equipment,{now,departure=now}={}){
 const issues=[],comparisons=[];
 const add=(code,message,axle=null)=>issues.push({code,message,axle});
 const result=()=>({status:issues.length?'HOLD':'REVIEW_REQUIRED',guidanceAllowed:false,issues,comparisons,
  // Ratings do not become road restrictions or provider grossWeight parameters.
  binding:issues.length?null:JSON.stringify(equipment),
  remainingChecks:['rating-source authenticity and exact installed equipment','individual vehicle GVWRs within combinations and coupling ratings','tire condition, speed/application limits and wheel/rim suitability','state/local/posted road limits and field verification']});
 const measured=reviewFederalAxleWeights(measurement),freshness=reviewLoadMeasurement(measurement,{now,departure});
 issues.push(...measured.issues,...freshness.issues);
 if(measured.status==='HOLD'||freshness.status==='HOLD')return result();
 if(!equipment||equipment.measurementRevision!==measurement.revision||equipment.loadReference!==measurement.loadReference
  ||equipment.measuredAt!==measurement.measuredAt||equipment.unchangedSinceInspection!==true||!reference(equipment.revision)){
  add('EQUIPMENT_BINDING','Installed ratings and tire measurements must match this exact load, weighing time and configuration.');return result();
 }
 const inspected=Date.parse(equipment.inspectedAt);
 if(!canonicalTime(equipment.inspectedAt)||inspected<Date.parse(measurement.measuredAt)||inspected>now)
  add('EQUIPMENT_INSPECTION_TIME','Record the inspection of this loaded setup at or after weighing, not in the future.');
 const expectedKind=measurement.configuration==='single-unit'?'GVWR':'manufacturer-GCWR';
 const rating=equipment.loadedRating;
 if(rating?.kind!==expectedKind||rating?.appliesTo!=='complete-current-configuration'||!positive(rating?.weightLb)||!reference(rating?.sourceRef))
  add('EQUIPMENT_GROSS_RATING','Use the manufacturer rating for the complete configuration. A tractor GVWR, summed axle ratings or statutory road limit is not a combination rating.');
 else {
  comparisons.push({kind:expectedKind,actualLb:measurement.loadedWeightLb,limitLb:rating.weightLb});
  if(measurement.loadedWeightLb>rating.weightLb)add('EQUIPMENT_GROSS_EXCEEDED','Measured loaded weight exceeds the supplied manufacturer rating.');
 }
 if(!Array.isArray(equipment.axles)||equipment.axles.length!==measurement.axles.length){add('EQUIPMENT_AXLES_MISSING','Supply the installed ratings for every measured axle in order.');return result();}
 const installedIds=new Set();
 for(let i=0;i<measurement.axles.length;i++){
  const axle=equipment.axles[i],actual=measurement.axles[i];
  if(axle?.axleIndex!==i||!positive(axle?.gawrLb)||!reference(axle?.sourceRef)){
   add('GAWR_MISSING','Supply the manufacturer axle rating and its source for this axle.',i+1);continue;
  }
  comparisons.push({kind:'GAWR',axle:i+1,actualLb:actual.weightLb,limitLb:axle.gawrLb});
  if(actual.weightLb>axle.gawrLb)add('GAWR_EXCEEDED','Measured axle weight exceeds the supplied manufacturer axle rating.',i+1);
  // Only single or dual tires on BOTH ends are supported. Never infer equal loads.
  const positions=axle.mounting==='single'?['left','right']:axle.mounting==='dual'?['left-inner','left-outer','right-inner','right-outer']:[];
  if(!positions.length||!Array.isArray(axle.tires)||axle.tires.length!==positions.length){add('TIRE_CONFIGURATION_UNSUPPORTED','Identify each installed tire and its single/dual mounting. Other configurations need separate review.',i+1);continue;}
  let total=0,validLoads=true;
  for(let j=0;j<positions.length;j++){
   const tire=axle.tires[j];
   if(installedIds.has(tire?.installedId))add('TIRE_ID_DUPLICATE','Each installed tire must have a distinct internal identifier.',i+1);
   installedIds.add(tire?.installedId);
   if(tire?.position!==positions[j]||tire?.ratingMounting!==axle.mounting||!reference(tire?.installedId)||!reference(tire?.sourceRef)
    ||!positive(tire?.ratedLoadLb)||!positive(tire?.capacityAtColdPressureLb)){
    add('TIRE_RATING_MISSING','Require a rating for the exact installed tire, mounting and measured cold pressure. Do not use a single-tire rating for a dual fitment.',i+1);validLoads=false;continue;
   }
   if(tire?.loadBasis!=='individual-measurement'||tire?.measuredAt!==measurement.measuredAt||!positive(tire?.measuredLoadLb)){
    add('TIRE_LOAD_UNVERIFIED','Individual tire loading is unverified. Axle or wheel-end totals must not be divided into invented tire measurements.',i+1);validLoads=false;
   }else{
    total+=tire.measuredLoadLb;
    const limit=Math.min(tire.ratedLoadLb,tire.capacityAtColdPressureLb);
    comparisons.push({kind:'tire',axle:i+1,position:tire.position,actualLb:tire.measuredLoadLb,limitLb:limit});
    if(tire.measuredLoadLb>limit)add('TIRE_LOAD_EXCEEDED','A measured tire load exceeds its supplied rating or load-table capacity at the recorded cold pressure.',i+1);
   }
   if(tire.capacityAtColdPressureLb>tire.ratedLoadLb)add('TIRE_CAPACITY_CONFLICT','Cold-pressure capacity cannot exceed the supplied tire load rating in this ordinary-load review.',i+1);
   if(tire.pressureBasis!=='cold-measured'||!psi(tire.coldPsi)||!psi(tire.requiredColdPsiForLoad)||!psi(tire.maxColdPsi)
    ||tire.requiredColdPsiForLoad>tire.maxColdPsi||tire.coldPsi<tire.requiredColdPsiForLoad||tire.coldPsi>tire.maxColdPsi)
    add('TIRE_PRESSURE_UNVERIFIED','Cold pressure must satisfy the applicable manufacturer load table and supplied maximum. Hot-pressure estimates are outside this diagnostic.',i+1);
  }
  if(validLoads&&total!==actual.weightLb)add('TIRE_TOTAL_MISMATCH','Individual tire measurements must equal this measured axle total; no balancing or tolerance is inferred.',i+1);
 }
 return result();
}
