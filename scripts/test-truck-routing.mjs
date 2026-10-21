import test from'node:test';import assert from'node:assert/strict';
import{decodeFlexiblePolyline,normalizeHereRoute,normalizeTruckProfile,toHereVehicleParams,validateTruckProfile}from'../src/assets/routing/core.mjs';
import{normalizeTomTomRoute,toTomTomVehicleParams}from'../src/assets/routing/tomtom.mjs';
import{buildHereRouteURL,buildTomTomRouteURL,calculateTruckRoute,resolveTruckStop}from'../api/truck-route.mjs';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function encUnsigned(value){let output='';do{let chunk=value&31;value=Math.floor(value/32);if(value)chunk|=32;output+=alphabet[chunk]}while(value);return output}
function encSigned(value){return encUnsigned(value<0?(-value*2-1):value*2)}
function encode(points,precision=5){let output=encUnsigned(1)+encUnsigned(precision),lastLat=0,lastLng=0;const factor=10**precision;for(const point of points){const lat=Math.round(point[0]*factor),lng=Math.round(point[1]*factor);output+=encSigned(lat-lastLat)+encSigned(lng-lastLng);lastLat=lat;lastLng=lng}return output}

const profile={heightFt:13,heightIn:6,widthFt:8,widthIn:6,overallLengthFt:72,trailerLengthFt:53,grossWeightLb:80000,currentWeightLb:78000,axleCount:5,trailerAxleCount:2,trailerCount:1,singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0,hazmatCategories:[],routePreference:'fast'};
const points=[[32.7767,-96.797],[32.9,-96.7],[33.1,-96.5]];
const polyline=encode(points);
const herePayload={routes:[{id:'route-1',sections:[{polyline,travelSummary:{length:12345,duration:900,baseDuration:840},turnByTurnActions:[{action:'depart',instruction:'Head north',offset:0,length:500,duration:40},{action:'turn',instruction:'Turn right onto I-30',offset:1,length:11845,duration:860}],notices:[]}]}]};
const tomtomPayload={routes:[{summary:{lengthInMeters:12345,travelTimeInSeconds:900,trafficDelayInSeconds:60},legs:[{points:points.map(([latitude,longitude])=>({latitude,longitude}))}],sections:[{sectionType:'SPEED_LIMIT',startPointIndex:0,endPointIndex:1,maxSpeedLimitInKmh:105},{sectionType:'LANES',startPointIndex:1,endPointIndex:2,lanes:[{directions:['STRAIGHT'],follow:'STRAIGHT'}],laneSeparators:[]}],guidance:{instructions:[{routeOffsetInMeters:0,travelTimeInSeconds:0,point:{latitude:points[0][0],longitude:points[0][1]},pointIndex:0,instructionType:'DEPART',maneuver:'DEPART',message:'Leave Dallas'},{routeOffsetInMeters:500,travelTimeInSeconds:40,point:{latitude:points[1][0],longitude:points[1][1]},pointIndex:1,instructionType:'TURN',maneuver:'TURN_RIGHT',message:'Turn right onto I-30',street:'I-30'},{routeOffsetInMeters:12345,travelTimeInSeconds:900,point:{latitude:points[2][0],longitude:points[2][1]},pointIndex:2,instructionType:'ARRIVE',maneuver:'ARRIVE',message:'You have arrived'}]}}]};

test('truck profile normalizes and converts HERE provider units',()=>{const normalized=normalizeTruckProfile(profile);assert.equal(normalized.heightInches,162);assert.equal(normalized.widthInches,102);assert.equal(normalized.trailerCount,1);const validation=validateTruckProfile(normalized);assert.equal(validation.ready,true);const params=toHereVehicleParams(normalized);assert.equal(params['vehicle[height]'],'411');assert.equal(params['vehicle[width]'],'259');assert.equal(params['vehicle[axleCount]'],'5');assert.equal(params['vehicle[commercial]'],'true');assert.match(params['vehicle[weightPerAxleGroup]'],/^single:\d+,tandem:\d+$/)});

test('TomTom fallback profile converts dimensions, axle count and hazmat',()=>{const result=toTomTomVehicleParams({...profile,hazmatCategories:['flammable']});assert.equal(result.params.vehicleWeight,String(Math.round(78000*0.45359237)));assert.equal(result.params.vehicleNumberOfAxles,'5');assert.equal(result.params.vehicleCommercial,'true');assert.equal(result.params.vehicleLength,'21.95');assert.equal(result.params.vehicleWidth,'2.59');assert.equal(result.params.vehicleHeight,'4.11');assert.deepEqual(result.loadTypes,['USHazmatClass3']);assert.ok(Number(result.params.vehicleAxleWeight)>0);assert.ok(result.warnings.length>=2)});

