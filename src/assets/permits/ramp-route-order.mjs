import { meters } from './core.mjs';
import { sanitizeIssuerMap } from './issuer-map.mjs';
import { issuerRehearsal, issuerRampPair } from './issuer-rehearsal.mjs';
import { nearestSpanPoint } from './issuer-span-check.mjs';
import { rampRoadContacts } from './ramp-road-match.mjs';

// Compare traversal order only. Nearest positions on a drawing are not issued
// maneuver coordinates, and rounded mileage must never stretch either source.
export function rampRouteOrder(permit, index, chain, context) {
  const held={available:false,approved:false,guidanceAllowed:false};
  let source;
  try { source=sanitizeIssuerMap(permit?.issuerMap,permit); } catch { return {...held,message:'The issuer map no longer matches this permit.'}; }
  const view=issuerRehearsal(permit,index),pair=issuerRampPair(view);
  if(!pair||!view.estimated||!rampRoadContacts(chain,context,view).available)return {...held,message:'A source-bound ramp pair and candidate are needed for an order comparison.'};
  const path=source.paths[0],lengths=path.slice(1).map((p,i)=>meters(path[i],p)),along=[0];
  for(const length of lengths)along.push(along.at(-1)+length);
  function position(point) {
    const projections=[];
    for(let i=0;i<lengths.length;i++){
      if(lengths[i]===0)continue;
      const near=nearestSpanPoint(point,[path[i],path[i+1]]);
      projections.push({distance:near.distance,along:along[i]+near.fraction*lengths[i],sparse:lengths[i]>5000});
    }
    const distance=Math.min(...projections.map(p=>p.distance));
    // A one-metre near-tie is drawing ambiguity, not a statement of accuracy.
    const ties=projections.filter(p=>p.distance<=distance+1).sort((a,b)=>a.along-b.along);
    const groups=[];
    for(const p of ties){const last=groups.at(-1);if(!last||p.along-last[0].along>2)groups.push([p]);else last.push(p);}
    const best=projections.find(p=>p.distance===distance);
    return {distance,mapMiles:best.along/1609.344,minAlong:ties[0].along,maxAlong:ties.at(-1).along,occurrences:groups.length,sparse:ties.some(p=>p.sparse)};
  }
  const entry=position(chain.path[0]),merge=position(chain.path.at(-1));
  const ambiguous=entry.occurrences!==1||merge.occurrences!==1||entry.sparse||merge.sparse;
  const order=ambiguous?'ambiguous':merge.minAlong-entry.maxAlong>2?'forward':entry.minAlong-merge.maxAlong>2?'reversed':'overlap';
  const messages={forward:'Closest line positions run in the printed order. This does not locate either turn.',reversed:'The closest positions run backwards along the issuer line. This candidate does not establish the printed movement.',overlap:'The closest entry and merge positions overlap. Their order is unresolved.',ambiguous:'Repeated nearby route positions or a sparse issuer span make the order ambiguous.'};
  const candidateMeters=chain.path.slice(1).reduce((sum,p,i)=>sum+meters(chain.path[i],p),0);
  return {...held,available:true,order,message:messages[order],entry,merge,candidateMiles:candidateMeters/1609.344,issuerBetweenMiles:ambiguous?null:merge.mapMiles-entry.mapMiles,printed:{entryMiles:view.rows[pair.entry].cumulativeMiles,mergeMiles:view.rows[pair.merge].cumulativeMiles,rampMiles:view.rows[pair.merge].miles}};
}
