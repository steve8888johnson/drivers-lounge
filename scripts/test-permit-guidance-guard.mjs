import test from'node:test';
import assert from'node:assert/strict';
import{permitGuidanceDecision}from'../src/assets/permits/permit-guidance-guard.mjs';

const ready={
 tripExists:true,masterReady:true,walletVerified:true,conditionsChecked:true,
 routeReadinessReady:true,visibleIssueCount:0,guidanceRunning:false,completed:false,
 pageBusy:false,statusError:false
};

test('permitted guidance is allowed only when every independent safety gate is clear',()=>{
 const decision=permitGuidanceDecision(ready);
 assert.equal(decision.allowed,true);
 assert.deepEqual(decision.reasons,[]);
});

test('each missing permit safety requirement independently blocks guidance',()=>{
 const cases=[
  ['tripExists',false,/Choose a saved permitted load/i],
  ['masterReady',false,/still need review/i],
  ['walletVerified',false,/original permit PDF or image/i],
  ['conditionsChecked',false,/Confirm current curfews/i],
  ['routeReadinessReady',false,/not marked ready/i],
  ['guidanceRunning',true,/already running/i],
  ['completed',true,/already marked complete/i],
  ['pageBusy',true,/still in progress/i],
  ['statusError',true,/current permit-workflow error/i]
 ];
 for(const[field,value,pattern]of cases){
  const decision=permitGuidanceDecision({...ready,[field]:value});
  assert.equal(decision.allowed,false,field);
  assert.match(decision.reasons.join(' '),pattern,field);
 }
});

test('visible route checks keep guidance locked even when the route badge says ready',()=>{
 const one=permitGuidanceDecision({...ready,visibleIssueCount:1});
 assert.equal(one.allowed,false);assert.match(one.reasons.join(' '),/1 visible route check remains/i);
 const many=permitGuidanceDecision({...ready,visibleIssueCount:4});
 assert.equal(many.allowed,false);assert.match(many.reasons.join(' '),/4 visible route checks remain/i);
});

test('multiple failures are retained instead of being hidden behind a single acknowledgment',()=>{
 const decision=permitGuidanceDecision({tripExists:true});
 assert.equal(decision.allowed,false);
 assert.ok(decision.reasons.length>=5);
 assert.match(decision.reasons.join(' '),/original permit PDF or image/i);
 assert.match(decision.reasons.join(' '),/curfews, escorts, restrictions and travel conditions/i);
});
