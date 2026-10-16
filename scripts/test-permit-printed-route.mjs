import test from 'node:test';
import assert from 'node:assert/strict';
import {pageLines,extractRouteTables,printedRowSpeech,pronouncePrintedRoad} from '../src/assets/permits/pdf-route-review.mjs';
import {comparePrintedIssuerRoute} from '../src/assets/permits/printed-map-match.mjs';
import {issuerRowText} from '../src/assets/permits/issuer-map.mjs';
const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
const line=(y,cells)=>cells.map((s,i)=>item(s,[30,130,230,530,600][i],y));
const page=(number,rows,title='Texas Oversize/Overweight Single-Trip Permit')=>({page:number,items:[item(title,30,760),...line(700,['Miles','Route','To','Distance','Est. Time']),...rows.flatMap((cells,i)=>line(680-i*20,cells)),item('Final Destination: SYNTHETIC SITE',30,100)]});

function pair(){
  const pdf=page(1,[['1.00','SH171 se','Take SH31 Ramp sw','1.00','00:01'],['< 0.1','SH31 Ramp sw','Merge onto SH31 sw','1.00','00:00']]);
  pdf.items.push(item('Permit Number: TEST-1',300,740));
  const review=extractRouteTables([pdf]),rows=review.rows.map((r,i)=>({sequence:i+1,road:r.road,instruction:r.instruction,miles:i?0:1,cumulativeMiles:1}));
  const permit={state:'TX',number:'TEST-1',routeText:rows.map(issuerRowText).join('\n'),entry:{label:'A'},exit:{label:'B'},steps:[]};
  permit.issuerMap={format:'txpros-issuer-map/v2',sourceUrl:'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=10000001&QRUSER=1',permitNumber:permit.number,routeText:permit.routeText,entryLabel:'A',exitLabel:'B',retrievedAt:'2026-10-15T12:00:00Z',paths:[[[32,-100],[32.001,-100]]],rows};
  return {review,permit,pdf};
}

test('full printed table binds to matching issuer rows without modifying either source or establishing turns',()=>{
  const {review,permit}=pair(),before=JSON.stringify({review,permit});
  const match=comparePrintedIssuerRoute(review,permit);assert(match.matched);assert.equal(match.rowCount,2);assert.deepEqual(match.differences,[]);assert.match(match.message,/not a verified turn location/);assert.equal(JSON.stringify({review,permit}),before);
  review.rows[1].instruction='Merge  onto SH31\n sw';assert(comparePrintedIssuerRoute(review,permit).matched);
});

test('one wrong direction, ramp, branch, lane or mileage blocks every map-row handoff',()=>{
  for(const [field,value] of [['instruction','Merge onto SH31 ne'],['road','SH31 sw'],['road','SH31 Ramp ne'],['instruction','Left lane: Merge onto SH31 sw'],['road','IH35W'],['miles','0.1'],['miles','0'],['cumulative','1.01']]){
    const {review,permit}=pair();review.rows[1][field]=value;const match=comparePrintedIssuerRoute(review,permit);assert(!match.matched);assert.equal(match.status,'mismatch');assert.equal(match.differences[0].row,2);assert.match(match.message,/No rows are connected/);
  }
});

test('missing rows, conflicting identity, extraction failures and unsupported maps cannot borrow a nearby match',()=>{
  for(const mutate of [r=>r.permitNumber='OTHER',r=>r.permitNumber=null,r=>r.rows.pop(),r=>r.rows.reverse(),r=>r.rows[0].page=2,r=>r.rows[0].row=5,r=>r.issues.push('incomplete table'),r=>r.issues=null,r=>r.pageCount=41]){const {review,permit}=pair();mutate(review);assert(!comparePrintedIssuerRoute(review,permit).matched);}
  const {review,permit}=pair();permit.routeText+=' edited';assert(!comparePrintedIssuerRoute(review,permit).matched);
  assert(!comparePrintedIssuerRoute(review,{}).matched);assert(!comparePrintedIssuerRoute(null,permit).matched);review.state='KS';assert.equal(comparePrintedIssuerRoute(review,permit).status,'unavailable');
});

