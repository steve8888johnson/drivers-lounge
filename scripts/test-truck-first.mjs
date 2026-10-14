import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync('src/assets/truck-first.js','utf8');
const valid=()=>({'truck-height-ft':'13','truck-height-in':'6','truck-width-ft':'8','truck-width-in':'6','truck-length':'71','trailer-length':'53','truck-weight':'80000','truck-axles':'5','kingpin-rear-axle':'40','trailer-type':'semi-53',oversize:false,hazmat:false});
test('dimensions validation rejects blank inches, impossible fractions and inconsistent trailers',()=>{
 const c=vm.createContext({});vm.runInContext(source,c);assert.equal(c.DLTruckFirst.validate(valid()).length,0);
 for(const [key,value]of[['truck-height-in',''],['truck-width-in','12'],['truck-axles','2.5'],['truck-weight','-20'],['trailer-length','90'],['kingpin-rear-axle',''],['hazmat',true]]){const p=valid();p[key]=value;assert(c.DLTruckFirst.validate(p).length>0,key);}
});
test('confirmation unlocks trip inputs only; editing revokes confirmation and removes old explanation',()=>{
 const elements=new Map();const data=valid();const get=id=>{if(!elements.has(id))elements.set(id,{value:data[id]??'',type:['oversize','hazmat'].includes(id)?'checkbox':'text',checked:false,handlers:{},textContent:'',addEventListener(name,fn){this.handlers[name]=fn},focus(){this.focused=true}});return elements.get(id)};
 const c=vm.createContext({document:{getElementById:get}});vm.runInContext(source,c);
 assert.equal(get('trip-inputs').disabled,true);get('confirm-truck').handlers.click();assert.equal(get('trip-inputs').disabled,false);assert.equal(c.DLTruckFirst.isConfirmed(),true);assert.match(get('why-profile').textContent,/71 ft long/);
 get('truck-weight').value='90000';get('truck-weight').handlers.input();assert.equal(get('trip-inputs').disabled,true);assert.equal(c.DLTruckFirst.isConfirmed(),false);assert.match(get('truck-readiness-details').textContent,/Confirm the loaded truck/);assert.doesNotMatch(get('why-profile').textContent,/80000|80,000/);
});
test('profile appears before destination entry and no route evidence is fabricated',()=>{
 const html=readFileSync('src/navigation.html','utf8');assert(html.indexOf('id="profile-editor"')<html.indexOf('id="origin"'));assert.match(html,/<fieldset id="trip-inputs" disabled>/);assert.match(html,/No route selected yet/);assert.match(html,/No avoided-road count is claimed/);
});
