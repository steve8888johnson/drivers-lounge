import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const source=readFileSync('src/assets/backend.js','utf8');
function setup(config={}){
 const calls=[];let notify;
 const auth={onAuthStateChange(fn){notify=fn},async getSession(){return {data:{session:{user:{id:'owner'}}}}},async getUser(){return {data:{user:{id:'owner'}}}},async signInWithPassword(){calls.push('signin');return {data:{}}},async resetPasswordForEmail(){calls.push('reset');return {data:{}}}};
 const raw={auth,from(table){calls.push(table);return {}},storage:{from(bucket){calls.push(bucket);return {}}}};
 const window={DRIVERS_LOUNGE_CONFIG:{readOnlyBeta:true,accountsEnabled:true,supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'sb_publishable_test',...config},supabase:{createClient(){calls.push('create');return raw}},dispatchEvent(event){calls.push(event.detail)}};
 vm.runInNewContext(source,{window,URLSearchParams,location:{origin:'https://driverslounge.app',hash:'',search:''},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}}});
 return {window,calls,notify};
}
test('account beta supports sign-in and recovery without opening the legacy service client',async()=>{
 const {window:w,calls}=setup();
 assert.equal(w.DLBackend.configured,false);assert.equal(w.DLBackend.client,null);
 assert.equal(w.DLAccountBackend.configured,true);assert.equal(w.DLAccountBackend.accountOnly,true);
 assert.equal(await w.DLBackend.session(),null);
 await assert.rejects(w.DLBackend.insert('road_reports',{}),/not open/);
 await w.DLAccountBackend.signIn('driver@example.com','synthetic');await w.DLAccountBackend.reset('driver@example.com');
 assert.deepEqual(calls,['create','signin','reset']);
});
test('account client exposes only setup, wallet and deletion tables plus private wallet storage',()=>{
 const {window:w,calls}=setup();const c=w.DLAccountBackend.client;
 c.from('dl_truck_setups');c.from('account_deletion_requests');c.from('dl_permit_wallets');c.storage.from('permit-wallet');
 for(const table of ['profiles','communication_preferences','road_reports','permit_trips','payments'])assert.throws(()=>c.from(table),/not open/);
 assert.equal(c.rpc,undefined);assert.throws(()=>c.storage.from('driver-documents'),/not open/);
 assert.deepEqual(calls,['create','dl_truck_setups','account_deletion_requests','dl_permit_wallets','permit-wallet']);
});
test('account beta relays verified auth lifecycle events for setup clearing',()=>{
 const {window:w,calls,notify}=setup();notify('SIGNED_OUT',null);notify('SIGNED_IN',{user:{id:'other'}});
 assert.equal(calls[1].event,'SIGNED_OUT');assert.equal(calls[1].userId,null);assert.equal(calls[2].userId,'other');
 notify('PASSWORD_RECOVERY',{user:{id:'other'}});assert.equal(w.DLAccountBackend.authCallback.recovery,true);
});
test('account activation requires a strict flag and a usable client configuration',()=>{
 for(const config of [{accountsEnabled:'true'},{accountsEnabled:false},{supabaseUrl:''},{supabaseAnonKey:''}]){
  const {window:w,calls}=setup(config);assert.equal(w.DLAccountBackend.configured,false);assert.deepEqual(calls,[]);
 }
});
test('full-service configuration preserves the existing backend outside account beta',()=>{
 const {window:w}=setup({readOnlyBeta:false,accountsEnabled:false});
 assert.equal(w.DLBackend.configured,true);assert.equal(w.DLAccountBackend.accountOnly,false);
 assert.equal(w.DLBackend.client,w.DLAccountBackend.client);
});
test('build emits public keys only for explicit account/full activation and rejects privileged keys',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dl-account-build-'));
 try{
  cpSync('src',join(dir,'src'),{recursive:true});cpSync('build.mjs',join(dir,'build.mjs'));
  const env={...process.env,DL_READ_ONLY_BETA:'true',DL_ACCOUNTS_ENABLED:'false',NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_synthetic_only',SUPABASE_URL:'',SUPABASE_ANON_KEY:''};
  const build=changes=>spawnSync(process.execPath,['build.mjs'],{cwd:dir,env:{...env,...changes},encoding:'utf8'});
  const config=()=>{const window={};vm.runInNewContext(readFileSync(join(dir,'dist/config.js'),'utf8'),{window});return window.DRIVERS_LOUNGE_CONFIG};
  assert.equal(build({}).status,0);assert.equal(config().supabaseAnonKey,'');assert.equal(config().accountsEnabled,false);
  assert.equal(build({DL_ACCOUNTS_ENABLED:'true'}).status,0);assert.equal(config().accountsEnabled,true);assert.equal(config().readOnlyBeta,true);assert.equal(config().permitGuidanceEnabled,false);assert.equal(config().supabaseAnonKey,env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const rejected=build({DL_ACCOUNTS_ENABLED:'true',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_secret_synthetic_only'});assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/privileged keys are forbidden/);
  const missing=build({DL_ACCOUNTS_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:''});assert.notEqual(missing.status,0);assert.match(missing.stderr,/configuration is missing/);
 }finally{if(!dir.startsWith(join(tmpdir(),'dl-account-build-')))throw Error('Unexpected test directory');rmSync(dir,{recursive:true,force:true})}
});

test('account-only screen hides unrelated controls and sends login to the setup workflow',async()=>{
 for(const [search,expected] of [['','/navigation'],['?return=%2Fpermitted-loads%23trip%3Dtest','/permitted-loads#trip=test'],['?return=https%3A%2F%2Fevil.example','/navigation'],['?return=%2Fmission-control','/navigation']]){
  const listeners=new Map(),message={},title={},elements=new Map();
  const button={textContent:'Sign in',disabled:false};
  const form={addEventListener(event,fn){listeners.set(event,fn)},querySelector(){return button}};
  elements.set('#login-form',form);elements.set('#auth-message',message);elements.set('#account-title',title);
  const control={disabled:false},section={hidden:false,querySelectorAll(){return [control]}};
  const location={search,origin:'https://driverslounge.app'};let reads=0,signIns=0;
  const window={DLBackend:{configured:false},DLAccountBackend:{configured:true,accountOnly:true,authCallback:{},async user(){return null},async list(){reads++;throw Error('unrelated query')},async signIn(){signIns++;return {}}},addEventListener(){}};
  vm.runInNewContext(readFileSync('src/assets/auth.js','utf8'),{window,document:{querySelector:s=>elements.get(s)||null,querySelectorAll:s=>s==='[data-full-service-only]'?[section]:[]},location,URL,URLSearchParams,setTimeout,history:{replaceState(){}},FormData:class{get(name){return name==='email'?'test@example.com':'synthetic'}}});
  assert.equal(section.hidden,true);assert.equal(control.disabled,true);
  listeners.get('submit')({preventDefault(){},currentTarget:form});await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(signIns,1);assert.equal(location.href,expected);assert.equal(reads,0);
 }
});
