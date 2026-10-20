import test from'node:test';
import assert from'node:assert/strict';
import{blankPermit,blankTrip}from'../src/assets/permits/core.mjs';
import{joinPdfPages,textItemsToLines,validatePermitPdf}from'../src/assets/permits/pdf-import.mjs';
import{applyImportedPermit,blankPermitForImport,choosePermitTarget,mergeTripProfileFromPacket,orderTripPermits,samePermitIdentity,summarizePdfBatch}from'../src/assets/permits/pdf-batch-core.mjs';

test('PDF policy accepts a bounded permit PDF and rejects unsafe inputs',()=>{
 assert.deepEqual(validatePermitPdf({name:'state-permit.pdf',type:'application/pdf',size:4096}),{name:'state-permit.pdf',type:'application/pdf',size:4096});
 assert.equal(validatePermitPdf({name:'state-permit.pdf',type:'',size:4096}).type,'application/pdf');
 assert.throws(()=>validatePermitPdf({name:'permit.html',type:'text/html',size:100}),/not a PDF/i);
 assert.throws(()=>validatePermitPdf({name:'empty.pdf',type:'application/pdf',size:0}),/empty/i);
 assert.throws(()=>validatePermitPdf({name:'large.pdf',type:'application/pdf',size:16*1024*1024}),/15 MB/i);
});

test('PDF text items are reconstructed into stable visual lines',()=>{
 const items=[
  {str:'Permit',transform:[1,0,0,10,10,700],width:35,height:10},
  {str:'Number:',transform:[1,0,0,10,49,700],width:42,height:10},
  {str:'ABC123',transform:[1,0,0,10,96,700],width:45,height:10},
  {str:'Origin:',transform:[1,0,0,10,10,680],width:35,height:10},
  {str:'US-491 CO Line',transform:[1,0,0,10,50,680],width:90,height:10}
 ];
 assert.deepEqual(textItemsToLines(items),['Permit Number: ABC123','Origin: US-491 CO Line']);
});

test('PDF page joining labels pages and fails safely at a text cap',()=>{
 assert.equal(joinPdfPages(['FIRST','SECOND']),`[PERMIT PDF PAGE 1]\nFIRST\n[PERMIT PDF PAGE 2]\nSECOND`);
 assert.match(joinPdfPages(['A'.repeat(60),'B'.repeat(60)],85),/TEXT TRUNCATED/);
});

test('batch import reuses exact and blank permits without merging unrelated states',()=>{
 const trip=blankTrip(),blank=blankPermit(),existing=blankPermit();existing.state='CO';existing.number='CO-1';trip.permits.push(blank,existing);const claimed=new Set();
 const exact=choosePermitTarget(trip,{state:'CO',number:'CO-1'},claimed);assert.equal(exact.id,existing.id);claimed.add(exact.id);
 const reused=choosePermitTarget(trip,{state:'UT',number:'UT-1'},claimed);assert.equal(reused.id,blank.id);claimed.add(reused.id);
 const created=choosePermitTarget(trip,{state:'NM',number:'NM-1'},claimed);assert.equal(trip.permits.includes(created),true);assert.notEqual(created.id,blank.id);
 assert.equal(blankPermitForImport(blank),true);assert.equal(samePermitIdentity(existing,{state:'co',number:'co-1'}),true);assert.equal(samePermitIdentity(existing,{state:'CO',number:'CO-2'}),false);
});

test('imported fields invalidate review and preserve original evidence arrays',()=>{
 const target=blankPermit();target.documents.push({id:'doc',name:'original.pdf',type:'application/pdf',size:100});target.qr.push('qr');target.review={key:'old'};target.geometryReview={key:'old'};
 applyImportedPermit(target,{state:'NM',number:'NM-1',validFrom:'2026-10-19',validTo:'2026-10-23',timeZone:'America/Denver',entry:{label:'US-491 CO Line',state:'CO',road:'US-491'},exit:{label:'I-40 TX Line',state:'TX',road:'I-40'},limits:{weightLb:86002},confidence:{state:{score:.9,source:'test'}}});
 assert.equal(target.state,'NM');assert.equal(target.number,'NM-1');assert.equal(target.limits.weightLb,86002);assert.equal(target.documents.length,1);assert.equal(target.qr.length,1);assert.equal(target.complete,false);assert.equal(target.review,null);assert.equal(target.geometryReview,null);
});

test('packet profile fills blanks but never overwrites conflicting saved values',()=>{
 const trip=blankTrip();trip.name='Untitled permitted load';trip.profile.weightLb='85000';
 const packet={trip:{name:'UT → CO permitted load',departure:'2026-10-19',profile:{heightFt:'13.5',widthFt:'8.5',lengthFt:'75',weightLb:'86002',axles:'6',axleWeights:'',hazmat:''}},conflicts:[]};
 const result=mergeTripProfileFromPacket(trip,packet);
 assert.equal(trip.profile.heightFt,'13.5');assert.equal(trip.profile.weightLb,'85000');assert.equal(trip.name,'UT → CO permitted load');assert.equal(trip.departure,'2026-10-19');assert.match(result.conflicts.join(' '),/weightLb/i);
});

test('batch summary retains parser conflicts and border-order issues',()=>{
 const trip=blankTrip(),ut=blankPermit(),co=blankPermit();ut.state='UT';ut.number='UT-1';ut.exit={label:'US-491 CO Border',state:'CO',road:'US-491'};co.state='CO';co.number='CO-1';co.entry={label:'US-491 UT Line',state:'UT',road:'US-491'};co.exit={label:'US-491 NM Line',state:'NM',road:'US-491'};trip.permits=[co,ut];
 const ordered=orderTripPermits(trip);assert.deepEqual(trip.permits.map(p=>p.state),['UT','CO']);
 const report=summarizePdfBatch([{name:'ut.pdf',permit:ut,qrCodes:['a'],warnings:['review restriction']}],{conflicts:['profile mismatch']},ordered,{conflicts:['saved mismatch']});
 assert.equal(report.fileCount,1);assert.equal(report.qrCount,1);assert.match(report.message,/UT/);assert.deepEqual(report.warnings.sort(),['profile mismatch','review restriction','saved mismatch'].sort());
});
