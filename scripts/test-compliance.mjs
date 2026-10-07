import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ENTRIES, BY_ID, COUNTS, SOURCES, CATEGORIES, STATE_DIRECTORY, STATE_CHECKLISTS, findEntries, readFilters, filterQuery, cleanBookmarks, escapeHTML, sourceURL } from '../src/assets/compliance/core.mjs';

test('reference graph has unique stable IDs, real sources and complete jurisdiction coverage',()=>{
  assert.equal(BY_ID.size,ENTRIES.length);assert(COUNTS.terms>=150);assert(COUNTS.rules>=50);
  const expected='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
  assert.deepEqual(STATE_DIRECTORY.map(s=>s.code).sort(),expected.sort());
  assert.equal(COUNTS.states,51);
  for(const entry of ENTRIES){
    assert.match(entry.id,/^[a-z0-9-]+$/);assert(entry.title&&entry.summary&&entry.sources.length,entry.id);
    assert(Object.hasOwn(CATEGORIES,entry.category)||entry.type==='state',entry.id);
    for(const id of entry.sources){assert(SOURCES[id],`${entry.id}: ${id}`);assert.equal(new URL(sourceURL(id)).protocol,'https:');}
    for(const id of entry.related)assert(BY_ID.has(id),`${entry.id}: ${id}`);
  }
  for(const s of STATE_DIRECTORY){const desk=BY_ID.get('state-'+s.code.toLowerCase());assert(desk.sources.includes('state-'+s.code));assert(desk.sources.includes('hazmat-'+s.code));}
  assert.deepEqual(Object.keys(STATE_CHECKLISTS).sort(),['hazmat','oversize','pilot','standard']);
});
test('acronyms, punctuation, multi-word terms and exact regulation references are searchable',()=>{
  for(const [q,id] of [['HOS','term-hos'],['OS/OW','term-osow'],['high pole','term-high-pole'],['172.504','term-placard'],['49 CFR 397','rule-hm-routing'],['working load limit','term-wll'],['reciprocity','term-reciprocity'],['Illinois','state-il']]){
    assert(findEntries({q}).some(e=>e.id===id),`${q} did not find ${id}`);
  }
  assert.equal(findEntries({q:'zzunknownnotaregulation'}).length,0);
  assert(!findEntries({q:'HOS'}).some(e=>e.id==='state-id'),'HOS must not join the words IdaHO State');
  assert(findEntries({q:'HOS'}).some(e=>e.id==='rule-hos'));
  assert(findEntries({q:'49CFR397'}).some(e=>e.id==='rule-hm-routing'));
  assert.equal(findEntries({q:'high pole'})[0].id,'term-high-pole','Direct term matches must rank above generic state checklists');
});
test('state filtering retains federal material but never leaks another state rule',()=>{
  const ny=findEntries({state:'NY'});
  assert(ny.some(e=>e.id==='rule-ny-certification'));assert(ny.some(e=>e.id==='rule-hm-routing'));
  assert(ny.every(e=>['US','NY'].includes(e.jurisdiction)));
  assert(!ny.some(e=>e.id==='rule-oh-conditions'));
  const desks=findEntries({state:'IL',type:'state',category:'hazmat'});assert.deepEqual(desks.map(e=>e.id),['state-il']);
  assert(findEntries({state:'US'}).every(e=>e.jurisdiction==='US'));
  for(const category of ['standard','oversize','hazmat','pilot'])assert.equal(findEntries({category,type:'state'}).length,51);
});
test('shared filters validate input, preserve citations and combine A-Z, category and saved selection',()=>{
  const f=readFilters('?q=49%20CFR%20172.504&state=IL&category=hazmat&type=rule&letter=M&saved=1');
  assert.deepEqual(readFilters(filterQuery(f)),f);
  assert.deepEqual(readFilters('?state=ZZ&category=constructor&type=<script>&letter=ZZ'),readFilters());
  const saved=cleanBookmarks(['term-hos','term-hos','term-high-pole',null,'<img>','no-such-entry']);
  assert.deepEqual(saved,['term-hos','term-high-pole']);
  const hits=findEntries({saved:true,category:'standard',letter:'H'},saved);assert.deepEqual(hits.map(e=>e.id),['term-hos']);
  assert.equal(findEntries({saved:true},[]).length,0);
  assert.equal(readFilters('?q='+'x'.repeat(500)).q.length,200);
});
test('rendered text and source classifications cannot imply CAMEO route approval',()=>{
  assert.equal(escapeHTML('<img onerror="x"> & \'test\''),'&lt;img onerror=&quot;x&quot;&gt; &amp; &#39;test&#39;');
  assert.equal(SOURCES.cameo.kind,'reference');assert.match(SOURCES.cameo.note,/not a routing authority/);
  assert.equal(SOURCES.pilot5.kind,'guidance');assert.match(SOURCES.pilot5.note,/2017/);
  assert.match(BY_ID.get('rule-hm-response-tools').summary,/Neither approves a highway route/);
});

