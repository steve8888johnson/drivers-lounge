import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapReview, routeOverview, coordinateText, STREET_TILES, STREET_OPTIONS } from '../src/assets/permits/map-review.mjs';
import { blankPermit, geometryErrors } from '../src/assets/permits/core.mjs';
import { createMapReview } from '../src/assets/permits/map-review-ui.mjs';
const permit = () => ({ ...blankPermit(), state:'UT', number:'SYNTHETIC', routeText:'Use I-15 north\nTake the issued exit', steps:[
  {text:'Use I-15 north',road:'I-15',routeLine:1,points:[[40,-111],[40.001,-111]]},
  {text:'Take the issued exit',road:'Issued ramp',routeLine:2,points:[[40.001,-111],[40.002,-111]]}
] });
test('comparison preserves exact supplied points and source without confirming or snapping', () => {
  const p=permit(), before=JSON.stringify(p),v=mapReview(p);
  assert.equal(v.source,p.routeText.split('\n')[0]);assert.deepEqual(v.segments,[[[40,-111],[40.001,-111]]]);assert.equal(v.next.gap,0);assert.deepEqual(v.issues,[]);
  assert.equal(JSON.stringify(p),before);assert.equal(p.geometryReview,null);v.segments[0][0][0]=0;assert.equal(p.steps[0].points[0][0],40);
});
test('candidate maneuver can be inspected before all permits or reviews exist', () => {
  const v=mapReview(permit(),1);assert(v.available);assert.equal(v.line,2);assert.equal(v.next,null);assert.equal(v.previous.gap,0);
  assert(!('ready' in v));assert(!('approved' in v));
});
test('missing and out-of-range instructions never inherit a previous map', () => {
  for(const i of [-1,2,1.5,NaN])assert(!mapReview(permit(),i).available);
  assert(!mapReview(blankPermit()).available);assert(!mapReview(null).available);
});
test('sparse segment is omitted without drawing a bridge across its missing road', () => {
  const p=permit();p.steps[0].points.push([41,-111],[41.001,-111]);
  const v=mapReview(p);assert.equal(v.segments.length,2);assert.deepEqual(v.segments[1],[[41,-111],[41.001,-111]]);
  assert(v.issues.some(x=>x.includes('not drawn')));assert(geometryErrors(p).some(x=>x.includes('too sparse')));
});
test('invalid coordinates and unsupported polar geometry are never partly drawn', () => {
  for(const point of [[90,0],[40,Infinity],[-111,40],['40',-111]]){
    const p=permit();p.steps[0].points.push(point);const v=mapReview(p);assert.equal(v.segments.length,0);assert.equal(v.start,null);assert(v.issues.some(x=>x.includes('not drawn')));
  }
});
test('dateline jump and zero-length points do not become a road', () => {
  const p=permit();p.geometrySource={format:'promiles-public-json/v1'};p.steps[0].points=[[40,179.999],[40,-179.999]];
  assert.equal(mapReview(p).segments.length,0);
  p.steps[0].points=[[40,-111],[40,-111]];assert.equal(mapReview(p).segments.length,0);
});
test('missing source, road and broken adjacent connection stay visible', () => {
  const p=permit();p.steps[0].routeLine=50;p.steps[0].road='';p.steps[1].points[0]=[40.01,-111];
  const v=mapReview(p);assert.equal(v.source,'');assert(v.next.gap>25);assert(v.issues.some(x=>x.includes('source')||x.includes('permit line')));assert(v.issues.some(x=>x.includes('Road name')));assert(v.issues.some(x=>x.includes('gap')));
});
test('issuer spacing allowance does not change input or bless sparse geometry', () => {
  const p=permit();p.steps[0].points=[[40,-111],[40.01,-111]];
  assert.equal(mapReview(p).segments.length,0);p.geometrySource={format:'promiles-public-json/v1'};assert.equal(mapReview(p).segments.length,1);
  p.steps[0].points[1]=[41,-111];assert.equal(mapReview(p).segments.length,0);
});
test('tile requests have explicit attribution and origin-only referrer without prefetch buffers', async () => {
  assert.equal(STREET_TILES,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');assert.equal(STREET_OPTIONS.referrerPolicy,'origin');assert.equal(STREET_OPTIONS.keepBuffer,0);assert.equal(STREET_OPTIONS.detectRetina,false);assert.match(STREET_OPTIONS.attribution,/openstreetmap.org\/copyright/);
  const sw=await readFile(new URL('../src/sw.js',import.meta.url),'utf8');assert.match(sw,/url.origin\s*!==\s*location.origin/);assert(!sw.includes('tile.openstreetmap.org'));
  assert.equal(coordinateText([40,-111]),'40.000000, -111.000000');assert.equal(coordinateText(null),'Not supplied');
});

function environment() {
  const elements=new Map(), events={}, tileEvents={}, state={removed:0,created:0,fail:false};
  const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'',hidden:true,disabled:false,open:false,setAttribute(n,v){this[n]=v;},addEventListener(n,f){this[n]=f;},showModal(){this.open=true;}});return elements.get(id);};
  const L={map(){if(state.fail)throw Error('Test map unavailable');state.created++;return {remove(){state.removed++;},invalidateSize(){},fitBounds(){}};},layerGroup(){return {addTo(){return this;},clearLayers(){}};},polyline(){return {addTo(){}};},circleMarker(){return {bindTooltip(){return this;},addTo(){}};},latLngBounds(x){return x;},tileLayer(){return {on(n,f){tileEvents[n]=f;return this;},addTo(){return this;}};}};
  const oldDoc=globalThis.document,oldWin=globalThis.window;
  globalThis.document={hidden:false,querySelector:el,addEventListener(n,f){events[n]=f;}};
  globalThis.window={L,addEventListener(n,f){events[n]=f;}};
  return {el,state,tileEvents,events,cleanup(){events.pagehide?.();globalThis.document=oldDoc;globalThis.window=oldWin;}};
}
test('failed tiles retain comparison text; moving to invalid geometry clears map and rejects late load status',async()=>{
  const env=environment();try{
    const p=permit();p.steps[1].points=[[NaN,0]];const selected=[];const review=createMapReview();review.open(p,0,i=>selected.push(i));
    const before=JSON.stringify(p);await env.el('#permit-map-show').onclick();env.tileEvents.tileerror();assert.match(env.el('#permit-map-status').textContent,/failed to load/);assert.match(env.el('#permit-map-comparison').innerHTML,/Use I-15 north/);
    env.el('#permit-map-next').onclick();assert.deepEqual(selected,[1]);assert.equal(env.state.removed,1);assert(env.el('#permit-street-map').hidden);assert(env.el('#permit-map-show').disabled);
    env.tileEvents.load();assert.match(env.el('#permit-map-status').textContent,/cleared/);assert.equal(JSON.stringify(p),before);
  }finally{env.cleanup();}
});
test('leaving the page stops street context and requires a fresh explicit request',async()=>{
  const env=environment();try{const review=createMapReview();review.open(permit());await env.el('#permit-map-show').onclick();document.hidden=true;env.events.visibilitychange();assert.equal(env.state.removed,1);assert(env.el('#permit-street-map').hidden);assert(!env.el('#permit-map-show').disabled);document.hidden=false;env.events.visibilitychange();assert.equal(env.state.created,1);assert.match(env.el('#permit-map-status').textContent,/stopped/);}finally{env.cleanup();}
});
test('map initialization failure preserves saved instructions and allows manual retry',async()=>{
  const env=environment();try{const review=createMapReview();review.open(permit());env.state.fail=true;await env.el('#permit-map-show').onclick();assert.match(env.el('#permit-map-status').textContent,/unavailable/);assert.match(env.el('#permit-map-comparison').innerHTML,/Use I-15 north/);assert(!env.el('#permit-map-show').disabled);env.state.fail=false;await env.el('#permit-map-show').onclick();assert.equal(env.state.created,1);}finally{env.cleanup();}
});

