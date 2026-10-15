// Parked comparison only. Ordered pieces are references into original inventory
// geometry, not a route solver, one-way evidence or a source of GPS instructions.
import { meters } from './core.mjs';

function position(path, ref) {
  if (!ref || !Number.isInteger(ref.segment) || ref.segment < 0 || ref.segment >= path.length - 1 || !Number.isFinite(ref.fraction) || ref.fraction < 0 || ref.fraction > 1) throw Error('Invalid movement position in source geometry.');
  const a=path[ref.segment],b=path[ref.segment+1];
  return {at:ref.segment+ref.fraction,point:[a[0]+(b[0]-a[0])*ref.fraction,a[1]+(b[1]-a[1])*ref.fraction]};
}

export function sourcePiece(path,start,end) {
  const a=position(path,start),b=position(path,end);
  if(a.at===b.at)throw Error('Movement has no extent.');
  const reversed=a.at>b.at,lo=reversed?b:a,hi=reversed?a:b;
  const piece=[lo.point];
  for(let i=Math.floor(lo.at)+1;i<hi.at;i++)piece.push(path[i].slice());
  piece.push(hi.point);
  return reversed?piece.reverse():piece;
}

export function compassOrder(path) {
  const a=path[0],b=path.at(-1);
  if(meters(a,b)<5)return 'loops back near its start';
  const angle=Math.atan2((b[1]-a[1])*Math.cos((a[0]+b[0])*Math.PI/360),b[0]-a[0])*180/Math.PI;
  return ['north','northeast','east','southeast','south','southwest','west','northwest'][Math.round((angle+360)/45)%8];
}

export function readMovements(raw,features) {
  if(raw===undefined)return [];
  if(!Array.isArray(raw)||raw.length>8)throw Error('Unsupported movement comparisons.');
  const ids=new Set();
  return raw.map(m=>{
    if(!m||typeof m.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(m.id)||ids.has(m.id)||typeof m.label!=='string'||!m.label||m.label.length>160||typeof m.note!=='string'||m.note.length>2000||!Array.isArray(m.parts)||!m.parts.length||m.parts.length>12)throw Error('Invalid movement comparison.');
    ids.add(m.id);const seen=new Set();let count=0;
    const parts=m.parts.map(p=>{
      const f=features.find(f=>f.id===p.featureId);
      if(!f||!Number.isInteger(p.pathIndex)||!f.paths[p.pathIndex]||seen.has(p.featureId))throw Error('Movement uses a missing or repeated source record.');
      seen.add(p.featureId);
      const path=sourcePiece(f.paths[p.pathIndex],p.start,p.end);count+=path.length;
      if(count>20000)throw Error('Movement has too many map points.');
      const lengthMeters=path.slice(1).reduce((n,point,i)=>n+meters(path[i],point),0);
      if(lengthMeters<1)throw Error('Movement piece is too short to compare.');
      return {featureId:f.id,road:f.road,path,lengthMeters,compass:compassOrder(path)};
    });
    const gaps=parts.slice(1).map((p,i)=>meters(parts[i].path.at(-1),p.path[0]));
    // Reject disconnected selections; never bridge gaps or reverse pieces silently.
    if(gaps.some(d=>d>10))throw Error('Movement pieces do not meet within the 10 m comparison tolerance. No connection inferred.');
    return {id:m.id,label:m.label,note:m.note,parts,gaps,lengthMeters:parts.reduce((n,p)=>n+p.lengthMeters,0),approved:false,travelDirectionVerified:false};
  });
}
