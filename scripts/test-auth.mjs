import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source=await readFile(new URL('../src/assets/backend.js',import.meta.url),'utf8');
function setup({hash='',search='',error=null}={}){
 const calls=[],listeners={};let authChange;
 const auth={
  onAuthStateChange(fn){authChange=fn},
  async resetPasswordForEmail(email,options){calls.push({method:'reset',email,options});return {data:{},error}},
  async signUp(input){calls.push({method:'signup',input});return {data:{},error}},
  async signInWithPassword(input){calls.push({method:'signin',input});return {data:{},error}},
  async getSession(){return {data:{session:{user:{id:'driver'}}},error}},
  async updateUser(input){calls.push({method:'update',input});return {data:{user:{id:'driver'}},error}},
  async resend(input){calls.push({method:'resend',input});return {data:{},error}},
  async signOut(){return {error}}
 };
 const window={DRIVERS_LOUNGE_CONFIG:{supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'test-publishable-key'},supabase:{createClient(){return {auth}}},dispatchEvent(e){listeners[e.type]=e.detail}};
 vm.runInNewContext(source,{window,location:{origin:'https://drivers-lounge.vercel.app',hash,search},URLSearchParams,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}}});
 return {backend:window.DLBackend,calls,event:()=>authChange('PASSWORD_RECOVERY'),listeners};
}
test('recovery email failures are rejected rather than reported as success',async()=>{
 const failure={code:'over_email_send_rate_limit',message:'Too many requests'};
 await assert.rejects(setup({error:failure}).backend.reset('driver@example.com'),e=>e===failure);
});
test('reset and confirmation callbacks return to the deployed account page',async()=>{
 const {backend,calls}=setup();await backend.reset(' driver@example.com ');await backend.signUp(' driver@example.com ','test-value',{role:'driver'});await backend.resendConfirmation(' driver@example.com ');
 assert.equal(calls[0].options.redirectTo,'https://drivers-lounge.vercel.app/account?flow=recovery');
 assert.equal(calls[0].email,'driver@example.com');
 assert.equal(calls[1].input.options.emailRedirectTo,'https://drivers-lounge.vercel.app/account?confirmed=1');
 assert.equal(calls[2].input.options.emailRedirectTo,calls[1].input.options.emailRedirectTo);
});
test('recovery intent survives URL fragment consumption and session events',()=>{
 assert.equal(setup({hash:'#type=recovery&access_token=test'}).backend.authCallback.recovery,true);
 assert.equal(setup({search:'?flow=recovery'}).backend.authCallback.recovery,true);
 const s=setup();s.event();assert.equal(s.backend.authCallback.recovery,true);assert.equal(s.listeners['dl-auth-change'].event,'PASSWORD_RECOVERY');
});
test('expired callback errors are retained for visible recovery guidance',()=>{
 assert.equal(setup({hash:'#error=access_denied&error_code=otp_expired'}).backend.authCallback.error,'otp_expired');
});
test('password update is submitted to Supabase and clears recovery only on success',async()=>{
 const good=setup({search:'?flow=recovery'});await good.backend.updatePassword('new-test-value');assert.equal(good.calls[0].input.password,'new-test-value');assert.equal(good.backend.authCallback.recovery,false);
 const bad=setup({search:'?flow=recovery',error:{message:'Session expired'}});await assert.rejects(bad.backend.updatePassword('new-test-value'));assert.equal(bad.backend.authCallback.recovery,true);
});
test('signout and session errors propagate to the UI',async()=>{
 const {backend}=setup({error:{message:'Network failed'}});await assert.rejects(backend.signOut());await assert.rejects(backend.session());
});
