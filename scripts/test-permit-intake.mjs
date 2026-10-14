import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPermit, sanitizePermit, buildMaster, confirmPermit, confirmGeometry } from '../src/assets/permits/core.mjs';
import { mergePermitIntake, createCameraSession, previewPermitIntake, intakeContext, intakeContextMatches } from '../src/assets/permits/intake.mjs';
import { classifyQR, parsePermitText, importPublicQR } from '../src/assets/permits/import.mjs';
import { parsePublicProvider } from '../src/assets/permits/provider.mjs';
import { resolvePermitURL } from '../api/permit-route.mjs';
import { reviewFixture } from './fixtures/permitted-review.mjs';
import { readFileSync } from 'node:fs';
import jsQR from '../src/assets/vendor/jsQR-1.4.0.js';
import { decodePhotoPixels } from '../src/assets/permits/qr-scan.mjs';

// Synthetic values only. Real carrier details and private permit references stay
// outside the repository; these reproduce the observed structure, not the load.
const infoQR = 'Permit No: 10000001\r\nStart Date: 10/14/2026\r\nEnd Date: 10/20/2026\r\nDot No: 1000000\r\nPlate No: TEST001\r\nVIN: 00001\r\nPhone: 5550100000';
const texasInfoQR = 'http://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=10000001&QRUSER=1';
test('identification-only QR never supplies a route, issuer or movement dates', () => {
  for (const text of [infoQR,infoQR.replaceAll('\r\n','\n')]) {
    const result=classifyQR(text);
    assert.equal(result.kind,'permit-info'); assert.equal(result.raw,text);
    assert.equal(result.permit,undefined); assert.equal(result.url,undefined);
    assert.match(result.message,/shorter weight authorization/);
    assert.throws(()=>parsePermitText(text),/not the issued route/);
  }
  assert.equal(classifyQR(infoQR+'\nTurn left onto TEST ROAD').kind,'manual');
});
test('Texas permit-information references are preserved without a route import or scheme upgrade', async () => {
  let requests=0;
  for (const text of [texasInfoQR,texasInfoQR.replace('http:','https:')]) {
    const result=classifyQR(text);
    assert.equal(result.kind,'permit-info');assert.equal(result.raw,text);
    assert.equal(result.permit,undefined);assert.equal(result.url,undefined);
    assert.throws(()=>parsePermitText(text),/not the issued route/);
    await assert.rejects(()=>importPublicQR(text,async()=>{requests++;return new Response('unexpected');}),/Only public HTTPS/);
  }
  assert.equal(requests,0);
});
test('lookalike hosts, credentials and altered information references are not the recognized Texas QR', () => {
  for (const text of [texasInfoQR.replace('txpros.txdmv.gov','txpros.txdmv.gov.example.com'),texasInfoQR.replace('txpros.txdmv.gov','txpros.txdmv.gov@evil.example'),texasInfoQR+'&QRUSER=1',texasInfoQR+'&other=1',texasInfoQR+'#x',texasInfoQR.replace('10000001','not-an-id')]) assert.notEqual(classifyQR(text).kind,'permit-info');
});

test('a different state or permit ID cannot silently overwrite the selected permit', () => {
  const current = {...blankPermit(), state:'UT', number:'UT-TEST-1', routeText:'EXACT ORIGINAL ROAD'};
  const before = structuredClone(current);
  for (const incoming of [{state:'GA',number:'UT-TEST-1'}, {state:'UT',number:'UT-TEST-2'}]) assert.throws(() => mergePermitIntake(current, incoming), /different state or permit/);
  assert.deepEqual(current, before);
});

test('a changed route discards prior geometry and approvals while keeping originals and QR references', () => {
  const current = {...blankPermit(), state:'UT', number:'UT-TEST-1', routeText:'OLD ROAD', steps:[{text:'Old instruction',routeLine:1,points:[[40,-111],[40.001,-111]]}], geometrySource:{format:'old'}, complete:true, review:{key:'old'}, geometryReview:{key:'old'}, qr:['reference'], documents:[{id:'original'}]};
  const next = mergePermitIntake(current, {state:'UT',number:'UT-TEST-1',routeText:'NEW ISSUED ROAD'});
  assert.equal(next.id,current.id);assert.deepEqual(next.documents,current.documents);assert.deepEqual(next.qr,current.qr);
  assert.equal(next.routeText,'NEW ISSUED ROAD');assert.deepEqual(next.steps,[]);assert.equal(next.geometrySource,null);assert.equal(next.complete,false);assert.equal(next.review,null);assert.equal(next.geometryReview,null);
  assert.equal(current.routeText,'OLD ROAD');assert.equal(current.steps.length,1);
});

