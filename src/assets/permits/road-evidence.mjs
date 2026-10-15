// Read-only road inventory evidence. Never returns approved geometry or GPS cues.
import { meters, pointOK } from './core.mjs';
import { readMovements } from './road-movement.mjs';
const text=(value,max=1000)=>typeof value==='string'&&value.length<=max;
const norm=value=>String(value).trim().replace(/\s+/g,' ');
export function rowIdentity(review,index) {
  const r=review?.rows?.[index];
  return r?JSON.stringify([review.state,index+1,r.page,norm(r.road),norm(r.instruction),norm(r.miles),norm(r.cumulative)]):'';
}
export function readRoadEvidence(raw,review) {
  if(typeof raw!=='string'||raw.length>4000000)throw Error('Road comparison file exceeds 4 MB.');
  const p=JSON.parse(raw);
  if(!/^[a-f0-9]{64}$/.test(review?.pdfSha256))throw Error('The PDF version check is unavailable. Reload this page and reopen the original PDF before loading its comparison.');
  if(!/^[a-f0-9]{64}$/.test(p?.pdfSha256)||p.pdfSha256!==review?.pdfSha256)throw Error('This road comparison belongs to a different PDF version. Use a comparison prepared for this exact original.');
  if(p?.format!=='dl-road-evidence/v1'||p.state!==review?.state||p.rowCount!==review?.rows?.length||review.issues.length)throw Error('This comparison does not match the recognized PDF route table.');
  if(!Array.isArray(p.rows)||!p.rows.length||p.rows.length>1000)throw Error('Unsupported comparison rows.');
  let points=0;const seen=new Set();
  const rows=p.rows.map(r=>{
    if(!Number.isInteger(r.index)||r.index<0||r.index>=p.rowCount||seen.has(r.index)||r.identity!==rowIdentity(review,r.index))throw Error('A source row changed, is repeated, or belongs to a different PDF. Rebuild the comparison.');
    seen.add(r.index);
    if(!text(r.note,3000)||!text(r.source,500)||!text(r.retrievedAt,40)||!Number.isFinite(Date.parse(r.retrievedAt))||!text(r.dataDate,80))throw Error('Comparison source/date details are missing.');
    let url;try{url=new URL(r.source);}catch{throw Error('Invalid source link.');}
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Source must be a plain HTTPS reference, not a credential or private query.');
    if(!Array.isArray(r.features)||!r.features.length||r.features.length>80)throw Error('Unsupported road feature count.');
    const ids=new Set();
    const features=r.features.map(f=>{
      if(!text(f.id,80)||!f.id||ids.has(f.id)||!text(f.road,100)||!text(f.kind,80)||!text(f.direction,80)||!Array.isArray(f.paths)||!f.paths.length||f.paths.length>100)throw Error('Invalid or duplicate road feature.');
      ids.add(f.id);
      const paths=f.paths.map(path=>{
        if(!Array.isArray(path)||path.length<2||path.length>20000)throw Error('Unsupported road geometry.');
        points+=path.length;if(points>60000)throw Error('Comparison has too many map points.');
        if(path.some(p=>!pointOK(p)||Math.abs(p[0])>85))throw Error('Invalid map coordinate.');
        for(let i=1;i<path.length;i++)if(meters(path[i-1],path[i])>5000||Math.abs(path[i][1]-path[i-1][1])>180)throw Error('Sparse or discontinuous road geometry. No line drawn across the gap.');
        return path.map(p=>p.slice());
      });
      return {id:f.id,road:f.road,kind:f.kind,direction:f.direction,paths};
    });
    return {index:r.index,identity:r.identity,note:r.note,source:url.href,retrievedAt:r.retrievedAt,dataDate:r.dataDate,features,movements:readMovements(r.movements,features)};
  });
  return {format:p.format,pdfSha256:p.pdfSha256,state:p.state,rowCount:p.rowCount,rows,approved:false};
}

export function evidenceForRow(packet,review,index) {
  const row=packet?.rows?.find(r=>r.index===index);
  return row&&packet.pdfSha256===review?.pdfSha256&&row.identity===rowIdentity(review,index)?row:null;
}

// Planar point-to-segment distance for bounded junction inspection only.
// Proximity is not a road connection, level match or allowed direction.
export function nearestRoadPoint(point,paths) {
  if(!pointOK(point))return null;
  const k=Math.cos(point[0]*Math.PI/180),scale=111195;let best=null;
  for(const path of paths||[])for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];if(!pointOK(a)||!pointOK(b))continue;
    const ax=(a[1]-point[1])*k*scale,ay=(a[0]-point[0])*scale,bx=(b[1]-point[1])*k*scale,by=(b[0]-point[0])*scale;
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(ax+t*dx,ay+t*dy);
    if(!best||distance<best.meters)best={meters:distance,point:[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]};
  }return best;
}

export function connectionEvidence(from,branch,to) {
  if(!branch?.length)return null;
  const a=branch[0],b=branch.at(-1);
  const forward=[nearestRoadPoint(a,from),nearestRoadPoint(b,to)],reverse=[nearestRoadPoint(b,from),nearestRoadPoint(a,to)];
  if([...forward,...reverse].some(x=>!x))return null;
  const selected=forward[0].meters+forward[1].meters<=reverse[0].meters+reverse[1].meters?forward:reverse;
  return {fromGapMeters:selected[0].meters,toGapMeters:selected[1].meters,proximityOnly:true,travelDirectionVerified:false,approved:false};
}
