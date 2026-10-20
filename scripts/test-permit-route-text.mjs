import test from'node:test';
import assert from'node:assert/strict';
import{parseIssuedRouteSteps}from'../src/assets/permits/route-text.mjs';
import{parsePermitPdfText}from'../src/assets/permits/import.mjs';
import{
 utahPermitText,coloradoPermitText,newMexicoPermitText,texasPermitText
}from'./fixtures/permit-packet-unit-179.mjs';

function draft(text){const permit=parsePermitPdfText(text);return{permit,draft:parseIssuedRouteSteps(permit.routeText,permit.state)};}

test('Utah freeform permit routing becomes ordered draft segments without geometry',()=>{
 const{permit,draft:result}=draft(utahPermitText);
 assert.equal(permit.state,'UT');
 assert.ok(result.steps.length>=10);
 assert.match(result.steps[0].text,/Issued route segment: E GRAND AVE/i);
 assert.match(result.steps.at(-1).text,/US-491/i);
 assert.equal(result.geometryCreated,false);
 assert.equal(result.steps.every(step=>Array.isArray(step.points)&&step.points.length===0),true);
 assert.match(result.warnings.join(' '),/No GPS geometry or detour was created/i);
});

test('Colorado, New Mexico and Texas route tables retain issued instructions and source lines',()=>{
 const co=draft(coloradoPermitText).draft,nm=draft(newMexicoPermitText).draft,tx=draft(texasPermitText).draft;
 assert.equal(co.steps.length,1);
 assert.equal(co.steps[0].road,'US-491');
 assert.match(co.steps[0].text,/Arrive at destination/i);
 assert.ok(nm.steps.length>=8);
 assert.ok(nm.steps.some(step=>/US-64 TRUCK BYPASS/i.test(step.text)));
 assert.ok(nm.steps.some(step=>step.road==='I-40'));
 assert.ok(tx.steps.length>=15);
 assert.ok(tx.steps.some(step=>/Exit 62A/i.test(step.text)));
 assert.ok(tx.steps.some(step=>step.road==='I-20'));
 for(const result of[co,nm,tx])for(const step of result.steps){
  assert.ok(Number.isInteger(step.routeLine)&&step.routeLine>=1&&step.routeLine<=result.sourceLineCount);
  assert.deepEqual(step.points,[]);
  assert.ok(step.source.original);
 }
});

test('route parser does not invent a connector, detour or geometry between permit lines',()=>{
 const tx=draft(texasPermitText).draft;
 assert.equal(tx.geometryCreated,false);
 assert.equal(tx.steps.some(step=>/recalculat|detour|connector to route/i.test(step.text)),false);
 assert.equal(tx.steps.every(step=>step.source.kind==='permit-table-row'),true);
 const originals=tx.steps.map(step=>step.source.original).join('\n');
 assert.match(originals,/IH0040|IH40/i);
 assert.match(originals,/IH20 e Arrive at destination/i);
});

test('unstructured route evidence remains a manual-review warning rather than false guidance',()=>{
 const result=parseIssuedRouteSteps('Follow special local instructions attached to the permit.','TX');
 assert.deepEqual(result.steps,[]);
 assert.equal(result.geometryCreated,false);
 assert.match(result.warnings.join(' '),/No structured maneuvers/i);
});
