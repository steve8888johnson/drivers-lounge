import test from'node:test';
import assert from'node:assert/strict';
import{auditCommercialRoute,officialRestrictionSources}from'../src/assets/routing/restrictions.mjs';

const profile={heightInches:162,widthInches:102,trailerCount:1,hazmatCategories:[]};
const routeFor=(road,geometry=[[38.9,-77.1],[38.92,-77.05]])=>({distanceMeters:10000,geometry,steps:[{road,instruction:`Continue on ${road}`,lengthMeters:10000,geometryIndex:0}]});

test('National Park Service commercial parkways block ordinary truck guidance',()=>{
 for(const road of['George Washington Memorial Parkway','Clara Barton Parkway','Spout Run Parkway']){
  const audit=auditCommercialRoute(routeFor(road),profile);
  assert.equal(audit.status,'blocked');
  assert.ok(audit.criticalNotices.some(item=>item.code==='officialNationalParkCommercialVehicleRestriction'));
  assert.ok(audit.sources.some(source=>source.id==='nationalCapital'));
 }
});

test('Baltimore-Washington Parkway explicit road name blocks commercial vehicles',()=>{
 const audit=auditCommercialRoute(routeFor('Baltimore-Washington Parkway',[[38.95,-76.82],[39.08,-76.75]]),profile);
 assert.equal(audit.status,'blocked');
 assert.ok(audit.criticalNotices.some(item=>item.code==='officialCommercialRoadProhibition'&&item.sourceId==='baltimoreWashington'));
});

test('Pennsylvania Turnpike tunnel cannot be cleared from a broad hazmat category',()=>{
 const audit=auditCommercialRoute(routeFor('Allegheny Mountain Tunnel',[[40.0,-78.55],[40.02,-78.5]]),{...profile,hazmatCategories:['flammable']});
 assert.equal(audit.status,'blocked');
 assert.ok(audit.criticalNotices.some(item=>item.code==='officialHazmatTunnelClassificationRequired'));
 assert.ok(audit.sources.some(source=>source.id==='paTurnpike'));
});

test('expanded official sources retain verifiable agency URLs',()=>{
 assert.match(officialRestrictionSources.nationalCapital.url,/nps\.gov/);
 assert.match(officialRestrictionSources.baltimoreWashington.url,/nps\.gov/);
 assert.match(officialRestrictionSources.paTurnpike.url,/paturnpike\.com/);
});
