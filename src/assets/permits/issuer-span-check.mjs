import { meters } from './core.mjs';
import { sourcePiece } from './road-movement.mjs';

export const TXDOT_ROADWAYS='https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0';
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=25&&p[0]<=37&&p[1]>=-107&&p[1]<=-93;
export function nearestSpanPoint(p,path) {
  let best=null;const k=Math.cos(p[0]*Math.PI/180),scale=111195;
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],ax=(a[1]-p[1])*k*scale,ay=(a[0]-p[0])*scale,dx=(b[1]-a[1])*k*scale,dy=(b[0]-a[0])*scale;
    const fraction=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(ax+fraction*dx,ay+fraction*dy);
    if(!best||distance<best.distance)best={distance,segment:i-1,fraction};
  }
  return best;
}
function samples(path) {
  const out=[path[0]];
  for(let i=1;i<path.length;i++) {const a=path[i-1],b=path[i],count=Math.ceil(meters(a,b)/50);if(count>250)throw Error('Road comparison extent exceeded.');for(let j=1;j<=count;j++)out.push([a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count]);}
  if(out.length>4000)throw Error('Road comparison capacity exceeded.');return out;
}
// Tests geometric agreement only, never road permission, lane direction or GPS readiness.
export function spanAgreement(original,detail) {
  if(!Array.isArray(original)||original.length!==2||!original.every(point)||!Array.isArray(detail)||detail.length<3||detail.length>1000||!detail.every(point))throw Error('Invalid span comparison geometry.');
  const length=meters(...original);if(length<=5000||length>10000)throw Error('Unsupported sparse span extent.');
  let detailLength=0;for(let i=1;i<detail.length;i++){const d=meters(detail[i-1],detail[i]);if(d>1000)throw Error('Inventory detail is also sparse.');detailLength+=d;}
  const endpointOffsets=[meters(original[0],detail[0]),meters(original[1],detail.at(-1))];
  const fromDetail=samples(detail).map(p=>nearestSpanPoint(p,original)),fromOriginal=samples(original).map(p=>nearestSpanPoint(p,detail));
  const maxOffset=Math.max(...fromDetail.map(x=>x.distance),...fromOriginal.map(x=>x.distance));
  const backward=fromDetail.some((x,i)=>i&&x.fraction<fromDetail[i-1].fraction-2/length);
  return {agrees:endpointOffsets.every(d=>d<=15)&&maxOffset<=15&&Math.abs(detailLength-length)<=length*.01&&!backward,maxOffset,endpointOffsets,originalMeters:length,detailMeters:detailLength,detailPoints:detail.length};
}
export function sparseSpanQueries(path,rows=[]) {
  const result=[];let along=0;
  for(let i=1;i<path.length;i++) {
    const length=meters(path[i-1],path[i]),start=along/1609.344;along+=length;const end=along/1609.344;
    if(length<=5000||length>10000||rows.some(r=>r.cumulativeMiles>=start-1&&r.cumulativeMiles<=end+1))continue;
    const row=rows.find(r=>r.cumulativeMiles>end),road=row?.road.match(/^(US|SH|IH|FM|SS|SL)-?(\d{1,4})\b/);
    if(!road||/Ramp|Connector|FR\b/.test(row.road))continue;
    result.push({edgeIndex:i-1,original:[path[i-1],path[i]],family:road[1]+road[2].padStart(4,'0')});
  }
  return result.slice(0,2);
}
export function matchInventorySpan(span,data,retrievedAt) {
  if(data?.error||data?.exceededTransferLimit||data?.spatialReference?.wkid!==4326||!Array.isArray(data.features)||data.features.length>80)throw Error('Incomplete road inventory response.');
  const matches=[];let points=0;
  for(const f of data.features) {
    const a=f.attributes;if(!a||!Number.isInteger(a.OBJECTID)||!String(a.RTE_NM).startsWith(span.family+'-')||!['Single Roadbed','Left Roadbed','Right Roadbed'].includes(a.RDBD_TYPE)||!/^\d{2}-\d{2}-\d{4}$/.test(a.EXT_DATE)||!Array.isArray(f.geometry?.paths))continue;
    for(const raw of f.geometry.paths){if(!Array.isArray(raw)||(points+=raw.length)>40000)throw Error('Road inventory capacity exceeded.');const path=raw.map(p=>[p[1],p[0]]);if(path.length<2||!path.every(point))throw Error('Invalid inventory coordinates.');
      const start=nearestSpanPoint(span.original[0],path),end=nearestSpanPoint(span.original[1],path);
      if(start.distance>15||end.distance>15||start.segment+start.fraction===end.segment+end.fraction)continue;
      const detail=sourcePiece(path,start,end);let result;try{result=spanAgreement(span.original,detail);}catch{continue;}if(!result.agrees)continue;
      matches.push({edgeIndex:span.edgeIndex,original:span.original.map(p=>p.slice()),source:TXDOT_ROADWAYS,featureId:a.OBJECTID,road:a.RTE_NM,dataDate:a.EXT_DATE,retrievedAt,detail});
    }
  }
  // A second nearby roadbed is ambiguity, even when both look convincing.
  return matches.length===1?matches[0]:null;
}
export function readSpanEvidence(raw,path) {
  if(!Array.isArray(raw)||raw.length>2)throw Error('Invalid inventory span evidence.');const seen=new Set();
  return raw.map(e=>{
    if(!e||!Number.isInteger(e.edgeIndex)||e.edgeIndex<0||e.edgeIndex>=path.length-1||seen.has(e.edgeIndex)||e.source!==TXDOT_ROADWAYS||!Number.isInteger(e.featureId)||e.featureId<1||!/^((US|SH|IH|FM|SS|SL)\d{4})-[A-Z0-9]+$/.test(e.road)||!/^\d{2}-\d{2}-\d{4}$/.test(e.dataDate)||typeof e.retrievedAt!=='string'||!Number.isFinite(Date.parse(e.retrievedAt))||JSON.stringify(e.original)!==JSON.stringify([path[e.edgeIndex],path[e.edgeIndex+1]]))throw Error('Road evidence does not match the issuer span.');
    seen.add(e.edgeIndex);const comparison=spanAgreement(e.original,e.detail);if(!comparison.agrees)throw Error('Inventory shape does not agree with this issuer span.');
    return {edgeIndex:e.edgeIndex,original:e.original.map(p=>p.slice()),source:TXDOT_ROADWAYS,featureId:e.featureId,road:e.road,dataDate:e.dataDate,retrievedAt:e.retrievedAt,detail:e.detail.map(p=>p.slice())};
  });
}
