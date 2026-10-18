import test from'node:test';import assert from'node:assert/strict';
import{decodeFlexiblePolyline,normalizeHereRoute,normalizeTruckProfile,toHereVehicleParams,validateTruckProfile}from'../src/assets/routing/core.mjs';
import{buildHereRouteURL,calculateTruckRoute}from'../api/truck-route.mjs';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function encUnsigned(value){let output='';do{let chunk=value&31;value=Math.floor(value/32);if(value)chunk|=32;output+=alphabet[chunk]}while(value);return output}
function encSigned(value){return encUnsigned(value<0?(-value*2-1):value*2)}
function encode(points,precision=5){let output=encUnsigned(1)+encUnsigned(precision),lastLat=0,lastLng=0;const factor=10**precision;for(const point of points){const lat=Math.round(point[0]*factor),lng=Math.round(point[1]*factor);output+=encSigned(lat-lastLat)+encSigned(lng-lastLng);lastLat=lat;lastLng=lng}return output}

const profile={heightFt:13,heightIn:6,widthFt:8,widthIn:6,overallLengthFt:72,trailerLengthFt:53,grossWeightLb:80000,currentWeightLb:78000,axleCount:5,trailerAxleCount:2,trailerCount:1,singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0,hazmatCategories:[],routePreference:'fast'};
const points=[[32.7767,-96.797],[32.9,-96.7],[33.1,-96.5]];
const polyline=encode(points);
const herePayload={routes:[{id:'route-1',sections:[{polyline,travelSummary:{length:12345,duration:900,baseDuration:840},turnByTurnActions:[{action:'depart',instruction:'Head north',offset:0,length:500,duration:40},{action:'turn',instruction:'Turn right onto I-30',offset:1,length:11845,duration:860}],notices:[]}]}]};

test('truck profile normalizes and converts provider units',()=>{const normalized=normalizeTruckProfile(profile);assert.equal(normalized.heightInches,162);assert.equal(normalized.widthInches,102);assert.equal(normalized.trailerCount,1);const validation=validateTruckProfile(normalized);assert.equal(validation.ready,true);const params=toHereVehicleParams(normalized);assert.equal(params['vehicle[height]'],'411');assert.equal(params['vehicle[width]'],'259');assert.equal(params['vehicle[axleCount]'],'5');assert.match(params['vehicle[weightPerAxleGroup]'],/^single:\d+;tandem:\d+$/)});

test('permitted loads are blocked from automatic truck routing',()=>{const validation=validateTruckProfile({...profile,permittedLoad:true});assert.equal(validation.ready,false);assert.match(validation.errors.join(' '),/issued-permit workflow/i)});

test('flexible polyline round trips route points',()=>{const decoded=decodeFlexiblePolyline(polyline).points;assert.equal(decoded.length,points.length);for(let i=0;i<points.length;i++){assert.ok(Math.abs(decoded[i][0]-points[i][0])<0.00001);assert.ok(Math.abs(decoded[i][1]-points[i][1])<0.00001)}});

test('HERE response normalizes into guidance route',()=>{const route=normalizeHereRoute(herePayload,profile);assert.equal(route.provider,'HERE Routing API v8');assert.equal(route.routeClass,'commercial-restriction-aware');assert.equal(route.guidanceEligible,true);assert.equal(route.geometry.length,3);assert.equal(route.steps[1].instruction,'Turn right onto I-30');assert.equal(route.distanceMeters,12345)});

test('critical provider notice blocks guidance',()=>{const payload=structuredClone(herePayload);payload.routes[0].sections[0].notices=[{code:'violatedVehicleRestriction',title:'Vehicle restriction violated',severity:'critical'}];const route=normalizeHereRoute(payload,profile);assert.equal(route.guidanceEligible,false);assert.equal(route.criticalNotices.length,1)});

test('route request includes full commercial profile without exposing a browser key',()=>{const url=buildHereRouteURL({origin:{lat:32.7,lng:-96.8},destination:{lat:29.7,lng:-95.3},profile},'server-secret');assert.equal(url.searchParams.get('transportMode'),'truck');assert.equal(url.searchParams.get('vehicle[height]'),'411');assert.equal(url.searchParams.get('vehicle[currentWeight]'),String(Math.round(78000*0.45359237)));assert.equal(url.searchParams.get('apiKey'),'server-secret');assert.equal(url.searchParams.get('units'),'imperial')});

test('server adapter geocodes, routes and returns only normalized data',async()=>{let calls=0;const fetcher=async url=>{calls++;const href=String(url);if(href.includes('geocode.search.hereapi.com')){const isDallas=href.includes('Dallas');return new Response(JSON.stringify({items:[{title:isDallas?'Dallas, TX':'Houston, TX',resultType:'locality',position:isDallas?{lat:32.7767,lng:-96.797}:{lat:29.7604,lng:-95.3698},scoring:{queryScore:.99}}]}),{status:200,headers:{'content-type':'application/json'}})}return new Response(JSON.stringify(herePayload),{status:200,headers:{'content-type':'application/json'}})};const result=await calculateTruckRoute({origin:{address:'Dallas, TX'},destination:{address:'Houston, TX'},profile},{fetcher,apiKey:'test-key'});assert.equal(calls,3);assert.equal(result.origin.label,'Dallas, TX');assert.equal(result.destination.label,'Houston, TX');assert.equal(result.route.providerRouteId,'route-1');assert.equal(JSON.stringify(result).includes('test-key'),false)});

test('server adapter fails closed without provider credentials',async()=>{await assert.rejects(()=>calculateTruckRoute({origin:{address:'Dallas'},destination:{address:'Houston'},profile},{apiKey:''}),/not configured/i)});
