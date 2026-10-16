import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewFederalAxleWeights,prepareMeasuredAxleParameters,poundsToKilogramsUp,inchesToCentimetersUp} from '../src/assets/truck-axle-review.mjs';
import {measuredAxlesFixture} from './fixtures/truck-axles.mjs';
function withAxles(positions,weights) {
 const profile=measuredAxlesFixture(); profile.loadedWeightLb=weights.reduce((a,b)=>a+b,0);
 profile.axles=positions.map((positionIn,index)=>({positionIn,weightLb:weights[index],measured:true}));return profile;
}
const group=(result,first,last)=>result.groups.find(item=>item.firstAxle===first&&item.lastAxle===last);
test('all consecutive groups are screened; none can authorize driving',()=>{
 const result=reviewFederalAxleWeights(measuredAxlesFixture());
 assert.equal(result.status,'REVIEW_REQUIRED');assert.equal(result.guidanceAllowed,false);assert.equal(result.groups.length,15);
 assert.equal(result.groups.filter(item=>item.firstAxle===item.lastAxle).length,5);
 assert(result.remainingChecks.includes('posted bridge and road limits'));
});
test('FHWA five-axle example catches interior bridge excess despite 80000 lb total',()=>{
 const result=reviewFederalAxleWeights(withAxles([0,192,240,564,612],[12000,17000,17000,17000,17000]));
 assert.equal(group(result,1,3).baselineLimitLb,51000);assert.equal(group(result,1,5).baselineLimitLb,80000);
 assert.equal(group(result,2,5).weightLb,68000);assert.equal(group(result,2,5).baselineLimitLb,65500);
 assert.equal(group(result,2,5).exceedsBaseline,true);assert.equal(result.status,'HOLD');
});
test('two measured tandem pairs receive only the exact 36-foot baseline exception',()=>{
 const profile=withAxles([0,192,240,576,624],[12000,17000,17000,17000,17000]);
 const result=reviewFederalAxleWeights(profile);
 assert.equal(group(result,2,5).rule,'two-tandem-36ft-exception');assert.equal(group(result,2,5).baselineLimitLb,68000);
 assert.equal(result.status,'REVIEW_REQUIRED');
 profile.axles[4].positionIn=623.99;
 assert.equal(reviewFederalAxleWeights(profile).status,'HOLD');
 profile.axles[4].positionIn=624;profile.axles[3].positionIn=585;
 assert.notEqual(group(reviewFederalAxleWeights(profile),2,5).rule,'two-tandem-36ft-exception');
});
test('FHWA single-unit example checks the interior three axles',()=>{
 const result=reviewFederalAxleWeights(withAxles([0,168,222,276],[12000,15000,15000,15000]));
 assert.equal(group(result,1,4).baselineLimitLb,57500);assert.equal(group(result,2,4).baselineLimitLb,42500);
 assert.equal(group(result,2,4).weightLb,45000);assert.equal(result.status,'HOLD');
});
test('statutory axle windows are not just a count of physical axles',()=>{
 for(const [span,limit] of [[40,20000],[40.01,34000],[96,34000],[96.01,38000]]){
  const result=reviewFederalAxleWeights(withAxles([0,span],[10000,10000]));assert.equal(group(result,1,2).baselineLimitLb,limit);
 }
 const three=reviewFederalAxleWeights(withAxles([0,48,96],[12000,12000,12000]));
 assert.equal(group(three,1,3).baselineLimitLb,34000);assert.equal(three.status,'HOLD');
});
test('missing, split, reordered and inconsistent measurements never get defaults',()=>{
 for(const mutate of [p=>p.confirmed=false,p=>p.exceptionClaimed=true,p=>p.scope='all-roads',p=>p.configuration='bus',p=>p.revision='',
  p=>p.axles[0].measured=false,p=>p.axles[0].weightLb='12000',p=>p.axles[0].weightLb=0,p=>p.axles[1].positionIn=NaN,
  p=>p.axles[1].positionIn=192.123,p=>p.axles[0].positionIn=1,p=>p.axles.reverse(),p=>p.axles[1].positionIn=0,p=>p.loadedWeightLb=78001]){
  const p=measuredAxlesFixture();mutate(p);assert.equal(reviewFederalAxleWeights(p).status,'HOLD');
 }
 for(const value of [null,{}, {axles:[]},{axles:Array(21).fill({})}])assert.equal(reviewFederalAxleWeights(value).status,'HOLD');
});
test('gross and single/group overloads are caught without enforcement allowances',()=>{
 const single=reviewFederalAxleWeights(withAxles([0,200],[20001,10000]));assert.equal(single.status,'HOLD');
 const gross=reviewFederalAxleWeights(withAxles([0,240,480,720,960],[17000,17000,17000,17000,17000]));
 assert(gross.issues.some(issue=>issue.code==='BASELINE_GROSS_EXCEEDED'));
 const tandem=reviewFederalAxleWeights(withAxles([0,48],[17000,17001]));assert.equal(tandem.status,'HOLD');
});
test('imperial conversions never understate physical dimensions or loads',()=>{
 assert.equal(poundsToKilogramsUp(78000),35381);assert.equal(poundsToKilogramsUp(12000),5444);
 assert.equal(inchesToCentimetersUp(162),412);assert.equal(inchesToCentimetersUp(102),260);
 for(const bad of [-1,0,NaN,'12000',1.5])assert.throws(()=>poundsToKilogramsUp(bad));
 assert.throws(()=>inchesToCentimetersUp(162.001));
});
test('provider groups derive from measured weights; missing and misleading partitions fail',()=>{
 const result=prepareMeasuredAxleParameters(measuredAxlesFixture());
 assert.equal(result.weightPerAxleGroup,'single:5444,tandem:14969');assert.equal(result.currentWeightKg,35381);
 for(const groups of [[],[{type:'single',axles:[0]}],[{type:'single',axles:[0]},{type:'tandem',axles:[2,1]},{type:'tandem',axles:[3,4]}],
  [0,1,2,3,4].map(index=>({type:'single',axles:[index]}))]){
  const profile=measuredAxlesFixture();profile.providerGroups=groups;assert.throws(()=>prepareMeasuredAxleParameters(profile));
 }
 const changed=measuredAxlesFixture();changed.axles[4].positionIn+=12;
 const other=prepareMeasuredAxleParameters(changed);assert.equal(other.weightPerAxleGroup,result.weightPerAxleGroup);assert.notEqual(other.binding,result.binding);
});
