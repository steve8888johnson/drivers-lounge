import test from'node:test';
import assert from'node:assert/strict';
import{authenticatedOfficialPermitReference,classifyPermitQrSupplement,parseInlinePermitMetadataQR}from'../src/assets/permits/qr-metadata.mjs';

const metadata=`Permit No: NM-SAMPLE-179\r\nStart Date: 10/19/2026\r\nEnd Date: 10/23/2026\r\nPermit Type: Single Trip OW Load\r\nCompany Name: PRIVATE CARRIER\r\nPhone: 5551234567\r\nUSDOT #: 0000000\r\nVIN #: PRIVATEVIN\r\nPlate No: PRIVATEPLATE\r\nTruck Make: KW\r\nTruck Year: 2025`;

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
 assert.match(result.message,/authorized route.*must come from the complete original permit/i);
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
