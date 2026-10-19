import test from'node:test';
import assert from'node:assert/strict';
import{crossCheckPresentation}from'../src/assets/routing/route-cross-check-ui.mjs';
import{dispatchRouteResponse}from'../src/assets/routing/route-stop-adapter.mjs';

test('single-provider routes are labeled unverified without inventing confidence',()=>{
 const view=crossCheckPresentation({status:'single-provider',providers:['TomTom Routing API v1']});
 assert.equal(view.tone,'warning');
 assert.equal(view.badge,'Not independently verified');
 assert.match(view.title,/single-provider/i);
 assert.match(view.body,/TomTom Routing API v1/);
});

test('aligned dual-provider routes show measured comparison details',()=>{
 const view=crossCheckPresentation({status:'aligned',providers:['HERE Routing API v8','TomTom Routing API v1'],metrics:{distanceDeltaPct:3.24,p95SeparationMeters:820,roadNameOverlapPct:76.66}});
 assert.equal(view.tone,'good');assert.equal(view.badge,'Cross-checked');
 assert.match(view.body,/distance difference 3.2%/);
 assert.match(view.body,/820 m/);
 assert.match(view.body,/76.7%/);
});

test('review and blocked results visibly lock guidance',()=>{
 for(const status of['review','blocked']){
  const view=crossCheckPresentation({status,reasons:['Provider route disagreement.']});
  assert.equal(view.tone,'bad');assert.equal(view.badge,'Guidance locked');assert.match(view.body,/disagreement/i);
 }
});

test('route response event publishes normalized payload without exposing fetch internals',()=>{
 const events=[];
 class FakeCustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
 const root={defaultView:{CustomEvent:FakeCustomEvent},dispatchEvent:event=>{events.push(event);return true;}};
 const payload={crossCheck:{status:'aligned'}};
 assert.equal(dispatchRouteResponse(root,payload),true);
 assert.equal(events.length,1);assert.equal(events[0].type,'routing-route-response');assert.equal(events[0].detail,payload);
 assert.equal(dispatchRouteResponse(null,payload),false);
});