async function workerFixture({missing=false}={}){
  const listeners={}, writes=[], adds=[], gets=[];
  const cache={addAll:async paths=>adds.push(...paths),put:async(...args)=>writes.push(args),match:async path=>missing&&path.endsWith('rules.mjs')?undefined:{path}};
  const caches={open:async()=>cache,match:async path=>{gets.push(path);return {path};},keys:async()=>[],delete:async()=>true};
  runInNewContext(await readFile(new URL('../src/sw.js',import.meta.url),'utf8'),{URL,self:{addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches,location:{origin:'https://preview.test'},fetch:async()=>{throw Error('offline');}});
  const request=async(path,extra={})=>{
    let promise;listeners.fetch({request:{url:'https://preview.test'+path,method:'GET',mode:'navigate',...extra},respondWith:value=>{promise=value;},waitUntil:()=>{}});
    return promise?await promise:null;
  };
  return{listeners,adds,writes,gets,request};
}
test('offline shell contains every reference dependency and all precached paths exist',async()=>{
  const f=await workerFixture();let job;f.listeners.install({waitUntil:p=>{job=p;}});await job;
  for(const path of f.adds){await access(new URL('../src'+(path.split('/').at(-1).includes('.')?path:path+'.html'),import.meta.url));}
  for(const file of ['app','core','glossary','rules','sources','states'])assert(f.adds.includes('/assets/compliance/'+file+'.mjs'));
  assert(f.adds.includes('/compliance'));assert(f.adds.includes('/permitted-loads'));
});
test('offline reference deep links reuse only public shell while private requests remain excluded',async()=>{
  const f=await workerFixture();
  assert.equal((await f.request('/compliance?state=OH&category=hazmat')).path,'/compliance');
  assert.equal((await f.request('/compliance.html?type=term')).path,'/compliance');
  assert.equal((await f.request('/permitted-loads')).path,'/permitted-loads');
  assert.equal((await f.request('/permitted-loads?code=private')).path,'/offline');
  assert.equal((await f.request('/account?token=private')).path,'/offline');
  assert.equal(await f.request('/api/crew'),null);assert.equal(await f.request('/config.js'),null);
  assert.equal(await f.request('/compliance',{method:'POST'}),null);
  assert.equal(await f.request('',{url:'https://www.ecfr.gov/'}),null);
  assert.equal(f.writes.length,0);
});
test('offline-ready status requires all reference files, never just an active service worker',async()=>{
  for(const missing of [false,true]){
    const f=await workerFixture({missing});let job,result;
    f.listeners.message({data:{type:'reference-cache-status'},ports:[{postMessage:v=>{result=v;}}],waitUntil:p=>{job=p;}});await job;
    assert.equal(result.referenceReady,!missing);
  }
});
