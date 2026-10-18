const FLEX_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const FLEX_TABLE=Object.freeze(Object.fromEntries([...FLEX_ALPHABET].map((c,i)=>[c,i])));
const HAZMAT_ALLOWED=new Set(['explosive','gas','flammable','combustible','organic','poison','radioActive','corrosive','poisonousInhalation','harmfulToWater','other']);

const finite=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback};
const positive=(value,fallback=0)=>Math.max(0,finite(value,fallback));
const integer=(value,fallback=0)=>Math.round(positive(value,fallback));
const round=(value,places=2)=>{const factor=10**places;return Math.round(finite(value)*factor)/factor};
export const poundsToKilograms=pounds=>Math.round(positive(pounds)*0.45359237);
export const inchesToCentimeters=inches=>Math.round(positive(inches)*2.54);
export const feetToCentimeters=feet=>Math.round(positive(feet)*30.48);
export const feetInchesToInches=(feet,inches)=>integer(feet)*12+integer(inches);

export function normalizeTruckProfile(input={}){
 const heightInches=positive(input.heightInches,feetInchesToInches(input.heightFt,input.heightIn));
 const widthInches=positive(input.widthInches,feetInchesToInches(input.widthFt,input.widthIn));
 const grossWeightLb=integer(input.grossWeightLb||input.weightLb);
 const currentWeightLb=integer(input.currentWeightLb||grossWeightLb);
 const hazmatCategories=[...new Set(Array.isArray(input.hazmatCategories)?input.hazmatCategories:[])].filter(value=>HAZMAT_ALLOWED.has(value));
 return{
  schema:'dl-truck-profile/v1',
  name:String(input.name||'Saved truck').trim().slice(0,80),
  preset:String(input.preset||'custom').trim().slice(0,40),
  heightInches:round(heightInches,1),
  widthInches:round(widthInches,1),
  overallLengthFt:round(positive(input.overallLengthFt||input.lengthFt),1),
  trailerLengthFt:round(positive(input.trailerLengthFt),1),
  grossWeightLb,
  currentWeightLb,
  axleCount:integer(input.axleCount||input.axles),
  trailerAxleCount:integer(input.trailerAxleCount),
  trailerCount:integer(input.trailerCount),
  singleAxleGroupLb:integer(input.singleAxleGroupLb),
  tandemAxleGroupLb:integer(input.tandemAxleGroupLb),
  tripleAxleGroupLb:integer(input.tripleAxleGroupLb),
  hazmatCategories,
  tunnelCategory:['B','C','D','E'].includes(input.tunnelCategory)?input.tunnelCategory:'',
  avoidTolls:Boolean(input.avoidTolls),
  routePreference:input.routePreference==='short'?'short':'fast',
  permittedLoad:Boolean(input.permittedLoad)
 };
}

export function validateTruckProfile(profileInput={}){
 const profile=normalizeTruckProfile(profileInput),errors=[],warnings=[];
 const range=(field,min,max,label)=>{const value=profile[field];if(!value)errors.push(`${label} is required.`);else if(value<min||value>max)errors.push(`${label} is outside the supported planning range (${min}–${max}).`)};
 range('heightInches',48,240,'Overall height (inches)');
 range('widthInches',48,240,'Overall width (inches)');
 range('overallLengthFt',10,300,'Overall length (feet)');
 range('grossWeightLb',1000,1000000,'Gross weight (lb)');
 range('currentWeightLb',1000,1000000,'Current weight (lb)');
 range('axleCount',2,20,'Axle count');
 if(profile.currentWeightLb>profile.grossWeightLb)errors.push('Current loaded weight cannot exceed the gross-weight value sent to the routing provider.');
 if(profile.trailerAxleCount>profile.axleCount)errors.push('Trailer axle count cannot exceed total axle count.');
 if(profile.trailerCount>4)errors.push('Trailer count above 4 is not supported by this routing candidate.');
 if(profile.permittedLoad)errors.push('Permitted or oversize/overweight loads must use the issued-permit workflow; automatic truck routing cannot replace the permit route.');
 if(profile.heightInches>162||profile.widthInches>102||profile.grossWeightLb>80000)warnings.push('This profile may require one or more permits. Confirm every jurisdiction before moving.');
 if(!profile.singleAxleGroupLb&&!profile.tandemAxleGroupLb&&!profile.tripleAxleGroupLb)warnings.push('Axle-group weights are missing; bridge and axle-group restriction evaluation may be incomplete.');
 if(profile.hazmatCategories.length===0&&profile.tunnelCategory)warnings.push('A tunnel category was entered without a hazardous-goods category. Verify the cargo profile.');
 return{profile,errors,warnings,ready:errors.length===0};
}