test('imported geometry stays in its supplied order and never carries review approval', () => {
  const steps=[{routeLine:1,text:'Follow exact first road',road:'TEST',points:[[40,-111],[40.001,-111]]},{routeLine:2,text:'Then exact second road',road:'TEST2',points:[[40.001,-111],[40.001,-111.001]]}];
  const next=mergePermitIntake(blankPermit(),{state:'UT',number:'UT-TEST',routeText:'First\nSecond',steps,complete:true,review:{key:'untrusted'},geometryReview:{key:'untrusted'}});
  assert.deepEqual(next.steps.map(s=>s.points),steps.map(s=>s.points));assert.deepEqual(next.steps.map(s=>s.text),steps.map(s=>s.text));
  assert.equal(next.review,null);assert.equal(next.geometryReview,null);assert.equal(next.complete,false);
});

test('a partial extraction preserves explicit permit type and existing route geometry only for unchanged text', () => {
  const current={...blankPermit(),kind:'annual',number:'TEST',routeText:'Issued road',steps:[{text:'Existing'}]};
  const next=mergePermitIntake(current,{number:'TEST',restrictions:'Copied condition'});
  assert.equal(next.kind,'annual');assert.deepEqual(next.steps,current.steps);assert.equal(next.restrictions,'Copied condition');assert.equal(next.geometryReview,null);
  assert.equal(mergePermitIntake(blankPermit(),{state:'UT'}).kind,'single-trip');
  assert.deepEqual(mergePermitIntake(current,{entry:{road:'CHANGED ENTRY'}}).steps,[]);
});

test('cancelled, replaced or cross-permit camera work cannot attach a late frame', () => {
  const sessions=createCameraSession();const first=sessions.start('trip1','permit1');
  assert(sessions.current(first,'trip1','permit1'));assert(!sessions.current(first,'trip2','permit1'));assert(!sessions.current(first,'trip1','permit2'));
  sessions.cancel();assert(!sessions.current(first,'trip1','permit1'));
  const second=sessions.start('trip1','permit1');assert(sessions.current(second,'trip1','permit1'));assert(!sessions.current(first,'trip1','permit1'));
  sessions.start('trip1','permit1');assert(!sessions.current(second,'trip1','permit1'));
});

test('real vendored decoder reads ordinary and inverted QR pixels without a remote service', () => {
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/permit-qr.json',import.meta.url),'utf8'));
  const size=fixture.matrix.length*5;
  for(const inverted of [false,true]) {
    const pixels=new Uint8ClampedArray(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const dark=fixture.matrix[Math.floor(y/5)][Math.floor(x/5)]==='1';
      const v=dark!==inverted?0:255,n=(y*size+x)*4;
      pixels.set([v,v,v,255],n);
    }
    assert.deepEqual(decodePhotoPixels(pixels,size,size,jsQR),[fixture.payload]);
  }
  assert.deepEqual(decodePhotoPixels(new Uint8ClampedArray(160*160*4).fill(255),160,160,jsQR),[]);
});

