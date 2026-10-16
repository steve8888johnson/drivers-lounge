import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('clean view cannot leave setup without truck confirmation and editing restores setup',()=>{
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{value:'13',handlers:{},addEventListener(n,f){this.handlers[n]=f},focus(){this.focused=true}});return elements.get(id)};
 let confirmed=false;const body={dataset:{}};const window={DLTruckFirst:{isConfirmed:()=>confirmed}};
 vm.runInNewContext(readFileSync('src/assets/navigation-clean.js','utf8'),{document:{body,getElementById:get},window});
 assert.equal(body.dataset.navScreen,'truck');get('confirm-truck').handlers.click();assert.equal(body.dataset.navScreen,'truck');
 confirmed=true;get('confirm-truck').handlers.click();assert.equal(body.dataset.navScreen,'trip');assert.equal(get('origin').focused,true);
 get('edit-truck').handlers.click();assert.equal(body.dataset.navScreen,'truck');assert.equal(get('profile-editor').hidden,false);
 confirmed=false;get('calculate-route').handlers.click();assert.notEqual(get('route-evidence').open,true);
 confirmed=true;get('calculate-route').handlers.click();assert.equal(get('route-evidence').open,true);
});
