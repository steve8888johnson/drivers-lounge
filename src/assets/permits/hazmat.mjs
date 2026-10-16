import { CAMEO_NUMBERS } from './hazmat-sources.mjs';

// Cargo classification comes from reviewed shipping papers, never a chemical-name guess.
export const DIVISIONS = ['1.1','1.2','1.3','1.4','1.5','1.6','2.1','2.2','2.3','3','4.1','4.2','4.3','5.1','5.2','6.1','6.2','7','8','9'];
export const HAZMAT_NOTICE = 'Hazmat route review is required in addition to OS/OW permits. DOT, state, tribal and local restrictions control. CAMEO provides chemical reference information, not route authorization.';
const str = (v, n = 2000) => String(v ?? '').slice(0, n).trim();
const dateOK = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && Number.isFinite(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().slice(0,10) === v;
export const blankMaterial = () => ({ unNumber: '', shippingName: '', division: '', subsidiary: '', packingGroup: '', quantity: '', unit: '', packaging: '', inhalation: 'unknown', hrcq: 'unknown' });
export const blankHazmat = () => ({ enabled: false, materials: [], placarding: 'unknown', shippingPaperRef: '', emergencyContact: '', writtenPlanRef: '', compatibilityNotes: '', review: null });
export const blankHazmatRoute = () => ({ disposition: 'unknown', registryChecked: false, authoritiesChecked: false, checkedOn: '', validThrough: '', reviewer: '', authorityURL: '', notes: '', alerts: [], review: null });
export const hazmatActive = trip => !!(trip.hazmat?.enabled || trip.hazmat?.materials?.length || trip.profile?.hazmat?.trim() || trip.permits?.some(p => p.kind === 'hazmat-route-plan'));
export function normalizeUN(value) { const m = str(value).toUpperCase().match(/^(UN|NA)\s*-?\s*(\d{4})$/); return m ? `${m[1]}${m[2]}` : ''; }
export function cameoURL(value) { const code = normalizeUN(value).slice(2); return CAMEO_NUMBERS.has(code) ? `https://cameochemicals.noaa.gov/unna/${Number(code)}` : 'https://cameochemicals.noaa.gov/search/simple'; }
export function sourceURL(value) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
export function sanitizeHazmat(value) {
  const h = blankHazmat(); if (!value || typeof value !== 'object') return h;
  if (value.materials !== undefined && (!Array.isArray(value.materials) || value.materials.length > 30)) throw Error('Use at most 30 hazardous material entries.');
  h.enabled = value.enabled === true; h.placarding = str(value.placarding, 30);
  for (const k of ['shippingPaperRef','emergencyContact','writtenPlanRef','compatibilityNotes']) h[k] = str(value[k]);
  h.materials = (value.materials || []).map(m => Object.fromEntries(Object.keys(blankMaterial()).map(k => [k, str(m?.[k], 300)])));
  return h; // Import never accepts another device's confirmation.
}
export function sanitizeHazmatRoute(value) {
  const r = blankHazmatRoute(); if (!value || typeof value !== 'object') return r;
  for (const k of ['disposition','checkedOn','validThrough','reviewer','notes']) r[k] = str(value[k]);
  r.authorityURL = sourceURL(value.authorityURL); r.registryChecked = value.registryChecked === true; r.authoritiesChecked = value.authoritiesChecked === true;
  if (value.alerts !== undefined && (!Array.isArray(value.alerts) || value.alerts.length > 100)) throw Error('Use at most 100 reviewed hazmat route alerts.');
  r.alerts = (value.alerts || []).map(a => ({ routeLine: Number(a.routeLine), text: str(a.text, 1000), sourceURL: sourceURL(a.sourceURL) }));
  return r;
}
export const cargoKey = h => JSON.stringify(sanitizeHazmat(h));
const routeEvidence = p => [p.state,p.number,p.kind,p.validFrom,p.validTo,p.timeZone,p.entry,p.exit,p.routeText,p.restrictions,p.steps,p.limits,p.travelWindow];
export const hazmatRouteKey = (trip,p) => JSON.stringify([cargoKey(trip.hazmat),trip.profile,trip.departure,trip.permits.map(routeEvidence),sanitizeHazmatRoute(p.hazmatRoute)]);
export const cargoReviewed = h => !!h?.review && h.review.key === cargoKey(h);
const classes = m => [m.division,...String(m.subsidiary||'').split(',').map(s=>s.trim())];
export function materialErrors(h) {
  const errors = [];
  if (!h?.materials?.length) errors.push('Hazmat: add every material from the shipping papers.');
  for (const [i,m] of (h?.materials || []).entries()) {
    const label = `Material ${i+1}`;
    if (!normalizeUN(m.unNumber)) errors.push(`${label}: enter UN or NA plus four digits.`);
    if (!m.shippingName?.trim()) errors.push(`${label}: copy the proper shipping name.`);
    if (!DIVISIONS.includes(m.division)) errors.push(`${label}: select the exact class/division.`);
    if (m.subsidiary && m.subsidiary.split(',').some(s => !DIVISIONS.includes(s.trim()))) errors.push(`${label}: enter valid comma-separated subsidiary classes/divisions.`);
    if (!['I','II','III','not-assigned'].includes(m.packingGroup)) errors.push(`${label}: confirm packing group or not assigned.`);
    if (!(Number(m.quantity) > 0) || !Number.isFinite(Number(m.quantity)) || !['lb','kg','gal','L','ft3','m3'].includes(m.unit)) errors.push(`${label}: enter quantity and units from the shipping papers.`);
    if (!['bulk','non-bulk','residue'].includes(m.packaging)) errors.push(`${label}: confirm packaging, including uncleaned residue.`);
    if (!['yes','no'].includes(m.inhalation)) errors.push(`${label}: confirm poison/toxic inhalation hazard status.`);
    if (!['yes','no'].includes(m.hrcq)) errors.push(`${label}: confirm highway route-controlled radioactive quantity status.`);
    if (classes(m).includes('2.3') && m.inhalation !== 'yes') errors.push(`${label}: Division 2.3 conflicts with the entered inhalation hazard status.`);
    if (m.hrcq === 'yes' && m.division !== '7' && !m.subsidiary.split(',').map(s=>s.trim()).includes('7')) errors.push(`${label}: radioactive quantity status conflicts with the entered classes.`);
  }
  if (!['required','not-required'].includes(h?.placarding)) errors.push('Hazmat: the carrier must determine placarding applicability.');
  if (!h?.shippingPaperRef?.trim() || !h?.emergencyContact?.trim()) errors.push('Hazmat: retain shipping-paper reference and emergency contact information.');
  if ((h?.materials || []).length > 1 && !h.compatibilityNotes?.trim()) errors.push('Hazmat: record the carrier review of mixed-load compatibility and segregation.');
  if ((h?.materials || []).some(m => classes(m).some(c=>['1.1','1.2','1.3'].includes(c)) || m.hrcq === 'yes') && !h.writtenPlanRef?.trim()) errors.push('Hazmat: record the required carrier written route-plan reference for explosives/HRCQ.');
  return [...new Set(errors)];
}
export function confirmCargo(h, now = Date.now()) { const errors=materialErrors(h); if(errors.length)throw Error(errors[0]); h.review={key:cargoKey(h),at:new Date(now).toISOString()}; }
export function routeReviewErrors(trip,p,date=trip.departure) {
  const r=p.hazmatRoute || blankHazmatRoute(), e=[], label=`${p.state || 'State'} hazmat`;
  if (r.disposition !== 'clear') e.push(`${label}: ${r.disposition === 'conflict' ? 'route conflict. Resolve with the issuing/routing authorities; no detour will be substituted.' : 'routing applicability is unresolved.'}`);
  if (!r.registryChecked || !r.authoritiesChecked) e.push(`${label}: review the FMCSA registry and current state/tribal/local, tunnel and bridge requirements.`);
  if (!dateOK(r.checkedOn) || !dateOK(r.validThrough) || r.checkedOn > date || r.validThrough < date || r.checkedOn > r.validThrough) e.push(`${label}: source review does not cover this travel date.`);
  if (!r.reviewer?.trim() || !sourceURL(r.authorityURL) || !r.notes?.trim()) e.push(`${label}: record reviewer, authority source and the route-specific determination.`);
  if (/^https:\/\/([^/]*\.)?cameochemicals\.noaa\.gov\//i.test(r.authorityURL)) e.push(`${label}: CAMEO is chemical reference information, not a routing authority. Record the applicable routing source.`);
  if (r.alerts.some(a=>!Number.isInteger(a.routeLine)||a.routeLine<1||a.routeLine>p.routeText.split('\n').length||!a.text||!sourceURL(a.sourceURL)||!p.steps.some(s=>s.routeLine===a.routeLine))) e.push(`${label}: each alert needs a supplied maneuver, warning text and HTTPS authority source.`);
  return e;
}
export function confirmHazmatRoute(trip,p,now=Date.now()) {
  const errors=[...materialErrors(trip.hazmat),...routeReviewErrors(trip,p)];
  if(p.hazmatRoute?.checkedOn>new Date(now).toISOString().slice(0,10))errors.unshift('Source review cannot be dated in the future.');
  if(!cargoReviewed(trip.hazmat))errors.unshift('Confirm cargo against the shipping papers first.');
  if(!p.review || !p.geometryReview)errors.unshift('Confirm the route evidence and geometry before hazmat review.');
  if(errors.length)throw Error(errors[0]);
  p.hazmatRoute.review={key:hazmatRouteKey(trip,p),at:new Date(now).toISOString()};
}
export function hazmatErrors(trip,{date=trip.departure,permit=null}={}) {
  if(!hazmatActive(trip))return [];
  const errors=materialErrors(trip.hazmat);
  if(!cargoReviewed(trip.hazmat))errors.push('Hazmat cargo has not been confirmed against shipping papers.');
  for(const p of permit?[permit]:trip.permits){
    errors.push(...routeReviewErrors(trip,p,date));
    if(p.hazmatRoute?.review?.key!==hazmatRouteKey(trip,p))errors.push(`${p.state || 'State'}: confirm hazmat compatibility with this exact route and load revision.`);
  }
  return [...new Set(errors)];
}
export function hazmatWarnings(trip,p,line=null) {
  if(!hazmatActive(trip))return [];
  const h=trip.hazmat||blankHazmat();
  const output=[`Hazmat cargo: ${h.materials.map(m=>`${m.unNumber} · class ${m.division}${m.inhalation==='yes'?' · inhalation hazard':''}${m.hrcq==='yes'?' · HRCQ radioactive':''}`).join('; ')}. Follow reviewed hazmat restrictions.`];
  if(p.hazmatRoute?.notes)output.push(p.hazmatRoute.notes);
  for(const a of p.hazmatRoute?.alerts||[])if(line===null||a.routeLine===line)output.push(`Hazmat route alert: ${a.text}`);
  return output;
}
