import test from 'node:test';
import assert from 'node:assert/strict';
import {rowIdentity,readRoadEvidence,evidenceForRow,nearestRoadPoint,connectionEvidence} from '../src/assets/permits/road-evidence.mjs';
import {sourcePiece,readMovements,compassOrder} from '../src/assets/permits/road-movement.mjs';
import {createRoadEvidence} from '../src/assets/permits/road-evidence-ui.mjs';
const review=()=>({state:'TX',pdfSha256:'a'.repeat(64),issues:[],rows:[{page:3,road:'IH35 s',instruction:'Take Exit 12',miles:'1.0',cumulative:'2.0'},{page:4,road:'IH35 Ramp s',instruction:'Continue on frontage road',miles:'0.3',cumulative:'2.3'}]});
const packet=()=>({format:'dl-road-evidence/v1',pdfSha256:'a'.repeat(64),state:'TX',rowCount:2,rows:[{index:0,identity:rowIdentity(review(),0),source:'https://example.gov/roads',retrievedAt:'2026-10-15T12:00:00Z',dataDate:'2026-10-01',note:'Proximity only',features:[{id:'1',road:'IH0035-RP',kind:'Ramp',direction:'Unknown',paths:[[[32,-97],[32.001,-97.001]]]}]}]});
const countySource=()=>({label:'County street records',url:'https://county.example.gov/streets',dataDate:'2026-04-16',retrievedAt:'2026-10-15T20:00:00Z'});
test('v3 preserves per-record provenance without granting any movement permission',()=>{
 const p=packet();p.format='dl-road-evidence/v3';p.rows[0].features[0].provenance={...countySource(),approved:true};p.rows[0].movements=[{...candidate(),approved:true,travelDirectionVerified:true}];
 const r=readRoadEvidence(JSON.stringify(p),review());assert.deepEqual(r.rows[0].features[0].provenance,countySource());assert.equal(r.approved,false);assert.equal(r.rows[0].movements[0].travelDirectionVerified,false);assert.equal(r.rows[0].movements[0].approved,false);
});
test('alternate sources reject private links, malformed dates and older format labels',()=>{
 for(const change of [p=>p.format='dl-road-evidence/v2',p=>p.rows[0].features[0].provenance.url='https://example.gov/?token=private',p=>p.rows[0].features[0].provenance.url='javascript:alert(1)',p=>p.rows[0].features[0].provenance.retrievedAt='unknown',p=>p.rows[0].features[0].provenance.label='',p=>p.rows[0].features[0].provenance.dataDate='']){const p=packet();p.format='dl-road-evidence/v3';p.rows[0].features[0].provenance=countySource();change(p);assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));}
});
test('selected geometry displays its own source and switching records clears the old attribution',async()=>{
 const e=environment();try{
  const p=packet();p.format='dl-road-evidence/v3';p.rows[0].features.push({...structuredClone(p.rows[0].features[0]),id:'county-1',provenance:countySource()});
  await e.load(JSON.stringify(p));let box=e.el('#printed-road-source');assert.equal(box.children[0].children[0].href,'https://example.gov/roads');
  e.el('#printed-road-feature').value='county-1';e.el('#printed-road-feature').onchange();assert.equal(box.children[0].children[0].href,countySource().url);assert.equal(box.children.length,2);
  e.el('#printed-road-feature').value='1';e.el('#printed-road-feature').onchange();assert.equal(box.children[0].children[0].href,'https://example.gov/roads');e.ui.select(1);assert.equal(box.children.length,0);
 }finally{e.cleanup();}
});
test('evidence is bound to literal source row, page, state and mileage without approving geometry',()=>{
 const r=review(),before=structuredClone(r),p=readRoadEvidence(JSON.stringify({...packet(),approved:true}),r);assert.deepEqual(r,before);assert.equal(p.approved,false);assert.equal(p.rows[0].features[0].road,'IH0035-RP');assert.equal(evidenceForRow(p,r,1),null);r.rows[0].instruction='Different exit';assert.equal(evidenceForRow(p,r,0),null);
});
test('changed source, row count, page, state and repeats reject the entire comparison',()=>{
 for(const mutate of [p=>p.pdfSha256='b'.repeat(64),p=>p.state='KS',p=>p.rowCount=3,p=>p.rows[0].identity='wrong',p=>p.rows.push(p.rows[0])]){const p=packet();mutate(p);assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));}const r=review();r.rows[0].page=4;assert.throws(()=>readRoadEvidence(JSON.stringify(packet()),r));r.issues.push('missing text');assert.throws(()=>readRoadEvidence(JSON.stringify(packet()),r));
});
test('untrusted links, invalid metadata and duplicate features fail before rendering',()=>{
 for(const source of ['javascript:alert(1)','http://example.gov','https://user:password@example.gov','https://example.gov/?key=secret','https://example.gov/#secret']){const p=packet();p.rows[0].source=source;assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));}const p=packet();p.rows[0].features.push(p.rows[0].features[0]);assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));p.rows[0].retrievedAt='yesterday';assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));
});
test('bad, sparse, dateline and excessive geometry fail closed',()=>{
 for(const paths of [[[[90,-97],[32,-97]]],[[[32,-97],[34,-97]]],[[[32,179.99],[32,-179.99]]],[[[32,-97]]]]){const p=packet();p.rows[0].features[0].paths=paths;assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));}assert.throws(()=>readRoadEvidence('x'.repeat(4000001),review()));
});
test('multipart road geometry stays separate and unknown direction remains explicit',()=>{
 const p=packet();p.rows[0].features[0].paths.push([[32.01,-97.01],[32.011,-97.011]]);const result=readRoadEvidence(JSON.stringify(p),review());assert.equal(result.rows[0].features[0].paths.length,2);assert.equal(result.rows[0].features[0].direction,'Unknown');
});
test('point-to-line checks find an interior junction, not only the nearest vertex',()=>{
 const hit=nearestRoadPoint([32,-97],[[[31.99,-97],[32.01,-97]]]);assert(hit.meters<.001);assert.deepEqual(hit.point,[32,-97]);assert.equal(nearestRoadPoint([NaN,0],[]),null);
});
test('reversed storage order produces proximity only, never one-way or turn authorization',()=>{
 const from=[[[32,-97.01],[32,-96.99]]],to=[[[32.01,-97.01],[32.01,-96.99]]];const a=connectionEvidence(from,[[32,-97],[32.01,-97]],to),b=connectionEvidence(from,[[32.01,-97],[32,-97]],to);assert.deepEqual(a,b);assert(a.fromGapMeters<.01&&a.toGapMeters<.01);assert.equal(a.travelDirectionVerified,false);assert.equal(a.approved,false);assert.equal(a.proximityOnly,true);
});
test('a crossing road and a separated level cannot be promoted by geometric proximity',()=>{
 const c=connectionEvidence([[[32,-97.01],[32,-96.99]]],[[32,-97],[32.01,-97]],[[[32.01,-97.01],[32.01,-96.99]]]);assert.equal(c.approved,false);assert.equal(c.travelDirectionVerified,false);assert.equal(connectionEvidence([],[[32,-97],[32.01,-97]],[]),null);
});

