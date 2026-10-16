import { createHash } from 'node:crypto';
import { prepareTomTomRequest } from './tomtom-candidate.mjs';
import { requestTomTomCandidate } from './tomtom-routing.mjs';

const project = 'prj_WABuJ8HC4AVK1h2FC4Y8LyrblDPW';
const backend = 'https://opwaikfrnpvovnaslvfz.supabase.co';
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const codes = new Set(['FREE_PLAN_NOT_VERIFIED','TESTER_NOT_ENABLED','SESSION_NOT_ACTIVE','APPROVAL_EXPIRING','REQUEST_ALREADY_USED','MONTHLY_LIMIT','DAILY_LIMIT','ACCOUNT_DAILY_LIMIT','REQUEST_TOO_SOON']);
const reply = (status, code, extra = {}) => Response.json({ status: 'HOLD', guidanceAllowed: false, provider: 'tomtom', reasons: [{ code }], ...extra }, {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin', ...(status === 405 ? { Allow: 'POST' } : {}) }
});

// Bounded streams prevent large/chunked input or backend responses from consuming memory.
async function jsonBody(body, maxBytes, signal) {
  if (!body) throw Error('missing body');
  const reader = body.getReader(), chunks = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal.aborted) throw Error('aborted');
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw Error('aborted');
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw Error('too large'); }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
}

async function backendJson(path, options, fetchImpl) {
  const signal = AbortSignal.timeout(5000);
  const response = await fetchImpl(backend + path, { ...options, signal, redirect: 'error', cache: 'no-store' });
  if (!response.ok || response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw Error('backend unavailable');
  return jsonBody(response.body, 65536, signal);
}

// A closed-by-default evaluation endpoint, not a source of operational directions.
// Server configuration, verified Auth and a database reservation are all required.
export function createTruckRouteHandler({ env = process.env, fetchImpl = fetch, provider = requestTomTomCandidate, clock = Date.now } = {}) {
  return async request => {
    if (request.method !== 'POST') return reply(405, 'POST_REQUIRED');
    if (env.DL_TOMTOM_EVALUATION_ENABLED !== 'true' || env.VERCEL_ENV !== 'preview' || env.VERCEL_PROJECT_ID !== project) return reply(503, 'CONNECTION_DISABLED');
    const previewHost = env.VERCEL_URL;
    if (typeof previewHost !== 'string' || !/^[a-z0-9-]+\.vercel\.app$/.test(previewHost) || request.headers.get('origin') !== `https://${previewHost}`) return reply(403, 'ORIGIN_REJECTED');
    if (env.SUPABASE_URL?.replace(/\/$/, '') !== backend || !env.SUPABASE_SERVICE_ROLE_KEY || !env.TOMTOM_API_KEY?.trim()) return reply(503, 'CONNECTION_NOT_CONFIGURED');
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return reply(415, 'JSON_REQUIRED');
    const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{20,8192})$/)?.[1];
    if (!token) return reply(401, 'SIGN_IN_REQUIRED');
    let input, requestId;
    try {
      const body = await jsonBody(request.body, 32768, AbortSignal.timeout(5000));
      if (!body || Object.keys(body).some(k => !['input','requestId'].includes(k)) || !uuid(body.requestId)) throw Error('invalid body');
      input = body.input; requestId = body.requestId;
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['vehicle','origin','destination','departure'].includes(k))) throw Error('invalid input');
      prepareTomTomRequest({ ...input, now: clock() }, { instructions: true });
    } catch { return reply(400, 'INVALID_TRUCK_OR_TRIP'); }
    let owner, session;
    try {
      // This server request verifies the token. Only then read its signed session claim.
      const user = await backendJson('/auth/v1/user', { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } }, fetchImpl);
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (!uuid(user.id) || user.is_anonymous === true || !user.email_confirmed_at || claims.sub !== user.id || claims.role !== 'authenticated' || !uuid(claims.session_id) || !Number.isFinite(claims.exp) || claims.exp * 1000 <= clock() + 10000) throw Error('invalid session');
      owner = user.id; session = claims.session_id;
    } catch { return reply(401, 'SIGN_IN_REQUIRED'); }
    let reservation;
    try {
      const prepared = prepareTomTomRequest({ ...input, now: clock() }, { instructions: true });
      const fingerprint = createHash('sha256').update(JSON.stringify([owner, prepared.endpoint, prepared.query, prepared.vehicleReviewBinding])).digest('hex');
      reservation = await backendJson('/rest/v1/rpc/dl_reserve_truck_route', {
        method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_owner: owner, p_session: session, p_request: requestId, p_fingerprint: fingerprint })
      }, fetchImpl);
    } catch { return reply(503, 'BUDGET_UNAVAILABLE'); }
    if (reservation?.allowed !== true || reservation.code !== 'RESERVED') return reply(429, codes.has(reservation?.code) ? reservation.code : 'BUDGET_UNAVAILABLE');
    const expiry = Date.parse(reservation.expires_at);
    if (!Number.isFinite(expiry) || expiry <= clock() + 10000 || expiry > clock() + 31000) return reply(503, 'APPROVAL_EXPIRING');
    try {
      // One reserved attempt. No retries or refunds, including timeout/429/invalid responses.
      const result = await provider(input, { enabled: true, freePlanVerified: true, apiKey: env.TOMTOM_API_KEY,
        fetchImpl, clock, includeInstructionDiagnostics: true });
      if (clock() >= expiry) return reply(503, 'APPROVAL_EXPIRING');
      // Explicit projection: never forward a route, credential, provider text or exception.
      const reasons = Array.isArray(result?.reasons) ? result.reasons.filter(r => /^[A-Z_]{1,80}$/.test(r?.code)).map(r => ({ code: r.code })) : [];
      const extra = { structurePassed: result?.structurePassed === true, reasons: reasons.length ? reasons : [{ code: 'PROVIDER_UNAVAILABLE' }] };
      if (result?.structurePassed === true && Number.isSafeInteger(result.instructionCount) && result.instructionCount >= 2 && result.instructionCount <= 5000) extra.instructionCount = result.instructionCount;
      return reply(200, 'REVIEW_ONLY', extra);
    } catch { return reply(503, 'PROVIDER_UNAVAILABLE'); }
  };
}
