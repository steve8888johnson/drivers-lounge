import test from 'node:test';
import assert from 'node:assert/strict';
import { scanPDFPages, scanViewport, PDF_SCAN_LIMITS, cleanPDFProgress, mergePDFProgress, pdfProgressView } from '../src/assets/permits/pdf-scan.mjs';
import { parkedSource } from '../src/assets/permits/speech.mjs';
import { saveOriginalBatch, originalBatchSummary } from '../src/assets/permits/document-intake.mjs';
import { scanImage } from '../src/assets/permits/import.mjs';
const fakeRender = released => async page => ({ canvas: { page }, release: () => released.push(page) });

test('stopped PDF history resumes the first unscanned page and later passes complete the same original',()=>{
  const first=mergePDFProgress(null,{totalPages:4,pages:[{page:1,status:'qr-found',count:1},{page:2,status:'no-readable-qr',count:0}]});
  const before=JSON.stringify(first);assert.equal(pdfProgressView(first).nextPage,3);assert.equal(pdfProgressView(first).checked,2);
  const rest=mergePDFProgress(first,{totalPages:4,pages:[{page:3,status:'no-readable-qr',count:0},{page:4,status:'qr-found',count:1}]});
  assert(pdfProgressView(rest).complete);assert.equal(pdfProgressView(rest).checked,4);assert.equal(JSON.stringify(first),before);assert.match(pdfProgressView(rest).summary,/does not verify the route/);assert(!('approved' in rest));
});
test('failed pages remain unresolved across later passes and are the next explicit retry',()=>{
  const first=mergePDFProgress(null,{totalPages:3,pages:[{page:1,status:'failed',count:0},{page:2,status:'qr-found',count:1}]});
  const later=mergePDFProgress(first,{totalPages:3,pages:[{page:3,status:'no-readable-qr',count:0}]});
  assert.equal(pdfProgressView(later).nextPage,1);assert.equal(pdfProgressView(later).action,'Retry page 1');assert.equal(pdfProgressView(later).checked,2);assert(!pdfProgressView(later).complete);
  const retried=mergePDFProgress(later,{totalPages:3,pages:[{page:1,status:'no-readable-qr',count:0}]});assert(pdfProgressView(retried).complete);
});
test('retrying does not double-count and a latest failure replaces a previous successful scan',()=>{
  const pass={totalPages:1,pages:[{page:1,status:'qr-found',count:1}]},first=mergePDFProgress(null,pass);
  assert.equal(mergePDFProgress(first,pass).pages.length,1);
  const failed=mergePDFProgress(first,{totalPages:1,pages:[{page:1,status:'failed',count:0}]});assert.equal(pdfProgressView(failed).checked,0);assert(!pdfProgressView(failed).complete);
});
test('changed page count resets incompatible history and empty cancelled passes never claim completion',()=>{
  const old=mergePDFProgress(null,{totalPages:1,pages:[{page:1,status:'qr-found',count:1}]});
  const reset=mergePDFProgress(old,{totalPages:3,pages:[{page:2,status:'qr-found',count:1}]});assert.equal(pdfProgressView(reset).nextPage,1);assert.equal(pdfProgressView(reset).checked,1);
  const empty=mergePDFProgress(null,{totalPages:2,pages:[]});assert.equal(pdfProgressView(empty).nextPage,1);assert(!pdfProgressView(empty).complete);
});
test('untrusted scan metadata cannot fabricate a complete report or carry arbitrary fields',()=>{
  const good={schema:'dl-pdf-qr-progress/v1',totalPages:2,pages:[{page:1,status:'qr-found',count:1,approved:true}],complete:true};
  assert(!pdfProgressView(good).complete);assert(!('approved' in cleanPDFProgress(good).pages[0]));
  for(const bad of [{...good,totalPages:10001},{...good,pages:[...good.pages,...good.pages]},{...good,pages:[{page:3,status:'qr-found',count:1}]},{...good,pages:[{page:1,status:'failed',count:1}]},{...good,pages:[{page:1,status:'qr-found',count:0}]}]){assert.equal(cleanPDFProgress(bad),null);assert.equal(pdfProgressView(bad),null);}
});

