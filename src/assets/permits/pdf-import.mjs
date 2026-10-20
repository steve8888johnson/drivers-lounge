const PDFJS_VERSION='6.4.299';
export const PDFJS_MODULE_URL=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
export const PDFJS_WORKER_URL=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;
export const PDF_IMPORT_LIMITS=Object.freeze({maxBytes:15*1024*1024,maxPages:40,maxQrPages:6,maxTextChars:250000,maxRenderPixels:9000000,maxRenderEdge:2600});

let pdfLibraryPromise;
const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:0};
const clean=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').replace(/[ \t]+/g,' ').trim();

export function validatePermitPdf(file,limits=PDF_IMPORT_LIMITS){
 if(!file||typeof file!=='object')throw Error('Choose a permit PDF.');
 const name=String(file.name||'permit.pdf'),type=String(file.type||'').toLowerCase(),size=Number(file.size||0);
 if(type&&type!=='application/pdf'&&!/\.pdf$/i.test(name))throw Error(`${name} is not a PDF.`);
 if(!type&&!/\.pdf$/i.test(name))throw Error(`${name} is not a PDF.`);
 if(!Number.isFinite(size)||size<=0)throw Error(`${name} is empty.`);
 if(size>limits.maxBytes)throw Error(`${name} exceeds the ${Math.round(limits.maxBytes/1024/1024)} MB permit-wallet limit.`);
 return{name,type:type||'application/pdf',size};
}

export function textItemsToLines(items=[]){
 const rows=[];
 for(const item of items){
  const value=clean(item?.str);if(!value)continue;
  const transform=Array.isArray(item.transform)?item.transform:[],x=finite(transform[4]),y=finite(transform[5]),height=Math.max(1,Math.abs(finite(transform[3]))||finite(item.height)||8),width=Math.max(0,finite(item.width));
  const tolerance=Math.max(2,Math.min(6,height*.45));
  let row=rows.find(candidate=>Math.abs(candidate.y-y)<=Math.max(candidate.tolerance,tolerance));
  if(!row){row={y,tolerance,height,items:[]};rows.push(row);}else{row.y=(row.y*row.items.length+y)/(row.items.length+1);row.tolerance=Math.max(row.tolerance,tolerance);row.height=Math.max(row.height,height);}
  row.items.push({value,x,width,height,hasEOL:Boolean(item.hasEOL)});
 }
 rows.sort((a,b)=>b.y-a.y);
 const lines=[];
 for(const row of rows){
  row.items.sort((a,b)=>a.x-b.x);let line='',right=null;
  for(const item of row.items){
   const gap=right===null?0:item.x-right,space=right!==null&&gap>Math.max(1.5,Math.min(item.height,row.height)*.18);
   if(line&&space&&!/\s$/.test(line))line+=' ';
   line+=item.value;right=Math.max(right??item.x,item.x+item.width);
  }
  line=clean(line);if(line)lines.push(line);
 }
 return lines;
}

export function joinPdfPages(pageTexts,maxChars=PDF_IMPORT_LIMITS.maxTextChars){
 let combined='';
 for(let index=0;index<pageTexts.length;index++){
  const section=`[PERMIT PDF PAGE ${index+1}]\n${String(pageTexts[index]||'').trim()}\n`;
  if(combined.length+section.length>maxChars){combined+=`[TEXT TRUNCATED AFTER PAGE ${index+1}]`;break;}
  combined+=section;
 }
 return combined.trim();
}

export async function loadPdfLibrary(importer=specifier=>import(specifier)){
 if(!pdfLibraryPromise){
  pdfLibraryPromise=Promise.resolve(importer(PDFJS_MODULE_URL)).then(library=>{
   if(!library?.getDocument||!library?.GlobalWorkerOptions)throw Error('The local PDF reader did not load correctly.');
   library.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
   return library;
  }).catch(error=>{pdfLibraryPromise=null;throw Error(`The private PDF reader is unavailable: ${error?.message||'load failed'}. Keep the original and use manual entry.`);});
 }
 return pdfLibraryPromise;
}