test('permitted loads are blocked from automatic truck routing',()=>{const validation=validateTruckProfile({...profile,permittedLoad:true});assert.equal(validation.ready,false);assert.match(validation.errors.join(' '),/issued-permit workflow/i)});

test('standard routing fails closed above conservative legal-size and weight baselines',()=>{
 for(const unsafe of[
  {...profile,heightFt:14,heightIn:0},
  {...profile,widthFt:9,widthIn:0},
  {...profile,currentWeightLb:81000,grossWeightLb:90000},
  {...profile,singleAxleGroupLb:21000},
  {...profile,tandemAxleGroupLb:35000}
 ]){
  const validation=validateTruckProfile(unsafe);assert.equal(validation.ready,false);assert.match(validation.errors.join(' '),/issued-permit workflow/i);
 }
});

test('higher rated capacity can use standard routing when actual load and axle groups stay within baseline',()=>{const validation=validateTruckProfile({...profile,grossWeightLb:105500,currentWeightLb:78000});assert.equal(validation.ready,true);assert.match(validation.warnings.join(' '),/gross-weight capacity exceeds 80,000/i)});

test('flexible polyline round trips route points',()=>{const decoded=decodeFlexiblePolyline(polyline).points;assert.equal(decoded.length,points.length);for(let i=0;i<points.length;i++){assert.ok(Math.abs(decoded[i][0]-points[i][0])<0.00001);assert.ok(Math.abs(decoded[i][1]-points[i][1])<0.00001)}});

test('HERE response normalizes into guidance route',()=>{const route=normalizeHereRoute(herePayload,profile);assert.equal(route.provider,'HERE Routing API v8');assert.equal(route.routeClass,'commercial-restriction-aware');assert.equal(route.guidanceEligible,true);assert.equal(route.geometry.length,3);assert.equal(route.steps[1].instruction,'Turn right onto I-30');assert.equal(route.distanceMeters,12345)});

test('critical HERE provider notice blocks guidance',()=>{const payload=structuredClone(herePayload);payload.routes[0].sections[0].notices=[{code:'violatedVehicleRestriction',title:'Vehicle restriction violated',severity:'critical'}];const route=normalizeHereRoute(payload,profile);assert.equal(route.guidanceEligible,false);assert.equal(route.criticalNotices.length,1)});

test('HERE legal-violation notice blocks guidance even when provider severity is informational',()=>{const payload=structuredClone(herePayload);payload.routes[0].sections[0].notices=[{code:'violatedAdminWideVehicleRestriction',title:'Violated admin-wide vehicle restriction.',severity:'info'}];const route=normalizeHereRoute(payload,profile);assert.equal(route.guidanceEligible,false);assert.equal(route.criticalNotices.length,1);assert.equal(route.criticalNotices[0].providerSeverity,'info');assert.equal(route.criticalNotices[0].blocking,true)});

test('TomTom response normalizes into guidance, lanes and speed limits',()=>{const route=normalizeTomTomRoute(tomtomPayload,profile);assert.equal(route.provider,'TomTom Routing API v1');assert.equal(route.routeClass,'commercial-restriction-aware-fallback');assert.equal(route.guidanceEligible,true);assert.equal(route.geometry.length,3);assert.equal(route.steps[1].instruction,'Turn right onto I-30');assert.equal(route.distanceMeters,12345);assert.equal(route.speedLimits[0].maxSpeedLimitInKmh,105);assert.equal(route.laneGuidance.length,1)});

test('HERE route request includes full commercial profile and safe baseline avoids',()=>{const url=buildHereRouteURL({origin:{lat:32.7,lng:-96.8},destination:{lat:29.7,lng:-95.3},profile},'server-secret');assert.equal(url.searchParams.get('transportMode'),'truck');assert.equal(url.searchParams.get('vehicle[height]'),'411');assert.equal(url.searchParams.get('vehicle[currentWeight]'),String(Math.round(78000*0.45359237)));assert.equal(url.searchParams.get('vehicle[commercial]'),'true');assert.equal(url.searchParams.get('avoid[features]'),'dirtRoad,uTurns');assert.equal(url.searchParams.get('apiKey'),'server-secret');assert.equal(url.searchParams.get('units'),'imperial')});