export function toHereVehicleParams(profileInput={}){
 const{profile,errors}=validateTruckProfile(profileInput);if(errors.length)throw new Error(errors[0]);
 const params={
  'vehicle[height]':String(inchesToCentimeters(profile.heightInches)),
  'vehicle[width]':String(inchesToCentimeters(profile.widthInches)),
  'vehicle[length]':String(feetToCentimeters(profile.overallLengthFt)),
  'vehicle[grossWeight]':String(poundsToKilograms(profile.grossWeightLb)),
  'vehicle[currentWeight]':String(poundsToKilograms(profile.currentWeightLb)),
  'vehicle[axleCount]':String(profile.axleCount),
  'vehicle[trailerCount]':String(profile.trailerCount)
 };
 if(profile.trailerAxleCount)params['vehicle[trailerAxleCount]']=String(profile.trailerAxleCount);
 if(profile.trailerLengthFt)params['vehicle[trailerLength]']=String(feetToCentimeters(profile.trailerLengthFt));
 const axleGroups=[];
 if(profile.singleAxleGroupLb)axleGroups.push(`single:${poundsToKilograms(profile.singleAxleGroupLb)}`);
 if(profile.tandemAxleGroupLb)axleGroups.push(`tandem:${poundsToKilograms(profile.tandemAxleGroupLb)}`);
 if(profile.tripleAxleGroupLb)axleGroups.push(`triple:${poundsToKilograms(profile.tripleAxleGroupLb)}`);
 if(axleGroups.length)params['vehicle[weightPerAxleGroup]']=axleGroups.join(';');
 if(profile.hazmatCategories.length)params['vehicle[shippedHazardousGoods]']=profile.hazmatCategories.join(',');
 if(profile.tunnelCategory)params['vehicle[tunnelCategory]']=profile.tunnelCategory;
 return params;
}

function decodeUnsigned(encoded,state){
 let result=0,shift=0;
 while(state.index<encoded.length){
  const value=FLEX_TABLE[encoded[state.index++]];
  if(value===undefined)throw new Error('Invalid flexible polyline character.');
  result+=(value&31)*2**shift;
  if((value&32)===0)return result;
  shift+=5;if(shift>52)throw new Error('Flexible polyline value exceeds safe precision.');
 }
 throw new Error('Truncated flexible polyline.');
}
function decodeSigned(value){const negative=value%2===1,magnitude=Math.floor(value/2);return negative?-magnitude-1:magnitude}

export function decodeFlexiblePolyline(encoded){
 if(typeof encoded!=='string'||!encoded.length)throw new Error('Missing route geometry.');
 const state={index:0};
 const version=decodeUnsigned(encoded,state);if(version!==1)throw new Error(`Unsupported flexible polyline version ${version}.`);
 const header=decodeUnsigned(encoded,state),precision=header&15,thirdDimension=(header>>4)&7,thirdPrecision=(header>>7)&15;
 const factor=10**precision,thirdFactor=10**thirdPrecision,points=[];let lat=0,lng=0,third=0;
 while(state.index<encoded.length){
  lat+=decodeSigned(decodeUnsigned(encoded,state));lng+=decodeSigned(decodeUnsigned(encoded,state));
  if(thirdDimension){third+=decodeSigned(decodeUnsigned(encoded,state));points.push([lat/factor,lng/factor,third/thirdFactor]);}
  else points.push([lat/factor,lng/factor]);
 }
 if(points.length<2)throw new Error('Route geometry contains fewer than two points.');
 return{precision,thirdDimension,thirdPrecision,points};
}

