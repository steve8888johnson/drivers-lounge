// Read local PDF pixels only. No URL, text extraction, form actions or inferred routes.
export const PDF_SCAN_LIMITS = Object.freeze({ pages: 40, bytes: 15 * 1024 * 1024, longestSide: 2300, pixels: 4000000, timeoutMs: 120000 });
// Processing history only: a scanned page is not a verified permit or route.
export function cleanPDFProgress(value) {
  if(value?.schema!=='dl-pdf-qr-progress/v1'||!Number.isInteger(value.totalPages)||value.totalPages<1||value.totalPages>10000||!Array.isArray(value.pages)||value.pages.length>value.totalPages)return null;
  const seen=new Set(),pages=[];
  for(const p of value.pages){
    if(!Number.isInteger(p?.page)||p.page<1||p.page>value.totalPages||seen.has(p.page)||!['qr-found','no-readable-qr','failed'].includes(p.status)||!Number.isInteger(p.count)||p.count<0||p.count>64||(p.status==='qr-found')!==(p.count>0))return null;
    seen.add(p.page);pages.push({page:p.page,status:p.status,count:p.count});
  }
  return {schema:'dl-pdf-qr-progress/v1',totalPages:value.totalPages,pages:pages.sort((a,b)=>a.page-b.page)};
}
export function mergePDFProgress(previous,result) {
  const pass=cleanPDFProgress({schema:'dl-pdf-qr-progress/v1',totalPages:result?.totalPages,pages:result?.pages});
  if(!pass)return null;
  const old=cleanPDFProgress(previous),pages=new Map((old?.totalPages===pass.totalPages?old.pages:[]).map(p=>[p.page,p]));
  // The latest attempt controls. A failed rescan must not keep an old success.
  for(const p of pass.pages)pages.set(p.page,p);
  return cleanPDFProgress({...pass,pages:[...pages.values()]});
}
export function pdfProgressView(value) {
  const progress=cleanPDFProgress(value);if(!progress)return null;
  const pages=new Map(progress.pages.map(p=>[p.page,p])),failed=progress.pages.filter(p=>p.status==='failed').length;
  const checked=progress.pages.length-failed,unscanned=progress.totalPages-progress.pages.length;
  let nextPage=null;for(let p=1;p<=progress.totalPages;p++)if(!pages.has(p)||pages.get(p).status==='failed'){nextPage=p;break;}
  return {checked,failed,unscanned,nextPage,complete:nextPage===null,
    summary:`QR scan checked ${checked} of ${progress.totalPages} pages; ${failed} failed; ${unscanned} not yet scanned. Scanning does not verify the route.`,
    action:nextPage===null?'Scan PDF pages again':`${pages.get(nextPage)?.status==='failed'?'Retry':'Continue from'} page ${nextPage}`};
}
export function scanViewport(width, height) {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw Error('Invalid PDF page size.');
  const scale = Math.min(3, PDF_SCAN_LIMITS.longestSide / Math.max(width, height), Math.sqrt(PDF_SCAN_LIMITS.pixels / (width * height)));
  return { scale, width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
const aborted = () => new DOMException('Scan stopped. Originals remain saved.', 'AbortError');
export async function scanPDFPages({ totalPages, render, decode, onPage = () => {}, signal, startPage = 1 }) {
  if (!Number.isInteger(totalPages) || totalPages < 1 || !Number.isInteger(startPage) || startPage < 1 || startPage > totalPages) throw Error('Invalid PDF page range.');
  const codes = new Map(), pages = [], endPage = Math.min(totalPages, startPage + PDF_SCAN_LIMITS.pages - 1);
  for (let page = startPage; page <= endPage; page++) {
    if (signal?.aborted) break;
    let rendered;
    try {
      onPage({ page, totalPages, status: 'scanning' });
      rendered = await render(page, signal);
      if (signal?.aborted) break;
      const found = await decode(rendered.canvas, { signal });
      if (signal?.aborted) break;
      const readable = [...new Set(found)].filter(raw => {
        if (typeof raw !== 'string' || raw.length > 50000) throw Error('Unsupported QR contents.');
        return !!raw.trim(); // A decoder's empty detection is not a retained reference.
      });
      for (const raw of readable) {
        if (!codes.has(raw)) codes.set(raw, []);
        codes.get(raw).push(page);
      }
      pages.push({ page, status: readable.length ? 'qr-found' : 'no-readable-qr', count: readable.length });
      onPage({ ...pages.at(-1), totalPages });
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') break;
      pages.push({ page, status: 'failed', count: 0 }); onPage({ ...pages.at(-1), totalPages });
    } finally { rendered?.release(); }
  }
  return { totalPages, startPage, pages, codes: [...codes].map(([raw, pages]) => ({ raw, pages })), stopped: !!signal?.aborted,
    nextPage: pages.length && pages.at(-1).page < totalPages ? pages.at(-1).page + 1 : !pages.length ? startPage : null,
    scanComplete: startPage === 1 && pages.length === totalPages && pages.every(p => p.status !== 'failed') };
}

export async function scanPDF(file, { signal, onPage, decode, startPage = 1 } = {}) {
  if (file.type !== 'application/pdf' || file.size > PDF_SCAN_LIMITS.bytes || !file.size) throw Error('Choose a PDF original up to 15 MB.');
  if (signal?.aborted) throw aborted();
  const pdfjs = await import('../vendor/pdfjs-6.4.299/pdf.min.mjs');
  if (signal?.aborted) throw aborted();
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs-6.4.299/pdf.worker.min.mjs', import.meta.url).href;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signal?.aborted) throw aborted();
  const loading = pdfjs.getDocument({ data: bytes, isEvalSupported: false, enableXfa: false, useWasm: false, useWorkerFetch: false, disableAutoFetch: true, disableStream: true, stopAtErrors: true, disableWorkerRendering: true, verbosity: 0 });
  const local = new AbortController();
  let renderTask;
  const stop = () => { local.abort(); renderTask?.cancel(); void loading.destroy().catch(() => {}); };
  signal?.addEventListener('abort', stop, { once: true });
  const timeout = setTimeout(stop, PDF_SCAN_LIMITS.timeoutMs);
  try {
    if (signal?.aborted) stop();
    const pdf = await loading.promise;
    return await scanPDFPages({ totalPages: pdf.numPages, signal: local.signal, startPage, onPage, decode,
      render: async number => {
        const page = await pdf.getPage(number), original = page.getViewport({ scale: 1 });
        const size = scanViewport(original.width, original.height), canvas = document.createElement('canvas');
        canvas.width = size.width; canvas.height = size.height;
        const release = () => { canvas.width = 0; canvas.height = 0; page.cleanup(); };
        try {
          if (local.signal.aborted) throw aborted();
          renderTask = page.render({ canvasContext: canvas.getContext('2d', { willReadFrequently: true }), viewport: page.getViewport({ scale: size.scale }), background: 'rgb(255,255,255)' });
          await renderTask.promise; renderTask = null;
          return { canvas, release };
        } catch (error) { release(); throw error; }
      }
    });
  } catch (error) {
    if (local.signal.aborted) throw aborted();
    throw Error(error?.name === 'PasswordException' ? 'This PDF is password protected. Keep the original and add a clear QR photo.' : 'This PDF could not be scanned on this device. The original is saved; add a clear QR photo instead.');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', stop); await loading.destroy().catch(() => {}); }
}
