import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {blankTrip,blankPermit,buildMaster} from '../src/assets/permits/core.mjs';
import {cleanCloudTrip,prepareCloudTrip,validateCloudRow,privatePath,digest,CLOUD_LIMITS} from '../src/assets/permits/cloud-packet.mjs';
import {createWalletSync} from '../src/assets/permits/cloud-sync.mjs';
import {rememberWalletOwner,offlineWalletOwner} from '../src/assets/permits/wallet-account-state.mjs';
import {importAccountTrip,listTrips,getDocument,saveTrip,deleteTrip,database} from '../src/assets/permits/storage.mjs';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('offline preference reveals only the last local account, never authorizes transfers, and clears on sign-out',()=>{
  const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
  rememberWalletOwner(storage,A);assert.equal(offlineWalletOwner(storage,false),A);assert.equal(offlineWalletOwner(storage,true),null);
  const c=createWalletSync({transport:null});assert.equal(c.owner,null); // preference never enters remote authorization
  rememberWalletOwner(storage,B);assert.equal(offlineWalletOwner(storage,false),B);rememberWalletOwner(storage,null);assert.equal(offlineWalletOwner(storage,false),null);
  rememberWalletOwner(storage,'invalid');assert.equal(offlineWalletOwner(storage,false),null);assert.equal(offlineWalletOwner(null,false),null);
});
function fixture(){
  const trip=blankTrip(),p=blankPermit(),blob=new Blob(['%PDF-1.4 synthetic permit'],{type:'application/pdf'});
  p.documents=[{id:crypto.randomUUID(),name:'original.pdf',type:blob.type,size:blob.size}];p.state='TX';p.number='SYNTHETIC';p.routeText='Follow SH31\nMerge onto SH31';
  p.steps=[{text:'Follow SH31',road:'SH31',lane:'',routeLine:1,points:[[32,-96],[32.0001,-96.0001]]}];p.qr=['https://example.invalid/reference'];
  p.review={key:'not portable'};p.geometryReview={key:'not portable'};trip.acknowledged=true;trip.shared={id:'not portable'};trip.permits=[p];trip.completedAt='2026-10-16T00:00:00Z';
  return {trip,blob,getDocument:async id=>id===p.documents[0].id?{blob}:undefined};
}
function server(){const rows=new Map(),files=new Map();let commits=0,failPut=false,failGet=false,failRemove=false,afterPut=()=>{};
  const transport={
    async list(owner){return [...rows.values()].filter(r=>r.owner_id===owner).map(r=>({...r,ready:!!r.snapshot}));},
    async read(owner,id){const r=rows.get(id);return r?.owner_id===owner?structuredClone(r):null;},
    async create(owner,id){if(rows.has(id))throw Error('Duplicate');const row={id,owner_id:owner,schema_version:1,name:'',snapshot:null,manifest:[],version:crypto.randomUUID(),updated_at:new Date().toISOString(),archived:false};rows.set(id,row);return structuredClone(row);},
    async commit(owner,id,version,values){const r=rows.get(id);if(!r||r.owner_id!==owner||r.version!==version)return null;commits++;Object.assign(r,structuredClone(values),{version:crypto.randomUUID(),updated_at:new Date().toISOString()});return structuredClone(r);},
    async put(path,blob){if(failPut)throw Error('Upload interrupted');if(!files.has(path))files.set(path,blob);afterPut();},
    async get(path){if(failGet)throw Error('Download interrupted');return files.get(path);},
    async eraseFiles(owner,id){if(failRemove)throw Error('Cleanup interrupted');for(const path of files.keys())if(path.startsWith(`${owner}/${id}/`))files.delete(path);},
    async remove(owner,id,version){const r=rows.get(id);if(r?.owner_id!==owner||r.version!==version||!r.archived)return null;rows.delete(id);return {id};}
  };
  return {transport,rows,files,get commits(){return commits;},set failPut(v){failPut=v;},set failGet(v){failGet=v;},set failRemove(v){failRemove=v;},set afterPut(v){afterPut=v;}};
}
function client(s,f,owner=A){const c=createWalletSync({transport:s.transport,getDocument:f.getDocument});c.setOwner(owner);return c;}
test('scan once round trip preserves original bytes, route, QR and completed-move hold without carrying approvals',async()=>{
  const f=fixture(),s=server(),desktop=client(s,f);f.trip.accountSync=await desktop.save(f.trip);
  const phone=client(s,f),packet=await phone.download(f.trip.id),copy=await importAccountTrip(packet);
  assert.notEqual(copy.id,f.trip.id);assert.notEqual(copy.permits[0].documents[0].id,f.trip.permits[0].documents[0].id);
  assert.deepEqual(copy.permits[0].steps,f.trip.permits[0].steps);assert.deepEqual(copy.permits[0].qr,f.trip.permits[0].qr);
  assert.equal(copy.permits[0].routeText,f.trip.permits[0].routeText);assert.equal(copy.completedAt,f.trip.completedAt);
  assert.equal(copy.permits[0].review,null);assert.equal(copy.permits[0].geometryReview,null);assert.equal(copy.acknowledged,false);assert.equal(copy.shared,undefined);
  assert.match(buildMaster(copy).issues.join(' '),/marked complete/);
  assert.equal(await (await getDocument(copy.permits[0].documents[0].id)).blob.text(),await f.blob.text());
  assert((await listTrips(A)).some(t=>t.id===copy.id));assert(!(await listTrips(B)).some(t=>t.id===copy.id));assert(!(await listTrips()).some(t=>t.id===copy.id));await deleteTrip(copy);
});
test('two devices cannot silently overwrite a newer trip',async()=>{
  const f=fixture(),s=server(),one=client(s,f),two=client(s,f);f.trip.accountSync=await one.save(f.trip);const stale=structuredClone(f.trip);
  f.trip.name='Computer update';f.trip.accountSync=await one.save(f.trip);stale.name='Phone update';
  await assert.rejects(two.save(stale),/Another device/);assert.equal(s.rows.get(f.trip.id).name,'Computer update');assert.equal(s.files.size,1);
});
test('simultaneous saves compare versions at publication, not just before upload',async()=>{
  const f=fixture(),s=server(),one=client(s,f),two=client(s,f);f.trip.accountSync=await one.save(f.trip);
  const results=await Promise.allSettled([one.save(structuredClone(f.trip)),two.save(structuredClone(f.trip))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/Another device/);
});
test('missing originals and excessive payloads fail before any account write',async()=>{
  const f=fixture(),s=server(),c=client(s,{getDocument:async()=>undefined});await assert.rejects(c.save(f.trip),/missing/);assert.equal(s.rows.size,0);
  f.trip.permits[0].documents[0].size=CLOUD_LIMITS.file+1;await assert.rejects(prepareCloudTrip(f.trip,f.getDocument),/Invalid original/);
});
test('partial upload never publishes incomplete originals and retry reuses the placeholder',async()=>{
  const f=fixture(),s=server(),c=client(s,f);s.failPut=true;await assert.rejects(c.save(f.trip),/interrupted/);assert.equal(s.commits,0);assert.equal(s.rows.get(f.trip.id).snapshot,null);
  s.failPut=false;const link=await c.save(f.trip);assert(link.version);assert.equal(s.rows.size,1);
});
test('failed update retains the last complete account snapshot',async()=>{
  const f=fixture(),s=server(),c=client(s,f);f.trip.name='Complete';f.trip.accountSync=await c.save(f.trip);f.trip.name='Interrupted';s.failPut=true;
  await assert.rejects(c.save(f.trip),/interrupted/);assert.equal(s.rows.get(f.trip.id).name,'Complete');
});
test('failed or corrupt downloads do not create a device trip',async()=>{
  const f=fixture(),s=server(),c=client(s,f);await c.save(f.trip);const before=(await listTrips(A)).length;
  s.failGet=true;await assert.rejects(c.download(f.trip.id),/interrupted/);s.failGet=false;
  const path=[...s.files.keys()][0];s.files.set(path,new Blob(['x'.repeat(f.blob.size)],{type:f.blob.type}));
  await assert.rejects(c.download(f.trip.id),/integrity/);assert.equal((await listTrips(A)).length,before);
});
test('foreign ownership, path substitution and duplicate manifest entries are rejected',async()=>{
  const f=fixture(),s=server(),c=client(s,f);await c.save(f.trip);const row=s.rows.get(f.trip.id);
  assert.throws(()=>validateCloudRow(row,B),/unavailable/);await assert.rejects(client(s,f,B).download(f.trip.id),/unavailable/);
  const forged=structuredClone(row);forged.manifest[0].path=forged.manifest[0].path.replace(A,B);assert.throws(()=>validateCloudRow(forged,A),/manifest/);
  forged.manifest=[row.manifest[0],row.manifest[0]];assert.throws(()=>validateCloudRow(forged,A),/reference/);
  assert.throws(()=>privatePath(A,'../bad','a'.repeat(64),'application/pdf'),/Invalid/);
});
test('account change during upload never publishes or applies the late result',async()=>{
  const f=fixture(),s=server(),c=client(s,f);s.afterPut=()=>c.setOwner(B);await assert.rejects(c.save(f.trip),/Account changed/);assert.equal(s.commits,0);assert.equal(c.owner,B);
});
test('account change during download discards its result',async()=>{
  const f=fixture(),s=server(),c=client(s,f);await c.save(f.trip);const get=s.transport.get;s.transport.get=async path=>{const b=await get(path);c.setOwner(null);return b;};await assert.rejects(c.download(f.trip.id),/Account changed/);
});
test('incomplete removal is visible and retryable; local originals survive',async()=>{
  const f=fixture(),s=server(),c=client(s,f);const link=await c.save(f.trip),copy=await importAccountTrip(await c.download(f.trip.id));
  s.failRemove=true;await assert.rejects(c.remove(f.trip.id,link.version),/interrupted/);assert.equal(s.rows.get(f.trip.id).archived,true);await assert.rejects(c.download(f.trip.id),/unavailable/);
  s.failRemove=false;await c.remove(f.trip.id,s.rows.get(f.trip.id).version);assert.equal(s.rows.size,0);assert.equal(s.files.size,0);assert(await getDocument(copy.permits[0].documents[0].id));await deleteTrip(copy);
});
test('old version cannot delete a newer account trip',async()=>{
  const f=fixture(),s=server(),c=client(s,f);const old=await c.save(f.trip);f.trip.accountSync=old;await c.save(f.trip);await assert.rejects(c.remove(f.trip.id,old.version),/changed/);assert.equal(s.rows.size,1);
});
test('IndexedDB transaction failure leaves old trip intact and no half-imported files',async()=>{
  const f=fixture(),s=server(),c=client(s,f);await saveTrip(f.trip);await c.save(f.trip);const packet=await c.download(f.trip.id),db=await database(),original=db.transaction.bind(db);
  db.transaction=(...args)=>{const tx=original(...args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};
  try{await assert.rejects(importAccountTrip(packet),/cancelled/);}finally{db.transaction=original;}
  assert((await listTrips()).some(t=>t.id===f.trip.id));assert(!(await listTrips(A)).some(t=>t.accountSync?.tripId===f.trip.id));await deleteTrip(f.trip);
});
test('unsafe route text cannot be silently shortened during sync',()=>{
  const f=fixture();f.trip.permits[0].routeText='x'.repeat(20001);assert.throws(()=>cleanCloudTrip(f.trip),/Nothing was shortened/);
});

test('account transfer preserves bounded PDF scan history without granting permit approval',async()=>{
  const f=fixture(),progress={schema:'dl-pdf-qr-progress/v1',totalPages:4,pages:[{page:1,status:'qr-found',count:1},{page:2,status:'failed',count:0}]};
  f.trip.permits[0].documents[0].pdfScan={...progress,approved:true};
  const s=server(),c=client(s,f);await c.save(f.trip);const packet=await c.download(f.trip.id),copy=await importAccountTrip(packet);
  assert.deepEqual(copy.permits[0].documents[0].pdfScan,progress);assert.equal(copy.permits[0].review,null);assert.equal(copy.permits[0].geometryReview,null);assert.equal(copy.acknowledged,false);assert(await getDocument(copy.permits[0].documents[0].id));await deleteTrip(copy);
  f.trip.permits[0].documents[0].pdfScan.totalPages=10001;assert.equal(cleanCloudTrip(f.trip).permits[0].documents[0].pdfScan,undefined);
});
