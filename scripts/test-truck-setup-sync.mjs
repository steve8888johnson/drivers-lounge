import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createSetupSync,setupTransport} from '../src/assets/truck-setup-sync.mjs';
const c=vm.createContext({});vm.runInContext(readFileSync('src/assets/truck-setup-memory.js','utf8'),c);
const clean=c.DLTruckSetupMemory.clean;
const values=()=>({heightFt:'14',widthFt:'12',lengthFt:'80',weightLb:'90000',axles:'6'});
function server(){
 const rows=new Map();let fail=false;
 const transport={
  async read(owner,kind){if(fail)throw Error('offline');return structuredClone(rows.get(owner+kind)||null);},
  async write(owner,kind,values,version){if(fail)throw Error('offline');const old=rows.get(owner+kind);
   if(!version&&old)throw {code:'23505'};
   if(version&&old?.version!==version)return null;
   const row={owner_id:owner,kind,schema_version:1,values,version:crypto.randomUUID()};rows.set(owner+kind,row);return structuredClone(row);},
  async remove(owner,kind,version){const row=rows.get(owner+kind);if(row?.version!==version)return null;rows.delete(owner+kind);return structuredClone(row);}
 };
 return{rows,transport,offline:value=>fail=value,client:()=>createSetupSync({transport,kind:'permit',clean})};
}
test('computer save loads on phone; current-load/permit/cargo fields never enter account record',async()=>{
 const s=server(),desktop=s.client(),phone=s.client();await desktop.setUser('a');
 assert(await desktop.save({...values(),acknowledged:true,permits:[{}],hazmat:'cargo',route:'private',axleWeights:'ticket'}));
 await phone.setUser('a');assert.deepEqual(phone.get().record.values,desktop.get().record.values);
 assert.deepEqual(Object.keys(phone.get().record.values).sort(),Object.keys(values()).sort());
});
test('stale desktop cannot silently overwrite newer phone edit, including a first-save collision',async()=>{
 const s=server(),a=s.client(),b=s.client();await a.setUser('a');await b.setUser('a');
 await a.save(values());assert.equal(await b.save({...values(),widthFt:'13'}),false);assert.equal(b.get().status,'conflict');
 assert.equal(b.get().record.values.widthFt,'12');assert(await b.save({...values(),widthFt:'13'}));
 assert.equal(await a.save(values()),false);assert.equal(a.get().record.values.widthFt,'13');
});
test('delete compares version; deletion/recreation cannot revive an old writer',async()=>{
 const s=server(),a=s.client(),b=s.client();await a.setUser('a');await a.save(values());await b.setUser('a');
 await b.save({...values(),heightFt:'15'});assert.equal(await a.remove(),false);assert.equal(a.get().status,'conflict');
 await a.remove();await a.save(values());assert.equal(await b.save(values()),false);
});
test('offline failures keep edits unsent and require a successful refresh before another write',async()=>{
 const s=server(),a=s.client();await a.setUser('a');await a.save(values());s.offline(true);
 assert.equal(await a.save({...values(),heightFt:'15'}),false);assert.equal(a.get().status,'error');assert(!a.get().loaded);
 s.offline(false);assert.equal(await a.save(values()),false);await a.load();assert(a.get().loaded);
});
test('late read or save response cannot cross an account change or sign-out',async()=>{
 const s=server(),a=s.client();let finish;
 const original=s.transport.read;s.transport.read=()=>new Promise(resolve=>finish=resolve);
 const pending=a.setUser('a');a.invalidate();finish({owner_id:'a',kind:'permit',schema_version:1,values:values(),version:crypto.randomUUID()});await pending;
 assert.equal(a.get().owner,null);assert.equal(a.get().record,null);
 s.transport.read=original;await a.setUser('a');s.transport.write=()=>new Promise(resolve=>finish=resolve);
 const saving=a.save(values());await a.setUser('b');finish({owner_id:'a',kind:'permit',schema_version:1,values:values(),version:crypto.randomUUID()});assert.equal(await saving,false);assert.equal(a.get().owner,'b');assert.equal(a.get().record,null);
});
test('malformed or wrong-owner server records fail closed; account switching never auto-uploads',async()=>{
 const s=server(),a=s.client();s.rows.set('apermit',{owner_id:'b',kind:'permit',schema_version:1,values:values(),version:crypto.randomUUID()});
 await a.setUser('a');assert.equal(a.get().status,'error');assert(!a.get().loaded);await a.setUser('b');assert.equal(a.get().status,'empty');assert.equal(s.rows.size,1);
});
test('private setup memory never writes into guest disk storage, nor survives identity changes',()=>{
 const data=new Map(),disk={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},m=c.DLTruckSetupMemory;
 m.setOwner(null);m.save(disk,'permit',values());const before=[...data];m.setOwner('a');assert.equal(m.read(disk,'permit'),null);
 m.save(disk,'permit',{...values(),widthFt:'13'});assert.equal(m.read(disk,'permit').widthFt,'13');assert.deepEqual([...data],before);
 m.setOwner('b');assert.equal(m.read(disk,'permit'),null);m.setOwner(null);assert.equal(m.read(disk,'permit').widthFt,'12');
});
test('transport includes owner, kind and expected version, and never uses unconditional upsert',async()=>{
 const calls=[];const q={};for(const method of ['select','eq','update','insert','delete','maybeSingle'])q[method]=(...args)=>{calls.push([method,...args]);return q;};q.abortSignal=async()=>({data:null,error:null});
 const t=setupTransport({from:table=>{assert.equal(table,'dl_truck_setups');return q;}});
 await t.write('owner','permit',values(),'expected');assert(calls.some(x=>x[0]==='eq'&&x[1]==='version'&&x[2]==='expected'));assert(calls.some(x=>x[0]==='eq'&&x[1]==='owner_id'&&x[2]==='owner'));
 calls.length=0;await t.remove('owner','permit','expected');assert(calls.some(x=>x[0]==='eq'&&x[1]==='version'));
});

test('initial account loading is busy until a terminal response so automatic restore remains eligible',async()=>{
 const states=[],s=server();await s.transport.write('a','permit',values());
 const client=createSetupSync({transport:s.transport,kind:'permit',clean,onState:state=>states.push(state)});
 await client.setUser('a');assert(states.filter(s=>s.status==='loading').every(s=>s.busy));assert.equal(states.at(-1).status,'ready');
});
