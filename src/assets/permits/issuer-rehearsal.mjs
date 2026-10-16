import { sanitizeIssuerMap, issuerRowText } from './issuer-map.mjs';
import { meters } from './core.mjs';
import { pronouncePrintedRoad } from './pdf-route-review.mjs';

// Parked inspection only. Rounded cumulative miles can locate a broad area,
// never a maneuver point. No interpolation, snapping, GPS trigger or approval.
export function issuerRehearsal(permit, index = 0) {
  let source;
  try { source = sanitizeIssuerMap(permit?.issuerMap,permit); } catch { return {available:false}; }
  const rows = source.rows || source.routeText.split('\n').filter(s=>s.trim()).map(instruction=>({instruction}));
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) return {available:false};
  const row=rows[index], result={available:true,index,total:rows.length,row,rows,source:source.rows?issuerRowText(row):row.instruction,area:[],sparseArea:[],estimated:false};
  if (!source.rows) return {...result,reason:'This saved map has text only. Load its Texas QR map again to add the issuer’s cumulative mileage.'};
  const points=source.paths[0], edges=[];let total=0;
  for(let i=1;i<points.length;i++) { const length=meters(points[i-1],points[i])/1609.344; edges.push({a:points[i-1],b:points[i],from:total,to:total+length,sparse:length>5000/1609.344});total+=length; }
  const issuedTotal=rows.at(-1).cumulativeMiles, difference=Math.abs(total-issuedTotal);
  result.mapMiles=total;result.issuedMiles=issuedTotal;result.differenceMiles=difference;
  // This is a display sanity limit, NOT a demonstrated positional accuracy.
  // Do not stretch the line to make a mismatched route appear to agree.
  if (total <= 0 || issuedTotal <= 0 || difference > Math.min(1,Math.max(.2,issuedTotal*.005))) return {...result,reason:'Map length and issued mileage do not agree closely enough for an approximate area. Read the row with the full map.'};
  const target=row.cumulativeMiles;
  // One mile on either side is viewing context, not an error bound. Retain
  // original edges only, including visibly dashed sparse edges. No point pin.
  for(const edge of edges) if(edge.to>=target-1 && edge.from<=target+1 && edge.to>edge.from) (edge.sparse?result.sparseArea:result.area).push([edge.a,edge.b]);
  if (!result.area.length && !result.sparseArea.length) return {...result,reason:'No supplied map area corresponds to this mileage.'};
  return {...result,estimated:true,reason:'Blue highlights an approximate area from rounded issuer mileage. It is not a confirmed turn or ramp location; errors can vary along the route.'};
}

export function issuerRowSpeech(view,{candidateComparison=false,printedPage=null}={}) {
  if (!view?.available) return null;
  const row=view.row;
  return `Parked Texas permit review. Row ${view.index+1} of ${view.total}. ${Number.isInteger(printedPage)&&printedPage>=1&&printedPage<=40?`Matching printed text on PDF page ${printedPage}. `:''}${row.road?`Road column: ${pronouncePrintedRoad(row.road)}. `:''}Issued instruction: ${pronouncePrintedRoad(row.instruction)}. ${candidateComparison?'The displayed road shapes are candidates. Their endpoints are not verified turn locations.':view.estimated?'The highlighted map area is approximate.':'No turn position has been established.'} This is not live guidance.`;
}

// Pair only adjacent, literal entry/merge wording for the same road and direction.
// Text sequence is not evidence that either row has a known maneuver coordinate.
export function issuerRampPair(view) {
  if(!view?.available||!Array.isArray(view.rows))return null;
  for(const first of [view.index-1,view.index]) {
    const entry=view.rows[first],merge=view.rows[first+1];
    if(!entry||!merge)continue;
    const m=entry.instruction.match(/^Take ((?:US|SH|IH|FM|SS|SL)-?\d{1,4}) Ramp (n|ne|e|se|s|sw|w|nw)$/);
    if(!m||merge.road!==`${m[1]} Ramp ${m[2]}`||merge.instruction!==`Merge onto ${m[1]} ${m[2]}`)continue;
    if(!Number.isFinite(entry.cumulativeMiles)||!Number.isFinite(merge.cumulativeMiles)||merge.cumulativeMiles<entry.cumulativeMiles||merge.cumulativeMiles-entry.cumulativeMiles>2)continue;
    return {entry:first,merge:first+1};
  }
  return null;
}
