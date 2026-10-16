// Parked topology inspection only. Exact shared vertices do not establish road
// level, allowed traffic direction, a permitted movement or GPS cue positions.
import { meters } from './core.mjs';
import { compassOrder } from './road-movement.mjs';
import { issuerRampPair } from './issuer-rehearsal.mjs';
const directions={n:'north',ne:'northeast',e:'east',se:'southeast',s:'south',sw:'southwest',w:'west',nw:'northwest'};
const key=p=>p.join(',');
const connector=f=>/^(?:Grade Separated Connector|Connector|Ramp)$/.test(f?.kind)&&f.paths?.length===1&&f.paths[0].length>=2&&f.paths[0].length<=1000;
export function joinedRampComparisons(first,context,view) {
  const pair=issuerRampPair(view),bounds=context?.query?.bounds;
  if(!pair||!Array.isArray(bounds)||bounds.length!==4||!context.features?.includes(first)||!connector(first))return [];
  const inside=p=>p[1]>bounds[0]&&p[1]<bounds[2]&&p[0]>bounds[1]&&p[0]<bounds[3];
  const wanted=directions[view.rows[pair.entry].instruction.split(' ').at(-1)],a=first.paths[0],ak=a.map(key);
  if(new Set(ak).size!==a.length)return [];
  const results=[];
  for(const second of context.features){
    if(second===first||!connector(second)||first.date!==second.date)continue;
    const b=second.paths[0],bk=b.map(key);if(new Set(bk).size!==b.length)continue;
    const aset=new Set(ak),shared=bk.map((k,i)=>aset.has(k)?i:-1).filter(i=>i>=0);
    // No near-vertex snapping, overlapping/retraced records or ambiguous joins.
    if(shared.length!==1)continue;
    const join=shared[0],at=ak.indexOf(bk[join]);if(at!==0&&at!==a.length-1)continue;
    const start=at===0?a.length-1:0,initial=at===0?a.slice().reverse():a;
    for(const end of [0,b.length-1]){
      if(end===join)continue;
      const continuation=end===0?b.slice(0,join+1).reverse():b.slice(join);
      const path=[...initial,...continuation.slice(1)].map(p=>p.slice());
      if(!inside(path[0])||!inside(path.at(-1))||compassOrder(path)!==wanted)continue;
      const lengths=path.slice(1).map((p,i)=>meters(path[i],p)),lengthMeters=lengths.reduce((n,v)=>n+v,0);
      if(lengths.some(n=>n<=0||n>1000)||lengthMeters<5||lengthMeters>1500)continue;
      results.push({id:`${first.id}:${start}:${second.id}:${join}:${end}`,recordIds:[first.id,second.id],path,lengthMeters,drawnDirection:wanted,approved:false,travelDirectionVerified:false});
      if(results.length>12)return [];
    }
  }
  return results;
}
