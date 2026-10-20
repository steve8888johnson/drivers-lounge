import test from'node:test';
import assert from'node:assert/strict';
import{parsePermitPdfPacketTexts,parsePermitPdfText,parseLoadProfile,classifyQR}from'../src/assets/permits/import.mjs';
import{canonicalRoadKey}from'../src/assets/permits/state-meta.mjs';
import{unit179PermitTexts,unit179InlineNewMexicoQR,unit179QrReferences}from'./fixtures/unit179-permit-formats.mjs';

const texts=Object.values(unit179PermitTexts);

test('real-format Unit 179 packet parses and orders UT to CO to NM to TX',()=>{
 const packet=parsePermitPdfPacketTexts(texts);
 assert.deepEqual(packet.trip.permits.map(permit=>permit.state),['UT','CO','NM','TX']);
 assert.deepEqual(packet.trip.permits.map(permit=>permit.entry.state),['','UT','CO','NM']);
 assert.deepEqual(packet.trip.permits.map(permit=>permit.exit.state),['CO','NM','TX','LA']);
 assert.deepEqual(packet.trip.permits.map(permit=>canonicalRoadKey(permit.exit.road)),['US491','US491','I40','I20']);
 assert.deepEqual(packet.trip.permits.slice(1).map(permit=>canonicalRoadKey(permit.entry.road)),['US491','US491','I40']);
 assert.deepEqual(packet.issues,[]);
 assert.deepEqual(packet.conflicts,[]);
 assert.equal(packet.trip.departure,'2026-10-19');
 assert.equal(packet.trip.name,'UT → CO → NM → TX permitted load');
});

test('packet load profile agrees across actual state formats',()=>{
 const packet=parsePermitPdfPacketTexts(texts),profile=packet.trip.profile;
 assert.equal(profile.widthFt,'8.5');
 assert.equal(profile.heightFt,'13.5');
 assert.equal(profile.lengthFt,'75');
 assert.equal(profile.weightLb,'86002');
 assert.equal(profile.axles,'6');
 assert.deepEqual(packet.loadDescriptions.sort(),['1 battery','BATTERY'].sort());
});

test('state-specific route sections exclude unrelated legal pages and preserve controlling roads',()=>{
 const permits=Object.fromEntries(texts.map(text=>{const permit=parsePermitPdfText(text);return[permit.state,permit]}));
 assert.match(permits.UT.routeText,/E GRAND AVE[\s\S]*US-491 E/);
 assert.doesNotMatch(permits.UT.routeText,/RESTRICTIONS:/);
 assert.match(permits.CO.routeText,/Origin: US 491 UT Line[\s\S]*US-491[\s\S]*Destination: US 491 NM Line/);
 assert.doesNotMatch(permits.CO.routeText,/Absolutely no convoying/);
 assert.match(permits.NM.routeText,/US-64 TRUCK BYPASS[\s\S]*NM-371[\s\S]*I-40/);
 assert.match(permits.TX.routeText,/IH0040 NM Line[\s\S]*IH635[\s\S]*IH20[\s\S]*IH0020 LA Line/);
 assert.match(permits.NM.restrictions,/maximum speed of sixty-five/i);
 assert.match(permits.TX.restrictions,/load-restricted bridge/i);
});

test('individual state dimensions and axle evidence are retained without inventing legal dimensions',()=>{
 const ut=parseLoadProfile(unit179PermitTexts.UT),co=parseLoadProfile(unit179PermitTexts.CO),nm=parseLoadProfile(unit179PermitTexts.NM),tx=parseLoadProfile(unit179PermitTexts.TX);
 assert.deepEqual([ut.profile.widthFt,ut.profile.lengthFt,ut.profile.heightFt,ut.profile.weightLb],['8.5','75','13.5','86002']);
 assert.equal(co.profile.widthFt,'');
 assert.equal(co.profile.heightFt,'');
 assert.equal(co.profile.lengthFt,'');
 assert.equal(co.profile.axles,'6');
 assert.deepEqual([nm.profile.widthFt,nm.profile.lengthFt,nm.profile.heightFt,nm.profile.axles],['8.5','75','13.5','6']);
 assert.deepEqual([tx.profile.widthFt,tx.profile.lengthFt,tx.profile.heightFt,tx.profile.weightLb],['8.5','75','13.5','86002']);
 assert.match(tx.profile.axleWeights,/Weights: 12400 15000 15000/);
});

test('observed QR formats are classified safely',()=>{
 assert.equal(classifyQR(unit179QrReferences.CO).kind,'public-provider');
 assert.equal(classifyQR(unit179QrReferences.TX).kind,'public-provider');
 const ut=classifyQR(unit179QrReferences.UT);
 assert.notEqual(ut.kind,'public-provider');
 assert.match(ut.message,/original permit|authorized access|manual|transcribe/i);
 const nm=classifyQR(unit179InlineNewMexicoQR);
 assert.notEqual(nm.kind,'public-url');
 assert.notEqual(nm.kind,'public-provider');
});

test('sanitized fixtures contain no real permit credentials or vehicle identifiers',()=>{
 const serialized=JSON.stringify({unit179PermitTexts,unit179InlineNewMexicoQR,unit179QrReferences});
 for(const forbidden of['2699096838','26SW0655731','NM26312176','261019397987','1XKYD49XXSJ170964','P1268126','2999415'])assert.equal(serialized.includes(forbidden),false,`fixture leaked ${forbidden}`);
});
