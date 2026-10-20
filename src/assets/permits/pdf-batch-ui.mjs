import{sanitizePermit}from'./core.mjs';
import{classifyQR,importPublicQR,parsePermitPdfPacketTexts,parsePermitPdfText,scanImage}from'./import.mjs';
import{publicProviderURL}from'./provider.mjs';
import{parseIssuedRouteSteps}from'./route-text.mjs';
import{addDocumentsAtomic,listTrips,saveTrip}from'./storage.mjs';
import{extractPermitPdf,validatePermitPdf}from'./pdf-import.mjs';
import{applyImportedPermit,choosePermitTarget,mergeTripProfileFromPacket,orderTripPermits,summarizePdfBatch}from'./pdf-batch-core.mjs';

const REPORT_KEY='dl-local-pdf-import-report-v1';
const sleep=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const $=selector=>document.querySelector(selector);
let busy=false;

function setPanel(message,tone=''){
 const panel=$('#pdf-batch-status');if(!panel)return;panel.hidden=false;panel.textContent=message;panel.dataset.tone=tone;
}
function setAppStatus(message,error=false){const status=$('#status');if(status){status.textContent=message;status.dataset.error=String(error);}}
function setBusy(active){busy=active;const input=$('#import-permit-pdfs-local');if(input)input.disabled=active;document.querySelectorAll('.layout,.trip-toolbar,.heading').forEach(element=>element.inert=active);}
async function waitFor(predicate,{timeout=10000,interval=50,message='Timed out waiting for the permit wallet.'}={}){
 const started=Date.now();while(Date.now()-started<timeout){if(predicate())return true;await sleep(interval);}throw Error(message);
}
async function saveOpenForms(){
 const button=$('#save-trip'),layout=$('.layout'),status=$('#status');if(!button)throw Error('The permit wallet is not ready.');
 await waitFor(()=>!layout?.inert,{timeout:8000,message:'The permit wallet is still busy.'});
 button.click();await sleep(30);
 await waitFor(()=>!layout?.inert,{timeout:12000,message:'Current permit changes could not be saved before PDF import.'});
 if(status?.dataset.error==='true')throw Error(status.textContent||'Current permit changes could not be saved.');
}
function storedTripId(){try{return JSON.parse(localStorage.getItem('dl-last-permit-trip')||'null')||'';}catch{return localStorage.getItem('dl-last-permit-trip')||'';}}
function currentTripId(){
 const picker=$('#trip-picker');if(picker?.value)return picker.value;
 const hash=new URLSearchParams(location.hash.replace(/^#/,''));return hash.get('trip')||storedTripId();
}
async function currentSavedTrip(){
 const id=currentTripId(),trips=await listTrips(),trip=trips.find(item=>item.id===id);if(!trip)throw Error('Create or choose a permitted load before importing PDFs.');
 if(trip.completedAt)throw Error('This single-trip move is marked complete. Create a new permitted load instead of changing its evidence.');
 return trip;
}
function exactDuplicate(permit,file){return(permit.documents||[]).some(document=>document.type==='application/pdf'&&document.name===file.name&&Number(document.size)===Number(file.size));}

async function providerPermitFromQr(raw){
 const knownProvider=publicProviderURL(raw);
 const classification=knownProvider?{kind:'public-provider',raw,url:knownProvider.href,message:'Allowlisted public issued-permit reference detected.'}:classifyQR(raw);
 if(classification.kind==='encoded-route')return{permit:classification.permit,warning:''};
 if(classification.kind==='public-provider'){
  try{
   const response=await fetch('/api/permit-route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:classification.url}),signal:AbortSignal.timeout(15000),cache:'no-store',credentials:'same-origin'}),data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'issued-route endpoint unavailable');return{permit:sanitizePermit(data.permit),warning:''};
  }catch(error){return{permit:null,warning:`QR retained, but issued-route data could not be imported (${error?.message||'unavailable'}). Review the original permit.`};}
 }
 if(classification.kind==='public-url'){
  try{return{permit:await importPublicQR(classification.url),warning:''};}
  catch(error){return{permit:null,warning:`QR retained, but public route data could not be imported (${error?.message||'unavailable'}). Review the original permit.`};}
 }
 return{permit:null,warning:classification.message||'QR retained for manual review.'};
}

async function extractFiles(files){
 const total=files.reduce((sum,file)=>sum+Number(file.size||0),0);if(files.length>20)throw Error('Import no more than 20 permit PDFs at once.');if(total>45*1024*1024)throw Error('The selected permit PDFs exceed the 45 MB packet limit.');
 files.forEach(file=>validatePermitPdf(file));const records=[];
 for(let index=0;index<files.length;index++){
  const file=files[index];setPanel(`Reading ${index+1} of ${files.length}: ${file.name} · nothing is being uploaded…`,'working');
  const pdf=await extractPermitPdf(file,{scanPage:blob=>scanImage(blob),onProgress:progress=>setPanel(`${file.name} · ${progress.stage==='qr'?'Scanning QR':'Reading text'} · page ${progress.pageNumber} of ${progress.pageCount}`,'working')});
  const permit=parsePermitPdfText(pdf.text),routeDraft=parseIssuedRouteSteps(permit.routeText,permit.state);
  if(routeDraft.steps.length){
   permit.steps=routeDraft.steps;
   permit.confidence.routeSteps={score:.62,source:'Draft maneuvers parsed from issued permit route text; no GPS geometry or detour was created'};
  }
  records.push({file,name:file.name,pdf,permit,routeDraft,qrCodes:pdf.qrCodes,warnings:[...pdf.warnings,...routeDraft.warnings]});
 }
 return records;
}

async function commitRecords(records,trip){
 const texts=records.map(record=>record.pdf.text),packet=parsePermitPdfPacketTexts(texts),claimed=new Set(),entries=[];
 for(const record of records){
  const target=choosePermitTarget(trip,record.permit,claimed);claimed.add(target.id);applyImportedPermit(target,record.permit);record.permit=target;
  for(const raw of record.qrCodes){
   if(!target.qr.includes(raw))target.qr.push(raw);
   const result=await providerPermitFromQr(raw);if(result.permit)applyImportedPermit(target,result.permit);if(result.warning)record.warnings.push(result.warning);
  }
  if(exactDuplicate(target,record.file))record.warnings.push('This exact PDF name and size is already in the permit wallet; the duplicate file was not stored again.');
  else entries.push({permit:target,file:record.file});
 }
 const merge=mergeTripProfileFromPacket(trip,packet),ordered=orderTripPermits(trip);trip.revision=Math.max(1,Number(trip.revision||0)+1);
 if(entries.length)await addDocumentsAtomic(trip,entries);else await saveTrip(trip);
 const report=summarizePdfBatch(records,packet,ordered,merge);sessionStorage.setItem(REPORT_KEY,JSON.stringify(report));localStorage.setItem('dl-last-permit-trip',JSON.stringify(trip.id));return{trip,report};
}

async function importPdfs(files){
 if(busy||!files.length)return;
 try{
  await saveOpenForms();const trip=await currentSavedTrip();setBusy(true);setAppStatus('Reading permit PDFs privately on this device…');
  const records=await extractFiles(files),{report}=await commitRecords(records,trip);
  setPanel(report.message,report.warnings.length?'warning':'good');setAppStatus(report.message);
  location.hash=`trip=${encodeURIComponent(trip.id)}&tab=review`;location.reload();
 }catch(error){setPanel(error?.message||'PDF permit import failed. No route was approved.','error');setAppStatus(error?.message||'PDF permit import failed.',true);setBusy(false);}
}

function priorReport(){
 try{const value=JSON.parse(sessionStorage.getItem(REPORT_KEY)||'null');sessionStorage.removeItem(REPORT_KEY);return value;}catch{return null;}
}
function reportMarkup(report){
 const warnings=(report?.warnings||[]).slice(0,12);return`<strong>${report?.message||'Permit PDFs imported.'}</strong>${warnings.length?`<details><summary>${warnings.length} review item${warnings.length===1?'':'s'}</summary><ul>${warnings.map(item=>`<li>${String(item).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}</li>`).join('')}</ul></details>`:''}`;
}
function installStyles(){
 if($('#pdf-batch-styles'))return;const style=document.createElement('style');style.id='pdf-batch-styles';style.textContent=`.pdf-batch-import{margin:10px 0;padding:12px;border:1px solid #b8c9db;border-radius:12px;background:#f5f9ff}.pdf-batch-import strong{display:block;color:#102443}.pdf-batch-import p{margin:6px 0;color:#52657a;font-size:12px;line-height:1.45}.pdf-batch-import .file-button{margin-top:8px}.pdf-batch-status{margin-top:9px;padding:9px;border-radius:8px;background:#e9f2ff;color:#17395f;font-size:12px;line-height:1.4}.pdf-batch-status[data-tone="working"]{background:#fff4d5;color:#624400}.pdf-batch-status[data-tone="warning"]{background:#fff0d8;color:#684100}.pdf-batch-status[data-tone="error"]{background:#ffe4e7;color:#7b1421}.pdf-batch-status[data-tone="good"]{background:#e3f7ea;color:#165b31}.pdf-batch-status ul{padding-left:18px}`;document.head.append(style);
}
async function mount(){
 await waitFor(()=>$('#import-originals')&&$('#trip-picker'),{timeout:15000,message:'Permit wallet controls did not load.'});installStyles();
 const existing=$('#pdf-batch-import');if(existing)return;
 const wrapper=document.createElement('section');wrapper.id='pdf-batch-import';wrapper.className='pdf-batch-import';wrapper.innerHTML=`<strong>Import a complete multi-state PDF packet</strong><p>Select each state's original permit PDF together. Text and QR pages are read in this browser; the app does not upload the PDF contents to the Drivers Lounge server. Extraction is a draft—not verification.</p><label class="file-button full">Read permit PDFs locally<input id="import-permit-pdfs-local" type="file" multiple accept="application/pdf,.pdf"></label><p>Each original is stored in this device's private permit wallet. Route-table lines become draft maneuvers for review, but no GPS geometry, connector road, detour or legal approval is created. Every state route, restriction page, date, dimension and border handoff remains unconfirmed until you review it.</p><div id="pdf-batch-status" class="pdf-batch-status" hidden role="status" aria-live="polite"></div>`;
 const anchor=$('#import-originals').closest('label');anchor.insertAdjacentElement('afterend',wrapper);
 $('#import-permit-pdfs-local').addEventListener('change',event=>{const files=[...event.target.files];event.target.value='';void importPdfs(files);});
 const report=priorReport();if(report){const panel=$('#pdf-batch-status');panel.hidden=false;panel.dataset.tone=report.warnings?.length?'warning':'good';panel.innerHTML=reportMarkup(report);}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void mount(),{once:true});else void mount();
