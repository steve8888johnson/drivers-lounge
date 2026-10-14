import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {blankTrip} from '../src/assets/permits/core.mjs';
import {applySavedPermitSetup} from '../src/assets/permits/saved-setup.mjs';
const memory=readFileSync('src/assets/truck-setup-memory.js','utf8'),truck=readFileSync('src/assets/truck-first.js','utf8');
const values=()=>({'truck-height-ft':'13','truck-height-in':'6','truck-width-ft':'8','truck-width-in':'6','truck-length':'71','trailer-length':'53','truck-weight':'77500','truck-axles':'5','kingpin-rear-axle':'40','trailer-type':'semi-53'});
function store(){const entries=new Map();return{getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};}
function browser(storage,data={}){
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{value:data[id]??'',checked:false,type:['oversize','hazmat'].includes(id)?'checkbox':'text',textContent:'',handlers:{},addEventListener(event,fn){(this.handlers[event]??=[]).push(fn)},focus(){}});return elements.get(id)};
 const c=vm.createContext({document:{getElementById:get},localStorage:storage});vm.runInContext(memory,c);vm.runInContext(truck,c);
 return{api:c.DLTruckFirst,memory:c.DLTruckSetupMemory,get,event:(id,event)=>get(id).handlers[event]?.forEach(fn=>fn({}))};
}
test('first setup is remembered; return opens a compact summary without treating the load as confirmed',()=>{
 const s=store(),first=browser(s,values());assert(!first.api.hasSavedSetup());first.event('confirm-truck','click');assert(first.api.isConfirmed());
 const next=browser(s);assert(next.api.hasSavedSetup());assert(!next.api.isConfirmed());assert.equal(next.get('truck-height-ft').value,'13');assert.equal(next.get('trip-inputs').disabled,false);assert.equal(next.get('saved-truck-card').hidden,false);assert.match(next.get('saved-truck-summary').textContent,/77,500/);
 next.event('reuse-truck','click');assert(next.api.isConfirmed());assert(next.get('saved-truck-card').hidden);
});
test('truck/trailer edits revoke the confirmation and remembered shortcut, including changing back',()=>{
 const s=store(),h=browser(s,values());h.event('confirm-truck','click');h.get('trailer-length').value='48';h.event('trailer-length','input');assert(!h.api.isConfirmed());assert(!h.api.hasSavedSetup());assert.equal(h.memory.read(s,'standard'),null);assert(h.get('trip-inputs').disabled);
 const pending=browser(s);assert(!pending.api.hasSavedSetup());assert.equal(pending.get('trailer-length').value,'48');assert.equal(pending.get('truck-height-ft').value,'13');
 h.get('trailer-length').value='53';h.event('trailer-length','input');assert(!h.api.isConfirmed());assert(!browser(s).api.hasSavedSetup());
});
test('corrupt, invalid, unknown-version and inaccessible saved setups never skip first setup',()=>{
 for(const serialized of ['{bad',JSON.stringify({version:2,ready:true,values:values()}),JSON.stringify({version:1,ready:true,values:{...values(),'truck-height-in':'12'}}),JSON.stringify({version:1,ready:true,values:{...values(),'trailer-type':'invented'}})]){const s=store();s.setItem('dl-saved-setup-v1-standard',serialized);const h=browser(s);assert(!h.api.hasSavedSetup());assert(!h.api.isConfirmed());assert(h.get('trip-inputs').disabled);}
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};const h=browser(blocked,values());h.event('confirm-truck','click');assert(h.api.isConfirmed());assert(!h.api.hasSavedSetup());assert.match(h.get('truck-confirmation').textContent,/could not remember/);
});
test('saved convenience values never persist permit, cargo, axle evidence or approval fields',()=>{
 const s=store(),c=vm.createContext({});vm.runInContext(memory,c);
 assert(c.DLTruckSetupMemory.save(s,'standard',{...values(),confirmed:true,permits:['private'],hazmat:true,axleTicket:'private'}));
 const encoded=s.getItem('dl-saved-setup-v1-standard');assert(!/confirmed|permits|private|hazmat|axleTicket/.test(encoded));
 assert.equal(c.DLTruckSetupMemory.read(s,'permit'),null);
});
test('new permit draft reuses dimensions but requires a current load confirmation and new permits',()=>{
 const t=blankTrip(),p={heightFt:'14',widthFt:'12',lengthFt:'80',weightLb:'90000',axles:'6',axleWeights:'OLD WEIGHING',hazmat:'OLD CARGO',acknowledged:true,permits:[{}]};
 applySavedPermitSetup(t,p);assert.equal(t.profile.widthFt,'12');assert.equal(t.profile.weightLb,'90000');assert.equal(t.profile.axleWeights,'');assert.equal(t.profile.hazmat,'');assert.equal(t.acknowledged,false);assert.deepEqual(t.permits,[]);assert.equal(t.departure,'');assert(t.profileFromSavedSetup);
});
test('remembered measurements never overwrite existing loads or malformed values',()=>{
 const p={heightFt:'14',widthFt:'12',lengthFt:'80',weightLb:'90000',axles:'6'};
 const existing=blankTrip();existing.profile.widthFt='10';const before=structuredClone(existing);applySavedPermitSetup(existing,p);assert.deepEqual(existing,before);
 const bad=blankTrip();applySavedPermitSetup(bad,{...p,widthFt:'unknown'});assert.equal(bad.profile.widthFt,'');assert.equal(bad.profileFromSavedSetup,undefined);
});
test('returning navigation bypasses the full editor but not the current-load gate',()=>{
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{handlers:{},addEventListener(n,f){this.handlers[n]=f},focus(){}});return elements.get(id)};const body={dataset:{}},api={hasSavedSetup:()=>true,isConfirmed:()=>false,invalidate:()=>{}};
 vm.runInNewContext(readFileSync('src/assets/navigation-clean.js','utf8'),{document:{body,getElementById:get},window:{DLTruckFirst:api}});
 assert.equal(body.dataset.navScreen,'trip');get('reuse-truck').handlers.click();assert.notEqual(get('origin').focused,true);get('edit-truck').handlers.click();assert.equal(body.dataset.navScreen,'truck');
});
