import test from 'node:test';
import assert from 'node:assert/strict';
import { texasPermitReference, texasPracticeReference } from '../src/assets/permits/issuer-map.mjs';
import { parseTexasMap, resolveTexasPermitMap } from '../server/texas-permit-map.mjs';
import { blankPermit, blankTrip, sanitizePermit, buildMaster, geometryErrors } from '../src/assets/permits/core.mjs';
import { mergePermitIntake } from '../src/assets/permits/intake.mjs';
import { routeOverview } from '../src/assets/permits/map-review.mjs';
import { issuerRehearsal, issuerRowSpeech } from '../src/assets/permits/issuer-rehearsal.mjs';
const url='http://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=10000001&QRUSER=1',ref=texasPermitReference(url);
const fixture=()=>({details:{d:{PermitID:10000001,PermitNo:200000000001,Status:'Issued',IsDeleted:false,DirectionsModified:false,LastUpdateDate:'2026-10-15T12:00:00Z',ContactEmail:'DO-NOT-RETURN',Trips:[{Stops:[{LegType:1,Lat:32,Lon:-100},{LegType:2,Lat:32.002,Lon:-100}],DrivingDirs:[{SequenceNo:0,To:'[Loaded Route Origin: TEST START ]'},{SequenceNo:1,Route:'TEST ROAD s',To:'Continue to TEST END',Miles:.2,Distance:.2},{SequenceNo:2,To:'[Loaded Route Destination: TEST END ]'}]}]}},geometry:{d:{LatLons:[{Lat:32,Lon:-100},{Lat:32.001,Lon:-100},{Lat:32.002,Lon:-100}],ptsIndices:[3],legTypes:[1,2]}}});
const parsed=()=>{const f=fixture();return parseTexasMap(f.details,f.geometry,ref);};
test('Texas URL accepts only exact public QR references; keeps HTTP QR but uses explicit HTTPS import',()=>{
  assert.equal(ref.url,url.replace('http:','https:'));
  for(const bad of [url+'&other=1',url+'&QRUSER=1',url+'#x',url.replace('gov','gov.evil.example'),url.replace('txpros','me:password@txpros'),url.replace('10000001','0'),url.replace('10000001','9999999999'),url.replace('gov/','gov:444/'),url.replace('http:','file:')])assert.equal(texasPermitReference(bad),null);
});
test('phone handoff accepts one bounded Texas reference, never an existing trip or arbitrary destination',()=>{
  assert.equal(texasPracticeReference('#texas=10000001').id,10000001);
  for(const hash of ['#texas=10000001&trip=old','#texas=10000001&texas=10000002','#texas=https://evil.example','#texas=0','#texas=999999999999','#texas=10000001%26QRUSER%3D1'])assert.equal(texasPracticeReference(hash),null);
});
test('actual format returns issuer coordinates and literal text, never credentials or GPS maneuvers',()=>{
  const p=parsed();assert.equal(p.issuerMap.paths[0].length,3);assert.equal(p.routeText,'TEST ROAD s · 0.2 mi — Continue to TEST END');assert.equal(p.steps.length,0);assert.equal(p.complete,false);assert.equal(p.review,null);assert.equal(p.validFrom,'');assert(!JSON.stringify(p).includes('DO-NOT-RETURN'));
  assert.equal(p.timeZone,'');assert.match(geometryErrors(p)[0],/no verified turn positions/);assert(routeOverview(p).issuerOverview);
  p.steps=[{text:'Malicious approval',routeLine:1,points:[[32,-100],[32.002,-100]]}];const t=blankTrip();t.permits=[p];assert.equal(buildMaster(t,{geometry:true}).segments.length,0);assert.equal(sanitizePermit(p).steps.length,0);
});
test('mismatched, modified, suspended, multipart and incomplete issuer data reject rather than guessing',()=>{
  const changes=[f=>f.details.d.PermitID++,f=>f.details.d.Status='Suspended',f=>f.details.d.IsDeleted=true,f=>f.details.d.DirectionsModified=true,f=>f.details.d.Trips.push(f.details.d.Trips[0]),f=>f.details.d.Trips[0].DrivingDirs[1].SequenceNo=9,f=>f.details.d.Trips[0].Stops[1].Lat=33,f=>f.geometry.d.ptsIndices=[2,3],f=>f.geometry.d.legTypes=[0,2],f=>f.geometry.d.LatLons[1].Lat=-1,f=>f.geometry.d.LatLons[1].Lon='-100',f=>f.details.d.Trips[0].DrivingDirs[1].To=''];
  for(const change of changes){const f=fixture();change(f);assert.throws(()=>parseTexasMap(f.details,f.geometry,ref));}
});
test('changing saved permit identity or route makes the old overview unavailable; no fabricated gap joins',()=>{
  for(const change of [p=>p.number='OTHER',p=>p.state='KS',p=>p.routeText='OTHER',p=>p.entry.label='OTHER']){const p=parsed();change(p);assert(!routeOverview(p).available);assert.throws(()=>sanitizePermit(p));}
  const p=parsed();p.issuerMap.paths[0]=[[32,-100],[32.001,-100],[33,-100],[33.001,-100]];const view=routeOverview(p);assert.equal(view.paths.length,2);assert.equal(view.issues.length,1);
});
test('import and packet sanitization retain preview, clear prior turns and confirmations, preserve originals',()=>{
  const current={...blankPermit(),state:'TX',documents:[{id:'original'}],qr:[url],steps:[{routeLine:1,text:'Old',points:[[32,-100],[32.001,-100]]}],complete:true,review:{key:'old'}};
  const next=mergePermitIntake(current,parsed());assert.equal(next.steps.length,0);assert.equal(next.complete,false);assert.equal(next.review,null);assert.deepEqual(next.documents,current.documents);assert.deepEqual(next.qr,[url]);assert.deepEqual(sanitizePermit(next).issuerMap,next.issuerMap);
  assert.equal(mergePermitIntake(next,{state:'TX',routeText:'changed'}).issuerMap,null);
});
function fakeFetch(options={}){
  const calls=[],f=fixture();let details=0;
  return {calls,fetch:async (address,init)=>{
    calls.push({address,init});
    if(calls.length===1)return new Response('<input value="10000001" id="PID" /> GetLatLonForPermit',{status:options.redirect?302:200,headers:{'content-type':'text/html','set-cookie':options.noSession?'other=value; Path=/':'ASP.NET_SessionId=abcdefghijklmnopqrstuvwx; Path=/'}});
    if(options.fail)return new Response('Denied',{status:403});
    if(address.endsWith('GetQRPermit')){details++;if(options.changed&&details===2)f.details.d.Status='Suspended';return Response.json(f.details);}
    if(options.oversized)return new Response('x'.repeat(3000001),{headers:{'content-type':'application/json'}});
    if(options.badUtf8)return new Response(new Uint8Array([123,34,120,34,58,34,255,34,125]),{headers:{'content-type':'application/json'}});
    return Response.json(f.geometry);
  }};
}
test('adapter uses bounded anonymous HTTPS reads; never forwards private browser cookies or keys',async()=>{
  const f=fakeFetch(),p=await resolveTexasPermitMap(url,f.fetch);assert.equal(p.issuerMap.paths[0].length,3);assert.equal(f.calls.length,4);
  for(const c of f.calls){assert(c.address.startsWith('https://txpros.txdmv.gov/'));assert.equal(c.init.redirect,'manual');assert.equal(c.init.credentials,'omit');assert.equal(c.init.cache,'no-store');assert(c.init.signal);assert(!c.init.headers.Authorization);}
  assert.equal(f.calls[0].init.headers.Cookie,undefined);assert.equal(f.calls[1].init.headers.Cookie,'ASP.NET_SessionId=abcdefghijklmnopqrstuvwx');
  assert.deepEqual(JSON.parse(f.calls[2].init.body),{PermitID:10000001,UseHistoryDB:false,AuditPermitID:-1});
});
test('redirect, missing anonymous session, access denial and changing revisions fail closed',async()=>{
  for(const options of [{redirect:true},{noSession:true},{fail:true},{changed:true},{oversized:true},{badUtf8:true}]){const f=fakeFetch(options);await assert.rejects(()=>resolveTexasPermitMap(url,f.fetch));}
  let calls=0;await assert.rejects(()=>resolveTexasPermitMap(url.replace('txpros.txdmv.gov','evil.example'),()=>{calls++;}));assert.equal(calls,0);
});

