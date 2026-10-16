import {blankTrip, sanitizePermit, clean} from './core.mjs';
import {sanitizeHazmat} from './hazmat.mjs';
import {planningPlaces} from './preparation.mjs';
import {cleanPDFProgress} from './pdf-scan.mjs';

export const CLOUD_LIMITS = Object.freeze({file:15*1024*1024, trip:45*1024*1024, files:200, snapshot:4*1024*1024, trips:20});
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const types = {'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
export const digest = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
export function privatePath(owner,tripId,hash,type) {
  if(!uuid(owner)||!uuid(tripId)||! /^[a-f0-9]{64}$/.test(hash)||!types[type]) throw Error('Invalid private permit file reference.');
  return `${owner}/${tripId}/${hash}.${types[type]}`;
}
export function cleanCloudTrip(value) {
  if(value?.schema!=='dl-permit-trip/v1'||!uuid(value.id)||!Array.isArray(value.permits)||value.permits.length>60)throw Error('Invalid account trip.');
  const trip=blankTrip();trip.id=value.id;trip.name=clean(value.name,120);trip.departure=clean(value.departure,10);trip.planning=planningPlaces(value.planning);
  if(value.completedAt)trip.completedAt=clean(value.completedAt,40);
  trip.revision=Number.isSafeInteger(value.revision)&&value.revision>0?value.revision:1;
  for(const key of Object.keys(trip.profile))trip.profile[key]=clean(value.profile?.[key],500);
  trip.hazmat=sanitizeHazmat(value.hazmat);
  const permitIds=new Set(),docIds=new Set();let bytes=0;
  trip.permits=value.permits.map(raw=>{
    if(!uuid(raw.id)||permitIds.has(raw.id)||!Array.isArray(raw.documents))throw Error('Invalid state permit identity.');
    permitIds.add(raw.id);const p=sanitizePermit(raw);p.id=raw.id;
    p.documents=raw.documents.map(d=>{
      if(!uuid(d.id)||docIds.has(d.id)||!types[d.type]||!Number.isSafeInteger(d.size)||d.size<=0||d.size>CLOUD_LIMITS.file)throw Error('Invalid original permit file.');
      docIds.add(d.id);bytes+=d.size;
      const pdfScan=d.type==='application/pdf'?cleanPDFProgress(d.pdfScan):null;
      return {id:d.id,name:clean(d.name,200),type:d.type,size:d.size,...(d.scanSummary?{scanSummary:clean(d.scanSummary,500)}:{}),...(pdfScan?{pdfScan}:{})};
    });
    // Account transfer is never a new load/route approval or crew invitation.
    p.review=null;p.geometryReview=null;return p;
  });
  if(docIds.size>CLOUD_LIMITS.files||bytes>CLOUD_LIMITS.trip)throw Error('Account sync supports up to 200 originals totaling 45 MB per trip. Keep the originals on this device.');
  if(new TextEncoder().encode(JSON.stringify(trip)).length>CLOUD_LIMITS.snapshot)throw Error('This route is too large for account sync. Keep an exported backup.');
  return trip;
}
export async function prepareCloudTrip(value,getDocument,guard=()=>{}) {
  const snapshot=cleanCloudTrip(value),files=[];
  for(const p of snapshot.permits)for(const d of p.documents){
    guard();const original=await getDocument(d.id);guard();
    if(!original?.blob||original.blob.size!==d.size||original.blob.type!==d.type)throw Error(`Original ${d.name} is missing or changed on this device. Nothing was published.`);
    const sha256=await digest(original.blob);guard();files.push({...d,sha256,blob:original.blob});
  }
  return {snapshot,files};
}
export function validateCloudRow(row,owner) {
  if(!row||row.owner_id!==owner||!uuid(row.id)||!uuid(row.version)||row.schema_version!==1||row.archived||!row.snapshot||!Array.isArray(row.manifest))throw Error('This account trip is unavailable or incomplete.');
  const snapshot=cleanCloudTrip(row.snapshot),documents=snapshot.permits.flatMap(p=>p.documents),seen=new Set();
  if(row.manifest.length!==documents.length)throw Error('The account trip is missing an original file reference.');
  const manifest=row.manifest.map(m=>{
    const d=documents.find(d=>d.id===m.id);
    if(!d||seen.has(m.id)||d.type!==m.type||d.size!==m.size||d.name!==m.name||m.path!==privatePath(owner,row.id,m.sha256,m.type))throw Error('Invalid account document manifest.');
    seen.add(m.id);return {...d,path:m.path,sha256:m.sha256};
  });
  return {snapshot,manifest};
}
