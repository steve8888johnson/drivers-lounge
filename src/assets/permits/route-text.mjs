const clean=value=>String(value??'').replace(/\r/g,'').replace(/[ \t]+/g,' ').trim();
const highwayPattern=/\b(?:I|IH|US|SR|SH|SL|SS|FM|NM|UT|CO|KS|IL|OH|PA|BI|BU)-?0*\d+[A-Z]*\b/i;
const actionPattern=/\b(?:head|turn|bear|continue|merge|take|keep|arrive|proceed|follow|enter|exit|left lane|right lane|go on|at exit)\b/i;
const tableRow=/^\s*(<?\s*\d+(?:\.\d+)?)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d{1,2}:\d{2})\s*$/;

function canonicalRoad(value){
 return clean(value).replace(/\s+([nsew]|ne|nw|se|sw)$/i,'').replace(/\bINTERSTATE\s*/i,'I-').replace(/\bIH0*(\d+)/i,'I-$1').replace(/\bI0*(\d+)/i,'I-$1').replace(/\bUS0*(\d+)/i,'US-$1').replace(/\s+/g,' ').trim();
}
function roadFromInstruction(instruction,fallback=''){
 const onto=String(instruction).match(/\b(?:onto|on)\s+((?:I|IH|US|SR|SH|SL|SS|FM|NM|UT|CO|KS|IL|OH|PA|BI|BU)[- ]?0*\d+[A-Z]*(?:\s+(?:RAMP|CONNECTOR|BYPASS|FRONTAGE ROAD|SFR|WFR|EFR|NFR))?)/i)?.[1];
 const highway=String(instruction).match(highwayPattern)?.[0];
 return canonicalRoad(onto||fallback||highway||'');
}
function parseTableLine(line,lineNumber){
 const match=clean(line).match(tableRow);if(!match)return null;
 const middle=match[2],action=middle.match(actionPattern);if(!action||action.index===undefined)return null;
 const roadRaw=middle.slice(0,action.index).trim(),instruction=middle.slice(action.index).trim();
 if(!roadRaw||/^(?:origin|destination)$/i.test(roadRaw)||/^(?:origin|destination)\s*:/i.test(instruction))return null;
 const distanceToken=match[1].replace(/\s/g,''),distanceMiles=distanceToken.startsWith('<')?.05:Number(distanceToken);
 return{
  text:instruction,
  road:roadFromInstruction(instruction,roadRaw),
  lane:/\b(?:left|right) lane\b/i.test(instruction)?instruction.match(/\b(?:left|right) lane[^,.;]*/i)?.[0]||'':'',
  routeLine:lineNumber,
  points:[],
  source:{kind:'permit-table-row',distanceMiles:Number.isFinite(distanceMiles)?distanceMiles:null,cumulativeMiles:Number(match[3]),estimatedTime:match[4],original:clean(line)}
 };
}
function parseNumberedLine(line,lineNumber){
 // A numbered instruction must have whitespace after the delimiter. This prevents
 // decimal mileage such as "0.00" or "69.40" from being misread as item 0 or 69.
 const match=clean(line).match(/^\d+[.)]\s+(.+)$/);if(!match)return null;
 const text=match[1].replace(/^\[(?:state|toll)\]\s*/i,'').trim();
 if(!text||/^border (?:start|end)/i.test(text))return null;
 return{text,road:roadFromInstruction(text),lane:'',routeLine:lineNumber,points:[],source:{kind:'permit-numbered-line',original:clean(line)}};
}
function freeformSegments(routeText,state){
 if(!['UT'].includes(String(state||'').toUpperCase()))return[];
 const segments=String(routeText||'').split(/[;\n]+/).map(clean).filter(Boolean).filter(value=>!/^(?:origin|destination|final destination)\s*:/i.test(value));
 return segments.map((segment,index)=>({
  text:`Issued route segment: ${segment}`,
  road:canonicalRoad(segment),lane:'',routeLine:Math.max(1,String(routeText||'').split('\n').findIndex(line=>line.includes(segment))+1),points:[],
  source:{kind:'permit-freeform-segment',sequence:index+1,original:segment}
 }));
}

export function parseIssuedRouteSteps(routeText,state=''){
 const lines=String(routeText||'').replace(/\r/g,'').split('\n'),steps=[];
 for(let index=0;index<lines.length;index++){
  const line=lines[index],step=parseTableLine(line,index+1)||parseNumberedLine(line,index+1);if(step)steps.push(step);
 }
 if(!steps.length)steps.push(...freeformSegments(routeText,state));
 const warnings=[];
 if(!steps.length)warnings.push('No structured maneuvers could be isolated from the issued route text. Keep the route text and review it manually.');
 else warnings.push(`Parsed ${steps.length} issued route line${steps.length===1?'':'s'} into a draft maneuver list. No GPS geometry or detour was created.`);
 if(steps.some(step=>!step.road))warnings.push('One or more route instructions have no confidently identified road name. Confirm them against the original permit.');
 return{
  schema:'dl-permit-route-text-draft/v1',
  state:String(state||'').toUpperCase(),
  steps,
  warnings,
  sourceLineCount:lines.filter(line=>clean(line)).length,
  parsedStepCount:steps.length,
  geometryCreated:false
 };
}
