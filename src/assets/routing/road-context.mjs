const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:null};
const normalizeIndex=value=>Math.max(0,Math.round(Number(value)||0));
const fold=value=>String(value||'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();

export function mphFromKmh(value){
 const kmh=finite(value);return kmh&&kmh>0?Math.round(kmh*0.621371):null;
}

function coversIndex(section,index){
 const point=normalizeIndex(index),start=normalizeIndex(section?.startPointIndex),end=Math.max(start,normalizeIndex(section?.endPointIndex));
 return point>=start&&point<=end;
}

export function providerSpeedLimitAt(route,index){
 const section=(route?.speedLimits||[]).find(item=>coversIndex(item,index));
 if(!section)return null;
 const mph=mphFromKmh(section.maxSpeedLimitInKmh);if(!mph)return null;
 return{mph,kmh:Math.round(Number(section.maxSpeedLimitInKmh)),startPointIndex:normalizeIndex(section.startPointIndex),endPointIndex:normalizeIndex(section.endPointIndex),advisory:'Provider-supplied speed limit. Posted signs and lower truck-specific limits control.'};
}

function laneDirections(lane){
 const raw=[];
 if(typeof lane?.follow==='string')raw.push(lane.follow);
 else if(Array.isArray(lane?.follow))raw.push(...lane.follow);
 if(Array.isArray(lane?.directions))raw.push(...lane.directions);
 return[...new Set(raw.map(fold).filter(Boolean))];
}

export function providerLaneContextAt(route,index){
 const section=(route?.laneGuidance||[]).find(item=>coversIndex(item,index));if(!section)return null;
 const lanes=Array.isArray(section.lanes)?section.lanes:[],recommended=[];
 for(const lane of lanes){
  const directions=laneDirections(lane),hasExplicitFollow=typeof lane?.follow==='string'||Array.isArray(lane?.follow)||lane?.follow===true;
  if(hasExplicitFollow)recommended.push(...directions);
 }
 const directions=[...new Set(recommended)].slice(0,4);
 const label=directions.length?`Provider lane guidance: ${directions.join(' / ')}`:`Provider lane guidance available for ${lanes.length||'multiple'} lane${lanes.length===1?'':'s'}`;
 return{label,laneCount:lanes.length,directions,startPointIndex:normalizeIndex(section.startPointIndex),endPointIndex:normalizeIndex(section.endPointIndex),advisory:'Use lane guidance only as an aid. Road markings, signs and safe positioning control.'};
}

export function providerRoadContextAt(route,index){
 return{speedLimit:providerSpeedLimitAt(route,index),laneGuidance:providerLaneContextAt(route,index)};
}