test('PDF QR pages retain duplicate provenance without duplicating payloads or inferring routes', async () => {
  const released = [], updates = [];
  const result = await scanPDFPages({ totalPages: 3, render: fakeRender(released), decode: async ({page}) => page === 2 ? [] : ['https://example.gov/qr', 'https://example.gov/qr'], onPage: p => updates.push(p) });
  assert.deepEqual(result.codes, [{ raw:'https://example.gov/qr', pages:[1,3] }]);
  assert.equal(result.pages[1].status,'no-readable-qr'); assert(result.scanComplete);
  assert.deepEqual(released,[1,2,3]); assert.equal(updates.length,6); assert(!('route' in result));
});
test('failed PDF page is visible and does not hide subsequent pages or imply complete scanning', async () => {
  const released = [];
  const result = await scanPDFPages({ totalPages:3, render:fakeRender(released), decode:async ({page}) => { if (page === 2) throw Error('decode'); return ['page'+page]; } });
  assert.equal(result.pages[1].status,'failed'); assert.equal(result.codes.length,2); assert(!result.scanComplete); assert.deepEqual(released,[1,2,3]);
});
test('stop during decoding discards late codes, releases pixels and leaves later pages unscanned', async () => {
  const controller = new AbortController(), released = [];
  const result = await scanPDFPages({ totalPages:3, signal:controller.signal, render:fakeRender(released), decode:async ({page}) => { if(page===2)controller.abort(); return ['page'+page]; } });
  assert.equal(result.pages.length,1); assert.deepEqual(result.codes,[{raw:'page1',pages:[1]}]); assert.equal(result.nextPage,2); assert(result.stopped); assert(!result.scanComplete); assert.deepEqual(released,[1,2]);
});
test('PDF scan limit is explicit and continuation starts at the requested actual page', async () => {
  const result = await scanPDFPages({ totalPages:43, render:fakeRender([]), decode:async () => [] });
  assert.equal(result.pages.length,PDF_SCAN_LIMITS.pages); assert.equal(result.nextPage,41); assert(!result.scanComplete);
  const rest = await scanPDFPages({ totalPages:43, startPage:41, render:fakeRender([]), decode:async () => [] });
  assert.deepEqual(rest.pages.map(p=>p.page),[41,42,43]); assert.equal(rest.nextPage,null); assert(!rest.scanComplete);
});
test('stopped and invalid page ranges never render a PDF page', async () => {
  let rendered=0; const controller=new AbortController();controller.abort();
  const options={totalPages:2,render:async()=>{rendered++;throw Error('should not render');},decode:async()=>[]};
  assert.equal((await scanPDFPages({...options,signal:controller.signal})).nextPage,1);
  for(const startPage of [0,3,1.5,NaN]) await assert.rejects(()=>scanPDFPages({...options,startPage}),/Invalid PDF page range/);
  assert.equal(rendered,0);
});
test('oversized or malformed QR data becomes a failed page, never a partial reference', async () => {
  for (const raw of ['x'.repeat(50001),null]) {
    const result=await scanPDFPages({totalPages:1,render:fakeRender([]),decode:async()=>['valid',raw]});
    assert.equal(result.pages[0].status,'failed');assert.deepEqual(result.codes,[]);assert(!result.scanComplete);
  }
});
test('empty decoder detections are not QR references or failures', async () => {
  const result=await scanPDFPages({totalPages:2,render:fakeRender([]),decode:async({page})=>page===1?['','  ','reference']:['']});
  assert.equal(result.pages[0].count,1); assert.equal(result.pages[1].status,'no-readable-qr'); assert.deepEqual(result.codes,[{raw:'reference',pages:[1]}]);
});
test('render dimensions fit memory and longest-edge bounds including unusual PDFs', () => {
  for(const [w,h] of [[612,792],[100000,90000],[1,200000],[500,500]]) {
    const size=scanViewport(w,h);assert(size.width*size.height<=PDF_SCAN_LIMITS.pixels);assert(Math.max(size.width,size.height)<=PDF_SCAN_LIMITS.longestSide);
  }
  for(const w of [0,-1,Infinity,NaN])assert.throws(()=>scanViewport(w,10),/Invalid PDF page size/);
});
test('spoken source comparison uses the exact saved line and never speaks an unready route', () => {
  const view={available:true,permit:{state:'UT'},step:{routeLine:4},source:'Take exit 2; do not use ramp B.'};
  const spoken=parkedSource(view);assert(spoken.includes(view.source));assert(spoken.includes('line 4'));assert(spoken.includes('not live guidance'));
  assert.equal(parkedSource({...view,available:false}),null);assert.equal(parkedSource({...view,source:' '}),null);
});

