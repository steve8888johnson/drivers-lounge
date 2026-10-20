import test from'node:test';
import assert from'node:assert/strict';
import{buildMaster}from'../src/assets/permits/core.mjs';
import{extractAuthorizedRouteText,parsePermitPacketTexts,parsePermitText}from'../src/assets/permits/import.mjs';
import{canonicalPermitRoad}from'../src/assets/permits/state-meta.mjs';
import{
 unit179PermitPacketTexts,utahPermitText,coloradoPermitText,newMexicoPermitText,texasPermitText
}from'./fixtures/permit-packet-unit-179.mjs';

test('state-specific permit extraction isolates the issued route instead of filling the route field with the entire PDF',()=>{
 const cases=[
  [utahPermitText,'UT',/E GRAND AVE.*US-491 E/s,/UTAH DEPARTMENT OF TRANSPORTATION/],
  [coloradoPermitText,'CO',/69\.40 US-491 Arrive at destination/,/Absolutely no convoying/],
  [newMexicoPermitText,'NM',/US-64 TRUCK BYPASS/,/City of Farmington/],
  [texasPermitText,'TX',/135\.80 IH20 e Arrive at destination/,/Texas Department of Motor Vehicles/]
 ];
 for(const[text,state,routePattern,excludedPattern]of cases){
  const result=extractAuthorizedRouteText(text,state);
  assert.equal(result.extracted,true,`${state} route section should be isolated`);
  assert.match(result.text,routePattern);
  assert.doesNotMatch(result.text,excludedPattern);
  assert.ok(result.text.length<text.length,`${state} route field should be smaller than the original permit text`);
 }
});

test('four-state packet imports in geographic order with exact border-road continuity',()=>{
 const packet=parsePermitPacketTexts([...unit179PermitPacketTexts].reverse());
 assert.deepEqual(packet.trip.permits.map(permit=>permit.state),['UT','CO','NM','TX']);
 assert.deepEqual(packet.trip.permits.map(permit=>permit.number),['9000000001','26SW0000001','NM26000001','261019000001']);
 assert.deepEqual(packet.issues,[]);
 assert.deepEqual(packet.conflicts,[]);
 const[ut,co,nm,tx]=packet.trip.permits;
 assert.deepEqual([ut.exit.state,canonicalPermitRoad(ut.exit.road)],['CO','US-491']);
 assert.deepEqual([co.entry.state,canonicalPermitRoad(co.entry.road)],['UT','US-491']);
 assert.deepEqual([co.exit.state,canonicalPermitRoad(co.exit.road)],['NM','US-491']);
 assert.deepEqual([nm.entry.state,canonicalPermitRoad(nm.entry.road)],['CO','US-491']);
 assert.deepEqual([nm.exit.state,canonicalPermitRoad(nm.exit.road)],['TX','I-40']);
 assert.deepEqual([tx.entry.state,canonicalPermitRoad(tx.entry.road)],['NM','I-40']);
 assert.deepEqual([tx.exit.state,canonicalPermitRoad(tx.exit.road)],['LA','I-20']);
});

test('packet load profile agrees across permits and preserves the final Texas route page',()=>{
 const packet=parsePermitPacketTexts(unit179PermitPacketTexts);
 assert.deepEqual(packet.trip.profile,{heightFt:'13.5',widthFt:'8.5',lengthFt:'75',weightLb:'86002',axles:'6',axleWeights:packet.trip.profile.axleWeights,hazmat:''});
 assert.ok(packet.trip.profile.axleWeights.length>0);
 assert.equal(packet.trip.departure,'2026-10-19');
 assert.equal(packet.trip.name,'UT → CO → NM → TX permitted load');
 assert.deepEqual(packet.loadDescriptions.map(value=>value.toLowerCase()),['battery','1 battery']);
 const texas=packet.trip.permits.at(-1);
 assert.match(texas.routeText,/IH635/);
 assert.match(texas.routeText,/SS557/);
 assert.match(texas.routeText,/IH20 e Arrive at destination/);
 assert.doesNotMatch(texas.routeText,/Payment Method|Total Amt Paid|VIN/i);
});

test('important restrictions remain evidence while complex curfews are not silently converted into a simple movement window',()=>{
 const nm=parsePermitText(newMexicoPermitText),tx=parsePermitText(texasPermitText),co=parsePermitText(coloradoPermitText);
 assert.match(nm.restrictions,/25 mph/);
 assert.match(nm.restrictions,/65 miles per hour/);
 assert.match(nm.restrictions,/Front Escort Required/);
 assert.match(nm.restrictions,/Albuquerque/);
 assert.equal(nm.travelWindow,null);
 assert.match(tx.restrictions,/adhere to the described route/i);
 assert.match(tx.restrictions,/toll roads/i);
 assert.equal(tx.travelWindow,null);
 assert.match(co.restrictions,/no convoying/i);
 assert.match(co.restrictions,/load-posted structures/i);
});

test('an imported packet remains fail-closed until originals, manual confirmation and reviewed geometry are present',()=>{
 const packet=parsePermitPacketTexts(unit179PermitPacketTexts),trip=packet.trip;
 trip.acknowledged=true;
 const master=buildMaster(trip,{geometry:true});
 assert.equal(master.ready,false);
 assert.ok(master.issues.some(issue=>/retain an original permit image or PDF/i.test(issue)));
 assert.ok(master.issues.some(issue=>/compare with the original and confirm extraction/i.test(issue)));
 assert.ok(master.issues.some(issue=>/reviewed route geometry is needed/i.test(issue)));
});
