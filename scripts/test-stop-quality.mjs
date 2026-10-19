import test from'node:test';
import assert from'node:assert/strict';
import{applyResolvedStopAudit,auditResolvedStops,classifyResolvedStop}from'../src/assets/routing/stop-quality.mjs';

test('coordinates, point addresses and facilities are precise enough for guidance review',()=>{
 for(const stop of[
  {label:'Current GPS location',resultType:'coordinate',confidence:1},
  {label:'611 East Carlson Street, Cheyenne, WY',resultType:'Point Address',confidence:1},
  {label:'Pilot Travel Center, Denver, CO',resultType:'POI',confidence:.98}
 ])assert.equal(classifyResolvedStop(stop).precise,true);
 const audit=auditResolvedStops({label:'611 East Carlson Street',resultType:'Point Address'},{label:'Pilot Travel Center',resultType:'POI'});
 assert.equal(audit.status,'clear');
 assert.equal(audit.criticalNotices.length,0);
});

test('city, state, road and other broad matches block live guidance',()=>{
 for(const resultType of['Geography','locality','city','state','street','addressRange'])assert.equal(classifyResolvedStop({label:'Denver, CO',resultType}).precise,false);
 const audit=auditResolvedStops({label:'Cheyenne, WY',resultType:'Geography',confidence:1},{label:'Denver, CO',resultType:'Geography',confidence:1});
 assert.equal(audit.status,'blocked');
 assert.equal(audit.criticalNotices.length,2);
 assert.match(audit.criticalNotices[0].title,/full street address/i);
});

test('resolved-stop audit preserves existing notices and disables guidance',()=>{
 const result=applyResolvedStopAudit({
  origin:{label:'611 East Carlson Street',resultType:'Point Address',confidence:1},
  destination:{label:'Denver, CO',resultType:'Geography',confidence:1},
  route:{guidanceEligible:true,notices:[{code:'existingWarning',title:'Existing warning',severity:'warning'}],criticalNotices:[]}
 });
 assert.equal(result.route.guidanceEligible,false);
 assert.equal(result.route.notices.length,2);
 assert.equal(result.route.criticalNotices.length,1);
 assert.equal(result.route.notices[0].code,'existingWarning');
 assert.equal(result.route.criticalNotices[0].code,'destinationStopNotPrecise');
});
