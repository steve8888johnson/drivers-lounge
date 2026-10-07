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
