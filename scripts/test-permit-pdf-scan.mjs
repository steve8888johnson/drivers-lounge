import test from 'node:test';
import assert from 'node:assert/strict';
import { scanPDFPages, scanViewport, PDF_SCAN_LIMITS } from '../src/assets/permits/pdf-scan.mjs';
import { parkedSource } from '../src/assets/permits/speech.mjs';
const fakeRender = released => async page => ({ canvas: { page }, release: () => released.push(page) });

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
