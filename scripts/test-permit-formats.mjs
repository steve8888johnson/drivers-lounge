import test from'node:test';
import assert from'node:assert/strict';
import{parseLoadProfile,parsePermitPacketTexts,parsePermitText}from'../src/assets/permits/import.mjs';
import{parsePublicProvider}from'../src/assets/permits/provider.mjs';
import{canonicalPermitRoad,inferBorderEdge,permitTimeZoneForState,permitTimeZoneNeedsReview}from'../src/assets/permits/state-meta.mjs';

// Synthetic/redacted excerpts preserve the state formats and route handoffs from a real
// UT→CO→NM→TX packet without publishing a carrier's VIN, plate or live permit identifiers.
const ut=`UTAH DEPARTMENT OF TRANSPORTATION
COMBINED TRANSPORTATION AND TAX COMMISSION PERMIT No. 2699000000
NON-DIVISIBLE OVERWEIGHT/OVERSIZE COMBINATION PERMIT
Starts: 10/19/2026
Expires: 10/23/2026
SIZE: Width Length Height
8' 6" 75' 13' 6"
Total Gross: 86,002
Total Axles: 6
LOAD: BATTERY From: 2052 E GRAND AVE, ERDA, UT 84074 To: US-491 CO BORDER
ROUTING:
E GRAND AVE ; SHEEP LN ; UT138 - 179 ; I-80 ; I-15 ; US-6/89 ; US-191 ; I-70 ; US-191 ; US-491 E .
RESTRICTIONS:
This route has not been reviewed by the UDOT adjudication team. Check current restrictions before movement.`;

const co=`COLORADO DEPARTMENT OF TRANSPORTATION
Single Trip Transport Permit # 26SW0000001
Valid From: 10/19/2026 To: 10/24/2026
Load: 1 battery
Gross Weight: 86,002 Total Axles: 6
From: US 491 UT Line
To: US 491 NM Line
Via: US-491
Special Restrictions
Absolutely no convoying. Maintain one-half mile distance between oversized loads.
Travel prohibited when hazardous conditions exist.`;

const nm=`STATE OF NEW MEXICO
Department of Transportation Ports of Entry
Permit Number: NM26000001
Single Trip Overweight Load Permit
Date Effective: 10/19/2026
Date Expires: 10/23/2026
Load Description: 1 battery
Overall Width: 8' 6" Overall Height: 13' 6" Overall Length: 75' Trailer Length: 53'
GVW: 86,002 Total Axles: 6
Origin: US-491;CO;Shiprock
Destination: I-40;TX;Glenrio
Route Summary: US-491, US-64, US-64 TRUCK BYPASS, NM-371, I-40
Restrictions:
Inclement weather includes current wind speeds that reach 25 mph or more.
Permittee shall not exceed 65 miles per hour.
State Curfew: Albuquerque - No Travel 7 AM - 9 AM and 4 PM - 6 PM Mon-Fri.`;

const tx=`Texas Department of Motor Vehicles
Texas Oversize/Overweight Single-Trip Permit
Permit Number: 261000000001
Effective: 10/19/2026
Expiration: 10/23/2026
Load Description: 1 battery Gross Weight: 86002
Max. Width: 8' 6'' Max Height: 13' 6'' Max. Length: 75'
Route Description: Origin: IH0040 NM Line
Destination: IH0020 LA Line
General Conditions:
Permittee must adhere to the described route and request an amended route when necessary.
Travel is not authorized on toll roads unless the permit route explicitly includes a toll road.
Permit is valid for single trip only.`;

