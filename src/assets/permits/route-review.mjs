import{parseIssuedRouteSteps}from'./route-text.mjs';

const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:null};

function safeLine(step,index){
 const points=Array.isArray(step?.points)?step.points.filter(point=>Array.isArray(point)&&point.length>=2&&Number.isFinite(Number(point[0]))&&Number.isFinite(Number(point[1]))):[];
 return{
  index:index+1,
  sourceLine:Math.max(0,Math.trunc(finite(step?.routeLine)||0)),
  instruction:clean(step?.text)||'Instruction missing',
  road:clean(step?.road),
  lane:clean(step?.lane),
  pointCount:points.length,
  hasGeometry:points.length>=2,
  sourceKind:clean(step?.source?.kind),
  distanceMiles:finite(step?.source?.distanceMiles),
  cumulativeMiles:finite(step?.source?.cumulativeMiles),
  estimatedTime:clean(step?.source?.estimatedTime)
 };
}

export function buildIssuedRouteReview(permit={}){
 const storedSteps=Array.isArray(permit.steps)?permit.steps:[],textDraft=!storedSteps.length&&clean(permit.routeText)?parseIssuedRouteSteps(permit.routeText,permit.state):null;
 const sourceSteps=storedSteps.length?storedSteps:textDraft?.steps||[],derivedFromText=!storedSteps.length&&sourceSteps.length>0;
 const lines=sourceSteps.map(safeLine),withGeometry=lines.filter(line=>line.hasGeometry).length;
 const missingRoad=lines.filter(line=>!line.road).length,missingSourceLine=lines.filter(line=>!line.sourceLine).length;
 const hasOriginal=Array.isArray(permit.documents)&&permit.documents.some(document=>['application/pdf','image/jpeg','image/png','image/webp'].includes(document?.type));
 const permitReviewed=Boolean(permit.review?.hash&&permit.review?.at),geometryReviewed=Boolean(permit.geometryReview?.hash&&permit.geometryReview?.at);
 const routeConfidence=Number(permit.confidence?.routeText?.score||0),stepConfidence=Number(permit.confidence?.routeSteps?.score||0);
 const issues=[];
 if(!hasOriginal)issues.push('Original permit pages are not stored in this device wallet.');
 if(!lines.length)issues.push('No structured issued-route lines are available.');
 if(derivedFromText)issues.push('Route lines shown here were derived for parked review from preserved permit text and have not been saved as reviewed maneuvers.');
 if(missingRoad)issues.push(`${missingRoad} route line${missingRoad===1?' has':'s have'} no identified road name.`);
 if(missingSourceLine)issues.push(`${missingSourceLine} route line${missingSourceLine===1?' is':'s are'} not tied to an original source line.`);
 if(lines.length&&withGeometry!==lines.length)issues.push(`${lines.length-withGeometry} of ${lines.length} route lines have no reviewed GPS geometry.`);
 if(!permitReviewed)issues.push('Permit fields and route text have not been confirmed against the original.');
 if(!geometryReviewed)issues.push('Route geometry has not been independently confirmed.');
 const guidanceReady=Boolean(!derivedFromText&&lines.length&&withGeometry===lines.length&&hasOriginal&&permitReviewed&&geometryReviewed&&!missingRoad&&!missingSourceLine);
 return{
  state:clean(permit.state).toUpperCase(),
  number:clean(permit.number),
  entry:clean(permit.entry?.label),
  exit:clean(permit.exit?.label),
  restrictions:clean(permit.restrictions),
  lines,
  counts:{total:lines.length,withGeometry,withoutGeometry:lines.length-withGeometry,missingRoad,missingSourceLine},
  evidence:{hasOriginal,permitReviewed,geometryReviewed,routeConfidence,stepConfidence,derivedFromText},
  guidanceReady,
  status:guidanceReady?'ready':lines.length?'draft':'missing',
  issues
 };
}