function environment(){
 const old={document:globalThis.document,window:globalThis.window,Option:globalThis.Option},elements=new Map(),state={removed:0,created:0,fail:false,read:0,stops:0,changes:[],fits:[],lines:[]};
 const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',hidden:true,disabled:false,open:true,children:[],replaceChildren(...children){this.children=children;this.value=children[0]?.value||'';},append(...children){this.children.push(...children);}});return elements.get(id);};
 globalThis.document={hidden:false,querySelector:el,createElement:()=>({textContent:'',children:[],append(...children){this.children.push(...children);}}),createTextNode:s=>s};globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
 globalThis.window={L:{map(){if(state.fail)throw Error('Map unavailable');state.created++;return {remove(){state.removed++;},fitBounds(bounds){state.fits.push(bounds);}};},layerGroup(){return {addTo(){return this;},clearLayers(){}};},polyline(path,options){state.lines.push({path,options});return {bindTooltip(){return this;},addTo(){return this;}};},circleMarker(){return {bindTooltip(){return this;},addTo(){return this;}};},latLngBounds:x=>x}};
 const ui=createRoadEvidence({readRow:()=>state.read++,stopSpeech:()=>state.stops++,changeRow:i=>state.changes.push(i)});ui.reset(review());
 const load=(raw=JSON.stringify(packet()))=>el('#printed-road-file').onchange({target:{files:[{size:raw.length,text:async()=>raw}],value:'file'}});
 return {ui,el,state,load,cleanup(){ui.stop();Object.assign(globalThis,old);}};
}
test('map and read action stay with the selected source row; missing evidence removes the old map',async()=>{
 const e=environment();try{await e.load();await e.el('#printed-road-open').onclick();e.el('#printed-road-read').onclick();assert.equal(e.state.read,1);assert.match(e.el('#printed-road-turn').textContent,/Take Exit 12/);e.ui.select(1);assert(e.el('#printed-road-map').hidden);assert(e.el('#printed-road-read').disabled);assert.equal(e.state.removed,1);assert.match(e.el('#printed-road-status').textContent,/No road evidence/);}finally{e.cleanup();}
});
test('map failure keeps source text available and permits an explicit retry',async()=>{
 const e=environment();try{await e.load();e.state.fail=true;await e.el('#printed-road-open').onclick();assert.match(e.el('#printed-road-status').textContent,/unavailable/);assert(!e.el('#printed-road-open').disabled);assert.match(e.el('#printed-road-turn').textContent,/Take Exit 12/);e.state.fail=false;await e.el('#printed-road-open').onclick();assert.equal(e.state.created,1);}finally{e.cleanup();}
});
test('invalid replacement evidence removes the previous map and read association',async()=>{
 const e=environment();try{await e.load();await e.el('#printed-road-open').onclick();await e.load('{invalid');assert(e.el('#printed-road-map').hidden);assert(e.el('#printed-road-open').disabled);assert(e.el('#printed-road-read').disabled);assert.match(e.el('#printed-road-status').textContent,/not loaded/);}finally{e.cleanup();}
});
test('late file completion cannot revive a hidden or closed review',async()=>{
 const e=environment();try{let resolve;const promise=new Promise(r=>resolve=r),pending=e.el('#printed-road-file').onchange({target:{files:[{size:100,text:()=>promise}],value:'file'}});e.ui.stop();resolve(JSON.stringify(packet()));await pending;assert(e.el('#printed-road-open').disabled);assert(e.el('#printed-road-map').hidden);assert.equal(e.state.created,0);}finally{e.cleanup();}
});

