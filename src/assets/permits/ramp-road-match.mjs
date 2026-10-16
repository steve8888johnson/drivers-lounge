import { issuerRampPair } from './issuer-rehearsal.mjs';
import { nearestSpanPoint } from './issuer-span-check.mjs';
import { joinedRampComparisons } from './ramp-comparison.mjs';

// Only unqualified main-road wording is supported here. Never discard a branch,
// frontage-road, business-route or lane suffix to make a nearby line match.
export function permitRampRoads(view) {
  const pair=issuerRampPair(view);if(!pair)return null;
  const parse=value=>{
    const m=String(value||'').match(/^(US|SH|IH|FM|SS|SL)-?([1-9]\d{0,3}) (n|ne|e|se|s|sw|w|nw)$/);
    return m?{prefix:m[1],number:Number(m[2]),direction:m[3],label:value}:null;
  };
  const approach=parse(view.rows[pair.entry].road),merge=parse(view.rows[pair.merge].instruction.replace(/^Merge onto /,''));
  return approach&&merge?{approach,merge,pair}:null;
}

const same=(a,b)=>a?.prefix===b?.prefix&&a?.number===b?.number;
const main=f=>['Single Roadbed','Left Roadbed','Right Roadbed'].includes(f.kind);

export function rampRoadContacts(chain,context,view) {
  const roads=permitRampRoads(view);
  const base={available:false,proximityOnly:true,approved:false,travelDirectionVerified:false,approach:[],merge:[]};
  if(!roads)return {...base,message:'The approach or merge wording includes an unsupported road qualification. Inspect the original; no road-name simplification was used.'};
  if(!chain?.path?.length||!context?.features?.length||!Array.isArray(chain.recordIds)||chain.recordIds.length!==2)return {...base,message:'Select a joined ramp comparison to inspect its approach and merge.'};
  const source=chain.recordIds.map(id=>context.features.find(f=>f.id===id));
  if(source.some(f=>!f)||source.some(f=>f.date!==source[0].date)||source.some(f=>!same(f,roads.merge)||f.suffix!=='_'))return {...base,message:'The selected ramp records do not match this issued road pair or have unknown road qualifications.'};
  if(!joinedRampComparisons(source[0],context,view).some(c=>c.id===chain.id&&JSON.stringify(c.path)===JSON.stringify(chain.path)))return {...base,message:'The selected candidate no longer matches the original road records.'};
  const queried=[context.query,context.query?.approach].filter(Boolean);
  if(!queried.some(q=>same(q,roads.approach))||!queried.some(q=>same(q,roads.merge)))return {...base,message:'The approach road was not included in this lookup. Compare nearby official roads again.'};
  const ends=[chain.path[0],chain.path.at(-1)],b=context.query.bounds;
  if(ends.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[1]<=b[0]||p[1]>=b[2]||p[0]<=b[1]||p[0]>=b[3]))return {...base,message:'A candidate endpoint lies outside the inspected area. Its road contact is unresolved.'};
  const contacts=(point,road)=>context.features.filter(f=>!chain.recordIds.includes(f.id)&&same(f,road)&&f.suffix==='_'&&main(f)&&f.date===source[0].date).flatMap(f=>f.paths.flatMap((path,pathIndex)=>{
    const distance=nearestSpanPoint(point,path).distance;
    return distance<=1?[{id:f.id,pathIndex,road:f.road,kind:f.kind,distance}]:[];
  }));
  const approach=contacts(ends[0],roads.approach),merge=contacts(ends[1],roads.merge);
  const unique=approach.length===1&&merge.length===1;
  return {...base,available:true,roads,approach,merge,uniqueContacts:unique,message:unique?'Both candidate ends are within 1 m of the named road lines. This is a drawing comparison; road level, allowed direction and exact turn positions are unverified.':approach.length>1||merge.length>1?'Multiple road lines meet a candidate end. The roadbed choice remains unresolved.':'A candidate end has no matching main-road line within 1 m. Missing, qualified or differently dated records cannot confirm the movement.'};
}