const roadLabel=road=>road?.name?.[0]?.value||road?.number?.[0]?.value||road?.toward?.[0]?.value||'';
const safeNotice=notice=>({code:String(notice?.code||'providerNotice'),title:String(notice?.title||notice?.code||'Provider notice'),severity:notice?.severity==='critical'?'critical':'info'});

export function normalizeHereRoute(payload,profileInput={}){
 const route=payload?.routes?.[0];if(!route)throw new Error('The commercial routing provider returned no route.');
 const geometry=[],steps=[],notices=[...(payload.notices||[]).map(safeNotice)];let distanceMeters=0,durationSeconds=0,baseDurationSeconds=0,globalOffset=0;
 for(const section of route.sections||[]){
  const decoded=decodeFlexiblePolyline(section.polyline),sectionPoints=decoded.points.map(point=>[point[0],point[1]]);
  if(geometry.length&&sectionPoints.length&&geometry.at(-1)[0]===sectionPoints[0][0]&&geometry.at(-1)[1]===sectionPoints[0][1])sectionPoints.shift();
  const sectionStart=geometry.length;geometry.push(...sectionPoints);
  const summary=section.travelSummary||section.summary||{};distanceMeters+=positive(summary.length);durationSeconds+=positive(summary.duration);baseDurationSeconds+=positive(summary.baseDuration);
  notices.push(...(section.notices||[]).map(safeNotice));
  const actions=section.turnByTurnActions||section.actions||[];
  for(const action of actions){
   const offset=Math.min(Math.max(0,integer(action.offset)),Math.max(0,sectionPoints.length-1));
   const coordinate=geometry[sectionStart+offset]||geometry.at(-1);
   steps.push({
    action:String(action.action||'continue'),instruction:String(action.instruction||'Continue'),direction:String(action.direction||''),
    road:roadLabel(action.nextRoad)||roadLabel(action.currentRoad),lengthMeters:positive(action.length),durationSeconds:positive(action.duration),
    coordinate,geometryIndex:sectionStart+offset
   });
  }
  globalOffset+=sectionPoints.length;
 }
 if(geometry.length<2)throw new Error('The provider route has no usable geometry.');
 const critical=notices.filter(item=>item.severity==='critical');
 return{
  schema:'dl-commercial-route/v1',provider:'HERE Routing API v8',providerRouteId:String(route.id||''),routeClass:'commercial-restriction-aware',
  calculatedAt:new Date().toISOString(),profile:normalizeTruckProfile(profileInput),distanceMeters:Math.round(distanceMeters),durationSeconds:Math.round(durationSeconds),baseDurationSeconds:Math.round(baseDurationSeconds),
  geometry,steps,notices,criticalNotices:critical,guidanceEligible:critical.length===0&&steps.length>0
 };
}

export function distanceMeters(a,b){
 const rad=value=>value*Math.PI/180,dLat=rad(b[0]-a[0]),dLng=rad(b[1]-a[1]);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export function nearestGeometryDistance(position,geometry=[]){
 if(!Array.isArray(geometry)||geometry.length<2)return Infinity;
 const stride=Math.max(1,Math.floor(geometry.length/1200));let best=Infinity,bestIndex=0;
 for(let index=0;index<geometry.length;index+=stride){const distance=distanceMeters(position,geometry[index]);if(distance<best){best=distance;bestIndex=index}}
 for(let index=Math.max(0,bestIndex-stride);index<=Math.min(geometry.length-1,bestIndex+stride);index++){const distance=distanceMeters(position,geometry[index]);if(distance<best){best=distance;bestIndex=index}}
 return{distance:best,index:bestIndex};
}

export function routeSummary(route){
 if(!route)return{miles:0,hours:0};
 return{miles:round(positive(route.distanceMeters)/1609.344,1),hours:round(positive(route.durationSeconds)/3600,1)};
}
