import{distanceMeters,nearestGeometryDistance,normalizeTruckProfile,poundsToKilograms,validateTruckProfile}from'./core.mjs';

const finite=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback};
const positive=(value,fallback=0)=>Math.max(0,finite(value,fallback));
const integer=(value,fallback=0)=>Math.round(positive(value,fallback));
const round=(value,places=2)=>{const factor=10**places;return Math.round(finite(value)*factor)/factor};
const inchesToMeters=inches=>round(positive(inches)*0.0254,2);
const feetToMeters=feet=>round(positive(feet)*0.3048,2);

const TOMTOM_HAZMAT=Object.freeze({
 explosive:'USHazmatClass1',
 gas:'USHazmatClass2',
 flammable:'USHazmatClass3',
 combustible:'USHazmatClass3',
 organic:'USHazmatClass5',
 poison:'USHazmatClass6',
 poisonousInhalation:'USHazmatClass6',
 radioActive:'USHazmatClass7',
 corrosive:'USHazmatClass8',
 harmfulToWater:'USHazmatClass9',
 other:'USHazmatClass9'
});

export function toTomTomVehicleParams(profileInput={}){
 const{profile,errors}=validateTruckProfile(profileInput);if(errors.length)throw new Error(errors[0]);
 const physicalAxleWeights=[
  profile.singleAxleGroupLb,
  profile.tandemAxleGroupLb?profile.tandemAxleGroupLb/2:0,
  profile.tripleAxleGroupLb?profile.tripleAxleGroupLb/3:0
 ].filter(Boolean);
 const heaviestAxleLb=physicalAxleWeights.length?Math.max(...physicalAxleWeights):0;
 const params={
  vehicleWeight:String(poundsToKilograms(profile.currentWeightLb)),
  vehicleNumberOfAxles:String(profile.axleCount),
  vehicleLength:String(feetToMeters(profile.overallLengthFt)),
  vehicleWidth:String(inchesToMeters(profile.widthInches)),
  vehicleHeight:String(inchesToMeters(profile.heightInches)),
  vehicleCommercial:'true'
 };
 if(heaviestAxleLb)params.vehicleAxleWeight=String(poundsToKilograms(heaviestAxleLb));
 if(profile.tunnelCategory)params.vehicleAdrTunnelRestrictionCode=profile.tunnelCategory;
 const loadTypes=[...new Set(profile.hazmatCategories.map(category=>TOMTOM_HAZMAT[category]).filter(Boolean))];
 const warnings=[
  'TomTom fallback receives total weight, axle count, a derived heaviest physical-axle load, and overall dimensions; it does not receive HERE-style axle-group or trailer-detail fields.'
 ];
 if(profile.trailerCount||profile.trailerLengthFt)warnings.push('Trailer restrictions are represented through overall vehicle length and weight in the fallback provider, not separate trailer fields.');
 if(profile.hazmatCategories.length)warnings.push('Legacy generic hazmat selections are mapped to U.S. Hazmat classes for fallback routing. Confirm the exact DOT class before departure.');
 return{profile,params,loadTypes,warnings};
}

const coordinateOf=point=>{
 const lat=finite(point?.latitude??point?.lat,NaN),lng=finite(point?.longitude??point?.lon??point?.lng,NaN);
 return Number.isFinite(lat)&&Number.isFinite(lng)?[lat,lng]:null;
};
const pointIndexFor=(instruction,geometry)=>{
 const explicit=integer(instruction?.pointIndex,-1);
 if(explicit>=0&&explicit<geometry.length)return explicit;
 const coordinate=coordinateOf(instruction?.point);if(!coordinate)return 0;
 const nearest=nearestGeometryDistance(coordinate,geometry);
 return Number.isFinite(nearest?.index)?nearest.index:0;
};
const notice=(code,title,severity='info')=>({code,title,severity});

