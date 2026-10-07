import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { blankTrip, blankPermit } from '../src/assets/permits/core.mjs';
import { saveTrip, listTrips, addDocument, getDocument, verifyWallet, importPacket, deleteTrip } from '../src/assets/permits/storage.mjs';

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
