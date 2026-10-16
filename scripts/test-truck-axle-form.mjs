import test from 'node:test';import assert from 'node:assert/strict';
import {reviewAxleForm} from '../src/assets/truck-axle-form.mjs';import {formDraft,formProfile} from './fixtures/truck-axle-form.mjs';
const options={now:Date.parse('2026-10-13T12:00:00Z'),revision:'test-1'};
test('five measured axles check every consecutive group without granting road clearance',()=>{
 const r=reviewAxleForm(formDraft(),formProfile(),options);assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.groups.length,15);assert.equal(r.guidanceAllowed,false);
 assert.equal(r.measurement.measuredAt,'2026-10-13T10:00:00.000Z');assert.equal(r.measurement.loadedWeightLb,78000);assert.equal(r.measurement.providerGroups,undefined);
});
test('grouped tickets cannot turn into individual measurements even with plausible rows',()=>{
 const d=formDraft();d.kind='grouped';const r=reviewAxleForm(d,formProfile(),options);assert.equal(r.status,'HOLD');assert.equal(r.measurement,null);assert.equal(r.groups.length,0);
});
test('unmeasured, inconsistent, malformed and unsupported axle forms stay on hold',()=>{
 for(const change of [d=>d.confirmed=false,d=>d.offset='',d=>d.axles[0].weightLb='12001',d=>d.axles[1].positionIn='0',d=>d.axles[1].weightLb='1e4',d=>d.axles[1].weightLb='',d=>d.axles[1]=null,d=>delete d.axles[1],d=>d.axles.pop(),d=>d.configuration='double-trailer',d=>d.loadReference='',d=>d.axles[4].positionIn='1000']){const d=formDraft();change(d);assert.equal(reviewAxleForm(d,formProfile(),options).status,'HOLD');}
 for(const [key,value] of [['truck-axles','4'],['truck-weight','78001'],['trailer-type','none'],['oversize',true],['hazmat',true],['truck-length','40']]){const p=formProfile();p[key]=value;assert.equal(reviewAxleForm(formDraft(),p,options).status,'HOLD',key);}
});
test('overall total under 80000 still holds an excessive individual axle',()=>{
 const d=formDraft();d.axles[0].weightLb='21000';d.axles[1].weightLb='7500';const r=reviewAxleForm(d,formProfile(),options);
 assert.equal(r.status,'HOLD');assert(r.issues.some(x=>x.code==='AXLE_GROUP_BASELINE_EXCEEDED'));assert.equal(r.measurement,null);
});
