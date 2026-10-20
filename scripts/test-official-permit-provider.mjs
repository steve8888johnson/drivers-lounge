import test from'node:test';
import assert from'node:assert/strict';
import{blankTrip,buildMaster,reviewed,geometryReviewed}from'../src/assets/permits/core.mjs';
import{publicOfficialPermitReference,parseOfficialPermitHTML}from'../src/assets/permits/official-provider.mjs';
import{publicPermitReference,publicProviderURL}from'../src/assets/permits/provider.mjs';
import{resolvePermitURL}from'../api/permit-route.mjs';
import{coloradoOfficialHTML,texasOfficialHTML}from'./fixtures/official-permit-html.mjs';

const coloradoURL='https://coopr.codot.gov/Mobile/Lookup.aspx?PermitID=1966694';
const texasHttpURL='http://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=15397987&QRUSER=1';

test('official permit URLs use exact host, path and query allowlists',()=>{
 const co=publicOfficialPermitReference(coloradoURL),tx=publicOfficialPermitReference(texasHttpURL);
 assert.equal(co.format,'colorado-public-html');assert.equal(co.url.href,coloradoURL);
 assert.equal(tx.format,'texas-public-html');assert.equal(tx.url.protocol,'https:');assert.equal(tx.url.hostname,'txpros.txdmv.gov');
 assert.equal(publicPermitReference(coloradoURL).format,'colorado-public-html');
 assert.equal(publicProviderURL(texasHttpURL).protocol,'https:');
 for(const unsafe of[
  'https://coopr.codot.gov.evil.test/Mobile/Lookup.aspx?PermitID=1966694',
  'http://coopr.codot.gov/Mobile/Lookup.aspx?PermitID=1966694',
  'https://coopr.codot.gov:444/Mobile/Lookup.aspx?PermitID=1966694',
  'https://coopr.codot.gov/Mobile/Lookup.aspx?PermitID=1966694&next=http://127.0.0.1',
  'https://user:pass@coopr.codot.gov/Mobile/Lookup.aspx?PermitID=1966694',
  'https://txpros.txdmv.gov.evil.test/PermitDetails02.aspx?PermitID=15397987&QRUSER=1',
  'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=15397987&QRUSER=0',
  'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=15397987&QRUSER=1&redirect=elsewhere',
  'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=abc&QRUSER=1'
 ])assert.equal(publicOfficialPermitReference(unsafe),null,unsafe);
});

test('Colorado official page imports only allowlisted permit fields and route evidence',()=>{
 const permit=parseOfficialPermitHTML(coloradoOfficialHTML,'colorado-public-html');
 assert.equal(permit.state,'CO');assert.equal(permit.number,'26SW0000001');
 assert.equal(permit.validFrom,'2026-10-19');assert.equal(permit.validTo,'2026-10-24');
 assert.equal(permit.entry.state,'UT');assert.equal(permit.exit.state,'NM');
 assert.equal(permit.entry.road,'US-491');assert.equal(permit.exit.road,'US-491');
 assert.deepEqual(permit.limits,{widthFt:8.5,heightFt:13.5,lengthFt:75,weightLb:86002,axles:6});
 assert.equal(permit.steps.length,1);assert.equal(permit.steps[0].road,'US-491');assert.deepEqual(permit.steps[0].points,[]);
 assert.match(permit.restrictions,/no convoying/i);assert.match(permit.restrictions,/load-posted/i);
 assert.equal(permit.complete,false);assert.equal(reviewed(permit),false);assert.equal(geometryReviewed(permit),false);
 const serialized=JSON.stringify(permit);assert.doesNotMatch(serialized,/PRIVATE CONTACT|PRIVATE-VIN/i);
});

test('Texas official page imports the complete public route table without private page data or invented geometry',()=>{
 const permit=parseOfficialPermitHTML(texasOfficialHTML,'texas-public-html');
 assert.equal(permit.state,'TX');assert.equal(permit.number,'261019000001');
 assert.equal(permit.validFrom,'2026-10-19');assert.equal(permit.validTo,'2026-10-23');
 assert.equal(permit.entry.state,'NM');assert.equal(permit.exit.state,'LA');
 assert.equal(permit.entry.road,'I-40');assert.equal(permit.exit.road,'I-20');
 assert.ok(permit.steps.length>=7);assert.ok(permit.steps.some(step=>/Exit 62A/.test(step.text)));assert.ok(permit.steps.some(step=>step.road==='IH20 e'));
 assert.match(permit.routeText,/Loaded Route Origin/);assert.match(permit.routeText,/Loaded Route Destination/);
 assert.equal(permit.steps.every(step=>step.points.length===0),true);assert.equal(permit.geometrySource,null);
 const serialized=JSON.stringify(permit);assert.doesNotMatch(serialized,/PRIVATE-PHONE|PRIVATE-VIN|PRIVATE-PAYMENT/i);
});

test('official HTML resolver requests no credentials, refuses redirects and returns no executable page content',async()=>{
 for(const[url,format,html,state]of[
  [coloradoURL,'colorado-public-html',coloradoOfficialHTML,'CO'],
  [texasHttpURL,'texas-public-html',texasOfficialHTML,'TX']
 ]){
  let requested='',options;
  const permit=await resolvePermitURL(url,async(input,requestOptions)=>{requested=String(input);options=requestOptions;return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8'}})});
  assert.equal(publicPermitReference(url).format,format);assert.equal(permit.state,state);
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');assert.match(options.headers.Accept,/text\/html/);
  assert.match(requested,/^https:\/\//);assert.doesNotMatch(JSON.stringify(permit),/<script|<html|PRIVATE-/i);
 }
 await assert.rejects(()=>resolvePermitURL(coloradoURL,async()=>new Response('',{status:302,headers:{location:'http://127.0.0.1'}})),/unavailable/i);
 await assert.rejects(()=>resolvePermitURL(coloradoURL,async()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}})),/unavailable/i);
});

test('official lookup evidence cannot make a permitted trip guidance-ready without original PDF review and geometry',()=>{
 const trip=blankTrip();trip.name='Official lookup evidence';trip.departure='2026-10-19';trip.acknowledged=true;
 trip.profile={heightFt:'13.5',widthFt:'8.5',lengthFt:'75',weightLb:'86002',axles:'6',axleWeights:'',hazmat:''};
 trip.permits=[parseOfficialPermitHTML(coloradoOfficialHTML,'colorado-public-html')];
 const master=buildMaster(trip,{geometry:true});assert.equal(master.ready,false);assert.equal(master.segments.length,0);
 assert.ok(master.issues.some(issue=>/original permit image or PDF/i.test(issue)));
 assert.ok(master.issues.some(issue=>/reviewed route geometry/i.test(issue)));
});
