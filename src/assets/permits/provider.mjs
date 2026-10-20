import { blankPermit, clean, pointOK } from './core.mjs';
import { inferBorderEdge, permitTimeZoneConfidence, permitTimeZoneForState } from './state-meta.mjs';
import { publicOfficialPermitReference } from './official-provider.mjs';

// Read-only public references observed on issued permits. No credentials,
// returned apiKey, remote scripts, SSML, alternative routes or navigation UI are used.
export function publicPermitReference(raw) {
  const official = publicOfficialPermitReference(raw); if (official) return official;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.port || u.username || u.password || u.search || u.hash) return null;
    if (u.hostname === 'permitnav.promiles.com' && /^\/permitnav3\/api\/Navigation\/json\/[A-Z]{2}\/PROD\/\d+\/\d+\/t$/.test(u.pathname)) return { url: u, format: 'promiles-public-json' };
    if (u.hostname === 'webapps.dot.illinois.gov' && /^\/ITAP\/api\/v1\/permits\/[A-Z0-9-]+\/[A-Z0-9]+\/route\/navigation$/.test(u.pathname)) return { url: u, format: 'illinois-public-json' };
  } catch { /* Unknown references stay in the manual workflow. */ }
  return null;
}
export function publicProviderURL(raw) { return publicPermitReference(raw)?.url || null; }
export function decodePolyline(encoded, precision) {
  if (typeof encoded !== 'string' || encoded.length > 2000000 || ![5, 6].includes(precision)) throw Error('Unsupported provider geometry.');
  let index = 0, lat = 0, lng = 0; const points = [], factor = 10 ** precision;
  const next = () => {
    let result = 0, shift = 0, byte;
    do { if (index >= encoded.length || shift > 30) throw Error('Truncated provider geometry.'); byte = encoded.charCodeAt(index++) - 63; if (byte < 0 || byte > 63) throw Error('Invalid provider geometry.'); result += (byte & 31) * 2 ** shift; shift += 5; } while (byte >= 32);
    return result & 1 ? -(Math.floor(result / 2) + 1) : Math.floor(result / 2);
  };
  while (index < encoded.length) { lat += next(); lng += next(); const point = [lat / factor, lng / factor]; if (!pointOK(point) || points.length >= 100000) throw Error('Invalid provider coordinates.'); points.push(point); }
  return points;
}
const isoDate=value=>{
  const raw=String(value||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return match?`${match[3]}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`:'';
};
export function parsePublicProvider(payload) {
  if (!payload || typeof payload.data !== 'string' || payload.data.length > 2000000) throw Error('Unsupported public provider format. Keep the QR and use manual entry.');
  const data = JSON.parse(payload.data);
  if (data.code !== 'Ok' || data.routes?.length !== 1) throw Error('Expected exactly one issued route. Alternative routes require manual review.');
  const route = data.routes[0], steps = route.legs?.flatMap(leg => leg.steps);
  if (!Array.isArray(steps) || !steps.length || steps.length > 1000) throw Error('No supported authorized maneuvers found.');
  const p = blankPermit(); p.state = clean(payload.jurisdiction, 2).toUpperCase();
  p.timeZone = permitTimeZoneForState(p.state);
  p.number = clean(payload.permitNumber || payload.permitNo || data.permitNumber || data.permitNo, 100);
  p.validFrom = isoDate(payload.validFrom || payload.effectiveDate || data.validFrom || data.effectiveDate);
  p.validTo = isoDate(payload.validTo || payload.expirationDate || data.validTo || data.expirationDate);
  p.entry = inferBorderEdge(clean(data.waypoints?.[0]?.name, 300), p.state);
  p.exit = inferBorderEdge(clean(data.waypoints?.at(-1)?.name, 300), p.state);
  p.steps = steps.map((step, i) => {
    if (!step.maneuver?.instruction) throw Error('An issued maneuver is missing its instruction.');
    return { routeLine: i + 1, text: clean(step.maneuver.instruction, 1000), road: clean(step.name, 200), lane: '', points: decodePolyline(step.geometry, payload.geometryPrecision) };
  });
  p.geometrySource = { format: 'promiles-public-json/v1', note: 'Geometry supplied by a public issued-route endpoint; complete original permit review remains required' };
  p.routeText = p.steps.map(s => s.text).join('\n');
  p.restrictions = clean(payload.preRouteMessage);
  p.confidence = Object.fromEntries(['state', 'entry', 'exit', 'routeText'].map(field => [field, { score: .85, source: 'Public issued-route QR data; compare with the complete permit' }]));
  p.confidence.timeZone = permitTimeZoneConfidence(p.state);
  p.confidence.number = { score: p.number ? .7 : 0, source: p.number ? 'Public issued-route metadata; confirm with original' : 'Not supplied by navigation endpoint' };
  p.confidence.validFrom = { score: p.validFrom ? .7 : 0, source: p.validFrom ? 'Public issued-route metadata; confirm with original' : 'Not supplied by navigation endpoint' };
  p.confidence.validTo = { score: p.validTo ? .7 : 0, source: p.validTo ? 'Public issued-route metadata; confirm with original' : 'Not supplied by navigation endpoint' };
  p.complete = false; return p;
}
