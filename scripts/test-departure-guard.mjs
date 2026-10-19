import test from'node:test';
import assert from'node:assert/strict';
import{evaluateDeparturePosition}from'../src/assets/routing/departure-guard.mjs';

const now=Date.now();
const route={geometry:[[41.1400,-104.8200],[41.1300,-104.8000],[41.1200,-104.7800]]};
const position=(latitude,longitude,accuracy=10,timestamp=now)=>({coords:{latitude,longitude,accuracy},timestamp});

test('departure preflight accepts a fresh precise fix on the reviewed corridor',()=>{
 const result=evaluateDeparturePosition(position(41.14005,-104.82005,8),route);
 assert.equal(result.ok,true);
 assert.equal(result.code,'ready');
 assert.ok(result.distanceMeters<120);
 assert.equal(result.accuracyMeters,8);
 assert.match(result.message,/precise gps confirmed/i);
});

test('departure preflight blocks weak, stale and invalid GPS fixes',()=>{
 const weak=evaluateDeparturePosition(position(41.14,-104.82,120),route);
 assert.equal(weak.ok,false);assert.equal(weak.code,'weakAccuracy');
 const stale=evaluateDeparturePosition(position(41.14,-104.82,8,Date.now()-20000),route);
 assert.equal(stale.ok,false);assert.equal(stale.code,'stalePosition');
 const invalid=evaluateDeparturePosition(position(141,-104.82,8),route);
 assert.equal(invalid.ok,false);assert.equal(invalid.code,'invalidPosition');
});

test('departure preflight refuses to invent a connector from an off-route location',()=>{
 const result=evaluateDeparturePosition(position(41.30,-104.95,8),route);
 assert.equal(result.ok,false);
 assert.equal(result.code,'outsideRouteCorridor');
 assert.ok(result.distanceMeters>result.corridorMeters);
 assert.match(result.message,/no automatic connector or detour/i);
});

test('departure preflight fails closed without reviewed route geometry',()=>{
 const missing=evaluateDeparturePosition(position(41.14,-104.82,8),{});
 assert.equal(missing.ok,false);assert.equal(missing.code,'missingRoute');
 const short=evaluateDeparturePosition(position(41.14,-104.82,8),{geometry:[[41.14,-104.82]]});
 assert.equal(short.ok,false);assert.equal(short.code,'missingRoute');
});

test('departure corridor expands only with measured GPS uncertainty',()=>{
 const result=evaluateDeparturePosition(position(41.1408,-104.8208,60),route,{minimumCorridorMeters:80,maxAccuracyMeters:75});
 assert.equal(result.corridorMeters,150);
 assert.equal(result.ok,true);
});
