import { blankPermit, sanitizePermit, clean } from './core.mjs';
import { publicProviderURL } from './provider.mjs';
import { decodePhotoPixels } from './qr-scan.mjs';

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

export function parsePermitText(text) {
  const p = blankPermit(); p.routeText = clean(text);
  if (/illinois/i.test(text)) { p.state = 'IL'; p.timeZone = 'America/Chicago'; }
  else if (/state of ohio|\bohio\b/i.test(text)) { p.state = 'OH'; p.timeZone = 'America/New_York'; }
  p.number = text.match(/permit\s*(?:number|no\.?|#)?\s*:?\s*([A-Z]?\d{5,})/i)?.[1] || '';
  const date = s => { const m = s?.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[1]}-${m[2]}` : ''; };
  const dates = text.match(/Effective\s*Date\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s*(?:through|to|–|-)\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dates) { p.validFrom = date(dates[1]); p.validTo = date(dates[2]); }
  const entry = text.match(/Border Start:\s*([^\n]+)/i), exit = text.match(/Border End:\s*([^\n]+)/i);
  if (entry) p.entry.label = entry[1].trim();
  if (exit) p.exit.label = exit[1].trim();
  if (/Indiana\s*-?\s*I-94/i.test(p.entry.label)) Object.assign(p.entry, { state: 'IN', road: 'I-94' });
  if (/Iowa\s*-?\s*I-80/i.test(p.exit.label)) Object.assign(p.exit, { state: 'IA', road: 'I-80' });
  if (/Origin:\s*I-80 PA Line/i.test(text)) p.entry = { label: 'I-80 PA Line', state: 'PA', road: 'I-80' };
  p.confidence = Object.fromEntries(['state', 'number', 'validFrom', 'validTo', 'entry', 'exit', 'routeText'].map(field => [field, { score: field === 'routeText' ? .4 : p[field] && (typeof p[field] !== 'object' || p[field].label) ? .75 : 0, source: 'Text extraction; unconfirmed' }]));
  return p;
}

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
