import test from'node:test';
import assert from'node:assert/strict';
import{normalizeHereSearch,normalizeTomTomSearch,searchTruckLocations}from'../api/truck-location-search.mjs';

const tomtom={results:[
 {type:'POI',id:'facility',matchConfidence:{score:.98},poi:{name:'Truck Stop'},address:{freeformAddress:'4701 Peoria St, Denver, CO 80239'},entryPoints:[{position:{lat:39.78,lon:-104.85}}]},
 {type:'Geography',id:'city',matchConfidence:{score:.99},address:{freeformAddress:'Denver, CO'},position:{lat:39.74,lon:-104.99}}
]};
const here={items:[
 {resultType:'houseNumber',id:'address',title:'611 East Carlson Street, Cheyenne, WY 82009',position:{lat:41.14,lng:-104.82},scoring:{queryScore:.97}},
 {resultType:'locality',id:'city',title:'Cheyenne, WY',position:{lat:41.14,lng:-104.82},scoring:{queryScore:.95}}
]};

test('search normalizers identify precise facilities and broad city results',()=>{
 const tt=normalizeTomTomSearch(tomtom),hr=normalizeHereSearch(here);
 assert.equal(tt[0].precise,true);assert.equal(tt[1].precise,false);
 assert.equal(hr[0].precise,true);assert.equal(hr[1].precise,false);
 assert.equal(tt[0].label,'4701 Peoria St, Denver, CO 80239');
});

test('location search uses configured provider without exposing its key',async()=>{
 let requested='';const fetcher=async url=>{requested=String(url);return new Response(JSON.stringify(tomtom),{status:200,headers:{'content-type':'application/json'}})};
 const result=await searchTruckLocations('truck stop Denver',{fetcher,providers:[{id:'tomtom',key:'server-secret'}]});
 assert.equal(result.provider,'TomTom Routing API v1');assert.equal(result.results.length,2);assert.equal(result.results[0].precise,true);
 assert.match(requested,/search\/2\/search/);assert.equal(JSON.stringify(result).includes('server-secret'),false);
});

test('location search validates input and fails closed without credentials',async()=>{
 await assert.rejects(()=>searchTruckLocations('x',{providers:[{id:'tomtom',key:'test'}]}),/three characters/i);
 await assert.rejects(()=>searchTruckLocations('Denver',{providers:[]}),/not configured/i);
});
