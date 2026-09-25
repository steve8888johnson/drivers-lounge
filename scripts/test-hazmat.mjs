import test from 'node:test';
import assert from 'node:assert/strict';
import { blankTrip, blankPermit, confirmPermit, confirmGeometry, buildMaster, locateOnMaster, crewKey, sanitizePermit } from '../src/assets/permits/core.mjs';
import { blankMaterial, blankHazmatRoute, hazmatActive, hazmatErrors, materialErrors, confirmCargo, confirmHazmatRoute, cargoReviewed, sanitizeHazmat, cameoURL, normalizeUN, hazmatWarnings, routeReviewErrors } from '../src/assets/permits/hazmat.mjs';
import { STATE_SOURCES } from '../src/assets/permits/hazmat-sources.mjs';
const now=Date.parse('2026-09-24T15:00:00Z');
function fixture() {
  const t=blankTrip(),p=blankPermit();t.departure='2026-09-24';t.acknowledged=true;
  Object.assign(t.profile,{heightFt:'13',widthFt:'8',lengthFt:'70',weightLb:'75000',axles:'5'});
  Object.assign(p,{state:'IN',number:'TEST PLAN ONLY',kind:'hazmat-route-plan',validFrom:'2026-09-24',validTo:'2026-09-25',timeZone:'America/Chicago',entry:{label:'Synthetic origin',state:'',road:''},exit:{label:'Synthetic destination',state:'',road:''},complete:true,routeText:'Follow test road\nContinue to test destination',documents:[{id:'test-original',name:'plan.pdf'}],steps:[{routeLine:1,text:'Follow test road',road:'Test road',points:[[41,-80],[41,-80.001]]},{routeLine:2,text:'Continue to test destination',road:'Test road',points:[[41,-80.001],[41,-80.002]]}]});
  t.permits=[p];confirmPermit(p);confirmGeometry(p);
  Object.assign(t.hazmat,{enabled:true,placarding:'required',shippingPaperRef:'TEST ONLY',emergencyContact:'TEST CONTACT',materials:[{...blankMaterial(),unNumber:'UN1203',shippingName:'TEST SHIPPING DESCRIPTION',division:'3',packingGroup:'II',quantity:'1000',unit:'gal',packaging:'bulk',inhalation:'no',hrcq:'no'}]});
  p.hazmatRoute={...blankHazmatRoute(),disposition:'clear',registryChecked:true,authoritiesChecked:true,checkedOn:'2026-09-24',validThrough:'2026-09-24',reviewer:'TEST CARRIER',authorityURL:STATE_SOURCES.IN.url,notes:'SYNTHETIC review only. Not authorization for a real road.',alerts:[{routeLine:2,text:'Synthetic tunnel instruction',sourceURL:STATE_SOURCES.IN.url}]};
  confirmCargo(t.hazmat,now);confirmHazmatRoute(t,p,now);return t;
}
test('structured hazmat-only plan can follow reviewed geometry without inventing an OS/OW permit',()=>{
  const t=fixture(),original=structuredClone(t.permits[0].steps),m=buildMaster(t,{geometry:true});assert.equal(m.ready,true);assert.deepEqual(m.permits[0].steps,original);assert.equal(hazmatActive(t),true);
});
test('legacy hazmat notes and hazmat route-plan type cannot bypass structured checks',()=>{
  const t=blankTrip();t.profile.hazmat='Class 3';assert.equal(hazmatActive(t),true);assert(hazmatErrors(t).some(e=>/shipping papers/.test(e)));t.profile.hazmat='';t.permits=[{...blankPermit(),kind:'hazmat-route-plan'}];assert.equal(hazmatActive(t),true);assert(hazmatErrors(t).length>0);
});
test('cargo changes and all route-affecting changes invalidate hazmat review',()=>{
  for(const mutate of [t=>t.hazmat.materials[0].quantity='2000',t=>t.hazmat.materials[0].division='8',t=>t.profile.weightLb='76000',t=>t.departure='2026-09-25',t=>t.permits[0].steps[0].points[1][1]-=.00001,t=>t.permits[0].routeText+='\nChanged',t=>t.permits[0].hazmatRoute.notes+=' changed']){
    const t=fixture();mutate(t);assert.equal(buildMaster(t,{geometry:true}).ready,false);assert(hazmatErrors(t).some(e=>/revision|shipping papers/.test(e)));
  }
});
test('unknown, conflicting, expired and future-source reviews fail closed',()=>{
  for(const mutate of [r=>r.disposition='unknown',r=>r.disposition='conflict',r=>r.validThrough='2026-09-23',r=>r.checkedOn='2026-09-25',r=>r.authoritiesChecked=false,r=>r.registryChecked=false,r=>r.authorityURL='javascript:alert(1)',r=>r.notes='']){
    const t=fixture();mutate(t.permits[0].hazmatRoute);assert.throws(()=>confirmHazmatRoute(t,t.permits[0],now));assert.equal(buildMaster(t,{geometry:true}).ready,false);
  }
});
test('CAMEO is not accepted as the authority clearing a route',()=>{
  const t=fixture();t.permits[0].hazmatRoute.authorityURL=cameoURL('UN1203');assert.match(routeReviewErrors(t,t.permits[0]).join(' '),/not a routing authority/);
});
test('CAMEO identifiers preserve UN/NA leading zeroes and unknown numbers use search',()=>{
  assert.equal(normalizeUN('un 0004'),'UN0004');assert.equal(cameoURL('UN0004'),'https://cameochemicals.noaa.gov/unna/4');assert.equal(cameoURL('NA1203'),'https://cameochemicals.noaa.gov/unna/1203');assert.equal(cameoURL('UN9999'),'https://cameochemicals.noaa.gov/search/simple');assert.equal(normalizeUN('1203'),'');assert.equal(normalizeUN('UN1203<script>'),'');
});
test('special classes, subsidiary hazards and mixed cargo require their own review evidence',()=>{
  const t=fixture(),h=t.hazmat;h.materials[0].subsidiary='1.1';assert(materialErrors(h).some(e=>/written route-plan/.test(e)));h.writtenPlanRef='TEST';assert.equal(materialErrors(h).length,0);
  h.materials[0].subsidiary='2.3';assert(materialErrors(h).some(e=>/inhalation hazard status/.test(e)));h.materials[0].inhalation='yes';assert.equal(materialErrors(h).length,0);
  h.materials[0].hrcq='yes';assert(materialErrors(h).some(e=>/radioactive quantity/.test(e)));h.materials[0].division='7';assert.equal(materialErrors(h).length,0);
  h.materials.push(structuredClone(h.materials[0]));assert(materialErrors(h).some(e=>/mixed-load/.test(e)));
});
test('unknown applicability, malformed class, quantity and packaging cannot clear cargo',()=>{
  for(const mutate of [h=>h.placarding='unknown',h=>h.materials[0].division='2',h=>h.materials[0].subsidiary='10',h=>h.materials[0].quantity='NaN',h=>h.materials[0].unit='',h=>h.materials[0].packingGroup='',h=>h.materials[0].packaging='',h=>h.materials[0].inhalation='unknown',h=>h.materials[0].hrcq='unknown']){
    const t=fixture();mutate(t.hazmat);assert.throws(()=>confirmCargo(t.hazmat,now));
  }
});
test('carrier not-required placarding does not skip route review and retained material cannot be unchecked away',()=>{
  const t=fixture();t.hazmat.enabled=false;t.hazmat.placarding='not-required';assert.equal(hazmatActive(t),true);confirmCargo(t.hazmat,now);assert(hazmatErrors(t).length);t.permits[0].hazmatRoute.disposition='unknown';assert.throws(()=>confirmHazmatRoute(t,t.permits[0],now));
});
test('review expiry is enforced during GPS guidance in the permit local date',()=>{
  const t=fixture(),master=buildMaster(t,{geometry:true});let time=Date.parse('2026-09-25T04:59:00Z');assert.equal(locateOnMaster(master,{point:[41,-80.0005],accuracy:5,timestamp:time},null,time).status,'on-route');
  time=Date.parse('2026-09-25T05:01:00Z');const result=locateOnMaster(master,{point:[41,-80.0005],accuracy:5,timestamp:time},null,time);assert.equal(result.status,'hazmat-hold');assert.match(result.message,/travel date/);
});
test('imported cargo and route evidence never inherit confirmation; crew equality includes hazmat',()=>{
  const t=fixture(),imported=structuredClone(t);imported.hazmat=sanitizeHazmat(t.hazmat);imported.permits=t.permits.map(sanitizePermit);assert.equal(cargoReviewed(imported.hazmat),false);assert.equal(imported.permits[0].hazmatRoute.review,null);assert.equal(crewKey(imported),crewKey(t));assert.equal(buildMaster(imported,{geometry:true}).ready,false);
  imported.hazmat.materials[0].quantity='900';assert.notEqual(crewKey(imported),crewKey(t));
});
test('maneuver warnings are tied to exact source lines and never change geometry',()=>{
  const t=fixture(),p=t.permits[0],before=JSON.stringify(p.steps);assert.equal(hazmatWarnings(t,p,1).some(a=>a.startsWith('Hazmat route alert:')),false);assert.match(hazmatWarnings(t,p,2).join(' '),/Synthetic tunnel instruction/);assert.equal(JSON.stringify(p.steps),before);
  p.hazmatRoute.alerts[0].routeLine=90;assert.throws(()=>confirmHazmatRoute(t,p,now),/each alert/);
});
test('source directory covers all states and DC, and import lengths are bounded',()=>{
  assert.equal(Object.keys(STATE_SOURCES).length,51);assert.equal(STATE_SOURCES.OH.name,'Ohio');assert.equal(STATE_SOURCES.IN.name,'Indiana');assert.equal(STATE_SOURCES.IL.name,'Illinois');assert.equal(STATE_SOURCES.WY.name,'Wyoming');assert(Object.values(STATE_SOURCES).every(s=>s.url.startsWith('https://www.fmcsa.dot.gov/')));assert.throws(()=>sanitizeHazmat({materials:Array(31).fill({})}),/at most 30/);
});
