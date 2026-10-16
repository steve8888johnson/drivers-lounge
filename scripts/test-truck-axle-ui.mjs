import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {mountAxleReview} from '../src/assets/truck-axle-ui.mjs';import {formDraft,formProfile} from './fixtures/truck-axle-form.mjs';
function fixture(){
 const els=new Map(),p=formProfile();let clock=Date.parse('2026-10-13T12:00:00Z'),timer,reset=0;
 function element(id){const el={id,value:p[id]??'',checked:false,type:['oversize','hazmat','axle-measured-confirm'].includes(id)?'checkbox':'text',children:[],handlers:{},textContent:'',
 addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);},fire(k){for(const f of this.handlers[k]||[])f();},append(...kids){this.children.push(...kids);for(const k of kids){if(k.id)els.set(k.id,k);}},replaceChildren(){this.children=[];}};return el;}
 const get=id=>{if(!els.has(id))els.set(id,element(id));return els.get(id);};
 const doc={getElementById:get,createElement:()=>element(''),addEventListener(){}};
 const c=vm.createContext({});vm.runInContext(readFileSync('src/assets/truck-first.js','utf8'),c);
 const win={addEventListener(){},DLTruckFirst:{validate:c.DLTruckFirst.validate,invalidate(){reset++;}}};
 const ui=mountAxleReview({document:doc,window:win,clock:()=>clock,setTimer:fn=>{timer=fn;return 1;},clearTimer:()=>{timer=null;}});
 const fill=()=>{const d=formDraft();for(const [id,value] of Object.entries({'axle-measurement-kind':d.kind,'axle-configuration':d.configuration,'axle-load-reference':d.loadReference,'axle-weighed-at':d.localTime,'axle-time-offset':d.offset}))get(id).value=value;
 d.axles.forEach((x,i)=>{get('axle-'+i+'-weight').value=x.weightLb;get('axle-'+i+'-position').value=x.positionIn;});get('axle-measured-confirm').checked=true;ui.review();};
 return {get,ui,fill,expire(){clock=Date.parse('2026-10-14T10:00:00Z');timer?.();},resetCount:()=>reset};
}
test('UI shows checks but holds guidance, and input edits revoke review immediately',()=>{
 const f=fixture();f.fill();assert(f.ui.snapshot());assert.equal(f.get('axle-review-groups').children.length,15);assert.match(f.get('why-axles').textContent,/not clearance to drive/);
 f.get('axle-1-weight').fire('input');assert.equal(f.ui.snapshot(),null);assert.equal(f.get('axle-measured-confirm').checked,false);assert.equal(f.get('axle-review-groups').children.length,0);
});
test('programmatic advanced edits are caught on snapshot, including weight and weighing time',()=>{
 for(const [id,value] of [['axle-1-weight','16501'],['axle-4-position','680'],['axle-weighed-at','2026-10-13T05:00'],['axle-load-reference','other-load'],['truck-height-in','7'],['axle-configuration','single-unit']]){
 const f=fixture();f.fill();assert(f.ui.snapshot());f.get(id).value=value;assert.equal(f.ui.snapshot(),null,id);assert.equal(f.get('axle-review-groups').children.length,0);}
});
test('group-only mode, load-change action and expiry remove old results',()=>{
 const f=fixture();f.fill();f.get('axle-measurement-kind').value='grouped';f.get('axle-measurement-kind').fire('change');assert.equal(f.get('axle-group-notes').hidden,false);assert.equal(f.get('axle-individual-fields').hidden,true);f.ui.review();assert.equal(f.ui.snapshot(),null);
 f.fill();f.get('load-changed').fire('click');assert.equal(f.resetCount(),1);assert.equal(f.ui.snapshot(),null);
 f.fill();f.expire();assert.equal(f.ui.snapshot(),null);assert.equal(f.get('axle-measured-confirm').checked,false);
});
test('failed validation removes a previous accepted review and never creates a fresh session on reload',()=>{
 const f=fixture();f.fill();f.get('truck-weight').value='79000';f.ui.review();assert.equal(f.ui.snapshot(),null);assert.equal(f.get('axle-review-groups').children.length,0);
 assert.equal(fixture().ui.snapshot(),null);
 const html=readFileSync('src/navigation.html','utf8');assert.match(html,/<button id="review-axles" type="button" disabled>/);assert.match(html,/type="module" src="\/assets\/truck-axle-ui.mjs"/);
});