test('rehearsal highlights only original edges and reads the same selected source; never generates a turn pin',()=>{
  const p=parsed(),before=JSON.stringify(p),v=issuerRehearsal(p);
  assert(v.estimated);assert.equal(v.source,p.routeText);assert.deepEqual(v.area,[[[32,-100],[32.001,-100]],[[32.001,-100],[32.002,-100]]]);
  assert.match(issuerRowSpeech(v),/Continue to TEST END/);assert.match(issuerRowSpeech(v),/approximate/);assert.match(issuerRowSpeech(v),/not live guidance/);
  assert(!('point' in v));assert(!('steps' in v));assert.equal(JSON.stringify(p),before);
  for(const i of [-1,1,NaN,.5]) assert.equal(issuerRehearsal(p,i).available,false);
});

test('mileage mismatch holds the area without stretching geometry; legacy saved maps retain literal text speech',()=>{
  const p=parsed();p.issuerMap.rows[0].miles=20;p.issuerMap.rows[0].cumulativeMiles=20;p.routeText=p.issuerMap.routeText='TEST ROAD s · 20 mi — Continue to TEST END';
  let v=issuerRehearsal(p);assert(v.available);assert(!v.estimated);assert.equal(v.area.length,0);assert.match(v.reason,/do not agree/);assert.match(issuerRowSpeech(v),/No turn position/);
  p.issuerMap.format='txpros-issuer-map/v1';delete p.issuerMap.rows;v=issuerRehearsal(p);assert(v.available);assert(!v.estimated);assert.match(v.reason,/again/);
});

