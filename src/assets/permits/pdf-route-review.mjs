// Read-only route-table rehearsal. Never creates geometry, a permit review or GPS cues.
export function pageLines(items) {
  if (!Array.isArray(items) || items.length > 30000) throw Error('Unsupported PDF text size. Review the original.');
  const lines = [], buckets=new Map(); let characters=0;
  for (const item of items) {
    if (!item.str?.trim()) continue;
    characters+=item.str.length; if(characters>250000) throw Error('PDF page text exceeds the review limit. Nothing was shortened.');
    const [x, y] = [item.transform?.[4], item.transform?.[5]];
    if (![x,y].every(Number.isFinite)) throw Error('Unsupported PDF text placement.');
    const key=Math.round(y/2);
    let line = [key-1,key,key+1].flatMap(k=>buckets.get(k)||[]).find(l=>Math.abs(l.y-y)<2);
    if (!line) { line = {y,items:[]}; lines.push(line); if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(line); }
    line.items.push({x,text:item.str.trim()});
  }
  return lines.sort((a,b)=>b.y-a.y).map(l=>({...l,items:l.items.sort((a,b)=>a.x-b.x),text:l.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')}));
}

export function extractRouteTables(pages) {
  if (!Array.isArray(pages) || pages.length < 1 || pages.length > 40) throw Error('Review a PDF with 1–40 pages.');
  const prepared = pages.map(p=>({page:p.page,lines:pageLines(p.items)}));
  const allText = prepared.flatMap(p=>p.lines.map(l=>l.text)).join('\n');
  if(allText.length>2000000) throw Error('PDF text exceeds the review limit. Nothing was shortened.');
  const texas = /Texas (?:Oversize\/Overweight|Department of Motor Vehicles)/i.test(allText);
  const kansas = /Kansas/i.test(allText) && /Overdimension Oversize and\/or Overweight Single-Trip/i.test(allText);
  if (texas === kansas) throw Error('This is not a recognized Kansas or Texas route-table layout. Read the original; no route was inferred.');
  const rows = [], tablePages = [], issues = [];
  for (const {page,lines} of prepared) {
    let boundaries = null, current = null, active = false;
    for (const line of lines) {
      const heads = ['Miles','Route','To','Distance'].map(text=>line.items.find(i=>i.text===text));
      if(heads.every(Boolean)) { boundaries=heads.map(i=>i.x); const time=line.items.find(i=>/^(?:Est\.\s*)?Time$/.test(i.text)); if (!time) throw Error(`Page ${page}: route table columns are incomplete.`); boundaries.push(time.x); active=true; tablePages.push(page); current=null; continue; }
      if(!active) continue;
      if(/Final Destination:|\[(?:Loaded Route )?Destination/.test(line.text)) { active=false; current=null; continue; }
      if(/\[(?:Loaded Route )?(?:Origin|Trip Origin|Trip Destination)/.test(line.text)) continue;
      if(/^(?:Texas Oversize|PAGE \d|Page \d|For more information|\*Permit loads)/i.test(line.text)) { active=false; continue; }
      const cells = ['', '', '', '', ''];
      for(const item of line.items) { let column=0; for(let i=1;i<boundaries.length;i++) if(item.x >= boundaries[i]-3) column=i; cells[column]+=(cells[column]?' ':'')+item.text; }
      const isMiles=/^(?:<\s*)?\d+(?:\.\d+)?$/.test(cells[0]);
      if(isMiles) { current={page,row:rows.length+1,miles:cells[0],road:cells[1],instruction:cells[2],cumulative:cells[3],time:cells[4]}; rows.push(current); }
      else if(current && !cells[0] && (cells[1]||cells[2]||cells[3]||cells[4])) {
        for(const [i,key] of [[1,'road'],[2,'instruction'],[3,'cumulative'],[4,'time']]) if(cells[i]) current[key]+=(current[key]?' ':'')+cells[i];
      } else if(line.text.trim()) issues.push(`Page ${page}: unrecognized table text; compare the original: ${line.text}`);
    }
  }
  if(!rows.length || rows.length>1000) throw Error('No supported printed route rows found. A scanned image may need manual transcription; no OCR or route was inferred.');
  for(let i=0;i<rows.length;i++) {
    const r=rows[i];
    if(!r.road || !/^(Head|Turn|Continue|Take|Keep|Bear|Merge|Left lane|Right lane|Arrive)\b/i.test(r.instruction) || !/^\d+(?:\.\d+)?$/.test(r.cumulative) || !/^\d{2}:\d{2}$/.test(r.time)) issues.push(`Page ${r.page}, row ${r.row}: incomplete or unsupported columns. Compare the original before rehearsal.`);
    if(i && Number(r.cumulative)<Number(rows[i-1].cumulative)) issues.push(`Row ${r.row}: printed cumulative mileage decreases. Possible duplicate, missing or out-of-order pages.`);
  }
  return {state:texas?'TX':'KS',rows,tablePages:[...new Set(tablePages)],pageCount:pages.length,issues,geometry:[],approved:false};
}

export function printedRowSpeech(review,index) {
  const row=review?.rows?.[index];
  if(!row || review.issues.length) return null;
  return `Parked printed route review. ${review.state}. PDF page ${row.page}, route row ${index+1} of ${review.rows.length}. Road column: ${row.road}. Printed segment miles: ${row.miles.startsWith('<')?'less than '+row.miles.slice(1).trim():row.miles}. Instruction: ${row.instruction}. This reads the permit text only. No position or road match has been established.`;
}

export async function readPDFRoute(file,{signal,onPage=()=>{}}={}) {
  if(file?.type!=='application/pdf'||!file.size||file.size>15*1024*1024) throw Error('Choose a saved PDF original up to 15 MB.');
  const abort=()=>new DOMException('Printed-route review stopped. Original unchanged.','AbortError');
  if(signal?.aborted) throw abort();
  const pdfjs=await import('../vendor/pdfjs-6.4.299/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs-6.4.299/pdf.worker.min.mjs',import.meta.url).href;
  const data=new Uint8Array(await file.arrayBuffer()); if(signal?.aborted) throw abort();
  const pdfSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
  if(signal?.aborted)throw abort();
  const task=pdfjs.getDocument({data,isEvalSupported:false,enableXfa:false,useWasm:false,useWorkerFetch:false,disableAutoFetch:true,disableStream:true,stopAtErrors:true,disableWorkerRendering:true,verbosity:0});
  let cancelled=false; const stop=()=>{cancelled=true;void task.destroy().catch(()=>{});};
  signal?.addEventListener('abort',stop,{once:true});const timer=setTimeout(stop,60000);
  try {
    if(signal?.aborted) stop();
    const pdf=await task.promise; if(pdf.numPages>40) throw Error('This PDF has more than 40 pages. Read the original; nothing was shortened.');
    const pages=[];
    for(let page=1;page<=pdf.numPages;page++) {if(cancelled)throw abort();onPage(page,pdf.numPages);const p=await pdf.getPage(page);try{const text=await p.getTextContent();pages.push({page,items:text.items});}finally{p.cleanup();}}
    if(cancelled)throw abort();return {...extractRouteTables(pages),pdfSha256};
  } catch(e) {if(cancelled)throw abort();throw e;}
  finally {clearTimeout(timer);signal?.removeEventListener('abort',stop);await task.destroy().catch(()=>{});}
}