function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not render this PDF page for QR scanning.')),'image/png'));}
function renderScale(viewport,limits){
 const edge=Math.max(viewport.width,viewport.height),edgeScale=limits.maxRenderEdge/Math.max(1,edge),pixelScale=Math.sqrt(limits.maxRenderPixels/Math.max(1,viewport.width*viewport.height));
 return Math.max(1,Math.min(4,edgeScale,pixelScale));
}
async function extractPageText(page){
 const content=await page.getTextContent({disableCombineTextItems:false,includeMarkedContent:false});
 return textItemsToLines(content.items).join('\n');
}
async function renderPageBlob(page,limits){
 const base=page.getViewport({scale:1}),scale=renderScale(base,limits),viewport=page.getViewport({scale});
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
 const context=canvas.getContext('2d',{alpha:false,willReadFrequently:true});if(!context)throw Error('Canvas rendering is unavailable on this device.');
 context.save();context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.restore();
 await page.render({canvasContext:context,viewport,intent:'display',annotationMode:0}).promise;
 const blob=await canvasBlob(canvas);canvas.width=1;canvas.height=1;return blob;
}

export async function extractPermitPdf(file,{scanPage=null,limits=PDF_IMPORT_LIMITS,onProgress=()=>{},importer}={}){
 const policy=validatePermitPdf(file,limits),library=await loadPdfLibrary(importer),data=new Uint8Array(await file.arrayBuffer());
 let passwordRequired=false;
 const loadingTask=library.getDocument({data,isEvalSupported:false,disableAutoFetch:true,disableStream:true,disableRange:true,useSystemFonts:true,stopAtErrors:false,verbosity:0});
 loadingTask.onPassword=()=>{passwordRequired=true;void loadingTask.destroy();};
 let pdf;
 try{pdf=await loadingTask.promise;}catch(error){if(passwordRequired||/password/i.test(String(error?.message||error)))throw Error(`${policy.name} is password protected. Add an unlocked official copy or enter it manually.`);throw Error(`Could not read ${policy.name}: ${error?.message||'invalid or unsupported PDF'}.`);}
 try{
  if(!Number.isInteger(pdf.numPages)||pdf.numPages<1)throw Error(`${policy.name} has no readable pages.`);
  if(pdf.numPages>limits.maxPages)throw Error(`${policy.name} has ${pdf.numPages} pages; the on-device permit limit is ${limits.maxPages}. Split the packet before importing.`);
  const pageTexts=[],qrCodes=[],warnings=[];let textCharacters=0;
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
   onProgress({stage:'text',pageNumber,pageCount:pdf.numPages,name:policy.name});
   const page=await pdf.getPage(pageNumber);let text='';
   try{text=await extractPageText(page);}catch(error){warnings.push(`Page ${pageNumber}: text layer could not be read (${error?.message||'unknown error'}).`);}
   pageTexts.push(text);textCharacters+=text.length;
   if(scanPage&&pageNumber<=limits.maxQrPages){
    onProgress({stage:'qr',pageNumber,pageCount:pdf.numPages,name:policy.name});
    try{const blob=await renderPageBlob(page,limits),codes=await scanPage(blob,pageNumber);for(const code of codes||[])if(code&&!qrCodes.includes(code))qrCodes.push(String(code).slice(0,50000));}
    catch(error){warnings.push(`Page ${pageNumber}: QR scan unavailable (${error?.message||'render error'}).`);}
   }
   page.cleanup();
  }
  if(!textCharacters)warnings.push('No searchable text layer was found. The original remains in the wallet; use a QR import or manual transcription and verify every page.');
  if(pdf.numPages>limits.maxQrPages)warnings.push(`QR scanning was limited to the first ${limits.maxQrPages} pages; all ${pdf.numPages} pages remain in the original PDF.`);
  const metadata=await pdf.getMetadata().catch(()=>null);
  return{schema:'dl-local-permit-pdf/v1',name:policy.name,size:policy.size,pageCount:pdf.numPages,text:joinPdfPages(pageTexts,limits.maxTextChars),pageTexts,qrCodes,warnings,metadata:{title:clean(metadata?.info?.Title||metadata?.metadata?.get?.('dc:title')),author:clean(metadata?.info?.Author||metadata?.metadata?.get?.('dc:creator'))},readerVersion:PDFJS_VERSION,processedLocally:true};
 }finally{await pdf.destroy().catch(()=>{});}
}