test('opened map follows the next evidence row without automatically speaking',async()=>{
 const e=environment();try{const p=packet();p.rows.push({...structuredClone(p.rows[0]),index:1,identity:rowIdentity(review(),1),features:[{...p.rows[0].features[0],id:'2',road:'Frontage road'}]});await e.load(JSON.stringify(p));await e.el('#printed-road-open').onclick();const stops=e.state.stops;e.ui.select(1);await Promise.resolve();assert.equal(e.state.created,2);assert.equal(e.state.removed,1);assert.match(e.el('#printed-road-turn').textContent,/Continue on frontage/);assert.match(e.el('#printed-road-detail').textContent,/Frontage road/);assert.equal(e.state.read,0);assert(e.state.stops>stops);assert(!e.el('#printed-road-map').hidden);assert.match(e.el('#printed-road-coverage').textContent,/2 of 2/);assert.match(e.el('#printed-road-coverage').textContent,/not a continuous or approved/);}finally{e.cleanup();}
});

test('stopping an opening map prevents late rendering and automatic restart on row change',async()=>{
 const e=environment();try{await e.load();const pending=e.el('#printed-road-open').onclick();e.ui.stop();await pending;assert.equal(e.state.created,0);assert(e.el('#printed-road-map').hidden);e.ui.select(0);await Promise.resolve();assert.equal(e.state.created,0);assert(e.el('#printed-road-fit').disabled);}finally{e.cleanup();}
});

