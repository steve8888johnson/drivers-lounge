import test from'node:test';
import assert from'node:assert/strict';
import{calculateTruckRoute}from'../api/truck-route.mjs';

const profile={heightFt:13,heightIn:6,widthFt:8,widthIn:6,overallLengthFt:72,trailerLengthFt:53,grossWeightLb:80000,currentWeightLb:78000,axleCount:5,trailerAxleCount:2,trailerCount:1,singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0,hazmatCategories:[],routePreference:'fast'};
const routePayload={routes:[{summary:{lengthInMeters:10000,travelTimeInSeconds:600,trafficDelayInSeconds:0},legs:[{points:[{latitude:41.14,longitude:-104.82},{latitude:40.9,longitude:-104.5}]}],sections:[],guidance:{instructions:[{routeOffsetInMeters:0,travelTimeInSeconds:0,point:{latitude:41.14,longitude:-104.82},pointIndex:0,maneuver:'DEPART',message:'Depart',street:'I-25'},{routeOffsetInMeters:10000,travelTimeInSeconds:600,point:{latitude:40.9,longitude:-104.5},pointIndex:1,maneuver:'ARRIVE',message:'Arrive',street:'I-25'}]}}]};

function geocode(label,type,lat,lon){return{results:[{type,id:label,matchConfidence:{score:1},address:{freeformAddress:label},position:{lat,lon}}]};}

test('server returns a route preview but blocks live guidance for a city-only destination',async()=>{
 let geocodeCall=0;
 const fetcher=async url=>{
  const href=String(url);
  if(href.includes('/search/2/geocode/')){
   geocodeCall++;
   const payload=geocodeCall===1?geocode('611 East Carlson Street, Cheyenne, WY','Point Address',41.14,-104.82):geocode('Denver, CO','Geography',39.74,-104.99);
   return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response(JSON.stringify(routePayload),{status:200,headers:{'content-type':'application/json'}});
 };
 const result=await calculateTruckRoute({origin:{address:'611 E Carlson St, Cheyenne, WY'},destination:{address:'Denver, CO'},profile},{fetcher,provider:'tomtom',apiKey:'test'});
 assert.equal(result.route.guidanceEligible,false);
 assert.equal(result.stopAudit.status,'blocked');
 assert.equal(result.route.criticalNotices.at(-1).code,'destinationStopNotPrecise');
});

test('server keeps guidance eligible for two precise resolved stops',async()=>{
 let geocodeCall=0;
 const fetcher=async url=>{
  const href=String(url);
  if(href.includes('/search/2/geocode/')){
   geocodeCall++;
   const payload=geocodeCall===1?geocode('611 East Carlson Street, Cheyenne, WY','Point Address',41.14,-104.82):geocode('4701 Peoria Street, Denver, CO','Point Address',39.78,-104.85);
   return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response(JSON.stringify(routePayload),{status:200,headers:{'content-type':'application/json'}});
 };
 const result=await calculateTruckRoute({origin:{address:'611 E Carlson St, Cheyenne, WY'},destination:{address:'4701 Peoria St, Denver, CO'},profile},{fetcher,provider:'tomtom',apiKey:'test'});
 assert.equal(result.stopAudit.status,'clear');
 assert.equal(result.route.guidanceEligible,true);
 assert.equal(result.route.criticalNotices.length,0);
});
