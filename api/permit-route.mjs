import { publicProviderURL, parsePublicProvider } from '../src/assets/permits/provider.mjs';
const send = (res, status, body) => { res.setHeader('Cache-Control', 'private, no-store'); res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
export async function resolvePermitURL(raw, fetcher = fetch) {
  const url = publicProviderURL(raw); if (!url) throw Error('Unsupported route reference. Use the original permit for manual entry.');
  const response = await fetcher(url.href, { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  if ([401, 403].includes(response.status)) throw Error('This issuing service requires authorized access. QR retained; enter the route from the original permit.');
  if (!response.ok || response.status >= 300 || !/application\/json/i.test(response.headers.get('content-type') || '')) throw Error('The route is unavailable in a supported public format. No sign-in or access-control bypass was attempted.');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 2000000) throw Error('Provider route exceeds the import limit.'); chunks.push(part.value); } } finally { await reader.cancel(); }
  // Return only allowlisted permit fields. Provider credentials and executable content never leave this server adapter.
  return parsePublicProvider(JSON.parse(await new Blob(chunks).text()));
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Use POST.' }); }
  const origin = req.headers.origin, host = req.headers.host;
  let sameOrigin = false; try { sameOrigin = new URL(origin).host === host; } catch { /* Reject malformed origin. */ }
  if (!sameOrigin) return send(res, 403, { error: 'Same-origin request required.' });
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '') || Number(req.headers['content-length'] || 0) > 2048) return send(res, 400, { error: 'Send a small JSON route reference.' });
  try {
    let body = req.body;
    if (!body) { let raw = ''; for await (const part of req) { raw += part; if (raw.length > 2048) throw Error('Request too large.'); } body = raw; }
    if (typeof body === 'string') body = JSON.parse(body);
    if (JSON.stringify(body).length > 2048) throw Error('Request too large.');
    if (typeof body?.url !== 'string' || body.url.length > 1000) throw Error('Invalid route reference.');
    return send(res, 200, { permit: await resolvePermitURL(body.url) });
  } catch (error) { return send(res, 422, { error: error.name === 'AbortError' || error.name === 'TimeoutError' ? 'Public route service timed out. QR retained for manual entry.' : /Unexpected token|JSON/.test(error.message) ? 'Unsupported route response. Use manual entry.' : error.message }); }
}
