import { blankPermit, blankTrip, orderPermits, sanitizePermit, clean } from './core.mjs';
import { publicProviderURL } from './provider.mjs';
import { decodePhotoPixels } from './qr-scan.mjs';
import { inferBorderEdge, permitTimeZoneConfidence, permitTimeZoneForState } from './state-meta.mjs';

const DATE_TOKEN='(?:\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2})';
const isoDate=value=>{
  const raw=String(value||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return match?`${match[3]}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`:'';
};
const compact=value=>String(value||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').trim();
const lineValue=(text,label)=>compact(text).match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:?\\s*([^\\n]+)`,'i'))?.[1]?.trim()||'';
const inlineValue=(text,label)=>compact(text).match(new RegExp(`\\b${label}\\s*:\\s*([^\\n]+)`,'i'))?.[1]?.trim()||'';

function detectState(text){
  if(/UTAH\s+DEPARTMENT\s+OF\s+TRANSPORTATION|\bUDOT\b/i.test(text))return'UT';
  if(/COLORADO\s+DEPARTMENT\s+OF\s+TRANSPORTATION|\bCDOT\b/i.test(text))return'CO';
  if(/STATE\s+OF\s+NEW\s+MEXICO|NEW\s+MEXICO\s+DEPARTMENT\s+OF\s+TRANSPORTATION/i.test(text))return'NM';
  if(/TEXAS\s+OVERSIZE\/OVERWEIGHT|TEXAS\s+DEPARTMENT\s+OF\s+MOTOR\s+VEHICLES|\bTXDMV\b/i.test(text))return'TX';
  if(/KANSAS\s+DEPARTMENT\s+OF\s+TRANSPORTATION|\bK-TRIPS\b/i.test(text))return'KS';
  if(/ILLINOIS\s+DEPARTMENT\s+OF\s+TRANSPORTATION|ILLINOIS\s+OS\/OW/i.test(text))return'IL';
  if(/DEPARTMENT\s+OF\s+TRANSPORTATION[\s\S]{0,80}STATE\s+OF\s+OHIO|\bOHIO\s+DEPARTMENT\s+OF\s+TRANSPORTATION/i.test(text))return'OH';
  return'';
}
function permitNumber(text,state){
  const patterns={
    UT:[/COMBINED\s+TRANSPORTATION[\s\S]{0,80}?No\.\s*([A-Z0-9-]{6,})/i,/\bNo\.\s*([A-Z0-9-]{6,})/i],
    CO:[/Single\s+Trip\s+Transport\s+Permit\s*#\s*([A-Z0-9-]+)/i,/PERMIT\s+NUMBER\s+([A-Z0-9-]+)/i],
    NM:[/Permit\s+Number\s*:\s*([A-Z0-9-]+)/i],
    TX:[/Permit\s+Number\s*:\s*([A-Z0-9-]+)/i],
    KS:[/Permit\s*#\s*:?\s*([A-Z0-9-]+)/i],
    IL:[/Permit\s*:\s*([A-Z0-9-]+)/i,/Permit\s*(?:Number|No\.?|#)?\s*:?\s*([A-Z]?\d{5,})/i],
    OH:[/Permit\s*(?:Number|No\.?|#)?\s*:?\s*([A-Z]?\d{5,})/i]
  };
  for(const pattern of patterns[state]||[]){const match=text.match(pattern);if(match)return match[1];}
  return text.match(/Permit\s*(?:Number|No\.?|#)?\s*:?\s*([A-Z0-9-]{6,})/i)?.[1]||'';
}
function effectiveDates(text,state){
  const patterns=[
    new RegExp(`Valid\\s+From\\s*:\\s*(${DATE_TOKEN})[\\s\\S]{0,80}?\\bTo\\s*:\\s*(${DATE_TOKEN})`,'i'),
    new RegExp(`Date\\s+Effective\\s*:\\s*(${DATE_TOKEN})[\\s\\S]{0,100}?Date\\s+Expires\\s*:\\s*(${DATE_TOKEN})`,'i'),
    new RegExp(`\\bEffective\\s*:\\s*(${DATE_TOKEN})[\\s\\S]{0,100}?\\bExpiration\\s*:\\s*(${DATE_TOKEN})`,'i'),
    new RegExp(`\\bStarts\\s*:\\s*(${DATE_TOKEN})[\\s\\S]{0,100}?\\bExpires\\s*:\\s*(${DATE_TOKEN})`,'i'),
    new RegExp(`Effective\\s+Date\\s*:?\\s*(${DATE_TOKEN})\\s*(?:through|to|–|-)\\s*(${DATE_TOKEN})`,'i')
  ];
  if(state==='KS')patterns.push(new RegExp(`Overdimension[\\s\\S]{0,160}?\\$\\d+(?:\\.\\d+)?\\s+(${DATE_TOKEN})\\s+(${DATE_TOKEN})`,'i'));
  for(const pattern of patterns){const match=text.match(pattern);if(match)return[isoDate(match[1]),isoDate(match[2])];}
  return['',''];
}
function routeStops(text,state){
  const normalized=compact(text);let origin='',destination='';
  if(state==='UT'){
    const pair=normalized.match(/\bFrom\s*:\s*([\s\S]{1,260}?)\s+\bTo\s*:\s*([^\n]{2,260})/i);
    if(pair){origin=pair[1].replace(/\n/g,' ').trim();destination=pair[2].trim();}
  }
  if(!origin)origin=lineValue(normalized,'(?:Route Description:\\s*)?Origin')||inlineValue(normalized,'Border Start')||lineValue(normalized,'From');
  if(!destination)destination=lineValue(normalized,'Destination')||inlineValue(normalized,'Border End')||lineValue(normalized,'To')||lineValue(normalized,'Final Destination');
  origin=origin.replace(/^\[Loaded Route Origin:\s*/i,'').replace(/\]\s*$/,'').trim();
  destination=destination.replace(/^\[Loaded Route Destination:\s*/i,'').replace(/\]\s*$/,'').trim();
  return{entry:inferBorderEdge(origin,state),exit:inferBorderEdge(destination,state)};
}
function restrictionSection(text){
  const normalized=compact(text),headings=[
    /^\s*Special Restrictions\s*:?\s*$/im,
    /^\s*Conditions and Restrictions\s*:?\s*$/im,
    /^\s*Route Conditions\s*:?\s*$/im,
    /^\s*General Conditions(?:\s*\(Continued\))?\s*:?\s*$/im,
    /^\s*Restrictions\s*:?\s*$/im,
    /\bSpecial Restrictions\b/i,
    /\bConditions and Restrictions\b/i,
    /\bRoute Conditions\s*:/i,
    /\bGeneral Conditions\s*:/i,
    /\bRestrictions\s*:/i
  ];
  let index=-1;for(const heading of headings){const found=normalized.search(heading);if(found>=0&&(index<0||found<index))index=found;}
  return index>=0?clean(normalized.slice(index),20000):'';
}

const routePageNoise=line=>/^\[PERMIT PDF PAGE \d+\]$/i.test(line)||/^PAGE \d+ OF \d+$/i.test(line);
const finalDestinationLine=line=>/^Final Destination\s*:/i.test(line)||/^Destination\s*:/i.test(line)||/^\[Loaded Route Destination:/i.test(line);
function lastIndex(lines,predicate){for(let index=lines.length-1;index>=0;index--)if(predicate(lines[index],index))return index;return-1;}
function trimRouteLines(lines){
  const cleaned=lines.map(line=>line.trim()).filter(line=>line&&!routePageNoise(line));
  while(cleaned.length&&/^(?:ROUTING AND SPECIAL INSTRUCTIONS|AUTHORIZED ROUTE|ROUTE)$/i.test(cleaned[0]))cleaned.shift();
  return clean(cleaned.join('\n'),20000);
}
function sectionThroughFinal(lines,start,endFallback=lines.length){
  if(start<0)return'';
  let end=endFallback;
  for(let index=start+1;index<Math.min(lines.length,endFallback);index++)if(finalDestinationLine(lines[index])){end=index+1;break;}
  return trimRouteLines(lines.slice(start,end));
}
export function extractAuthorizedRouteText(text,state=''){
  const source=compact(text),lines=source.split('\n'),upper=String(state||'').toUpperCase();let route='';
  if(upper==='UT'){
    const start=lines.findIndex(line=>/^ROUTING\s*:/i.test(line));
    if(start>=0){
      const first=lines[start].replace(/^ROUTING\s*:\s*/i,'').trim(),body=first?[first]:[];
      for(let index=start+1;index<lines.length;index++){if(/^\*\*ATTENTION|^RESTRICTIONS\s*:/i.test(lines[index]))break;body.push(lines[index]);}
      route=trimRouteLines(body);
    }
  }else if(upper==='CO'){
    const start=lastIndex(lines,line=>/^ROUTING AND SPECIAL INSTRUCTIONS$/i.test(line));
    if(start>=0){let end=lines.length;for(let index=start+1;index<lines.length;index++)if(/^NOTE\s*:|^THIS PERMIT IS NOT VALID/i.test(lines[index])){end=index;break;}route=sectionThroughFinal(lines,start+1,end);}
  }else if(upper==='NM'){
    const start=lastIndex(lines,line=>/^ROUTING AND SPECIAL INSTRUCTIONS$/i.test(line));
    route=sectionThroughFinal(lines,start>=0?start+1:lastIndex(lines,line=>/^Route Summary\s*:/i.test(line)));
  }else if(upper==='TX'){
    const start=lastIndex(lines,line=>/^Origin\s*:/i.test(line));
    route=sectionThroughFinal(lines,start);
  }else if(upper==='KS'){
    const heading=lastIndex(lines,line=>/^ROUTE$/i.test(line)),origin=lastIndex(lines,line=>/^Origin\s*:/i.test(line));
    route=sectionThroughFinal(lines,Math.max(heading>=0?heading+1:-1,origin));
  }else if(upper==='IL'){
    const start=lastIndex(lines,line=>/^Authorized Route\s*:/i.test(line));
    if(start>=0){const first=lines[start].replace(/^Authorized Route\s*:\s*/i,'').trim(),body=first?[first]:[];for(let index=start+1;index<lines.length;index++){if(/^Total (?:Distance|Miles)|^State Mileage/i.test(lines[index]))break;body.push(lines[index]);}route=trimRouteLines(body);}
  }else if(upper==='OH'){
    const heading=lastIndex(lines,line=>/^ROUTING AND SPECIAL INSTRUCTIONS$/i.test(line)),origin=lastIndex(lines,line=>/^Origin\s*:/i.test(line));
    route=sectionThroughFinal(lines,Math.max(heading>=0?heading+1:-1,origin));
  }
  if(route)return{text:route,extracted:true};
  return{text:clean(source,20000),extracted:false};
}

const feetValue=(feet,inches='0')=>String(Math.round((Number(feet)+Number(inches||0)/12)*100)/100);
function measurement(text,label){
  const match=text.match(new RegExp(`${label}\\s*:?\\s*(\\d{1,3})\\s*['’]\\s*(?:(\\d{1,2})\\s*(?:\"|''|″))?`,'i'));
  return match?feetValue(match[1],match[2]):'';
}
function loadDescription(source){
  const explicit=source.match(/(?:^|\n)\s*Load Description\s*:\s*([^\n]{1,160})/i)?.[1];
  const labeled=source.match(/(?:^|\n)\s*LOAD\s*:\s*([^\n]{1,160})/i)?.[1];
  return clean((explicit||labeled||'')
    .replace(/\s+(?:Gross\s+Weight|\bGVW|Total\s+Gross|Overall\s+Width|Max\.?\s+Width)\s*:.*$/i,'')
    .replace(/\s+From\s*:.*$/i,''),160);
}
export function parseLoadProfile(text){
  const source=compact(text),profile={heightFt:'',widthFt:'',lengthFt:'',weightLb:'',axles:'',axleWeights:'',hazmat:''};
  const table=source.match(/\bWidth\s+Length\s+Height\b[\s\S]{0,180}?(\d{1,2})\s*['’]\s*(\d{1,2})?\s*(?:\"|''|″)?\s+(\d{1,3})\s*['’]\s*(\d{1,2})?\s*(?:\"|''|″)?\s+(\d{1,2})\s*['’]\s*(\d{1,2})?\s*(?:\"|''|″)?/i);
  if(table){profile.widthFt=feetValue(table[1],table[2]);profile.lengthFt=feetValue(table[3],table[4]);profile.heightFt=feetValue(table[5],table[6]);}
  profile.widthFt ||= measurement(source,'(?:Overall|Max\\.?|Maximum)?\\s*Width');
  profile.heightFt ||= measurement(source,'(?:Overall|Max\\.?|Maximum)?\\s*Height');
  profile.lengthFt ||= measurement(source,'(?:Overall|Max\\.?|Maximum)?\\s*Length');
  const weight=source.match(/(?:Gross\s+Weight|\bGVW|Total\s+Gross)\s*:?\s*([\d,]{4,})/i);if(weight)profile.weightLb=weight[1].replace(/,/g,'');
  const axles=source.match(/Total\s+Axles\s*:?\s*(\d{1,2})/i);if(axles)profile.axles=axles[1];
  const evidence=[...source.matchAll(/(?:^|\n)\s*(?:Weights?|Distances?|Spacing)\s*:?\s*([^\n]+)/gi)].map(match=>match[0].trim());profile.axleWeights=clean(evidence.join('\n'),500);
  const description=loadDescription(source);
  return{profile,description,confidence:Object.fromEntries(Object.entries(profile).map(([key,value])=>[key,{score:value ? .75 : 0,source:value?'Permit text extraction; confirm against original':'Not extracted'}]))};
}

export function classifyQR(raw) {
  raw = clean(raw, 50000).trim();
  if (!raw) return { kind: 'empty', message: 'No QR data found.' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.schema === 'dl-permit-route/v1') return { kind: 'encoded-route', permit: sanitizePermit(parsed.permit), raw };
  } catch (error) { if (raw.startsWith('{')) return { kind: 'manual', raw, message: 'The encoded route is not a supported valid permit package. Retain it and enter the issued route.' }; }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || !/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname) || /^\d/.test(url.hostname)) return { kind: 'manual', raw, message: 'This QR is not an eligible public HTTPS route. Retain it and transcribe the issued permit.' };
    if (publicProviderURL(raw)) return { kind: 'public-provider', raw, url: raw, message: 'Issued-permit navigation reference detected. Try a public-data import without signing in. If access is required, use the original permit.' };
    if (/promiles/i.test(url.hostname)) return { kind: 'proprietary', raw, message: 'Unrecognized ProMiles reference retained. No authenticated or proprietary service is accessed. Import authorized route data or transcribe the permit.' };
    return { kind: 'public-url', raw, url: url.href, message: 'Public URL detected. Import only if this is the expected issuing authority or authorized provider.' };
  } catch { return { kind: 'manual', raw, message: 'Unrecognized or proprietary QR payload retained. Enter the authorized route from the original permit.' }; }
}

