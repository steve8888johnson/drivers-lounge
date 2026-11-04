import test from'node:test';
import assert from'node:assert/strict';
import{extractAuthorizedRouteText,parseLoadProfile,parsePermitPacketTexts,parsePermitPdfText,parsePermitText}from'../src/assets/permits/import.mjs';
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
LOAD: BATTERY From: 1000 TEST INDUSTRIAL RD, SAMPLE CITY, UT 84000 To: US-491 CO BORDER
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


// Additional synthetic excerpts mirror the table and multi-page route structures in
// Kansas and Texas permits without retaining any carrier, vehicle, address or permit data.
const ks=`Kansas Department of Transportation
Central Permitting Office
Permit #:26080000
Overdimension Oversize and/or Overweight Single-Trip
Permit Type Fee Effective Date Expiration Date
Overdimension Oversize and/or Overweight $40.00 10/14/2026 10/20/2026
LOAD
Load Description: INDUSTRIAL COMPONENT
Overall Length: 75' Overall Width: 12' 6" Overall Height: 13' 6"
Gross Weight: 90520
Axle: 1 2 3 4 5 6
Weight: 10500 21500 21500 12340 12340 12340
Spacing: 19' 4' 5" 38' 5" 4' 6" 4' 6"
ROUTE
Origin: SAMPLE INDUSTRIAL ROAD, 0.4mi from SAMPLE CITY
0.38 US-83 Turn left onto US-83 Ramp
0.27 US-83 Ramp Continue straight on US-83 [US-50], [US-400]
75.46 US-83 Arrive at destination.
Final Destination: US0270 OK Line
Conditions and Restrictions
Detour all construction and low overhead structures.
Overwidth and/or overlength loads shall not move when visibility is less than one-half mile.
Night movement is allowed only for overweight-only loads unless separately authorized.
Any county road or city street requires approval from the appropriate local authority.`;

const txOversize=`Texas Department of Motor Vehicles
Texas Oversize/Overweight Single-Trip Permit
Permit Number: 261000000002
Effective: 10/14/2026
Expiration: 10/18/2026
Load Description: INDUSTRIAL COMPONENT Gross Weight: 92500
Max. Width: 12' 6'' Max Height: 13' 6'' Max. Length: 75'
Axle: 1 2 3 4 5 6
Distances: 19' 4' 39' 5' 5'
Weights: 10500 21500 21500 13000 13000 13000
Route Description: Origin: SH0136 OK Line
Destination: SH0031, 0.1mi SW of SAMPLE JUNCTION
Route Conditions:
Urban curfew: no movement 7:00am-9:00am and 4:00pm-6:00pm Monday-Friday.
General Conditions:
Permittee must adhere to the described route and request an amended route when necessary.
Travel is not authorized on non-state-maintained roads without local approval.
PAGE 3 OF 4
Origin: SH0136 OK Line
Miles Route To Distance Est. Time
18.50 SH136 Head east on SH136 18.50 00:21
36.40 SH15 Take sample state spur ramp 54.80 00:41
42.30 US83 Continue south on US83 99.80 00:43
65.40 US70 Continue southeast on US70 305.10 01:07
PAGE 4 OF 4
44.40 IH35W Continue south on IH35W 532.20 00:41
7.50 SH31 Arrive at destination. 565.60 00:08
Final Destination: SH0031, 0.1mi SW of SAMPLE JUNCTION`;

test('Kansas table layout extracts dates, six-axle profile, route and Oklahoma handoff',()=>{
 const permit=parsePermitPdfText(ks),load=parseLoadProfile(ks);
 assert.equal(permit.state,'KS');
 assert.equal(permit.number,'26080000');
 assert.equal(permit.validFrom,'2026-10-14');
 assert.equal(permit.validTo,'2026-10-20');
 assert.equal(permit.exit.state,'OK');
 assert.equal(permit.exit.road,'US-270');
 assert.equal(load.profile.widthFt,'12.5');
 assert.equal(load.profile.heightFt,'13.5');
 assert.equal(load.profile.lengthFt,'75');
 assert.equal(load.profile.weightLb,'90520');
 assert.equal(load.profile.axles,'6');
 assert.match(permit.routeText,/US-83 Ramp/i);
 assert.match(permit.restrictions,/visibility is less than one-half mile/i);
 assert.match(permit.restrictions,/local authority/i);
});

test('Texas multi-page layout isolates the issued route and preserves curfew and local-road conditions',()=>{
 const permit=parsePermitPdfText(txOversize),load=parseLoadProfile(txOversize);
 assert.equal(permit.state,'TX');
 assert.equal(permit.number,'261000000002');
 assert.equal(permit.validFrom,'2026-10-14');
 assert.equal(permit.validTo,'2026-10-18');
 assert.equal(permit.entry.state,'OK');
 assert.equal(permit.entry.road,'SH-136');
 assert.equal(load.profile.widthFt,'12.5');
 assert.equal(load.profile.heightFt,'13.5');
 assert.equal(load.profile.lengthFt,'75');
 assert.equal(load.profile.weightLb,'92500');
 assert.equal(load.profile.axles,'6');
 assert.match(permit.routeText,/Origin: SH0136 OK Line/i);
 assert.match(permit.routeText,/IH35W/i);
 assert.match(permit.routeText,/Final Destination: SH0031/i);
 assert.doesNotMatch(permit.routeText,/Permittee must adhere/i);
 assert.match(permit.restrictions,/no movement 7:00am-9:00am/i);
 assert.match(permit.restrictions,/non-state-maintained roads/i);
});

test('authorized-route extraction tolerates page labels without swallowing permit conditions',()=>{
 const route=extractAuthorizedRouteText(txOversize,'TX');
 assert.equal(route.extracted,true);
 assert.match(route.text,/SH136/);
 assert.match(route.text,/SH31 Arrive at destination/);
 assert.doesNotMatch(route.text,/General Conditions/);
});
