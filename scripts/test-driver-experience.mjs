import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { TOOLS, preferences, defaultFavorites, dailyChecklist, dateKey, findTools, tripSummaries, esc } from '../src/assets/driver/model.mjs';
import { walletLaunch } from '../src/assets/permits/launch.mjs';
import { PROGRAMS, buildInquiry, sendInquiry } from '../src/assets/driver/business.mjs';
import { activeOffers, publicHttps, saveOffer } from '../src/assets/driver/offers.mjs';

const id='12345678-1234-4234-a234-123456789abc',id2='12345678-1234-4234-a234-123456789abd';
test('driver favorites accept known tools only, stay bounded, and preserve intentional empty pins',async()=>{
  assert.deepEqual(preferences(null).favorites,defaultFavorites('driver'));
  assert.deepEqual(preferences({role:'pilot'}).favorites,defaultFavorites('pilot'));
  assert.deepEqual(preferences({role:'owner',favorites:[],largeText:true}),{role:'owner',favorites:[],largeText:true});
  assert.deepEqual(preferences({role:'constructor',favorites:['rules','rules','https://tracking.test'],largeText:'true'}),{role:'driver',favorites:['rules'],largeText:false});
  assert.equal(preferences({favorites:TOOLS.map(t=>t.id)}).favorites.length,6);
  for(const tool of TOOLS)await access(new URL('../src'+tool.url.split('#')[0]+'.html',import.meta.url));
});
test('tool search handles real driver vocabulary and an empty result safely',()=>{
  for(const [q,id] of [['hazmat','rules'],['roadside inspection','wallet'],['escort','crew'],['CDL','passport']])assert(findTools(q).some(t=>t.id===id));
  assert.equal(findTools('<script>').length,0);
  assert.equal(esc('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
});
test('personal checklist rolls over by local day and cannot carry arbitrary permit approvals',()=>{
  assert.equal(dateKey(new Date(2026,8,25,0,1)),'2026-09-25');
  assert.deepEqual(dailyChecklist({day:'2026-09-25',done:['route','route','permitConfirmed']},'2026-09-25'),{day:'2026-09-25',done:['route']});
  assert.deepEqual(dailyChecklist({day:'2026-09-24',done:['route']},'2026-09-25').done,[]);
});
test('recent-trip cards expose a minimal local summary and prioritize the last opened trip',()=>{
  const input=[{id,name:'Older',departure:'2026-09-24',permits:[{state:'OH',qr:'private-qr',documents:['private']},{state:'OH'}],shared:{invite:'secret'},profile:{cargo:'secret'}},{id:id2,name:'Newer',departure:'2026-09-25',completedAt:'done',permits:[]}];
  const rows=tripSummaries(input,id);assert.equal(rows[0].id,id);assert.deepEqual(rows[0].states,['OH']);assert.equal(rows[1].completed,true);
  assert.deepEqual(Object.keys(rows[0]).sort(),['completed','departure','id','name','states']);
  assert(!JSON.stringify(rows).includes('secret'));assert(!JSON.stringify(rows).includes('private'));
  assert.equal(tripSummaries([{id:'-'.repeat(36),name:'Bad'},{id,permits:[]}]).length,0);
});
test('wallet shortcuts select the exact device trip and never modify its route or sharing state',()=>{
  const rows=[{id,name:'One',confirmed:false},{id:id2,name:'Two',confirmed:false}],original=structuredClone(rows);
  assert.equal(walletLaunch(rows,`#trip=${id2}&tab=wallet`).trip,rows[1]);
  assert.equal(walletLaunch(rows,'#tab=crew',id2).trip,rows[1]);
  assert.equal(walletLaunch(rows,'#new=1').trip,null);
  assert.equal(walletLaunch(rows,'#trip=missing&tab=wallet').missing,true);
  assert.equal(walletLaunch(rows,'#tab=start-guidance').tab,'load');
  assert.equal(walletLaunch([]).trip,null);assert.deepEqual(rows,original);
});

const inquiry={program:'fleet',business:'Example Fleet',name:'Test Contact',email:'qa@example.com',website:'https://example.com',units:'20',regions:'OH, IN, IL',notes:'Pilot inquiry test',consent:true};
test('all business pilots produce bounded inquiries, with no purchase or driver-data authorization',()=>{
  assert.equal(PROGRAMS.length,3);
  for(const p of PROGRAMS){const t=buildInquiry({...inquiry,program:p.id});assert.equal(t.category,'advertising');assert(t.subject.length<=160&&t.message.length<=5000);assert.match(t.message,/no purchase or enrollment/);assert.match(t.message,/no payment or driver-data access is authorized/);}
  assert(!Object.hasOwn(buildInquiry(inquiry),'price'));
});
test('business inquiry rejects missing consent, malformed contact details and invalid business size',()=>{
  for(const change of [{consent:false},{program:'unknown'},{business:'X'},{name:''},{email:'bad'},{website:'javascript:alert(1)'},{website:'https://user:pass@example.com'},{units:'1.5'},{units:'100001'},{notes:'x'.repeat(2001)}])assert.throws(()=>buildInquiry({...inquiry,...change}));
});
test('business intake waits for the server, sends only the request and honors account ownership',async()=>{
  for(const user of [null,{id}]){const calls=[],backend={configured:true,user:async()=>user,submit:async(...args)=>calls.push(args)};await sendInquiry(backend,inquiry);assert.equal(calls.length,1);assert.equal(calls[0][0],'support_tickets');assert.equal(calls[0][1].user_id,user?.id||null);}
  let writes=0;const backend={configured:true,user:async()=>({id}),submit:async()=>{writes++;throw Error('Server rejected request');}};
  await assert.rejects(sendInquiry(backend,inquiry),/Server rejected/);assert.equal(writes,1);
  await assert.rejects(sendInquiry(backend,{...inquiry,consent:false}),/permission/);assert.equal(writes,1);
  await assert.rejects(sendInquiry({...backend,configured:false},inquiry),/Request not sent/);assert.equal(writes,1);
});

const now=Date.parse('2026-09-25T12:00:00Z');
const paid={id,active:true,review_status:'approved',billing_status:'paid',source_type:'paid',destination_url:'https://example.com/offer',category:'Food',target_states:['OH'],starts_at:'2026-09-24T00:00:00Z',ends_at:'2026-09-27T00:00:00Z',offer_expires_at:'2026-09-26T00:00:00Z'};
test('offer catalog requires approval, applicable billing, safe destination and a current time window',()=>{
  assert.equal(activeOffers([paid],{now}).length,1);
  for(const change of [{active:false},{review_status:'submitted'},{billing_status:'unpaid'},{billing_status:'refunded'},{source_type:'unknown'},{destination_url:'javascript:alert(1)'},{starts_at:'bad'},{starts_at:'2026-09-26T00:00:00Z'},{ends_at:'2026-09-25T12:00:00Z'},{offer_expires_at:'2026-09-25T12:00:00Z'},{target_states:'OH'},{target_states:[{}]}])assert.equal(activeOffers([{...paid,...change}],{now}).length,0,JSON.stringify(change));
  assert.equal(activeOffers([{...paid,source_type:'curated_public',billing_status:'unpaid'}],{now}).length,1);
  assert.equal(activeOffers([paid],{now:NaN}).length,0);
  assert.equal(publicHttps('https://a:b@example.com'),null);assert.equal(publicHttps('http://example.com'),null);
});
test('state and category choices include nationwide offers without collecting location',()=>{
  const nationwide={...paid,id:id2,target_states:[]};
  assert.equal(activeOffers([paid,nationwide],{now,state:'IL'}).length,1);
  assert.equal(activeOffers([paid,nationwide],{now,state:'OH',category:'Food'}).length,2);
  assert.equal(activeOffers([paid],{now,category:'Repair'}).length,0);
  assert.equal(activeOffers([{...paid,category:null}],{now,category:'Other'}).length,1);
});
test('saving an offer uses the signed-in account and never queues unsolicited email or SMS',async()=>{
  const calls=[],backend={configured:true,user:async()=>({id:id2}),upsert:async(...args)=>calls.push(args)};
  await saveOffer(backend,paid,now);assert.equal(calls.length,1);assert.deepEqual(calls[0],['saved_offers',{campaign_id:id,user_id:id2,delivery_preference:'in_app',requested_delivery:'in_app',delivery_status:'saved',delivered_to:null},'campaign_id,user_id']);
  await assert.rejects(saveOffer(backend,paid,Date.parse(paid.offer_expires_at)),/no longer/);assert.equal(calls.length,1);
  await assert.rejects(saveOffer({...backend,user:async()=>null},paid,now),/Sign in/);assert.equal(calls.length,1);
  await assert.rejects(saveOffer({...backend,upsert:async()=>{throw Error('offline');}},paid,now),/offline/);
});
test('old navigation advertising entry point cannot fetch, pop up, play audio or save data',async()=>{
  runInNewContext(await readFile(new URL('../src/assets/driver-ads-rc2.js',import.meta.url),'utf8'),{});
  for(const page of ['dashboard','navigation'])assert(!((await readFile(new URL('../src/'+page+'.html',import.meta.url),'utf8')).includes('src="/assets/driver-ads-rc2.js"')));
});
test('driver offline readiness checks the complete tool dependencies and excludes business/account pages',async()=>{
  for(const missing of ['', '/assets/driver/model.mjs','/assets/permits/launch.mjs','/assets/compliance/rules.mjs']){
    const listeners={},cache={match:async path=>path===missing?undefined:{path}};
    runInNewContext(await readFile(new URL('../src/sw.js',import.meta.url),'utf8'),{URL,self:{addEventListener:(n,f)=>listeners[n]=f},caches:{open:async()=>cache,match:cache.match},location:{origin:'https://test.local'},fetch:async()=>{throw Error('offline');}});
    let task,reply;listeners.message({data:{type:'driver-cache-status'},ports:[{postMessage:v=>reply=v}],waitUntil:p=>task=p});await task;assert.equal(reply.driverReady,!missing);
    for(const [path,result] of [['/start','/start'],['/start.html','/start'],['/start?token=private','/offline'],['/offers','/offline'],['/business','/offline'],['/account','/offline']]){let response;listeners.fetch({request:{method:'GET',url:'https://test.local'+path,mode:'navigate'},respondWith:p=>response=p,waitUntil:()=>{}});assert.equal((await response).path,result);}
  }
});
