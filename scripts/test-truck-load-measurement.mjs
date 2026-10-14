import test from 'node:test';import assert from 'node:assert/strict';
import {measurementTimeToUtc,reviewLoadMeasurement,createLoadReviewSession,MAX_MEASUREMENT_AGE_MS} from '../src/assets/truck-load-measurement.mjs';
import {measuredAxlesFixture} from './fixtures/truck-axles.mjs';
const now=Date.parse('2026-10-13T12:00:00Z');
test('weighing time uses explicit offset, rejects calendar rollover and ambiguous offsets',()=>{
 assert.equal(measurementTimeToUtc('2026-10-13T04:00','-06:00'),'2026-10-13T10:00:00.000Z');
 assert.equal(measurementTimeToUtc('2026-10-13T23:30','+14:00'),'2026-10-13T09:30:00.000Z');
 for(const [local,offset] of [['2026-02-30T10:00','+00:00'],['2026-10-13T25:00','+00:00'],['2026-10-13T10:00',''],['2026-10-13T10:00','-00:00'],['2026-10-13T10:00','+14:01'],['2026-10-13T10:00','-06:60'],['2026-10-13','-06:00']])assert.equal(measurementTimeToUtc(local,offset),null);
});
test('freshness holds future, stale, missing, changed and grouped measurements, never authorizes guidance',()=>{
 const valid=reviewLoadMeasurement(measuredAxlesFixture(),{now});assert.equal(valid.status,'REVIEW_REQUIRED');assert.equal(valid.guidanceAllowed,false);
 for(const change of [x=>x.measuredAt='2026-10-13T13:00:00.000Z',x=>x.measuredAt='2026-10-12T12:00:00.000Z',x=>x.measuredAt='2026-02-30T12:00:00.000Z',x=>delete x.measuredAt,x=>x.measurementKind='grouped',x=>x.loadReference='',x=>x.unchangedSinceWeighing=false]){const x=measuredAxlesFixture();change(x);assert.equal(reviewLoadMeasurement(x,{now}).status,'HOLD');}
 assert.equal(reviewLoadMeasurement(measuredAxlesFixture(),{now,departure:now+MAX_MEASUREMENT_AGE_MS}).status,'HOLD');
 assert.equal(reviewLoadMeasurement(measuredAxlesFixture(),{now:NaN}).status,'HOLD');
});
test('load review is isolated, expires at boundary, and an edit-back cannot restore confirmation',()=>{
 let clock=now;const session=createLoadReviewSession({clock:()=>clock}),m=measuredAxlesFixture(),context={weight:'78000'};
 session.confirm(m,context);m.axles[0].weightLb=1;
 const a=session.snapshot(context);assert.equal(a.axles[0].weightLb,12000);a.axles[0].weightLb=2;assert.equal(session.snapshot(context).axles[0].weightLb,12000);
 assert.equal(session.snapshot({weight:'79000'}),null);assert.equal(session.snapshot(context),null);
 session.confirm(measuredAxlesFixture(),context);session.invalidate();assert.equal(session.snapshot(context),null);
 session.confirm(measuredAxlesFixture(),context);clock=Date.parse('2026-10-14T10:00:00Z')-1;assert(session.snapshot(context));clock++;assert.equal(session.snapshot(context),null);
});
test('clock rollback and a new page session cannot reuse accepted measurements',()=>{
 let clock=now;const s=createLoadReviewSession({clock:()=>clock});s.confirm(measuredAxlesFixture(),{});clock=Date.parse('2026-10-13T09:00:00Z');assert.equal(s.snapshot({}),null);
 assert.equal(createLoadReviewSession({clock:()=>now}).snapshot({}),null);
});
