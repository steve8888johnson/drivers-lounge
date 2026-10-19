import test from'node:test';
import assert from'node:assert/strict';
import{mphFromKmh,providerLaneContextAt,providerRoadContextAt,providerSpeedLimitAt}from'../src/assets/routing/road-context.mjs';

const route={
 speedLimits:[{startPointIndex:0,endPointIndex:9,maxSpeedLimitInKmh:105},{startPointIndex:10,endPointIndex:20,maxSpeedLimitInKmh:80}],
 laneGuidance:[{startPointIndex:5,endPointIndex:8,lanes:[{directions:['LEFT']},{directions:['STRAIGHT'],follow:'STRAIGHT'},{directions:['RIGHT']}],laneSeparators:[]}]
};

test('provider speed limits convert to rounded mph within section bounds',()=>{
 assert.equal(mphFromKmh(105),65);
 assert.equal(mphFromKmh(0),null);
 assert.equal(providerSpeedLimitAt(route,4).mph,65);
 assert.equal(providerSpeedLimitAt(route,10).mph,50);
 assert.equal(providerSpeedLimitAt(route,21),null);
 assert.match(providerSpeedLimitAt(route,4).advisory,/posted signs/i);
});

test('lane context reports only provider directions without inventing lane numbering',()=>{
 const context=providerLaneContextAt(route,6);
 assert.equal(context.laneCount,3);
 assert.deepEqual(context.directions,['straight']);
 assert.match(context.label,/straight/i);
 assert.doesNotMatch(context.label,/lane 2/i);
 assert.match(context.advisory,/road markings/i);
 assert.equal(providerLaneContextAt(route,12),null);
});

test('combined provider road context degrades safely when provider omits data',()=>{
 const context=providerRoadContextAt(route,6);
 assert.equal(context.speedLimit.mph,65);
 assert.ok(context.laneGuidance);
 assert.deepEqual(providerRoadContextAt({},100),{speedLimit:null,laneGuidance:null});
});
