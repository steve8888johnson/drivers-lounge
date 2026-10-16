import { meters } from './core.mjs';
import { nearestSpanPoint, TXDOT_ROADWAYS } from './issuer-span-check.mjs';
import { issuerRehearsal, issuerRampPair } from './issuer-rehearsal.mjs';

export function junctionView(permit,index) {
  const view=issuerRehearsal(permit,index),pair=issuerRampPair(view);
  if(!pair)return view;
  const a=issuerRehearsal(permit,pair.entry),b=issuerRehearsal(permit,pair.merge);
  // Identical query for either row; only retain a comparison within this exact pair.
  return {...a,estimated:a.estimated&&b.estimated,area:[...a.area,...b.area],sparseArea:[...a.sparseArea,...b.sparseArea]};
}
export const junctionRequest=(permit,index)=>roadContextRequest(junctionView(permit,index));

export function roadEndpointContacts(feature,context) {
  if(!feature?.paths?.length||feature.paths.length!==1||!context?.features?.includes(feature))return [];
  const path=feature.paths[0];
  return [path[0],path.at(-1)].map((point,index)=>({point:point.slice(),index,contacts:context.features.filter(f=>f!==feature).flatMap(f=>{
    const distance=Math.min(...f.paths.map(p=>nearestSpanPoint(point,p).distance));
    return distance<=1?[{id:f.id,road:f.road,kind:f.kind,distance}]:[];
  })}));
}

export function roadContextRequest(view) {
  if(!view?.available||!view.estimated||view.sparseArea.length)throw Error('This row has no sufficiently detailed approximate map area.');
  const road=view.row.instruction.match(/\b(US|SH|IH|FM|SS|SL)-?(\d{1,4})\b/);
  if(!road)throw Error('No supported Texas road number in this instruction.');
  const points=view.area.flat(),lat=points.map(p=>p[0]),lon=points.map(p=>p[1]);
  return validateContextRequest({bounds:[Math.min(...lon)-.001,Math.min(...lat)-.001,Math.max(...lon)+.001,Math.max(...lat)+.001],prefix:road[1],number:Number(road[2])});
}
export function validateContextRequest(raw) {
  const b=raw?.bounds;
  if(!raw||Object.keys(raw).sort().join(',')!=='bounds,number,prefix'||!['US','SH','IH','FM','SS','SL'].includes(raw.prefix)||!Number.isInteger(raw.number)||raw.number<1||raw.number>9999||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]<-107||b[2]>-93||b[1]<25||b[3]>37||b[0]>=b[2]||b[1]>=b[3]||meters([b[1],b[0]],[b[3],b[2]])>6500)throw Error('Unsupported road comparison area.');
  return {bounds:b.slice(),prefix:raw.prefix,number:raw.number};
}
// Compare only original inventory edges intersecting the requested viewing box.
// Segments stay separate. No snapping, synthesized connectors or turn anchors.
export function readRoadContext(data,raw,retrievedAt=new Date().toISOString()) {
  const q=validateContextRequest(raw),b=q.bounds;
  if(data?.error||data?.exceededTransferLimit||data?.spatialReference?.wkid!==4326||!Array.isArray(data?.features)||data.features.length>80)throw Error('Incomplete road inventory; no comparison displayed.');
  const features=[];let count=0;const ids=new Set();
  for(const f of data.features){const a=f?.attributes;
    if(!a||!Number.isInteger(a.OBJECTID)||a.OBJECTID<1||ids.has(a.OBJECTID)||a.RTE_PRFX!==q.prefix||Number(a.RTE_NBR)!==q.number||typeof a.RTE_NM!=='string'||a.RTE_NM.length>40||typeof a.RDBD_TYPE!=='string'||a.RDBD_TYPE.length>60||!/^\d{2}-\d{2}-\d{4}$/.test(a.EXT_DATE)||!Array.isArray(f.geometry?.paths))throw Error('Unexpected road inventory record.');
    ids.add(a.OBJECTID);const paths=[];
    for(const path of f.geometry.paths){if(!Array.isArray(path)||(count+=path.length)>30000)throw Error('Road inventory capacity exceeded.');
      if(path.length<2||path.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)||p[0]<-107||p[0]>-93||p[1]<25||p[1]>37))throw Error('Invalid road inventory geometry.');
      let part=[];for(let i=1;i<path.length;i++){const u=path[i-1],v=path[i];const intersects=Math.max(u[0],v[0])>=b[0]&&Math.min(u[0],v[0])<=b[2]&&Math.max(u[1],v[1])>=b[1]&&Math.min(u[1],v[1])<=b[3];
        if(intersects&&meters([u[1],u[0]],[v[1],v[0]])>1000)throw Error('Inventory is too sparse in this area; no partial comparison displayed.');
        if(intersects){if(!part.length)part.push([u[1],u[0]]);part.push([v[1],v[0]]);}else if(part.length){paths.push(part);part=[];}}
      if(part.length)paths.push(part);
    }
    if(paths.length)features.push({id:a.OBJECTID,road:a.RTE_NM,kind:a.RDBD_TYPE,date:a.EXT_DATE,paths});
  }
  features.sort((a,b)=>Number(!/connector|ramp/i.test(a.kind))-Number(!/connector|ramp/i.test(b.kind))||a.id-b.id);
  return {source:TXDOT_ROADWAYS,retrievedAt,query:q,features};
}
export function compareRoadShape(feature,sourceEdges) {
  if(!feature?.paths?.length||!sourceEdges?.length)return null;
  let count=0,maxOffset=0,length=0;
  for(const path of feature.paths)for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],d=meters(a,b),n=Math.max(1,Math.ceil(d/20));length+=d;
    if(n>100||count+n>6000)throw Error('Comparison capacity exceeded.');
    for(let j=0;j<=n;j++){const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n];let nearest=Infinity;
      for(const edge of sourceEdges)nearest=Math.min(nearest,nearestSpanPoint(p,edge).distance);
      maxOffset=Math.max(maxOffset,nearest);count++;
    }
  }
  return {samples:count,maxOffset,lengthMeters:length,closeShape:maxOffset<=15};
}
export function sanitizeRoadContext(raw,query){
  if(raw?.source!==TXDOT_ROADWAYS||JSON.stringify(raw.query)!==JSON.stringify(query)||typeof raw.retrievedAt!=='string'||!Number.isFinite(Date.parse(raw.retrievedAt))||!Array.isArray(raw.features)||raw.features.length>80)throw Error('Road comparison does not match this viewing area.');
  return readRoadContext({spatialReference:{wkid:4326},features:raw.features.map(f=>({attributes:{OBJECTID:f.id,RTE_NM:f.road,RDBD_TYPE:f.kind,EXT_DATE:f.date,RTE_PRFX:query.prefix,RTE_NBR:String(query.number)},geometry:{paths:f.paths?.map(path=>path.map(p=>[p[1],p[0]]))}}))},query,raw.retrievedAt);
}