function basePermitFromText(text){
  const source=clean(text,50000),p=blankPermit();p.routeText=clean(source,20000);p.state=detectState(source);p.timeZone=permitTimeZoneForState(p.state);p.number=permitNumber(source,p.state);
  [p.validFrom,p.validTo]=effectiveDates(source,p.state);Object.assign(p,routeStops(source,p.state));p.restrictions=restrictionSection(source);
  p.kind=/annual/i.test(source)?'annual':/multiple\s+trips?|multi[- ]trip/i.test(source)?'multi-trip':'single-trip';
  const load=parseLoadProfile(source);p.limits={};for(const key of['heightFt','widthFt','lengthFt','weightLb','axles'])if(Number(load.profile[key])>0)p.limits[key]=Number(load.profile[key]);
  p.confidence={
    state:{score:p.state ? .9 : 0,source:'Issuing-agency text pattern; confirm against original'},
    number:{score:p.number ? .85 : 0,source:'Permit-number text pattern; confirm against original'},
    validFrom:{score:p.validFrom ? .85 : 0,source:'Effective-date text pattern; confirm against original'},
    validTo:{score:p.validTo ? .85 : 0,source:'Expiration-date text pattern; confirm against original'},
    timeZone:permitTimeZoneConfidence(p.state),
    entry:{score:p.entry.label ? .7 : 0,source:'Origin text extraction; confirm border state and road'},
    exit:{score:p.exit.label ? .7 : 0,source:'Destination text extraction; confirm border state and road'},
    routeText:{score:p.routeText ? .4 : 0,source:'Copied permit text retained exactly; identify and verify every authorized route instruction'},
    restrictions:{score:p.restrictions ? .4 : 0,source:'Restriction-section text extraction; verify every page and condition'}
  };
  return p;
}

