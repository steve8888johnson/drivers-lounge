import { readSpanEvidence } from './issuer-span-check.mjs';
// This is an issuer's overview, deliberately separate from navigable maneuvers.
// No route calculation, snapping, credentials or instruction-to-point inference.
export function texasPermitReference(raw) {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol) || u.hostname !== 'txpros.txdmv.gov' || u.port || u.username || u.password || u.hash || u.pathname !== '/PermitDetails02.aspx' || [...u.searchParams.keys()].sort().join(',') !== 'PermitID,QRUSER' || u.searchParams.get('QRUSER') !== '1') return null;
    const id = u.searchParams.get('PermitID');
    if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) return null;
    return { id: Number(id), url: `https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=${id}&QRUSER=1` };
  } catch { return null; }
}
export function issuerMapMatches(value, permit) {
  return !!value && permit.state === 'TX' && value.permitNumber === permit.number && value.routeText === permit.routeText && value.entryLabel === permit.entry?.label && value.exitLabel === permit.exit?.label;
}
export function texasPracticeReference(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/,''));
  if ([...params.keys()].join(',') !== 'texas') return null;
  return texasPermitReference(`https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=${params.get('texas')}&QRUSER=1`);
}
export const issuerRowText = row => `${row.road} · ${row.miles > 0 ? row.miles : '< 0.1'} mi — ${row.instruction}`;
export function sanitizeIssuerMap(value, permit) {
  const ref = texasPermitReference(value?.sourceUrl);
  if (!ref || value.sourceUrl !== ref.url || !['txpros-issuer-map/v1','txpros-issuer-map/v2','txpros-issuer-map/v3'].includes(value.format) || !issuerMapMatches(value, permit)) throw Error('The issuer map does not match the saved permit and route. Reload its QR map.');
  if (typeof value.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value.retrievedAt) || !Number.isFinite(Date.parse(value.retrievedAt))) throw Error('Issuer map retrieval time is missing.');
  if (!Array.isArray(value.paths) || value.paths.length !== 1 || !Array.isArray(value.paths[0]) || value.paths[0].length < 2 || value.paths[0].length > 20000) throw Error('Unsupported issuer map extent.');
  const paths = value.paths.map(path => path.map(p => {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || p[0] < 25 || p[0] > 37 || p[1] < -107 || p[1] > -93) throw Error('Invalid Texas issuer map coordinates.');
    return [...p];
  }));
  let rows;
  if (value.format !== 'txpros-issuer-map/v1') {
    if (!Array.isArray(value.rows) || !value.rows.length || value.rows.length > 1000) throw Error('The issuer route rows are missing. Reload its QR map.');
    let previous = 0;
    rows = value.rows.map((row,i) => {
      const safeText = (s,max) => typeof s === 'string' && s.trim() && s.length <= max && !/[\r\n\x00-\x1f]/.test(s);
      if (row.sequence !== i+1 || !safeText(row.road,200) || !safeText(row.instruction,1000) || ![row.miles,row.cumulativeMiles].every(n => Number.isFinite(n) && n >= 0 && n <= 5000) || row.cumulativeMiles < previous || Math.abs(row.cumulativeMiles-previous-row.miles) > .201) throw Error('The issuer route mileage or row order is inconsistent. Reload its QR map.');
      previous = row.cumulativeMiles;
      return {sequence:i+1,road:row.road,instruction:row.instruction,miles:row.miles,cumulativeMiles:row.cumulativeMiles};
    });
    if (rows.map(issuerRowText).join('\n') !== permit.routeText) throw Error('The issuer rows do not match the saved route text. Reload its QR map.');
  }
  let extra={};if(value.format==='txpros-issuer-map/v3') {if(typeof value.spanCheckNote!=='string'||value.spanCheckNote.length>300)throw Error('Missing span comparison status.');extra={spanEvidence:readSpanEvidence(value.spanEvidence,paths[0]),spanCheckNote:value.spanCheckNote};}
  return { format: value.format, sourceUrl: ref.url, permitNumber: permit.number, routeText: permit.routeText, entryLabel: permit.entry.label, exitLabel: permit.exit.label, retrievedAt: value.retrievedAt, paths, ...(rows ? {rows} : {}),...extra };
}
