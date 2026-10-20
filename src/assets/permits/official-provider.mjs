import{blankPermit,clean}from'./core.mjs';
import{inferBorderEdge,permitTimeZoneConfidence,permitTimeZoneForState}from'./state-meta.mjs';

const DATE_TOKEN=/(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const ACTION=/\b(?:head|turn|bear|continue|merge|take|keep|arrive|proceed|follow|enter|exit|left lane|right lane)\b/i;
const htmlEscape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function safeURL(raw){
 try{
  const url=new URL(raw);
  if(url.username||url.password||url.port||url.hash)return null;
  return url;
 }catch{return null;}
}
function exactParams(url,expected){
 const entries=[...url.searchParams.entries()];
 return entries.length===Object.keys(expected).length&&Object.entries(expected).every(([key,pattern])=>{
  const values=url.searchParams.getAll(key);return values.length===1&&pattern.test(values[0]);
 });
}

export function publicOfficialPermitReference(raw){
 const url=safeURL(raw);if(!url)return null;
 const host=url.hostname.toLowerCase();
 if(url.protocol==='https:'&&host==='coopr.codot.gov'&&url.pathname==='/Mobile/Lookup.aspx'&&exactParams(url,{PermitID:/^\d{1,20}$/})){
  const normalized=new URL('https://coopr.codot.gov/Mobile/Lookup.aspx');normalized.searchParams.set('PermitID',url.searchParams.get('PermitID'));
  return{url:normalized,format:'colorado-public-html',state:'CO'};
 }
 if(['http:','https:'].includes(url.protocol)&&host==='txpros.txdmv.gov'&&url.pathname==='/PermitDetails02.aspx'&&exactParams(url,{PermitID:/^\d{1,20}$/,QRUSER:/^1$/})){
  const normalized=new URL('https://txpros.txdmv.gov/PermitDetails02.aspx');normalized.searchParams.set('PermitID',url.searchParams.get('PermitID'));normalized.searchParams.set('QRUSER','1');
  return{url:normalized,format:'texas-public-html',state:'TX'};
 }
 return null;
}

function decodeEntities(value){
 return String(value||'')
  .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(Number.parseInt(hex,16)))
  .replace(/&#(\d+);/g,(_,decimal)=>String.fromCodePoint(Number(decimal)))
  .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/gi,entity=>({
   '&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"
  })[entity.toLowerCase()]||entity);
}
function textFromHTML(fragment){
 return decodeEntities(String(fragment||'')
  .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h\d)>/gi,'\n')
  .replace(/<script\b[\s\S]*?<\/script>/gi,'')
  .replace(/<style\b[\s\S]*?<\/style>/gi,'')
  .replace(/<[^>]+>/g,' '))
  .replace(/[ \t]+/g,' ')
  .replace(/\s*\n\s*/g,'\n')
  .trim();
}
function elementHTML(html,id){
 const escaped=htmlEscape(id),match=String(html||'').match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/\\1>`,'i'));
 return match?.[2]||'';
}
function textById(html,id){return textFromHTML(elementHTML(html,id));}
function rowsByTbody(html,id){
 const body=elementHTML(html,id);if(!body)return[];
 return[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>
  [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>textFromHTML(cell[1]))
 ).filter(cells=>cells.some(Boolean));
}
function dateOnly(value){
 const match=String(value||'').match(DATE_TOKEN);return match?`${match[3]}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}`:'';
}
function feet(value){
 const text=String(value||''),match=text.match(/(\d{1,3})\s*(?:ft\.?|['’])(?:\s*(\d{1,2})\s*(?:in\.?|["″]|''))?/i);
 if(!match)return 0;return Math.round((Number(match[1])+Number(match[2]||0)/12)*100)/100;
}
function integer(value){const match=String(value||'').replace(/,/g,'').match(/\b\d{1,9}\b/);return match?Number(match[0]):0;}
function routeEvidence(rows){
 const lines=[],steps=[];let origin='',destination='';
 rows.forEach((cells,index)=>{
  const normalized=[...cells];while(normalized.length<5)normalized.push('');
  const[miles,road,instruction,distance,time]=normalized.slice(0,5),instructionText=clean(instruction,1000),roadText=clean(road,200);
  const line=[miles,roadText,instructionText,distance,time].filter(value=>String(value||'').trim()).join(' ');if(line)lines.push(line);
  const originMatch=instructionText.match(/(?:Loaded Route )?Origin\s*:\s*(.+?)\s*\]?$/i);if(originMatch)origin=originMatch[1].trim();
  const destinationMatch=instructionText.match(/(?:Loaded Route )?Destination\s*:\s*(.+?)\s*\]?$/i);if(destinationMatch)destination=destinationMatch[1].trim();
  if(!roadText||!instructionText||!ACTION.test(instructionText)||originMatch||destinationMatch)return;
  steps.push({
   routeLine:index+1,text:instructionText,road:roadText,
   lane:instructionText.match(/\b(?:left|right) lane[^,.;]*/i)?.[0]||'',points:[],
   source:{kind:'official-public-permit-table',distanceMiles:String(miles).includes('<')?.05:Number(miles)||null,cumulativeMiles:Number(distance)||null,estimatedTime:clean(time,20),original:line}
  });
 });
 return{routeText:clean(lines.join('\n'),20000),steps,origin,destination};
}
function conditionsFrom(html,id){
 const rows=rowsByTbody(html,id),values=rows.map(cells=>clean(cells.join(' '),2000)).filter(Boolean);
 return clean(values.join('\n'),20000);
}
function axleCountFromHTML(html){
 const table=textFromHTML(elementHTML(html,'tblAxles')),line=table.match(/Axle\s*:\s*([\d\s]+)/i)?.[1]||'';
 const values=line.match(/\d+/g)||[];return values.length;
}
function confidence(source,score=.9){return{score,source};}

export function parseOfficialPermitHTML(html,format){
 if(typeof html!=='string'||!html.trim()||html.length>2000000)throw Error('Unsupported official permit page.');
 const config=format==='colorado-public-html'?{
  state:'CO',permitId:'PermitNumberLarge',startId:'spanStartDate',endId:'spanEndDate',routeBody:'DD',conditionsBody:'PermitConditions',numberPattern:/([A-Z0-9-]{6,})/i
 }:format==='texas-public-html'?{
  state:'TX',permitId:'PermitNumberLarge',startId:'spanStartDate',endId:'spanEndDate',routeBody:'tbodyDrivingDirections',conditionsBody:'PermitConditions',numberPattern:/Permit Number\s*:\s*([A-Z0-9-]+)/i
 }:null;
 if(!config)throw Error('Unsupported official permit page format.');
 const permit=blankPermit(),numberText=textById(html,config.permitId),number=numberText.match(config.numberPattern)?.[1]||numberText.match(/([A-Z0-9-]{6,})/i)?.[1]||'';
 const evidence=routeEvidence(rowsByTbody(html,config.routeBody));
 if(!number||!evidence.routeText||!evidence.steps.length)throw Error('The official permit page did not contain a complete supported route table. Keep the QR and use the original permit.');
 permit.state=config.state;permit.timeZone=permitTimeZoneForState(config.state);permit.number=clean(number,100);
 permit.validFrom=dateOnly(textById(html,config.startId));permit.validTo=dateOnly(textById(html,config.endId));
 permit.entry=inferBorderEdge(evidence.origin,config.state);permit.exit=inferBorderEdge(evidence.destination,config.state);
 permit.routeText=evidence.routeText;permit.steps=evidence.steps;permit.restrictions=conditionsFrom(html,config.conditionsBody);
 permit.kind='single-trip';permit.complete=false;
 const width=feet(textById(html,'ldWidth')),height=feet(textById(html,'ldHeight')),length=feet(textById(html,'ldLength')),weight=integer(textById(html,'ldWeight')),axles=axleCountFromHTML(html);
 permit.limits={};if(width)permit.limits.widthFt=width;if(height)permit.limits.heightFt=height;if(length)permit.limits.lengthFt=length;if(weight)permit.limits.weightLb=weight;if(axles)permit.limits.axles=axles;
 const source='Official public permit lookup; compare every field, route line and restriction with the original issued PDF';
 permit.confidence={
  state:confidence(source),number:confidence(source),validFrom:confidence(source,.85),validTo:confidence(source,.85),timeZone:permitTimeZoneConfidence(config.state),
  entry:confidence(source,.8),exit:confidence(source,.8),routeText:confidence(source,.88),routeSteps:confidence(source,.86),restrictions:confidence(source,permit.restrictions?.75:0)
 };
 return permit;
}
