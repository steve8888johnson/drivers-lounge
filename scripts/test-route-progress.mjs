import test from'node:test';
import assert from'node:assert/strict';
import{createRouteProgressTracker}from'../src/assets/routing/route-progress.mjs';

const fix=(latitude,longitude,{accuracy=8,speed=20,timestamp=Date.now()}={})=>({coords:{latitude,longitude,accuracy,speed},timestamp});
const straight=Array.from({length:12},(_,index)=>[40,-105+index*.01]);

test('normal forward travel advances route progress monotonically',()=>{
 const tracker=createRouteProgressTracker({geometry:straight});
 const start=tracker.update(fix(...straight[1],{timestamp:1000}));
 const next=tracker.update(fix(...straight[2],{timestamp:6000}));
 assert.equal(start.accept,true);assert.equal(start.status,'anchored');
 assert.equal(next.accept,true);assert.equal(next.status,'advanced');assert.equal(next.index,2);
 assert.equal(tracker.snapshot().lastIndex,2);
});

test('minor backward GPS jitter does not move confirmed progress backward',()=>{
 const tracker=createRouteProgressTracker({geometry:straight});
 tracker.update(fix(...straight[3],{timestamp:1000}));
 const jitter=tracker.update(fix(...straight[2],{timestamp:3000,speed:0}));
 assert.equal(jitter.accept,true);assert.equal(jitter.status,'minor-backward-jitter');
 assert.equal(jitter.observedIndex,2);assert.equal(jitter.index,3);
 assert.equal(tracker.snapshot().lastIndex,3);
});

test('nearby parallel segment cannot silently snap guidance far ahead',()=>{
 const loop=[
  [40,-105],[40,-104.99],[40,-104.98],[40,-104.97],[40,-104.96],
  [40.001,-104.96],[40.001,-104.97],[40.001,-104.98],[40.001,-104.99],[40.001,-105]
 ];
 const tracker=createRouteProgressTracker({geometry:loop});
 tracker.update(fix(...loop[2],{timestamp:1000,speed:12}));
 const ambiguous=tracker.update(fix(...loop[7],{timestamp:4000,speed:12}));
 assert.equal(ambiguous.accept,false);
 assert.ok(['parallel-or-crossing-road-ambiguity','implausible-route-jump'].includes(ambiguous.reason));
 assert.equal(tracker.snapshot().lastIndex,2);
});

test('large backward snap is held instead of reversing maneuvers',()=>{
 const loop=[
  [40,-105],[40,-104.99],[40,-104.98],[40,-104.97],[40,-104.96],
  [40.001,-104.96],[40.001,-104.97],[40.001,-104.98],[40.001,-104.99],[40.001,-105]
 ];
 const tracker=createRouteProgressTracker({geometry:loop});
 tracker.update(fix(...loop[7],{timestamp:1000,speed:15}));
 const backward=tracker.update(fix(...loop[2],{timestamp:4000,speed:15}));
 assert.equal(backward.accept,false);assert.equal(backward.reason,'backward-route-snap');
 assert.equal(tracker.snapshot().lastIndex,7);
});

test('true off-route samples pass through for the core deviation counter',()=>{
 const tracker=createRouteProgressTracker({geometry:straight});
 tracker.update(fix(...straight[2],{timestamp:1000}));
 const offRoute=tracker.update(fix(41,-103,{timestamp:5000}));
 assert.equal(offRoute.accept,true);assert.equal(offRoute.status,'off-route-sample');
});

test('weak GPS is not used to make route-progress snap decisions',()=>{
 const tracker=createRouteProgressTracker({geometry:straight});
 tracker.update(fix(...straight[2],{timestamp:1000}));
 const weak=tracker.update(fix(...straight[8],{accuracy:120,timestamp:5000}));
 assert.equal(weak.accept,true);assert.equal(weak.status,'weak-gps');
 assert.equal(tracker.snapshot().lastIndex,2);
});

test('strong forward rejoin requires repeated consistent fixes',()=>{
 const tracker=createRouteProgressTracker({geometry:straight},{forwardBaseMeters:600,reanchorSamples:3});
 tracker.update(fix(...straight[0],{timestamp:1000,speed:0}));
 const first=tracker.update(fix(...straight[6],{timestamp:3000,speed:0}));
 const second=tracker.update(fix(...straight[6],{timestamp:5000,speed:0}));
 const third=tracker.update(fix(...straight[6],{timestamp:7000,speed:0}));
 assert.equal(first.accept,false);assert.equal(second.accept,false);
 assert.equal(third.accept,true);assert.equal(third.status,'forward-reanchored');assert.equal(third.index,6);
});
