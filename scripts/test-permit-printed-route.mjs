import test from 'node:test';
import assert from 'node:assert/strict';
import {pageLines,extractRouteTables,printedRowSpeech} from '../src/assets/permits/pdf-route-review.mjs';
const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
const line=(y,cells)=>cells.map((s,i)=>item(s,[30,130,230,530,600][i],y));
const page=(number,rows,title='Texas Oversize/Overweight Single-Trip Permit')=>({page:number,items:[item(title,30,760),...line(700,['Miles','Route','To','Distance','Est. Time']),...rows.flatMap((cells,i)=>line(680-i*20,cells)),item('Final Destination: SYNTHETIC SITE',30,100)]});
test('continued tables preserve row order, literal road suffixes and source pages without geometry',()=>{
  const input=[page(3,[['0.40','IH35W Connector','Keep right toward IH35W South/Waco','487.30','00:00'],['','e','','','']]),page(4,[['44.40','IH35W s','Continue straight on IH-35 s [IH35W]','532.20','00:41']])];
  const before=JSON.stringify(input),r=extractRouteTables(input);assert.equal(r.rows.length,2);assert.equal(r.rows[0].road,'IH35W Connector e');assert.equal(r.rows[1].page,4);assert.equal(r.rows[1].row,2);assert.equal(r.rows[1].instruction,'Continue straight on IH-35 s [IH35W]');assert.deepEqual(r.issues,[]);assert.deepEqual(r.geometry,[]);assert.equal(r.approved,false);assert.equal(JSON.stringify(input),before);
});
test('wrapped lane and ramp wording is retained rather than replaced by main-road directions',()=>{
  const r=extractRouteTables([page(1,[['< 0.1','SS192 Ramp e','Continue straight on SS192 e','54.90','00:00'],['0.30','US82 se','Merge onto US281 s [HENRY S GRACE','358.60','00:00'],['','','FREEWAY]','','']])]);
  assert.equal(r.rows[0].miles,'< 0.1');assert.match(r.rows[1].instruction,/HENRY S GRACE FREEWAY/);assert.match(printedRowSpeech(r,0),/less than 0.1/);assert.match(printedRowSpeech(r,0),/PDF page 1/);assert.match(printedRowSpeech(r,0),/SS192 Ramp e/);
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
