import test from'node:test';
import assert from'node:assert/strict';
import{calculateTruckRoute}from'../api/truck-route.mjs';
import{applyCommercialRouteAudit,auditCommercialRoute}from'../src/assets/routing/restrictions.mjs';

const profile={heightFt:13,heightIn:6,heightInches:162,widthFt:8,widthIn:6,widthInches:102,overallLengthFt:72,trailerLengthFt:53,grossWeightLb:80000,currentWeightLb:78000,axleCount:5,trailerAxleCount:2,trailerCount:1,singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0,hazmatCategories:[],routePreference:'fast'};
const baseRoute=(geometry,steps,distanceMeters=10000)=>({schema:'dl-commercial-route/v1',provider:'Test provider',routeClass:'commercial-restriction-aware',calculatedAt:new Date().toISOString(),profile,distanceMeters,durationSeconds:900,baseDurationSeconds:850,geometry,steps,notices:[],criticalNotices:[],guidanceEligible:true});

const texasTomTomPayload={routes:[{summary:{lengthInMeters:385000,travelTimeInSeconds:13400,trafficDelayInSeconds:300},legs:[{points:[{latitude:32.7767,longitude:-96.797},{latitude:31.5,longitude:-96.1},{latitude:29.7604,longitude:-95.3698}]}],sections:[{sectionType:'SPEED_LIMIT',startPointIndex:0,endPointIndex:2,maxSpeedLimitInKmh:105}],guidance:{instructions:[{routeOffsetInMeters:0,travelTimeInSeconds:0,point:{latitude:32.7767,longitude:-96.797},pointIndex:0,maneuver:'DEPART',message:'Leave Dallas',street:'I-45'},{routeOffsetInMeters:385000,travelTimeInSeconds:13400,point:{latitude:29.7604,longitude:-95.3698},pointIndex:2,maneuver:'ARRIVE',message:'Arrive Houston',street:'I-45'}]}}]};

test('independent audit blocks a New York City commercial parkway',()=>{
 const route=baseRoute([[40.82,-73.91],[40.66,-73.85]],[{road:'Belt Parkway',instruction:'Continue',lengthMeters:10000,geometryIndex:0}]);
 const audit=auditCommercialRoute(route,profile);
 assert.equal(audit.regions.newYorkCity,true);
 assert.equal(audit.status,'blocked');
 assert.equal(audit.criticalNotices[0].code,'officialCommercialRoadProhibition');
 const applied=applyCommercialRouteAudit(route,profile);
 assert.equal(applied.guidanceEligible,false);
});

test('independent audit does not mistake a sign toward Storrow Drive for travel on Storrow Drive',()=>{
 const route=baseRoute([[42.37,-71.05],[42.36,-71.09]],[{road:'Charles River Dam Road',instruction:'Keep left toward Storrow Drive',lengthMeters:10000,geometryIndex:0}]);
 const audit=auditCommercialRoute(route,{...profile,trailerCount:0,axleCount:3});
 assert.equal(audit.regions.boston,true);
 assert.equal(audit.criticalNotices.length,0);
 assert.equal(audit.status,'clear');
});

test('independent audit blocks actual Boston river-road travel',()=>{
 const route=baseRoute([[42.37,-71.05],[42.35,-71.12]],[{road:'Storrow Drive',instruction:'Continue west',lengthMeters:10000,geometryIndex:0}]);
 const audit=auditCommercialRoute(route,{...profile,trailerCount:0,axleCount:3});
 assert.equal(audit.status,'blocked');
 assert.equal(audit.criticalNotices[0].code,'officialLowClearanceTruckProhibition');
});

test('independent audit blocks I-895 tunnel corridor for an 8 foot 6 inch truck',()=>{
 const route=baseRoute([[39.31,-76.69],[39.23,-76.55]],[{road:'I-895 / Baltimore Harbor Tunnel Thruway',instruction:'Continue',lengthMeters:10000,geometryIndex:0}]);
 const audit=auditCommercialRoute(route,profile);
 assert.equal(audit.regions.baltimore,true);
 assert.ok(audit.criticalNotices.some(item=>item.code==='officialBaltimoreTunnelVehicleRestriction'));
});

test('independent audit fails closed when named-road coverage is too low in a high-risk region',()=>{
 const route=baseRoute([[40.82,-73.91],[40.66,-73.85]],[{road:'I-278',instruction:'Continue',lengthMeters:1000,geometryIndex:0}],10000);
 const audit=auditCommercialRoute(route,profile);
 assert.equal(audit.status,'blocked');
 assert.ok(audit.criticalNotices.some(item=>item.code==='independentAuditCoverageInsufficient'));
});

test('retryable primary outage uses the configured commercial fallback',async()=>{
 let calls=0;
 const fetcher=async url=>{
  calls++;
  if(String(url).includes('router.hereapi.com'))return new Response(JSON.stringify({title:'Temporary provider outage'}),{status:503,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify(texasTomTomPayload),{status:200,headers:{'content-type':'application/json'}});
 };
 const result=await calculateTruckRoute({origin:{lat:32.7767,lng:-96.797,label:'Dallas'},destination:{lat:29.7604,lng:-95.3698,label:'Houston'},profile},{fetcher,providers:[{id:'here',key:'here-test'},{id:'tomtom',key:'tomtom-test'}]});
 assert.equal(calls,2);
 assert.equal(result.route.provider,'TomTom Routing API v1');
 assert.equal(result.route.providerFallback.used,true);
 assert.match(result.profileWarnings[0],/HERE Routing API v8 was unavailable/i);
 assert.equal(JSON.stringify(result).includes('here-test'),false);
 assert.equal(JSON.stringify(result).includes('tomtom-test'),false);
});

test('non-retryable provider rejection does not switch engines and invent a route',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;return new Response(JSON.stringify({title:'Vehicle profile cannot be routed'}),{status:400,headers:{'content-type':'application/json'}});};
 await assert.rejects(()=>calculateTruckRoute({origin:{lat:32.7767,lng:-96.797,label:'Dallas'},destination:{lat:29.7604,lng:-95.3698,label:'Houston'},profile},{fetcher,providers:[{id:'here',key:'here-test'},{id:'tomtom',key:'tomtom-test'}]}),/cannot be routed/i);
 assert.equal(calls,1);
});