test('stale or reordered instruction and mileage metadata cannot inherit an existing area or voice',()=>{
  for(const change of [p=>p.issuerMap.rows[0].instruction='Take a different ramp',p=>p.issuerMap.rows[0].sequence=2,p=>p.issuerMap.rows[0].cumulativeMiles=-1,p=>p.issuerMap.rows[0].cumulativeMiles=Infinity,p=>p.issuerMap.rows[0].cumulativeMiles=5,p=>p.routeText+='changed']) {
    const p=parsed();change(p);assert.throws(()=>sanitizePermit(p));assert(!issuerRehearsal(p).available);assert.equal(issuerRowSpeech(issuerRehearsal(p)),null);
  }
});

test('sparse issuer span is separately dashed without inventing coordinates or weakening GPS holds',()=>{
  const p=parsed();p.issuerMap.paths[0]=[[32,-100],[32.001,-100],[32.06,-100],[32.061,-100]];
  const v=routeOverview(p);assert.equal(v.paths.length,2);assert.deepEqual(v.sparsePaths,[[[32.001,-100],[32.06,-100]]]);assert.match(v.issues[0],/road shape.*unknown/);
  assert.equal([...v.paths,...v.sparsePaths].reduce((n,path)=>n+path.length-1,0),p.issuerMap.paths[0].length-1);
  assert.match(geometryErrors(p)[0],/no verified turn positions/);const t=blankTrip();t.permits=[p];assert.equal(buildMaster(t,{geometry:true}).segments.length,0);
});