test('whole-junction view includes alternatives while turn buttons respect source boundaries',async()=>{
 const e=environment();try{const p=packet();p.rows[0].features.push({id:'2',road:'Other branch',kind:'Ramp',direction:'Unknown',paths:[[[32.002,-97.003],[32.004,-97.005]]]});await e.load(JSON.stringify(p));assert(e.el('#printed-road-previous').disabled);e.el('#printed-road-previous').onclick();assert.deepEqual(e.state.changes,[]);e.el('#printed-road-next').onclick();assert.deepEqual(e.state.changes,[1]);await e.el('#printed-road-open').onclick();e.el('#printed-road-fit').onclick();assert.deepEqual(e.state.fits.at(-1),p.rows[0].features.flatMap(f=>f.paths.flat()));e.ui.select(1);assert(e.el('#printed-road-next').disabled);assert(e.el('#printed-road-fit').disabled);e.el('#printed-road-next').onclick();assert.deepEqual(e.state.changes,[1]);}finally{e.cleanup();}
});

test('interior split retains original vertices and excludes the unused branch in both storage orders',()=>{
 const path=[[32,-97],[32.001,-97],[32.002,-97],[32.003,-97]];
 const start={segment:0,fraction:.5},end={segment:1,fraction:.5};
 assert.deepEqual(sourcePiece(path,start,end),[[32.0005,-97],[32.001,-97],[32.0015,-97]]);
 assert.deepEqual(sourcePiece(path,end,start),[[32.0015,-97],[32.001,-97],[32.0005,-97]]);
 assert.throws(()=>sourcePiece(path,start,start));
 for(const invalid of [{segment:-1,fraction:0},{segment:3,fraction:0},{segment:1,fraction:NaN},{segment:0,fraction:1.1}])assert.throws(()=>sourcePiece(path,start,invalid));
});
const candidate=()=>({id:'split',label:'South branch comparison',note:'Signs unverified.',parts:[{featureId:'1',pathIndex:0,start:{segment:0,fraction:0},end:{segment:0,fraction:1}}]});
test('movement claims cannot set approval or verified direction, even when endpoints coincide',()=>{
 const f=packet().rows[0].features,m=readMovements([{...candidate(),approved:true,travelDirectionVerified:true}],f)[0];
 assert.equal(m.approved,false);assert.equal(m.travelDirectionVerified,false);assert.equal(m.parts[0].compass,'northwest');
 assert.equal(compassOrder([[32,-97],[32.001,-97],[32,-97]]),'loops back near its start');
});
test('disconnected, wrong-branch, nonexistent and repeated movement references fail closed',()=>{
 const features=packet().rows[0].features;features.push({...features[0],id:'2',paths:[[[32.01,-97.01],[32.011,-97.011]]]});
 for(const mutate of [m=>m.parts[0].featureId='missing',m=>m.parts[0].pathIndex=1,m=>m.parts.push(m.parts[0]),m=>m.parts.push({...m.parts[0],featureId:'2'})]){const m=candidate();mutate(m);assert.throws(()=>readMovements([m],features));}
 const m=candidate();assert.throws(()=>readMovements([m,m],features));
});
test('nearby pieces remain separate without a fabricated line through their gap',()=>{
 const features=packet().rows[0].features;features.push({...features[0],id:'2',paths:[[[32.001003,-97.001],[32.002,-97.002]]]});
 const m=candidate();m.parts.push({...m.parts[0],featureId:'2'});const result=readMovements([m],features)[0];
 assert(result.gaps[0]>.3&&result.gaps[0]<.4);assert.equal(result.parts.length,2);assert.equal(result.parts[0].path.length,2);assert.equal(result.parts[1].path.length,2);assert.equal(result.approved,false);
});