test('permit identity comes only from an explicit unambiguous printed label',()=>{
  const {pdf}=pair();assert.equal(extractRouteTables([pdf]).permitNumber,'TEST-1');
  pdf.items.push(item('Permit Number: TEST-1',300,720));assert.equal(extractRouteTables([pdf]).permitNumber,'TEST-1');
  pdf.items.push(item('Permit Number: OTHER',300,710));assert.equal(extractRouteTables([pdf]).permitNumber,null);
  pdf.items.pop();pdf.items.push(item('Permit Number: ???',300,710));assert.equal(extractRouteTables([pdf]).permitNumber,null);
  assert.equal(extractRouteTables([page(1,[['1','SH31','Arrive at destination.','1','00:01']])]).permitNumber,null);
});
test('continued tables preserve row order, literal road suffixes and source pages without geometry',()=>{
  const input=[page(3,[['0.40','IH35W Connector','Keep right toward IH35W South/Waco','487.30','00:00'],['','e','','','']]),page(4,[['44.40','IH35W s','Continue straight on IH-35 s [IH35W]','532.20','00:41']])];
  const before=JSON.stringify(input),r=extractRouteTables(input);assert.equal(r.rows.length,2);assert.equal(r.rows[0].road,'IH35W Connector e');assert.equal(r.rows[1].page,4);assert.equal(r.rows[1].row,2);assert.equal(r.rows[1].instruction,'Continue straight on IH-35 s [IH35W]');assert.deepEqual(r.issues,[]);assert.deepEqual(r.geometry,[]);assert.equal(r.approved,false);assert.equal(JSON.stringify(input),before);
});
test('wrapped lane and ramp wording is retained rather than replaced by main-road directions',()=>{
  const r=extractRouteTables([page(1,[['< 0.1','SS192 Ramp e','Continue straight on SS192 e','54.90','00:00'],['0.30','US82 se','Merge onto US281 s [HENRY S GRACE','358.60','00:00'],['','','FREEWAY]','','']])]);
  assert.equal(r.rows[0].miles,'< 0.1');assert.match(r.rows[1].instruction,/HENRY S GRACE FREEWAY/);assert.match(printedRowSpeech(r,0),/less than 0.1/);assert.match(printedRowSpeech(r,0),/PDF page 1/);assert.match(printedRowSpeech(r,0),/State Spur 192 Ramp east/);
});
test('Kansas table retains US83 road and does not silently rewrite the destination as road geometry',()=>{
  const r=extractRouteTables([page(2,[['75.46','US-83','Arrive at destination.','76.11','01:22']],'Kansas Overdimension Oversize and/or Overweight Single-Trip')]);assert.equal(r.state,'KS');assert.equal(r.rows[0].road,'US-83');assert.match(printedRowSpeech(r,0),/No position or road match/);
});
test('incomplete columns and decreasing page mileage block speech while retaining source rows',()=>{
  const r=extractRouteTables([page(3,[['1.00','IH35 s','Continue straight on IH35 s','50.00','00:01']]),page(4,[['2.00','','Take Exit 9','2.00','']])]);assert.equal(r.rows.length,2);assert.equal(printedRowSpeech(r,0),null);assert(r.issues.some(s=>s.includes('columns')));assert(r.issues.some(s=>s.includes('decreases')));
});
test('unknown, mixed issuers, image-only and oversized layouts fail explicitly',()=>{
  assert.throws(()=>extractRouteTables([page(1,[],'Another state')]));assert.throws(()=>extractRouteTables([page(1,[])]));assert.throws(()=>extractRouteTables([page(1,[],'Kansas Overdimension Oversize and/or Overweight Single-Trip Texas Department of Motor Vehicles')]));assert.throws(()=>pageLines([item('x'.repeat(250001),1,1)]));assert.throws(()=>pageLines([item('x',NaN,1)]));assert.throws(()=>extractRouteTables(Array(41).fill(page(1,[]))));
});
test('unsupported table row is exposed and never silently omitted from a clean speech result',()=>{
  const r=extractRouteTables([page(1,[['1.0','US83','Continue straight on US83','1.0','00:01'],['unknown','Ramp','Turn right','2.0','00:01']])]);assert(r.issues.some(s=>s.includes('unrecognized table text')));assert.equal(printedRowSpeech(r,0),null);assert.equal(printedRowSpeech(r,99),null);
});
test('position grouping tolerates small baseline variations and arbitrary input order',()=>{
  const p=page(1,[['1.00','SH31 sw','Arrive at destination.','1.00','00:01']]);p.items.reverse();p.items.find(x=>x.str==='SH31 sw').transform[5]+=.5;const r=extractRouteTables([p]);assert.equal(r.rows[0].road,'SH31 sw');assert.deepEqual(r.issues,[]);
});

test('speech expands known codes without confusing branch letters, street initials or changing the source',()=>{
 const r=extractRouteTables([page(3,[['0.4','IH35W Connector e','Keep right toward IH35W South/Waco','1.0','00:01']])]);const original=JSON.stringify(r);
 assert.match(printedRowSpeech(r,0),/Interstate 35 W Connector east/);assert.match(printedRowSpeech(r,0),/Interstate 35 W South\/Waco/);assert.equal(JSON.stringify(r),original);
 assert.equal(pronouncePrintedRoad('US70WFR se [US287WFR]'),'U.S. Highway 70 west frontage road southeast [U.S. Highway 287 west frontage road]');
 assert.equal(pronouncePrintedRoad('SH31 sw [FM339] HENRY S GRACE'),'State Highway 31 southwest [Farm to Market Road 339] HENRY S GRACE');
 assert.equal(pronouncePrintedRoad('IH-35 s SL143 e SS192 e'),'Interstate 35 south State Loop 143 east State Spur 192 east');
 assert.equal(pronouncePrintedRoad('UNKNOWN34 Exit 368A'),'UNKNOWN34 Exit 368A');
});
