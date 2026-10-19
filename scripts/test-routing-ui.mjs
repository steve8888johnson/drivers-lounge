import test from'node:test';
import assert from'node:assert/strict';
import{formatLocalDateTimeInput,hasBlockingRouteNotice,permittedModePresentation}from'../src/assets/routing/ui-core.mjs';

test('departure datetime keeps the device-local calendar date',()=>{
 const local=new Date(2026,9,19,23,45,0,0);
 assert.equal(formatLocalDateTimeInput(local),'2026-10-19T23:45');
 assert.equal(formatLocalDateTimeInput('not-a-date'),'');
});

test('permitted mode gives an explicit route-workflow action',()=>{
 const enabled=permittedModePresentation(true);
 assert.equal(enabled.buttonText,'Open permitted-load routing');
 assert.match(enabled.status,/import every state permit/i);
 assert.match(enabled.status,/border gaps/i);
 const standard=permittedModePresentation(false);
 assert.equal(standard.buttonText,'Build truck route');
});

test('any blocking or critical route notice prevents guidance independently of provider flag',()=>{
 assert.equal(hasBlockingRouteNotice(null),true);
 assert.equal(hasBlockingRouteNotice({guidanceEligible:false,notices:[]}),true);
 assert.equal(hasBlockingRouteNotice({guidanceEligible:true,criticalNotices:[{code:'blocked'}],notices:[]}),true);
 assert.equal(hasBlockingRouteNotice({guidanceEligible:true,criticalNotices:[],notices:[{severity:'critical'}]}),true);
 assert.equal(hasBlockingRouteNotice({guidanceEligible:true,criticalNotices:[],notices:[{blocking:true}]}),true);
 assert.equal(hasBlockingRouteNotice({guidanceEligible:true,criticalNotices:[],notices:[{severity:'warning'}]}),false);
});