export function parsePermitText(text){return basePermitFromText(text);}

export function parsePermitPdfText(text){
  const p=basePermitFromText(text),route=extractAuthorizedRouteText(text,p.state);
  if(route.extracted){
    p.routeText=route.text;
    p.confidence.routeText={score:.78,source:'Authorized-route section isolated from the local PDF text; compare every line with the original permit before confirmation'};
  }else p.confidence.routeText={score:p.routeText?.35:0,source:'No state-specific route section was isolated; full copied PDF text retained for manual identification'};
  return p;
}

function parsePacketTexts(texts,parser){
  const sources=(Array.isArray(texts)?texts:[]).map(value=>clean(value,50000)).filter(value=>value.trim()),trip=blankTrip(),conflicts=[];
  trip.permits=sources.map(parser);const ordered=orderPermits(trip.permits);trip.permits=ordered.permits;
  const loads=sources.map(parseLoadProfile),fields=['heightFt','widthFt','lengthFt','weightLb','axles'];
  for(const field of fields){const values=[...new Set(loads.map(item=>item.profile[field]).filter(Boolean))];if(values.length)trip.profile[field]=values[0];if(values.length>1)conflicts.push(`${field}: permit texts disagree (${values.join(' / ')}).`);}
  trip.profile.axleWeights=loads.map(item=>item.profile.axleWeights).find(Boolean)||'';
  trip.name=`${trip.permits.map(p=>p.state||'?').join(' → ')} permitted load`;trip.departure=trip.permits.map(p=>p.validFrom).filter(Boolean).sort().at(-1)||trip.departure;
  return{trip,conflicts,issues:ordered.issues,loadDescriptions:[...new Set(loads.map(item=>item.description).filter(Boolean))]};
}

