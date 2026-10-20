import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { blankTrip, blankPermit } from '../src/assets/permits/core.mjs';
import { saveTrip, listTrips, addDocument, addDocumentsAtomic, getDocument, verifyWallet, importPacket, deleteTrip } from '../src/assets/permits/storage.mjs';

test('wallet atomically saves originals, imports safely, strips review and deletes only its trip', async () => {
  const trip = blankTrip(), permit = blankPermit(); trip.permits.push(permit);
  trip.hazmat.enabled = true; trip.hazmat.materials = [{ unNumber: 'UN1203', shippingName: 'TEST', division: '3' }]; trip.hazmat.review = { key: 'must-not-transfer' };
  permit.hazmatRoute.notes = 'TEST authority review'; permit.hazmatRoute.review = { key: 'must-not-transfer' };
  const blob = new File(['%PDF-1.4 test-only'], 'original.pdf', { type: 'application/pdf' });
  await addDocument(trip, permit, blob); assert.equal((await getDocument(permit.documents[0].id)).blob.size, blob.size); await verifyWallet(trip);
  assert((await listTrips()).some(t => t.id === trip.id));
  await assert.rejects(() => addDocument(trip, permit, new File(['<script>'], 'unsafe.html', { type: 'text/html' })), /Choose/);
  const packet = { schema: 'dl-permit-packet/v1', trip, documents: [{ ...permit.documents[0], data: `data:application/pdf;base64,${Buffer.from('%PDF-1.4 test-only').toString('base64')}` }] };
  const imported = await importPacket(packet); assert.notEqual(imported.id, trip.id); assert.notEqual(imported.permits[0].documents[0].id, permit.documents[0].id); assert.equal(imported.permits[0].review, null); await verifyWallet(imported);
  assert.equal(imported.hazmat.materials[0].unNumber, 'UN1203'); assert.equal(imported.hazmat.review, null); assert.equal(imported.permits[0].hazmatRoute.notes, 'TEST authority review'); assert.equal(imported.permits[0].hazmatRoute.review, null);
  const unsafe = structuredClone(packet); unsafe.documents[0].data = 'data:text/html;base64,PHNjcmlwdD4='; await assert.rejects(() => importPacket(unsafe), /Unsupported document/);
  await deleteTrip(trip); assert.equal(await getDocument(permit.documents[0].id), undefined); await verifyWallet(imported);
  imported.permits[0].documents[0].id = 'missing'; await assert.rejects(() => verifyWallet(imported), /missing/);
  await saveTrip(imported); await deleteTrip(imported);
});

test('multi-PDF originals commit in one wallet transaction and reject the entire invalid batch',async()=>{
  const trip=blankTrip(),ut=blankPermit(),co=blankPermit();ut.state='UT';co.state='CO';trip.permits.push(ut,co);
  const utFile=new File(['%PDF-1.7 ut'],'ut.pdf',{type:'application/pdf'}),coFile=new File(['%PDF-1.7 co'],'co.pdf',{type:'application/pdf'});
  const records=await addDocumentsAtomic(trip,[{permit:ut,file:utFile},{permit:co,file:coFile}]);
  assert.equal(records.length,2);assert.equal(ut.documents.length,1);assert.equal(co.documents.length,1);await verifyWallet(trip);
  const before=ut.documents.length;
  await assert.rejects(()=>addDocumentsAtomic(trip,[{permit:ut,file:new File(['bad'],'bad.html',{type:'text/html'})},{permit:co,file:new File(['%PDF'],'later.pdf',{type:'application/pdf'})}]),/Choose/);
  assert.equal(ut.documents.length,before);assert.equal(co.documents.length,1);
  await deleteTrip(trip);
});
