import test from'node:test';
import assert from'node:assert/strict';
import{clearSelectedStop,consensusRequestTarget,selectedStopFromInput,transformTruckRouteRequest,writeSelectedStop}from'../src/assets/routing/route-stop-adapter.mjs';

const input=(value,dataset={})=>({value,dataset:{...dataset}});

test('exact selected commercial stop becomes a coordinate payload',()=>{
 const destination=input('4701 Peoria St, Denver, CO 80239',{
  selectedLat:'39.781',selectedLng:'-104.847',selectedLabel:'4701 Peoria St, Denver, CO 80239',
  selectedType:'Point Address',selectedPrecise:'true',selectedConfidence:'0.98',selectedId:'denver-stop'
 });
 assert.deepEqual(selectedStopFromInput(destination),{
  lat:39.781,lng:-104.847,label:'4701 Peoria St, Denver, CO 80239',resultType:'Point Address',confidence:0.98,id:'denver-stop'
 });
 const body=transformTruckRouteRequest({origin:{address:'Cheyenne, WY'},destination:{address:'Denver, CO'}},{destinationInput:destination});
 assert.equal(body.origin.address,'Cheyenne, WY');
 assert.equal(body.destination.lat,39.781);
 assert.equal(body.destination.label,'4701 Peoria St, Denver, CO 80239');
});

test('edited, broad or invalid selections fail closed to normal server geocoding',()=>{
 for(const candidate of[
  input('Denver, CO',{selectedLat:'39.74',selectedLng:'-104.99',selectedLabel:'Denver, CO',selectedPrecise:'false'}),
  input('4701 Peoria Street',{selectedLat:'39.78',selectedLng:'-104.85',selectedLabel:'4701 Peoria St',selectedPrecise:'true'}),
  input('Bad coordinate',{selectedLat:'999',selectedLng:'-104.85',selectedLabel:'Bad coordinate',selectedPrecise:'true'})
 ])assert.equal(selectedStopFromInput(candidate),null);
 const fallback={origin:{address:'Cheyenne'},destination:{address:'Denver'}};
 assert.deepEqual(transformTruckRouteRequest(fallback,{destinationInput:input('Denver')}),fallback);
});

test('selection metadata writes, clears and survives safe stop swapping',()=>{
 const origin=input(''),destination=input('');
 writeSelectedStop(origin,{lat:41.14,lng:-104.82,label:'611 E Carlson St, Cheyenne, WY 82009',resultType:'Point Address',precise:true,confidence:1,id:'origin'});
 assert.equal(origin.dataset.selectedLabel,'611 E Carlson St, Cheyenne, WY 82009');
 assert.equal(origin.dataset.selectedPrecise,'true');
 clearSelectedStop(origin);
 assert.deepEqual(origin.dataset,{});
 writeSelectedStop(destination,{lat:39.78,lng:-104.85,label:'4701 Peoria St, Denver, CO 80239',resultType:'POI',precise:true});
 assert.equal(selectedStopFromInput({...destination,value:'4701 Peoria St, Denver, CO 80239'}).resultType,'POI');
});

test('request transformation never mutates the caller body',()=>{
 const body={origin:{address:'A'},destination:{address:'B'},profile:{heightInches:162}};
 const exact=input('Exact',{selectedLat:'1',selectedLng:'2',selectedLabel:'Exact',selectedPrecise:'true'});
 const transformed=transformTruckRouteRequest(body,{originInput:exact});
 assert.notEqual(transformed,body);
 assert.deepEqual(body,{origin:{address:'A'},destination:{address:'B'},profile:{heightInches:162}});
 assert.equal(transformed.origin.lat,1);
});

test('standard route requests are upgraded to the consensus endpoint only',()=>{
 assert.equal(consensusRequestTarget('/api/truck-route'),'/api/truck-route-consensus');
 assert.equal(consensusRequestTarget('/api/truck-route?test=1'),'/api/truck-route-consensus?test=1');
 assert.equal(consensusRequestTarget('/api/truck-route-health'),'/api/truck-route-health');
 assert.equal(consensusRequestTarget('/api/truck-location-search'),'/api/truck-location-search');
 const absolute=consensusRequestTarget('https://example.com/api/truck-route?x=1');
 assert.equal(absolute,'https://example.com/api/truck-route-consensus?x=1');
});