export function parsePermitPacketTexts(texts){return parsePacketTexts(texts,parsePermitText);}
export function parsePermitPdfPacketTexts(texts){return parsePacketTexts(texts,parsePermitPdfText);}

export async function importPublicQR(url, fetcher = fetch) {
  const classification = classifyQR(url);
  if (classification.kind !== 'public-url') throw Error('Only public HTTPS references may be fetched by this adapter.');
  const response = await fetcher(url, { credentials: 'omit', mode: 'cors', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json, text/plain' } });
  if (!response.ok) throw Error('This route is unavailable or requires access. Keep the QR and use the original permit.');
  if (!/application\/json|text\/plain/i.test(response.headers.get('content-type') || '')) throw Error('This reference is a webpage or document. Save the original permit and enter its route; only public JSON/text route data can be imported directly.');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1000000) throw Error('Permit data is too large.'); chunks.push(value); } } finally { await reader.cancel(); }
  const text = await new Blob(chunks).text();
  let parsed; try { parsed = JSON.parse(text); } catch { return parsePermitText(text); }
  if (parsed.schema !== 'dl-permit-route/v1') throw Error('This provider format needs an adapter. Use manual route entry.');
  return sanitizePermit(parsed.permit);
}

export async function scanImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw Error('Scan a JPG, PNG or WebP photo. PDFs can be kept in the wallet; photograph the QR page to scan.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'), scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if ('BarcodeDetector' in window) {
      try { const found = await new BarcodeDetector({ formats: ['qr_code'] }).detect(canvas); if (found.length) return [...new Set(found.map(x => x.rawValue))]; } catch { /* Portable local decoder below. */ }
    }
    if (!window.jsQR) throw Error('QR decoder unavailable. Paste the QR contents or enter the permit route.');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if ('Worker' in window) return await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./qr-worker.mjs', import.meta.url), { type: 'module' });
      const timer = setTimeout(() => { worker.terminate(); reject(Error('Photo scan timed out. Try a closer QR photo.')); }, 45000);
      worker.onmessage = event => { clearTimeout(timer); worker.terminate(); event.data.error ? reject(Error(event.data.error)) : resolve(event.data.codes); };
      worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(Error('Photo scanner unavailable. Paste the QR contents or enter the permit manually.')); };
      worker.postMessage({ pixels: pixels.data.buffer, width: canvas.width, height: canvas.height }, [pixels.data.buffer]);
    });
    return decodePhotoPixels(pixels.data, canvas.width, canvas.height, window.jsQR);
  } finally { bitmap.close(); }
}