export function normalizeTomTomRoute(payload,profileInput={}){
 const route=payload?.routes?.[0];if(!route)throw new Error('The commercial routing fallback returned no route.');
 const geometry=[];
 for(const leg of route.legs||[]){
  const points=(leg.points||[]).map(coordinateOf).filter(Boolean);
  if(geometry.length&&points.length&&geometry.at(-1)[0]===points[0][0]&&geometry.at(-1)[1]===points[0][1])points.shift();
  geometry.push(...points);
 }
 if(geometry.length<2)throw new Error('The fallback provider route has no usable geometry.');
 const summary=route.summary||{},instructions=route.guidance?.instructions||[],steps=[];
 for(let index=0;index<instructions.length;index++){
  const item=instructions[index],next=instructions[index+1],geometryIndex=pointIndexFor(item,geometry);
  const routeOffset=positive(item.routeOffsetInMeters),nextOffset=positive(next?.routeOffsetInMeters,routeOffset);
  const travelTime=positive(item.travelTimeInSeconds),nextTime=positive(next?.travelTimeInSeconds,travelTime);
  const coordinate=coordinateOf(item.point)||geometry[geometryIndex]||geometry.at(-1);
  steps.push({
   action:String(item.maneuver||item.instructionType||'continue').toLowerCase(),
   instruction:String(item.message||item.combinedMessage||item.maneuver||'Continue'),
   direction:String(item.maneuver||''),
   road:String(item.street||item.signpostText||(item.roadNumbers||[]).join(' / ')||''),
   lengthMeters:Math.max(0,nextOffset-routeOffset),
   durationSeconds:Math.max(0,nextTime-travelTime),
   coordinate,
   geometryIndex,
   announcements:{
    early:item.earlyWarningAnnouncement||null,
    main:item.mainAnnouncement||null,
    confirmation:item.confirmationAnnouncement||null
   }
  });
 }
 const notices=[];
 for(const section of route.sections||[]){
  const sectionType=String(section.sectionType||'').toUpperCase();
  const travelMode=String(section.travelMode||'').toLowerCase();
  if(sectionType==='PEDESTRIAN'||(travelMode&&travelMode!=='truck'))notices.push(notice('nonTruckSection','The fallback route contains a section not confirmed for truck travel.','critical'));
 }
 if(!instructions.length)notices.push(notice('missingGuidance','The fallback provider returned route geometry without turn-by-turn guidance.','critical'));
 const criticalNotices=notices.filter(item=>item.severity==='critical');
 const speedLimits=(route.sections||[]).filter(section=>String(section.sectionType||'').toUpperCase()==='SPEED_LIMIT').map(section=>({
  startPointIndex:integer(section.startPointIndex),
  endPointIndex:integer(section.endPointIndex),
  maxSpeedLimitInKmh:positive(section.maxSpeedLimitInKmh)
 }));
 const laneGuidance=(route.sections||[]).filter(section=>String(section.sectionType||'').toUpperCase()==='LANES').map(section=>({
  startPointIndex:integer(section.startPointIndex),
  endPointIndex:integer(section.endPointIndex),
  lanes:Array.isArray(section.lanes)?section.lanes:[],
  laneSeparators:Array.isArray(section.laneSeparators)?section.laneSeparators:[]
 }));
 return{
  schema:'dl-commercial-route/v1',
  provider:'TomTom Routing API v1',
  providerRouteId:'',
  routeClass:'commercial-restriction-aware-fallback',
  calculatedAt:new Date().toISOString(),
  profile:normalizeTruckProfile(profileInput),
  distanceMeters:Math.round(positive(summary.lengthInMeters)),
  durationSeconds:Math.round(positive(summary.travelTimeInSeconds)),
  baseDurationSeconds:Math.round(Math.max(0,positive(summary.travelTimeInSeconds)-positive(summary.trafficDelayInSeconds))),
  geometry,
  steps,
  notices,
  criticalNotices,
  speedLimits,
  laneGuidance,
  guidanceEligible:criticalNotices.length===0&&steps.length>0
 };
}