test('a failed original save is counted explicitly and does not drop later selected pages', async () => {
  const files = ['route.pdf', 'bad.heic', 'conditions.pdf'].map(name => ({ name, size: 50 }));
  const calls = [], progress = [];
  const results = await saveOriginalBatch(files, async file => {
    calls.push(file.name);
    if (file.name === 'bad.heic') throw Error('Choose JPG or PDF.');
    return { id: file.name };
  }, (index, total) => progress.push([index, total]));
  assert.deepEqual(calls, files.map(file => file.name));
  assert.deepEqual(progress, [[1,3],[2,3],[3,3]]);
  assert.equal(results[2].document.id, 'conditions.pdf');
  assert.match(originalBatchSummary(results), /^2 of 3 original file\(s\) saved/);
  assert.match(originalBatchSummary(results), /NOT SAVED[\s\S]*bad.heic: Choose JPG or PDF/);
  assert(!results.some(result => 'route' in result || 'approved' in result));
});

test('empty/fully failed batches never claim that originals were saved', async () => {
  assert.match(originalBatchSummary(await saveOriginalBatch([], () => assert.fail())), /^0 of 0/);
  const result = await saveOriginalBatch([{ name: 'route.pdf', size: 50 }], async () => { throw Error('Device storage full.'); });
  assert.match(originalBatchSummary(result), /^0 of 1/);
  assert.match(originalBatchSummary(result), /Device storage full/);
});

test('oversized selections reject before the first original is written', async () => {
  let writes = 0;
  for (const files of [Array.from({length:21}, () => ({size:1})), [{size:46*1024*1024}]]) {
    await assert.rejects(() => saveOriginalBatch(files, () => { writes++; }), /Nothing from this selection was saved/);
  }
  assert.equal(writes, 0);
});

test('duplicate filenames preserve separate original files without merging their contents', async () => {
  let index = 0;
  const files = [{name:'permit.pdf',size:1},{name:'permit.pdf',size:2}];
  const result = await saveOriginalBatch(files, async file => ({id:++index,size:file.size}));
  assert.deepEqual(result.map(item => item.document), [{id:1,size:1},{id:2,size:2}]);
  assert.match(originalBatchSummary(result), /^2 of 2/);
});

test('stopping a photo scan while image decoding is pending closes its bitmap and never reads QR pixels', async () => {
  const old = globalThis.createImageBitmap, controller = new AbortController();
  let closed = 0, calls = 0;
  try {
    globalThis.createImageBitmap = async () => { calls++; controller.abort(); return {close(){closed++;}}; };
    await assert.rejects(() => scanImage({type:'image/png'}, {signal:controller.signal}), {name:'AbortError'});
    assert.equal(calls,1); assert.equal(closed,1);
    await assert.rejects(() => scanImage({type:'image/png'}, {signal:controller.signal}), {name:'AbortError'});
    assert.equal(calls,1);
  } finally { if (old) globalThis.createImageBitmap=old; else delete globalThis.createImageBitmap; }
});
