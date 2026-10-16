import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source=await readFile(new URL('../src/assets/mission-control.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup({user={id:'driver'},passport={},listFailure=false,delayedPassport}={}){
 const elements=new Map(),events={},calls=[];
 const el=selector=>{if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',hidden:true});return elements.get(selector)};
 const state={user};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[2026,8,20,23,30]))}}
 const B={configured:true,async user(){return state.user},async list(table,opts){calls.push({table,opts});if(listFailure&&table==='profiles')throw Error('offline');if(table==='profiles')return [{id:'profile-driver',display_name:'Driver'}];if(table==='driver_passports')return delayedPassport?await delayedPassport:[passport];return []}};
 vm.runInNewContext(source,{window:{DLBackend:B,addEventListener(name,fn){events[name]=fn}},document:{querySelector:el},localStorage:{getItem(){return null}},Date:Clock});
 return {el,events,calls,state};
}
test('signed-out dashboard does not request private records',async()=>{
 const s=setup({user:null});await settle();assert.equal(s.el('#mc-signin').hidden,false);assert.equal(s.calls.some(c=>c.table!=='road_reports'),false);assert.equal(s.el('#mc-credentials').innerHTML,'');
});
test('credential reminders handle expired, today and tomorrow on the local calendar',async()=>{
 const s=setup({passport:{cdl_expires:'2026-09-19',medical_card_expires:'2026-09-20',twic_expires:'2026-09-21'}});await settle();
 const html=s.el('#mc-credentials').innerHTML;assert.match(html,/Expired 2026-09-19/);assert.match(html,/Expires today/);assert.match(html,/Expires tomorrow/);
 assert.equal(s.calls.find(c=>c.table==='driver_passports').opts.eq.profile_id,'profile-driver');
});
test('missing and invalid dates are not represented as valid credentials',async()=>{
 const s=setup({passport:{cdl_expires:'2026-02-30',medical_card_expires:'<img src=x onerror=alert(1)>'}});await settle();
 const html=s.el('#mc-credentials').innerHTML;assert.equal((html.match(/Expiration not entered/g)||[]).length,3);assert.doesNotMatch(html,/<img|current/);
});
test('30-day warning boundary is inclusive',async()=>{
 const s=setup({passport:{cdl_expires:'2026-10-20',medical_card_expires:'2026-10-21'}});await settle();const html=s.el('#mc-credentials').innerHTML;
 assert.match(html,/data-urgency="soon"><strong>CDL/);assert.match(html,/in 30 days/);assert.match(html,/data-urgency="current"><strong>Medical card/);
});
test('signout clears private reminders and ignores an earlier pending response',async()=>{
 let finish;const delayedPassport=new Promise(resolve=>finish=resolve),s=setup({delayedPassport});await settle();s.state.user=null;s.events['dl-auth-change']();await settle();finish([{cdl_expires:'2026-09-19'}]);await settle();
 assert.equal(s.el('#mc-credentials').innerHTML,'');assert.equal(s.el('#mc-signin').hidden,false);assert.equal(s.el('#mc-greeting').textContent,'Welcome to Mission Control.');
});
test('profile failure stays visible while public road reports still load',async()=>{
 const s=setup({listFailure:true});await settle();assert.match(s.el('#mc-workspace-status').textContent,/could not be loaded/);assert.match(s.el('#mc-road-feed').innerHTML,/No current reports/);
});
test('publishing a road report refreshes the feed',async()=>{
 const s=setup();await settle();s.events['dl-report-published']();await settle();assert.equal(s.calls.filter(c=>c.table==='road_reports').length,2);
});
