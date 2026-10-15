import { blankPermit, sourceText, meters } from '../src/assets/permits/core.mjs';
import { texasPermitReference, sanitizeIssuerMap } from '../src/assets/permits/issuer-map.mjs';

const HOST = 'https://txpros.txdmv.gov';
const unavailable = () => Error('Texas did not supply a supported public route map. Keep the QR and open the issuer link; no route was imported.');
async function read(response, type, max) {
  if (!response.ok || response.status >= 300 || !response.headers.get('content-type')?.toLowerCase().includes(type)) { await response.body?.cancel(); throw unavailable(); }
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > max) throw unavailable(); chunks.push(part.value); } }
  finally { await reader.cancel(); }
  return new TextDecoder('utf-8',{fatal:true}).decode(await new Blob(chunks).arrayBuffer());
}
const revision = p => JSON.stringify([p?.PermitID,p?.PermitNo,p?.Status,p?.IsDeleted,p?.DirectionsModified,p?.LastUpdateDate,p?.Trips]);
export function parseTexasMap(details, geometry, ref, retrievedAt = new Date().toISOString()) {
  const p = details?.d, g = geometry?.d;
  if (!ref || p?.PermitID !== ref.id || p.Status !== 'Issued' || p.IsDeleted !== false || p.DirectionsModified !== false || !Array.isArray(p.Trips) || p.Trips.length !== 1 || !/^\d{1,16}$/.test(String(p.PermitNo))) throw unavailable();
  const trip = p.Trips[0], rows = trip.DrivingDirs, stops = trip.Stops;
  if (!Array.isArray(rows) || rows.length < 3 || rows.length > 1002 || rows.some((r,i) => r.SequenceNo !== i) || !Array.isArray(stops) || stops.length !== 2 || stops[0].LegType !== 1 || stops[1].LegType !== 2) throw unavailable();
  const origin = sourceText(rows[0].To, 350).match(/^\[Loaded Route Origin:\s*(.+?)\s*\]$/), destination = sourceText(rows.at(-1).To,350).match(/^\[Loaded Route Destination:\s*(.+?)\s*\]$/);
  if (!origin || !destination || !Array.isArray(g?.LatLons) || g.LatLons.length < 2 || g.LatLons.length > 20000 || JSON.stringify(g.ptsIndices) !== JSON.stringify([g.LatLons.length]) || JSON.stringify(g.legTypes) !== '[1,2]') throw unavailable();
  const result = blankPermit(); result.state = 'TX'; result.number = String(p.PermitNo); result.timeZone = 'America/Chicago';
  result.entry.label = origin[1]; result.exit.label = destination[1];
  result.routeText = sourceText(rows.slice(1,-1).map(row => {
    const road = sourceText(row.Route,200,'Issued road'), instruction = sourceText(row.To,1000,'Issued instruction');
    if (!road.trim() || !instruction.trim() || !Number.isFinite(row.Miles) || row.Miles < 0 || /\[Loaded Route|\[Start empty|\[End empty/.test(instruction)) throw unavailable();
    return `${road} · ${row.Miles > 0 ? row.Miles : '< 0.1'} mi — ${instruction}`;
  }).join('\n'));
  result.issuerMap = sanitizeIssuerMap({ format:'txpros-issuer-map/v1', sourceUrl:ref.url, permitNumber:result.number, routeText:result.routeText, entryLabel:result.entry.label, exitLabel:result.exit.label, retrievedAt, paths:[g.LatLons.map(pt => [pt.Lat,pt.Lon])] },result);
  for (const [stop,point] of [[stops[0],result.issuerMap.paths[0][0]],[stops[1],result.issuerMap.paths[0].at(-1)]]) {
    if (![stop.Lat,stop.Lon].every(Number.isFinite) || meters([stop.Lat,stop.Lon],point) > 100) throw unavailable();
  }
  // Dates/conditions remain for original review. No invented maneuver positions.
  result.confidence = Object.fromEntries(['state','number','entry','exit','routeText'].map(key => [key,{score:.85,source:'Texas QR page; compare with original'}]));
  return result;
}
export async function resolveTexasPermitMap(raw, fetcher = fetch) {
  const ref = texasPermitReference(raw); if (!ref) throw unavailable();
  const signal = AbortSignal.timeout(18000);
  const options = { redirect:'manual', credentials:'omit', signal, cache:'no-store' };
  // A fresh anonymous issuer-page session is required by its own Show Map call.
  // Never accept/forward user cookies, authentication headers or provider keys.
  const landing = await fetcher(ref.url,{...options,headers:{Accept:'text/html'}});
  const html = await read(landing,'text/html',250000);
  if (!html.includes(`value="${ref.id}" id="PID"`) || !html.includes('GetLatLonForPermit')) throw unavailable();
  const session = (landing.headers.getSetCookie?.() || []).map(c => c.match(/^ASP\.NET_SessionId=([A-Za-z0-9]{16,80});/i)?.[1]).filter(Boolean);
  if (session.length !== 1) throw unavailable();
  const post = async (path, body) => {
    const response = await fetcher(HOST+path,{...options,method:'POST',headers:{Accept:'application/json','Content-Type':'application/json; charset=utf-8',Cookie:`ASP.NET_SessionId=${session[0]}`},body:JSON.stringify(body)});
    try { return JSON.parse(await read(response,'application/json',3000000)); } catch { throw unavailable(); }
  };
  const detailPath = '/Services/PermitService.svc/GetQRPermit', body = {PermitID:ref.id};
  const before = await post(detailPath,body);
  const geometry = await post('/Services/RouteService.asmx/GetLatLonForPermit',{PermitID:ref.id,UseHistoryDB:false,AuditPermitID:-1});
  const after = await post(detailPath,body);
  if (revision(before?.d) !== revision(after?.d)) throw Error('Texas changed this permit while its map was loading. Nothing was imported; retry and compare the current original.');
  return parseTexasMap(after,geometry,ref);
}