test('uncovered state at either end holds even when every saved permit was reviewed', () => {
  for (const side of ['entry', 'exit']) {
    const trip = reviewFixture(); trip.hazmat.enabled = false; trip.hazmat.materials = []; trip.permits.forEach(p => p.kind = 'single-trip');
    const p = side === 'entry' ? trip.permits[0] : trip.permits.at(-1);
    p[side].state = side === 'entry' ? 'PA' : 'IA';
    trip.permits.forEach(p => { confirmPermit(p); confirmGeometry(p); });
    const m = buildMaster(trip, { geometry: true }); assert(!m.ready); assert(m.issues.some(s => s.includes(side === 'entry' ? 'Start coverage' : 'End coverage')));
    assert.deepEqual(m.permits.map(p => p.state), ['OH','IN','IL']);
  }
});
test('bounded source fields reject overflow rather than create a shortened permitted route', () => {
  for (const value of [{routeText:'x'.repeat(20001)},{restrictions:'x'.repeat(20001)},{number:'x'.repeat(101)},{entry:{road:'x'.repeat(101)}},{steps:[{text:'x'.repeat(1001),points:[[40,-100],[40,-99.999]]}]}]) assert.throws(() => sanitizePermit(value), /Nothing was shortened/);
  const exact = 'A'.repeat(19999) + 'Z'; assert.equal(sanitizePermit({routeText:exact}).routeText, exact);
  assert.throws(() => sanitizePermit({routeText:{instruction:'Turn'}}), /must be text/);
  assert.throws(() => parsePermitText('x'.repeat(20001)), /Nothing was shortened/);
});
test('QR/reference overflow never becomes a fetchable shortened URL or a partial packet', () => {
  assert.equal(classifyQR('https://permits.example.gov/'+'x'.repeat(50001)).kind,'manual');
  assert.throws(() => sanitizePermit({qr:Array(21).fill('original reference')}), /at most 20/);
  assert.throws(() => sanitizePermit({qr:['x'.repeat(50001)]}), /Nothing was shortened/);
});
test('invalid imported vehicle limits cannot silently disappear', () => {
  for (const n of [-1,0,'unknown',true,{},Infinity]) assert.throws(() => sanitizePermit({limits:{widthFt:n}}), /Invalid stated permit limit/);
  assert.throws(() => sanitizePermit({limits:{axles:4.5}}), /Invalid stated permit limit/);
  assert.deepEqual(sanitizePermit({limits:{widthFt:'12.5',heightFt:''}}).limits,{widthFt:12.5});
});
test('state names in a border or destination do not identify the issuer', () => {
  const text='STATE OF OHIO\nDestination: Illinois\nBorder Start: Indiana'; assert.equal(parsePermitText(text).state,'OH');
  assert.equal(parsePermitText('Travel through Illinois to Ohio').state,'');
  assert.equal(parsePermitText('STATE OF OHIO\nSTATE OF ILLINOIS').state,'');
  assert.equal(parsePermitText(text).routeText,text);
});
test('oversized public text is rejected whole without a partially extracted result', async () => {
  await assert.rejects(() => importPublicQR('https://permits.example.gov/route',async()=>new Response('x'.repeat(20001),{headers:{'content-type':'text/plain'}})),/Nothing was shortened/);
});
const providerPacket = (state='OH',instruction='Synthetic instruction only') => ({jurisdiction:state,geometryPrecision:5,data:JSON.stringify({code:'Ok',routes:[{legs:[{steps:[{geometry:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',name:'TEST',maneuver:{instruction}}]}]}],waypoints:[{name:'Synthetic pickup'},{name:'Synthetic delivery'}]})});
test('public provider response must have an actual matching issuing state', () => {
  assert.throws(()=>parsePublicProvider(providerPacket('GA'),'OH'),/does not match/);
  assert.throws(()=>parsePublicProvider(providerPacket(''),'OH'),/does not match/);
  assert.equal(parsePublicProvider(providerPacket('OH'),'OH').state,'OH');
  assert.throws(()=>parsePublicProvider(providerPacket('OH','x'.repeat(1001)),'OH'),/Nothing was shortened/);
});
test('both allowlisted endpoint types bind their response to the state in the QR reference', async () => {
  for(const [url,state] of [['https://permitnav.promiles.com/permitnav3/api/Navigation/json/OH/PROD/6/123/t','OH'],['https://webapps.dot.illinois.gov/ITAP/api/v1/permits/R123/ABC123/route/navigation','IL']]) {
    const fetcher=state=>async()=>new Response(JSON.stringify(providerPacket(state)),{headers:{'content-type':'application/json'}});
    await assert.rejects(()=>resolvePermitURL(url,fetcher('GA')),/does not match/);
    assert.equal((await resolvePermitURL(url,fetcher(state))).state,state);
  }
});
test('import comparison preserves full before and after source without mutating saved evidence', () => {
  const old={...blankPermit(),state:'UT',number:'TEST',routeText:'OLD exact road',restrictions:'Old condition',documents:[{id:'original'}],review:{key:'old'}};
  const before=structuredClone(old), preview=previewPermitIntake(old,{state:'UT',number:'TEST',routeText:'NEW exact road\nFinal restriction',restrictions:'New condition'});
  assert.deepEqual(old,before); assert.equal(preview.changes.find(c=>c.field==='routeText').before,old.routeText); assert.equal(preview.changes.find(c=>c.field==='routeText').after,'NEW exact road\nFinal restriction');
  assert.deepEqual(preview.next.documents,old.documents); assert.equal(preview.next.review,null); assert.equal(preview.next.complete,false);
});
test('preview calls out retained fields and obsolete geometry before applying a draft', () => {
  const old={...blankPermit(),state:'UT',number:'TEST',routeText:'OLD',restrictions:'Daylight only',validTo:'2026-10-15',steps:[{text:'OLD'}]};
  const preview=previewPermitIntake(old,{routeText:'NEW'});
  assert.equal(preview.geometryBefore,1); assert.equal(preview.geometryAfter,0); assert(preview.warnings.some(w=>/old maneuvers will be removed/.test(w)));
  assert(preview.retained.includes('Conditions / restrictions')); assert.equal(preview.next.restrictions,'Daylight only');
  assert.throws(()=>previewPermitIntake(old,{state:'GA',routeText:'NEW'}),/different state/);
});
test('late import or approval cannot apply to a switched or edited permit', () => {
  const p=blankPermit(), key=intakeContext('trip1',p); assert(intakeContextMatches(key,'trip1',structuredClone(p)));
  for(const edit of [p=>p.routeText='changed',p=>p.documents.push({id:'new'}),p=>p.id='other']) {const changed=structuredClone(p);edit(changed);assert(!intakeContextMatches(key,'trip1',changed));}
  assert(!intakeContextMatches(key,'trip2',p)); assert(!intakeContextMatches(key,'trip1',null));
});
