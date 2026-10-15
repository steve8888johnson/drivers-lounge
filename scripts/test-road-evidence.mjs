import test from 'node:test';
import assert from 'node:assert/strict';
import {rowIdentity,readRoadEvidence,evidenceForRow,nearestRoadPoint,connectionEvidence} from '../src/assets/permits/road-evidence.mjs';
import {createRoadEvidence} from '../src/assets/permits/road-evidence-ui.mjs';
const review=()=>({state:'TX',pdfSha256:'a'.repeat(64),issues:[],rows:[{page:3,road:'IH35 s',instruction:'Take Exit 12',miles:'1.0',cumulative:'2.0'},{page:4,road:'IH35 Ramp s',instruction:'Continue on frontage road',miles:'0.3',cumulative:'2.3'}]});
const packet=()=>({format:'dl-road-evidence/v1',pdfSha256:'a'.repeat(64),state:'TX',rowCount:2,rows:[{index:0,identity:rowIdentity(review(),0),source:'https://example.gov/roads',retrievedAt:'2026-10-15T12:00:00Z',dataDate:'2026-10-01',note:'Proximity only',features:[{id:'1',road:'IH0035-RP',kind:'Ramp',direction:'Unknown',paths:[[[32,-97],[32.001,-97.001]]]}]}]});
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
 const old={document:globalThis.document,window:globalThis.window,Option:globalThis.Option},elements=new Map(),state={removed:0,created:0,fail:false,read:0,stops:0};
 const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',hidden:true,disabled:false,open:true,children:[],replaceChildren(...children){this.children=children;this.value=children[0]?.value||'';},append(...children){this.children.push(...children);}});return elements.get(id);};
 globalThis.document={hidden:false,querySelector:el,createElement:()=>({textContent:''}),createTextNode:s=>s};globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
 globalThis.window={L:{map(){if(state.fail)throw Error('Map unavailable');state.created++;return {remove(){state.removed++;},fitBounds(){}};},layerGroup(){return {addTo(){return this;},clearLayers(){}};},polyline(){return {bindTooltip(){return this;},addTo(){return this;}};},latLngBounds:x=>x}};
 const ui=createRoadEvidence({readRow:()=>state.read++,stopSpeech:()=>state.stops++});ui.reset(review());
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
