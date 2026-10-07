import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('read-only beta never initializes the backend even with configured public keys',async()=>{
 let calls=0;
 const window={DRIVERS_LOUNGE_CONFIG:{readOnlyBeta:true,supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_test'},supabase:{createClient(){calls++;throw Error('must not connect');}}};
 vm.runInNewContext(readFileSync('src/assets/backend.js','utf8'),{window,location:{hash:'',search:''},URLSearchParams});
 assert.equal(calls,0);assert.equal(window.DLBackend.configured,false);
 await assert.rejects(window.DLBackend.signUp('test@example.com','not-a-real-password'),/not open/);
 assert.equal(await window.DLBackend.session(),null);
});
test('unconfigured account screen disables inputs before registering submission handlers',()=>{
 const controls=[{disabled:false},{disabled:false}], form={hidden:false,querySelectorAll(){return controls;}};
 const title={},message={hidden:true};
 const document={querySelector(s){return s==='#account-title'?title:s==='#auth-message'?message:null;},querySelectorAll(s){if(s==='[data-guest-only]')return [];assert.equal(s,'form');return [form];}};
 vm.runInNewContext(readFileSync('src/assets/auth.js','utf8'),{window:{DLBackend:{configured:false}},document,location:{search:''},URLSearchParams});
 assert.equal(form.hidden,true);assert(controls.every(c=>c.disabled));assert.equal(message.hidden,false);
 assert.match(message.textContent,/does not accept sign-ins/);assert.match(message.textContent,/support@atlasdigital.dev/);
});
test('deletion screen offers email and stops on unavailable account or request status',async()=>{
 for(const scenario of ['closed','session-error','status-error']){
  const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,style:{},addEventListener(){throw Error('must not register mutations after failed verification')}});return elements.get(id)};
  let sessionCalls=0,listCalls=0;
  const window={DLBackend:{configured:scenario!=='closed',async user(){sessionCalls++;if(scenario==='session-error')throw Error('offline');return {id:'test-user',email:'test@example.com'}},async list(){listCalls++;throw Error('offline')}}};
  await vm.runInNewContext(readFileSync('src/assets/delete-account-rc2.js','utf8'),{window,document:{querySelector:element},console:{error(){}}});
  assert.equal(element('#delete-web-form').hidden,true);
  assert.match(element('#delete-status').textContent,/legal@atlasdigital.dev/);
  assert.equal(sessionCalls,scenario==='closed'?0:1);assert.equal(listCalls,scenario==='status-error'?1:0);
 }
});