test('TomTom route request includes truck profile without weakening restrictions',()=>{const url=buildTomTomRouteURL({origin:{lat:32.7,lng:-96.8},destination:{lat:29.7,lng:-95.3},profile:{...profile,avoidTolls:true,hazmatCategories:['gas']}},'server-secret');assert.equal(url.searchParams.get('travelMode'),'truck');assert.equal(url.searchParams.get('vehicleNumberOfAxles'),'5');assert.equal(url.searchParams.get('vehicleCommercial'),'true');assert.deepEqual(url.searchParams.getAll('avoid'),['unpavedRoads','tollRoads']);assert.deepEqual(url.searchParams.getAll('sectionType'),['lanes','speedLimit','traffic']);assert.deepEqual(url.searchParams.getAll('vehicleLoadType'),['USHazmatClass2']);assert.equal(url.searchParams.get('key'),'server-secret')});

test('HERE server adapter geocodes, routes and returns only normalized data',async()=>{let calls=0;const fetcher=async url=>{calls++;const href=String(url);if(href.includes('geocode.search.hereapi.com')){const isDallas=href.includes('Dallas');return new Response(JSON.stringify({items:[{title:isDallas?'Dallas, TX':'Houston, TX',resultType:'locality',position:isDallas?{lat:32.7767,lng:-96.797}:{lat:29.7604,lng:-95.3698},scoring:{queryScore:.99}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify(herePayload),{status:200,headers:{'content-type':'application/json'}})};const result=await calculateTruckRoute({origin:{address:'Dallas, TX'},destination:{address:'Houston, TX'},profile},{fetcher,apiKey:'test-key'});assert.equal(calls,3);assert.equal(result.origin.label,'Dallas, TX');assert.equal(result.destination.label,'Houston, TX');assert.equal(result.route.providerRouteId,'route-1');assert.equal(JSON.stringify(result).includes('test-key'),false)});

test('TomTom fallback adapter geocodes, routes and exposes limitations',async()=>{let calls=0;const fetcher=async url=>{calls++;const href=String(url);if(href.includes('/search/2/geocode/')){const isDallas=decodeURIComponent(href).includes('Dallas');return new Response(JSON.stringify({results:[{type:'Geography',id:isDallas?'dallas':'houston',matchConfidence:{score:.99},address:{freeformAddress:isDallas?'Dallas, TX':'Houston, TX'},position:isDallas?{lat:32.7767,lon:-96.797}:{lat:29.7604,lon:-95.3698}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify(tomtomPayload),{status:200,headers:{'content-type':'application/json'}})};const result=await calculateTruckRoute({origin:{address:'Dallas, TX'},destination:{address:'Houston, TX'},profile},{fetcher,apiKey:'test-key',provider:'tomtom'});assert.equal(calls,3);assert.equal(result.route.provider,'TomTom Routing API v1');assert.equal(result.origin.label,'Dallas, TX');assert.ok(result.profileWarnings.some(value=>/fallback receives/i.test(value)));assert.equal(JSON.stringify(result).includes('test-key'),false)});

test('server adapter fails closed without provider credentials',async()=>{await assert.rejects(()=>calculateTruckRoute({origin:{address:'Dallas'},destination:{address:'Houston'},profile},{apiKey:''}),/not configured/i)});

test('missing or invalid coordinate input is rejected before provider lookup',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('Unexpected provider lookup')};
 for(const stop of[{lat:null,lng:null},{lat:'',lng:''},{lat:' ',lng:' '},{lat:false,lng:true},{lat:91,lng:0},{lat:0,lng:181},{lat:32.7},{lng:-96.8}]){
  await assert.rejects(()=>resolveTruckStop(stop,{id:'tomtom',key:'test'},fetcher),/valid latitude and longitude/i);
 }
 assert.equal(calls,0);
});
test('valid zero coordinates remain usable',async()=>{
 const stop=await resolveTruckStop({lat:0,lng:0},null);
 assert.equal(stop.lat,0);assert.equal(stop.lng,0);
});
test('TomTom instructions without pointIndex resolve to their coordinate',()=>{
 const payload=structuredClone(tomtomPayload);
 for(const step of payload.routes[0].guidance.instructions)delete step.pointIndex;
 const route=normalizeTomTomRoute(payload,profile);
 assert.deepEqual(route.steps.map(step=>step.geometryIndex),[0,1,2]);
});
test('invalid TomTom pointIndex does not move later maneuvers to route start',()=>{
 for(const value of[null,'',false,-1,0.4,999]){
  const payload=structuredClone(tomtomPayload);
  payload.routes[0].guidance.instructions[1].pointIndex=value;
  const route=normalizeTomTomRoute(payload,profile);
  assert.equal(route.steps[1].geometryIndex,1);
 }
});