test('an eight-metre near miss cannot become an ordered ramp connection',()=>{
 const features=packet().rows[0].features;features.push({...features[0],id:'2',paths:[[[32.001074,-97.001],[32.002,-97.002]]]});
 const m=candidate();m.parts.push({...m.parts[0],featureId:'2'});assert.throws(()=>readMovements([m],features),/1 m comparison tolerance/);
});

const check=()=>({outcome:'supports',label:'Exit sign',detail:'Historical plan supports one ramp; current conditions unknown.',date:'2025-02-21',source:'https://example.gov/plan.pdf'});
test('checks retain provenance and uncertainty without granting approval',()=>{
 const p=packet();p.format='dl-road-evidence/v2';p.rows[0].checks=[{...check(),approved:true}];const result=readRoadEvidence(JSON.stringify(p),review());assert.deepEqual(result.rows[0].checks,[check()]);assert.equal(result.approved,false);assert.equal(result.format,'dl-road-evidence/v2');assert.throws(()=>readRoadEvidence(JSON.stringify({...p,format:'dl-road-evidence/v99'}),review()));
 for(const mutate of [c=>c.outcome='approved',c=>c.source='javascript:alert(1)',c=>c.source='https://example.gov/?token=x',c=>c.date='',c=>c.detail='x'.repeat(1501)]){const c=check();mutate(c);p.rows[0].checks=[c];assert.throws(()=>readRoadEvidence(JSON.stringify(p),review()));}
 const m=candidate();m.disposition='approved';assert.throws(()=>readMovements([m],packet().rows[0].features));
});

test('conflicting geometry is never selected by default and uses a text label plus dashed red',async()=>{
 const e=environment();try{const p=packet();p.rows[0].movements=[{...candidate(),disposition:'conflict'}];p.rows[0].checks=[{...check(),outcome:'conflict'}];await e.load(JSON.stringify(p));assert.equal(e.el('#printed-road-feature').value,'');assert(!e.el('#printed-road-checks').hidden);const details=e.el('#printed-road-checks').children[0];assert.match(details.children[0].textContent,/1 conflict/);assert.match(details.children[1].children[0].textContent,/Conflict/);await e.el('#printed-road-open').onclick();assert(!e.state.lines.some(l=>l.options.color==='#a94c00'));e.el('#printed-road-feature').value='movement:split';e.el('#printed-road-feature').onchange();assert.match(e.el('#printed-road-detail').textContent,/CONFLICT — DO NOT USE/);assert.equal(e.state.lines.at(-1).options.dashArray,'9 7');assert.equal(e.state.lines.at(-1).options.color,'#a62035');assert.equal(e.state.read,0);e.ui.select(1);assert(e.el('#printed-road-checks').hidden);assert.equal(e.el('#printed-road-checks').children.length,0);}finally{e.cleanup();}
});
test('candidate selection fits only its referenced pieces, keeps speech manual and exposes direction uncertainty',async()=>{
 const e=environment();try{const p=packet();p.rows[0].movements=[candidate()];await e.load(JSON.stringify(p));await e.el('#printed-road-open').onclick();assert.match(e.el('#printed-road-detail').textContent,/CANDIDATE COMPARISON/);assert.match(e.el('#printed-road-detail').textContent,/Traffic direction and turn permission remain unverified/);assert.deepEqual(e.state.fits.at(-1),p.rows[0].features[0].paths[0]);assert.equal(e.state.read,0);const stops=e.state.stops;e.el('#printed-road-feature').value='1';e.el('#printed-road-feature').onchange();assert(e.state.stops>stops);assert.match(e.el('#printed-road-detail').textContent,/inventory order, not allowed traffic/);assert.equal(e.state.read,0);}finally{e.cleanup();}
});
