import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPermit } from '../src/assets/permits/core.mjs';
import { mergePermitIntake, createCameraSession } from '../src/assets/permits/intake.mjs';
import { readFileSync } from 'node:fs';
import jsQR from '../src/assets/vendor/jsQR-1.4.0.js';
import { decodePhotoPixels } from '../src/assets/permits/qr-scan.mjs';

test('a different state or permit ID cannot silently overwrite the selected permit', () => {
  const current = {...blankPermit(), state:'UT', number:'UT-TEST-1', routeText:'EXACT ORIGINAL ROAD'};
  const before = structuredClone(current);
  for (const incoming of [{state:'GA',number:'UT-TEST-1'}, {state:'UT',number:'UT-TEST-2'}]) assert.throws(() => mergePermitIntake(current, incoming), /different state or permit/);
  assert.deepEqual(current, before);
});

test('a changed route discards prior geometry and approvals while keeping originals and QR references', () => {
  const current = {...blankPermit(), state:'UT', number:'UT-TEST-1', routeText:'OLD ROAD', steps:[{text:'Old instruction',routeLine:1,points:[[40,-111],[40.001,-111]]}], geometrySource:{format:'old'}, complete:true, review:{key:'old'}, geometryReview:{key:'old'}, qr:['reference'], documents:[{id:'original'}]};
  const next = mergePermitIntake(current, {state:'UT',number:'UT-TEST-1',routeText:'NEW ISSUED ROAD'});
  assert.equal(next.id,current.id);assert.deepEqual(next.documents,current.documents);assert.deepEqual(next.qr,current.qr);
  assert.equal(next.routeText,'NEW ISSUED ROAD');assert.deepEqual(next.steps,[]);assert.equal(next.geometrySource,null);assert.equal(next.complete,false);assert.equal(next.review,null);assert.equal(next.geometryReview,null);
  assert.equal(current.routeText,'OLD ROAD');assert.equal(current.steps.length,1);
});

test('imported geometry stays in its supplied order and never carries review approval', () => {
  const steps=[{routeLine:1,text:'Follow exact first road',road:'TEST',points:[[40,-111],[40.001,-111]]},{routeLine:2,text:'Then exact second road',road:'TEST2',points:[[40.001,-111],[40.001,-111.001]]}];
  const next=mergePermitIntake(blankPermit(),{state:'UT',number:'UT-TEST',routeText:'First\nSecond',steps,complete:true,review:{key:'untrusted'},geometryReview:{key:'untrusted'}});
  assert.deepEqual(next.steps.map(s=>s.points),steps.map(s=>s.points));assert.deepEqual(next.steps.map(s=>s.text),steps.map(s=>s.text));
  assert.equal(next.review,null);assert.equal(next.geometryReview,null);assert.equal(next.complete,false);
});

test('a partial extraction preserves explicit permit type and existing route geometry only for unchanged text', () => {
  const current={...blankPermit(),kind:'annual',number:'TEST',routeText:'Issued road',steps:[{text:'Existing'}]};
  const next=mergePermitIntake(current,{number:'TEST',restrictions:'Copied condition'});
  assert.equal(next.kind,'annual');assert.deepEqual(next.steps,current.steps);assert.equal(next.restrictions,'Copied condition');assert.equal(next.geometryReview,null);
  assert.equal(mergePermitIntake(blankPermit(),{state:'UT'}).kind,'single-trip');
  assert.deepEqual(mergePermitIntake(current,{entry:{road:'CHANGED ENTRY'}}).steps,[]);
});

test('cancelled, replaced or cross-permit camera work cannot attach a late frame', () => {
  const sessions=createCameraSession();const first=sessions.start('trip1','permit1');
  assert(sessions.current(first,'trip1','permit1'));assert(!sessions.current(first,'trip2','permit1'));assert(!sessions.current(first,'trip1','permit2'));
  sessions.cancel();assert(!sessions.current(first,'trip1','permit1'));
  const second=sessions.start('trip1','permit1');assert(sessions.current(second,'trip1','permit1'));assert(!sessions.current(first,'trip1','permit1'));
  sessions.start('trip1','permit1');assert(!sessions.current(second,'trip1','permit1'));
});

test('real vendored decoder reads ordinary and inverted QR pixels without a remote service', () => {
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/permit-qr.json',import.meta.url),'utf8'));
  const size=fixture.matrix.length*5;
  for(const inverted of [false,true]) {
    const pixels=new Uint8ClampedArray(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const dark=fixture.matrix[Math.floor(y/5)][Math.floor(x/5)]==='1';
      const v=dark!==inverted?0:255,n=(y*size+x)*4;
      pixels.set([v,v,v,255],n);
    }
    assert.deepEqual(decodePhotoPixels(pixels,size,size,jsQR),[fixture.payload]);
  }
  assert.deepEqual(decodePhotoPixels(new Uint8ClampedArray(160*160*4).fill(255),160,160,jsQR),[]);
});
