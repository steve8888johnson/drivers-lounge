import test from 'node:test';import assert from 'node:assert/strict';
import {reviewEquipmentLimits} from '../src/assets/truck-equipment-review.mjs';
import {measuredAxlesFixture,equipmentFixture} from './fixtures/truck-axles.mjs';
const now=Date.parse('2026-10-13T12:00:00Z');
const run=(m=measuredAxlesFixture(),e=equipmentFixture(m))=>reviewEquipmentLimits(m,e,{now});
test('complete synthetic ratings remain preliminary and never grant travel clearance',()=>{
 const r=run();assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.guidanceAllowed,false);assert.equal(r.comparisons.length,24);assert(r.remainingChecks.length>0);
});
test('manufacturer rating must cover the whole configuration, not a tractor or statutory limit',()=>{
 for(const change of [e=>e.loadedRating.kind='GVWR',e=>e.loadedRating.kind='statutory-limit',e=>e.loadedRating.appliesTo='power-unit',e=>e.loadedRating.sourceRef='',e=>e.loadedRating.weightLb=77000,e=>e.loadedRating.weightLb='100000']){const m=measuredAxlesFixture(),e=equipmentFixture(m);change(e);assert.equal(run(m,e).status,'HOLD');}
});
test('single trucks require GVWR and cannot reuse a combination rating',()=>{
 const m=measuredAxlesFixture();m.configuration='single-unit';m.axles=m.axles.slice(0,3);m.loadedWeightLb=45000;const e=equipmentFixture(m);assert.equal(run(m,e).status,'HOLD');e.loadedRating.kind='GVWR';assert.equal(run(m,e).status,'REVIEW_REQUIRED');
});
test('legal-baseline axle totals do not override lower manufacturer ratings',()=>{
 const m=measuredAxlesFixture(),e=equipmentFixture(m);e.axles[0].gawrLb=11000;const r=run(m,e);assert.equal(r.status,'HOLD');assert(r.issues.some(x=>x.code==='GAWR_EXCEEDED'));
});
test('an overloaded tire is caught even when axle and combined tire capacities are sufficient',()=>{
 const m=measuredAxlesFixture(),e=equipmentFixture(m);e.axles[0].tires[0].measuredLoadLb=6600;e.axles[0].tires[1].measuredLoadLb=5400;
 const r=run(m,e);assert.equal(r.status,'HOLD');assert(r.issues.some(x=>x.code==='TIRE_LOAD_EXCEEDED'));assert(!r.issues.some(x=>x.code==='TIRE_TOTAL_MISMATCH'));
});
test('group-only or divided loads, swapped fitment, duplicate tire ids and missing tire records hold',()=>{
 for(const change of [e=>e.axles[1].tires[0].loadBasis='axle-divided-by-four',e=>e.axles[1].tires[0].loadBasis='wheel-end-measurement',e=>delete e.axles[1].tires[0].measuredLoadLb,e=>e.axles[1].tires[0].ratingMounting='single',e=>e.axles[1].tires[0].position='right-inner',e=>e.axles[1].tires[0].installedId=e.axles[0].tires[0].installedId,e=>e.axles[1].tires.pop(),e=>e.axles[1].tires[0]=null]){
 const m=measuredAxlesFixture(),e=equipmentFixture(m);change(e);assert.equal(run(m,e).status,'HOLD');}
});
test('inflation and load-table values cannot be defaulted, exceeded or hot-corrected silently',()=>{
 for(const [key,value] of [['pressureBasis','hot-measured'],['coldPsi',94],['coldPsi',121],['coldPsi','100'],['requiredColdPsiForLoad',121],['maxColdPsi',0],['capacityAtColdPressureLb',6600],['capacityAtColdPressureLb',5000],['ratedLoadLb',NaN]]){
 const m=measuredAxlesFixture(),e=equipmentFixture(m);e.axles[0].tires[1][key]=value;assert.equal(run(m,e).status,'HOLD',key+':'+value);}
});
test('installed equipment and weighing data must match without silently balancing totals',()=>{
 for(const change of [e=>e.loadReference='other',e=>e.measurementRevision='other',e=>e.unchangedSinceInspection=false,e=>e.inspectedAt='2026-10-13T13:00:00.000Z',e=>e.inspectedAt='2026-10-13T09:00:00.000Z',e=>e.inspectedAt='2026-02-30T10:00:00.000Z',e=>e.axles[0].tires[0].measuredAt='2026-10-13T11:00:00.000Z',e=>e.axles[0].tires[0].measuredLoadLb=5801,e=>e.axles[0].axleIndex=1,e=>e.axles.pop()]){const m=measuredAxlesFixture(),e=equipmentFixture(m);change(e);assert.equal(run(m,e).status,'HOLD');}
 for(const e of [null,{},[],undefined])assert.equal(reviewEquipmentLimits(measuredAxlesFixture(),e,{now}).status,'HOLD');
});
