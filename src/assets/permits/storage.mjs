import { sanitizePermit, blankTrip, clean } from './core.mjs';
import { sanitizeHazmat } from './hazmat.mjs';
const DB = 'dl-permit-wallet-v1';
const DOCUMENT_TYPES=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
const MAX_DOCUMENT_BYTES=15*1024*1024;
let connection;
export async function database() {
  if (connection) return connection;
  connection = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('trips', { keyPath: 'id' }); request.result.createObjectStore('documents', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  return connection;
}
async function transaction(stores, mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode); let result;
    tx.oncomplete = () => resolve(result?.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || Error('Wallet transaction cancelled.'));
    try { result = action(tx); } catch (e) { tx.abort(); reject(e); }
  });
}
function documentRecord(trip,permit,file){
  if(!trip?.id||!permit?.id)throw Error('Permit wallet target is missing.');
  if(!DOCUMENT_TYPES.has(file?.type))throw Error('Choose a JPG, PNG, WebP or PDF original.');
  if(!Number.isFinite(file.size)||file.size<=0)throw Error(`${file?.name||'Original'} is empty.`);
  if(file.size>MAX_DOCUMENT_BYTES)throw Error('Each original must be 15 MB or smaller.');
  const record={id:crypto.randomUUID(),tripId:trip.id,name:clean(file.name,200),type:file.type,size:file.size,blob:file};
  return{record,metadata:{id:record.id,name:record.name,type:record.type,size:record.size}};
}
export const listTrips = () => transaction(['trips'], 'readonly', tx => tx.objectStore('trips').getAll());
export const saveTrip = trip => transaction(['trips'], 'readwrite', tx => tx.objectStore('trips').put(trip));
export const getDocument = key => transaction(['documents'], 'readonly', tx => tx.objectStore('documents').get(key));
export async function addDocument(trip, permit, file) {
  const{record,metadata}=documentRecord(trip,permit,file);
  permit.documents.push(metadata); permit.review = null; permit.geometryReview = null;
  try { await transaction(['trips', 'documents'], 'readwrite', tx => { tx.objectStore('documents').put(record); tx.objectStore('trips').put(trip); }); }
  catch (e) { permit.documents.pop(); throw e; }
  return record;
}
export async function addDocumentsAtomic(trip,entries){
  if(!Array.isArray(entries)||!entries.length)return[];
  if(entries.length>60)throw Error('Import no more than 60 original files in one permit packet.');
  const permits=new Map((trip?.permits||[]).map(permit=>[permit.id,permit])),prepared=[];let total=0;
  for(const entry of entries){
    const permit=permits.get(entry?.permit?.id);if(!permit||permit!==entry.permit)throw Error('A permit original is not attached to this trip.');
    const item=documentRecord(trip,permit,entry.file);total+=item.record.size;if(total>45*1024*1024)throw Error('The selected original files exceed the 45 MB packet limit.');prepared.push({...item,permit});
  }
  const snapshots=new Map();for(const{permit}of prepared)if(!snapshots.has(permit.id))snapshots.set(permit.id,{documents:[...permit.documents],review:permit.review,geometryReview:permit.geometryReview});
  for(const{permit,metadata}of prepared){permit.documents.push(metadata);permit.review=null;permit.geometryReview=null;}
  try{
    await transaction(['trips','documents'],'readwrite',tx=>{const store=tx.objectStore('documents');for(const{record}of prepared)store.put(record);tx.objectStore('trips').put(trip);});
  }catch(error){for(const[permitId,snapshot]of snapshots){const permit=permits.get(permitId);permit.documents=snapshot.documents;permit.review=snapshot.review;permit.geometryReview=snapshot.geometryReview;}throw error;}
  return prepared.map(item=>item.record);
}
export async function deleteTrip(trip) {
  return transaction(['trips', 'documents'], 'readwrite', tx => {
    tx.objectStore('trips').delete(trip.id);
    const request = tx.objectStore('documents').openCursor();
    request.onsuccess = () => { const cursor = request.result; if (!cursor) return; if (cursor.value.tripId === trip.id) cursor.delete(); cursor.continue(); };
  });
}
export async function verifyWallet(trip) {
  for (const p of trip.permits) {
    if (!p.documents.length) throw Error(`${p.state || 'State permit'} has no original pages on this device. Add them before offline preparation or guidance.`);
    for (const doc of p.documents) if (!(await getDocument(doc.id))?.blob) throw Error(`Original ${doc.name} is missing on this device. Reimport before guidance.`);
  }
}
export async function exportPacket(trip) {
  const documents = [];
  for (const p of trip.permits) for (const doc of p.documents) {
    const record = await getDocument(doc.id); if (!record?.blob) throw Error(`Missing original: ${doc.name}`);
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(record.blob); });
    documents.push({ ...doc, data });
  }
  return { schema: 'dl-permit-packet/v1', trip, documents };
}
export async function importPacket(packet) {
  if (packet?.schema !== 'dl-permit-packet/v1' || !Array.isArray(packet.trip?.permits) || packet.trip.permits.length > 60 || !Array.isArray(packet.documents) || packet.documents.length > 200) throw Error('Unsupported permit-trip packet.');
  const trip = blankTrip(); trip.name = clean(packet.trip.name, 120); trip.departure = clean(packet.trip.departure, 10);
  trip.hazmat = sanitizeHazmat(packet.trip.hazmat);
  if (packet.trip.completedAt) trip.completedAt = clean(packet.trip.completedAt, 40);
  for (const key of Object.keys(trip.profile)) trip.profile[key] = clean(packet.trip.profile?.[key], 500);
  const docs = [], mappings = new Map(); let total = 0;
  for (const doc of packet.documents) {
    if (!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(doc.data || '')) throw Error('Unsupported document in trip packet.');
    const [prefix, data] = doc.data.split(','), binary = atob(data); total += binary.length;
    if (binary.length > MAX_DOCUMENT_BYTES || total > 45 * 1024 * 1024) throw Error('Trip documents exceed the import size limit.');
    const type = prefix.slice(5).split(';')[0], blob = new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))], { type });
    const metadata = { id: crypto.randomUUID(), name: clean(doc.name, 200), type, size: blob.size };
    mappings.set(doc.id, metadata); docs.push({ ...metadata, tripId: trip.id, blob });
  }
  trip.permits = packet.trip.permits.map(value => { const permit = sanitizePermit(value); permit.documents = (value.documents || []).map(doc => { if (!mappings.has(doc.id)) throw Error('Original permit missing from packet.'); return mappings.get(doc.id); }); return permit; });
  await transaction(['trips', 'documents'], 'readwrite', tx => { docs.forEach(doc => tx.objectStore('documents').put(doc)); tx.objectStore('trips').put(trip); });
  return trip;
}
