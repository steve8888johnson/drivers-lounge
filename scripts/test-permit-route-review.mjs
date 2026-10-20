import test from'node:test';
import assert from'node:assert/strict';
import{parsePermitPdfText}from'../src/assets/permits/import.mjs';
import{parseIssuedRouteSteps}from'../src/assets/permits/route-text.mjs';
import{buildIssuedRouteReview}from'../src/assets/permits/route-review.mjs';
import{exampleTrip}from'../src/assets/permits/examples.mjs';
import{texasPermitText}from'./fixtures/permit-packet-unit-179.mjs';

test('PDF-extracted route lines are visible for parked review but cannot imply guidance readiness',()=>{
 const permit=parsePermitPdfText(texasPermitText),draft=parseIssuedRouteSteps(permit.routeText,permit.state);permit.steps=draft.steps;
 const review=buildIssuedRouteReview(permit);
 assert.equal(review.status,'draft');assert.equal(review.guidanceReady,false);
 assert.ok(review.counts.total>=15);assert.equal(review.counts.withGeometry,0);assert.equal(review.counts.withoutGeometry,review.counts.total);
 assert.ok(review.issues.some(issue=>/Original permit pages/i.test(issue)));
 assert.ok(review.issues.some(issue=>/no reviewed GPS geometry/i.test(issue)));
 assert.ok(review.lines.some(line=>/Exit 62A/i.test(line.instruction)));
 assert.ok(review.lines.some(line=>line.road==='I-20'));
});

test('review model exposes source mileage and permit-line evidence without modifying instructions',()=>{
 const permit=parsePermitPdfText(texasPermitText),draft=parseIssuedRouteSteps(permit.routeText,permit.state);permit.steps=draft.steps;
 const review=buildIssuedRouteReview(permit),exit=review.lines.find(line=>/Exit 62A/i.test(line.instruction));
 assert.equal(exit.distanceMiles,61.5);assert.equal(exit.cumulativeMiles,61.7);assert.equal(exit.estimatedTime,'00:56');
 assert.ok(exit.sourceLine>=1);assert.equal(exit.sourceKind,'permit-table-row');
 assert.equal(exit.hasGeometry,false);assert.equal(exit.pointCount,0);
});

test('preserved Illinois example text produces parked-review lines but never approved guidance',()=>{
 const illinois=exampleTrip().permits.find(permit=>permit.state==='IL'),review=buildIssuedRouteReview(illinois);
 assert.ok(review.counts.total>=4);
 assert.equal(review.evidence.derivedFromText,true);
 assert.equal(review.guidanceReady,false);
 assert.equal(review.counts.withGeometry,0);
 assert.ok(review.lines.some(line=>/fork keep left/i.test(line.instruction)));
 assert.ok(review.lines.some(line=>/exit 5 keep right/i.test(line.instruction)));
 assert.ok(review.issues.some(issue=>/derived for parked review/i.test(issue)));
});

test('cropped Ohio photo evidence remains visibly missing rather than inventing route instructions',()=>{
 const ohio=exampleTrip().permits.find(permit=>permit.state==='OH'),review=buildIssuedRouteReview(ohio);
 assert.equal(review.guidanceReady,false);
 assert.equal(review.counts.withGeometry,0);
 assert.ok(review.issues.some(issue=>/No structured issued-route lines/i.test(issue)));
});

test('guidance-ready review requires originals, permit confirmation and geometry on every line',()=>{
 const permit=parsePermitPdfText(texasPermitText),draft=parseIssuedRouteSteps(permit.routeText,permit.state);permit.steps=draft.steps.map((step,index)=>({...step,points:[[31+index/100,-101-index/100],[31.001+index/100,-101.001-index/100]]}));
 permit.documents=[{id:'doc-1',name:'original.pdf',type:'application/pdf',size:1000}];permit.review={hash:'permit-hash',at:'2026-10-19T12:00:00Z'};permit.geometryReview={hash:'geometry-hash',at:'2026-10-19T12:05:00Z'};
 const review=buildIssuedRouteReview(permit);
 assert.equal(review.guidanceReady,true);assert.equal(review.status,'ready');assert.deepEqual(review.issues,[]);
 assert.equal(review.counts.withGeometry,review.counts.total);assert.equal(review.counts.withoutGeometry,0);
});

test('one missing road name or geometry line keeps the review locked',()=>{
 const permit=parsePermitPdfText(texasPermitText),draft=parseIssuedRouteSteps(permit.routeText,permit.state);permit.steps=draft.steps.map((step,index)=>({...step,points:[[31+index/100,-101-index/100],[31.001+index/100,-101.001-index/100]]}));
 permit.steps[1].road='';permit.steps[2].points=[];permit.documents=[{id:'doc-1',name:'original.pdf',type:'application/pdf',size:1000}];permit.review={hash:'permit-hash',at:'2026-10-19T12:00:00Z'};permit.geometryReview={hash:'geometry-hash',at:'2026-10-19T12:05:00Z'};
 const review=buildIssuedRouteReview(permit);
 assert.equal(review.guidanceReady,false);assert.equal(review.counts.missingRoad,1);assert.equal(review.counts.withoutGeometry,1);
 assert.ok(review.issues.some(issue=>/no identified road name/i.test(issue)));
});