test('state permit formats extract identifiers, dates, time zones and exact border handoffs',()=>{
 const permits=[ut,co,nm,tx].map(parsePermitText);
 assert.deepEqual(permits.map(p=>p.state),['UT','CO','NM','TX']);
 assert.deepEqual(permits.map(p=>p.number),['2699000000','26SW0000001','NM26000001','261000000001']);
 assert.deepEqual(permits.map(p=>p.validFrom),['2026-10-19','2026-10-19','2026-10-19','2026-10-19']);
 assert.deepEqual(permits.map(p=>p.validTo),['2026-10-23','2026-10-24','2026-10-23','2026-10-23']);
 assert.deepEqual(permits.map(p=>p.timeZone),['America/Denver','America/Denver','America/Denver','America/Chicago']);
 assert.deepEqual(permits.map(p=>[p.entry.state,p.entry.road,p.exit.state,p.exit.road]),[
  ['','','CO','US-491'],['UT','US-491','NM','US-491'],['CO','US-491','TX','I-40'],['NM','I-40','LA','I-20']
 ]);
});

test('four-state packet orders geographically despite shuffled uploads and preserves profile evidence',()=>{
 const packet=parsePermitPacketTexts([tx,nm,ut,co]);
 assert.deepEqual(packet.trip.permits.map(p=>p.state),['UT','CO','NM','TX']);
 assert.deepEqual(packet.issues,[]);
 assert.deepEqual(packet.conflicts,[]);
 assert.equal(packet.trip.profile.widthFt,'8.5');
 assert.equal(packet.trip.profile.heightFt,'13.5');
 assert.equal(packet.trip.profile.lengthFt,'75');
 assert.equal(packet.trip.profile.weightLb,'86002');
 assert.equal(packet.trip.profile.axles,'6');
 assert.equal(packet.trip.departure,'2026-10-19');
 assert.equal(packet.trip.name,'UT → CO → NM → TX permitted load');
});

test('permit restrictions are retained rather than inferred away',()=>{
 const permits=[parsePermitText(ut),parsePermitText(co),parsePermitText(nm),parsePermitText(tx)];
 assert.match(permits[0].restrictions,/not been reviewed by the UDOT adjudication team/i);
 assert.match(permits[1].restrictions,/no convoying/i);
 assert.match(permits[2].restrictions,/25 mph/i);
 assert.match(permits[2].restrictions,/No Travel 7 AM - 9 AM/i);
 assert.match(permits[3].restrictions,/adhere to the described route/i);
 assert.match(permits[3].restrictions,/toll roads/i);
 assert.equal(permits.every(p=>p.complete===false),true);
});

test('road aliases normalize across state permit naming conventions',()=>{
 assert.equal(canonicalPermitRoad('IH0040 NM Line'),'I-40');
 assert.equal(canonicalPermitRoad('I-40;TX;Glenrio'),'I-40');
 assert.equal(canonicalPermitRoad('US 491 UT Line'),'US-491');
 assert.equal(canonicalPermitRoad('US0270 OK Line'),'US-270');
 assert.deepEqual(inferBorderEdge('IH0020 LA Line','TX'),{label:'IH0020 LA Line',state:'LA',road:'I-20'});
});

test('load extraction keeps dimensions as decimal feet and original weight evidence',()=>{
 const parsed=parseLoadProfile(nm);
 assert.equal(parsed.profile.widthFt,'8.5');
 assert.equal(parsed.profile.heightFt,'13.5');
 assert.equal(parsed.profile.lengthFt,'75');
 assert.equal(parsed.profile.weightLb,'86002');
 assert.equal(parsed.profile.axles,'6');
 assert.match(parsed.description,/1 battery/i);
});

test('public issued-route QR imports use state metadata and canonical border roads',()=>{
 const payload={jurisdiction:'TX',geometryPrecision:5,data:JSON.stringify({code:'Ok',routes:[{legs:[{steps:[{geometry:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',name:'IH0040',maneuver:{instruction:'Continue on issued route'}}]}]}],waypoints:[{name:'IH0040 NM Line'},{name:'IH0020 LA Line'}]})};
 const permit=parsePublicProvider(payload);
 assert.equal(permit.timeZone,'America/Chicago');
 assert.equal(permit.entry.state,'NM');assert.equal(permit.entry.road,'I-40');
 assert.equal(permit.exit.state,'LA');assert.equal(permit.exit.road,'I-20');
 assert.equal(permit.complete,false);
 assert.equal(permitTimeZoneNeedsReview('TX'),true);
 assert.equal(permitTimeZoneForState('CO'),'America/Denver');
});
