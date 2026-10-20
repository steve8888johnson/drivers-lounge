import test from'node:test';
import assert from'node:assert/strict';
import{authenticatedOfficialPermitReference,classifyPermitQrSupplement,parseInlinePermitMetadataQR}from'../src/assets/permits/qr-metadata.mjs';
import{mergePermitQrSupplement,safeQrEvidence}from'../src/assets/permits/qr-metadata-wallet.mjs';

const metadata=`Permit No: NM-SAMPLE-179\r\nStart Date: 10/19/2026\r\nEnd Date: 10/23/2026\r\nPermit Type: Single Trip OW Load\r\nCompany Name: PRIVATE CARRIER\r\nPhone: 5551234567\r\nUSDOT #: 0000000\r\nVIN #: PRIVATEVIN\r\nPlate No: PRIVATEPLATE\r\nTruck Make: KW\r\nTruck Year: 2025`;
const blank=()=>({state:'',number:'',kind:'single-trip',validFrom:'',validTo:'',timeZone:'',entry:{label:'',state:'',road:''},exit:{label:'',state:'',road:''},routeText:'',restrictions:'',complete:false,qr:[],confidence:{},review:{key:'old'},geometryReview:{key:'old'}});

test('New Mexico inline QR imports identity and dates without retaining private vehicle or contact data',()=>{
 const result=parseInlinePermitMetadataQR(metadata);
 assert.equal(result.kind,'permit-metadata');
 assert.equal(result.permit.state,'NM');
 assert.equal(result.permit.number,'NM-SAMPLE-179');
 assert.equal(result.permit.validFrom,'2026-10-19');
 assert.equal(result.permit.validTo,'2026-10-23');
 assert.equal(result.permit.kind,'single-trip');
 assert.equal(result.permit.timeZone,'America/Denver');
 assert.equal(result.permit.routeText,'');
 assert.equal(result.permit.restrictions,'');
 assert.equal(result.permit.complete,false);
 const serialized=JSON.stringify(result);
 for(const privateValue of['PRIVATE CARRIER','5551234567','PRIVATEVIN','PRIVATEPLATE','0000000'])assert.equal(serialized.includes(privateValue),false);
 assert.match(result.message,/complete original permit is still required/i);
 assert.match(result.message,/not the authorized route/i);
 assert.ok(result.safeSummary.includes('Permit time zone: Mountain'));
 assert.ok(result.safeSummary.includes('Permit type: Single trip'));
});

test('inline metadata parser rejects vague text, URLs and unsupported permit prefixes',()=>{
 for(const value of['Permit No: NM-SAMPLE','https://example.gov/permit/123','Permit No: XX123456\nStart Date: 10/19/2026\nEnd Date: 10/20/2026','random text'])assert.equal(parseInlinePermitMetadataQR(value),null);
});

test('Utah lookup is recognized as authenticated evidence without retaining VIN or plate query values',()=>{
 const raw='https://utcview.com/Permit/index?VIN=SENSITIVEVIN&Plate=SENSITIVEPLATE&permit_number=1234567890&State=UT&iftaOnly=No';
 const result=authenticatedOfficialPermitReference(raw);
 assert.equal(result.kind,'official-authenticated');
 assert.equal(result.state,'UT');
 assert.equal(result.permitNumber,'1234567890');
 assert.match(result.message,/will not sign in.*bypass access controls/i);
 assert.equal(result.url.includes('SENSITIVEVIN'),false);
 assert.equal(result.url.includes('SENSITIVEPLATE'),false);
 assert.equal(result.url,'https://utcview.com/Permit/index?permit_number=1234567890&iftaOnly=No');
});