test('zoom or pan loading revokes loaded status and preserves failures until reopened',async()=>{
  const env=environment();try{
    const review=createMapReview();review.open(permit());await env.el('#permit-map-show').onclick();env.tileEvents.load();assert.match(env.el('#permit-map-status').textContent,/context loaded/);
    env.tileEvents.loading();assert.match(env.el('#permit-map-status').textContent,/coverage is incomplete/);env.tileEvents.tileerror();env.tileEvents.load();assert.match(env.el('#permit-map-status').textContent,/failed to load/);
    review.open(permit());const old=env.el('#permit-map-status').textContent;env.tileEvents.loading();assert.equal(env.el('#permit-map-status').textContent,old);
  }finally{env.cleanup();}
});

test('full imported route preview preserves gaps and never creates a state connection or approval',()=>{
  const p=permit();p.steps[0].points.push([41,-111],[41.001,-111]);
  const before=JSON.stringify(p), result=routeOverview(p);
  assert(result.available);assert.equal(result.drawn,2);assert.equal(result.paths.length,3);
  assert.deepEqual(result.paths[0],[[40,-111],[40.001,-111]]);
  assert.deepEqual(result.paths[1],[[41,-111],[41.001,-111]]);
  assert(result.issues.some(x=>x.includes('gap')));assert(result.issues.some(x=>x.includes('not drawn')));
  assert.equal(JSON.stringify(p),before);assert(!('ready' in result));assert.equal(p.geometryReview,null);
});
test('overview rejects excessive data and omits invalid or sparse geometry without hiding the failure',()=>{
  assert(!routeOverview(null).available);assert(!routeOverview(blankPermit()).available);
  const p=permit();p.steps[0].points=[[40,-111],[42,-111]];
  let result=routeOverview(p);assert(result.available);assert.equal(result.drawn,1);assert.equal(result.total,2);assert(result.issues.length);
  p.steps[1].points=[[90,0],[90,1]];assert(!routeOverview(p).available);
  p.steps[0].points=Array(100001).fill([40,-111]);assert.match(routeOverview(p).issues[0],/limit/);
});
test('explicit save-and-plot opens the full preview without setting permit or geometry confirmations',async()=>{
  const env=environment();try{
    const p=permit(),before=JSON.stringify(p),review=createMapReview();
    await review.open(p,0,()=>{},{overview:true,showMap:true});
    assert.equal(env.state.created,1);assert.equal(env.el('#permit-map-all')['aria-pressed'],'true');
    assert.match(env.el('#permit-map-overview').textContent,/2 of 2/);assert.match(env.el('#permit-map-overview').textContent,/does not activate guidance/);
    env.el('#permit-map-next').onclick();assert(env.el('#permit-map-overview').hidden);
    env.el('#permit-map-all').onclick();assert(!env.el('#permit-map-overview').hidden);
    assert.equal(JSON.stringify(p),before);
  }finally{env.cleanup();}
});