test('authenticated lookup allowlist rejects lookalike hosts, extra parameters, credentials and insecure URLs',()=>{
 for(const raw of[
  'https://utcview.com.evil.test/Permit/index?permit_number=1234567890&iftaOnly=No',
  'http://utcview.com/Permit/index?permit_number=1234567890&iftaOnly=No',
  'https://user:pass@utcview.com/Permit/index?permit_number=1234567890&iftaOnly=No',
  'https://utcview.com:444/Permit/index?permit_number=1234567890&iftaOnly=No',
  'https://utcview.com/Permit/index?permit_number=1234567890&iftaOnly=No&redirect=https://evil.test',
  'https://utcview.com/Permit/index?permit_number=not-a-number&iftaOnly=No'
 ])assert.equal(authenticatedOfficialPermitReference(raw),null);
});

test('supplement classifier distinguishes metadata, authenticated evidence and unsupported QR content',()=>{
 assert.equal(classifyPermitQrSupplement(metadata).kind,'permit-metadata');
 assert.equal(classifyPermitQrSupplement('https://utcview.com/Permit/index?VIN=&Plate=&permit_number=1234567890&State=&iftaOnly=No').kind,'official-authenticated');
 assert.equal(classifyPermitQrSupplement('https://coopr.codot.gov/Mobile/Lookup.aspx?PermitID=1234567'),null);
 assert.equal(classifyPermitQrSupplement('plain unsupported text'),null);
});

test('metadata wallet merge persists exact dates, Mountain time and single-trip while leaving route evidence empty',()=>{
 const supplement=parseInlinePermitMetadataQR(metadata),permit=blank();
 const result=mergePermitQrSupplement(permit,supplement);
 assert.equal(result.changed,true);
 assert.deepEqual([permit.state,permit.number,permit.validFrom,permit.validTo,permit.timeZone,permit.kind],['NM','NM-SAMPLE-179','2026-10-19','2026-10-23','America/Denver','single-trip']);
 assert.equal(permit.routeText,'');assert.equal(permit.restrictions,'');assert.equal(permit.entry.label,'');assert.equal(permit.exit.label,'');
 assert.equal(permit.complete,false);assert.equal(permit.review,null);assert.equal(permit.geometryReview,null);
 assert.equal(permit.qr.length,1);assert.equal(permit.qr[0],safeQrEvidence(supplement));
 const stored=JSON.stringify(permit);
 for(const privateValue of['PRIVATE CARRIER','5551234567','PRIVATEVIN','PRIVATEPLATE','0000000'])assert.equal(stored.includes(privateValue),false);
});

test('wallet merge never silently overwrites conflicting permit identity or dates',()=>{
 const supplement=parseInlinePermitMetadataQR(metadata),permit={...blank(),state:'TX',number:'EXISTING',validTo:'2026-10-22',timeZone:'America/Chicago'};
 const result=mergePermitQrSupplement(permit,supplement);
 assert.deepEqual([permit.state,permit.number,permit.validTo,permit.timeZone],['TX','EXISTING','2026-10-22','America/Chicago']);
 assert.ok(result.conflicts.some(value=>value.startsWith('state ')));
 assert.ok(result.conflicts.some(value=>value.startsWith('number ')));
 assert.ok(result.conflicts.some(value=>value.startsWith('validTo ')));
 assert.ok(result.conflicts.some(value=>value.startsWith('timeZone ')));
});

test('authenticated Utah wallet evidence stores only the sanitized official reference',()=>{
 const raw='https://utcview.com/Permit/index?VIN=SENSITIVEVIN&Plate=SENSITIVEPLATE&permit_number=1234567890&State=UT&iftaOnly=No';
 const supplement=authenticatedOfficialPermitReference(raw),permit=blank();
 mergePermitQrSupplement(permit,supplement);
 assert.equal(permit.state,'UT');assert.equal(permit.number,'1234567890');assert.equal(permit.complete,false);
 assert.deepEqual(permit.qr,['https://utcview.com/Permit/index?permit_number=1234567890&iftaOnly=No']);
 assert.equal(JSON.stringify(permit).includes('SENSITIVEVIN'),false);assert.equal(JSON.stringify(permit).includes('SENSITIVEPLATE'),false);
});
