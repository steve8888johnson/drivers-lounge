import { pointOK } from './core.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A sketch of supplied geometry only. Never bridge a gap, generate a road,
// place a GPS marker, or use a selected instruction as evidence of legality.
export function routeSketch(master, index = 0, focus = false, allowSelection = true) {
  const segments = (master?.segments || []).filter(s => pointOK(s.a) && pointOK(s.b));
  const steps = (master?.permits || []).flatMap(permit => permit.steps.map(step => ({ permit, step })));
  const position = Math.max(0, Math.min(steps.length - 1, Number.isFinite(index) ? Math.trunc(index) : 0));
  const selected = allowSelection && master?.ready && master.geometryChecked === true ? steps[position] : null;
  const selectedSegments = selected ? segments.filter(s => s.permitId === selected.permit.id && s.step === selected.step) : [];
  const selectable = selectedSegments.length > 0, focused = focus && selectable;
  const bounds = (focused ? selectedSegments : segments).flatMap(s => [s.a, s.b]);
  if (!bounds.length) {
    const issuerMap = master?.permits?.some(p => p.issuerMap);
    return { selectable: false, focused: false, markup: `<text x="400" y="155" text-anchor="middle" fill="#435570" font-size="18">${issuerMap ? 'No turn positions supplied' : 'No route geometry saved'}</text><text x="400" y="185" text-anchor="middle" fill="#435570" font-size="14">${issuerMap ? 'Open View scanned route above for the issuer map.' : 'Keep reviewing your original permits.'}</text>`, caption: issuerMap ? 'The issuer map is saved separately. Open View scanned route above; GPS and turn positions remain unavailable.' : 'No GPS position or road map. Scanning a QR alone does not supply a route.' };
  }
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const [lat, lng] of bounds) { minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); }
  const k = Math.max(.01, Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
  const scale = Math.min(680 / Math.max((maxLng - minLng) * k, .00001), 200 / Math.max(maxLat - minLat, .00001));
  const xy = p => [400 + (p[1] - (minLng + maxLng) / 2) * k * scale, 170 - (p[0] - (minLat + maxLat) / 2) * scale];
  const line = (s, color, width, extra = '') => `<polyline ${extra} points="${[s.a, s.b].map(p => xy(p).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  let markup = '<path d="M0 85H800M0 170H800M0 255H800M200 0V340M400 0V340M600 0V340" stroke="#dde5f0" stroke-width="1"/>';
  markup += segments.map(s => line(s, '#8595aa', 5)).join('');
  for (const s of selectedSegments) markup += line(s, 'white', 13) + line(s, '#1556bd', 7, 'data-selected-maneuver="true"');
  if (selectable) {
    for (const [label, point, title] of [['A', selectedSegments[0].a, 'Start of selected instruction'], ['B', selectedSegments.at(-1).b, 'End of selected instruction; not confirmed arrival']]) {
      const [x,y] = xy(point);
      markup += `<g><title>${title}</title><circle class="sketch-marker" cx="${x}" cy="${y}" r="16" fill="#102443" stroke="white" stroke-width="3"/><text class="sketch-label" x="${x}" y="${y}" dominant-baseline="central" text-anchor="middle" fill="white" font-size="15" font-weight="bold">${label}</text></g>`;
    }
  }
  const caption = selectable ? `${focused ? 'Selected turn' : 'Full supplied route'} · maneuver ${position + 1} of ${steps.length} · ${selected.permit.state}. Bold blue: selected instruction, A to B. Gray: other supplied geometry. Not a street map or live GPS; B does not confirm arrival.` : 'Supplied geometry needs review. No selected instruction, street map or live GPS. Gaps are not filled in.';
  return { selectable, focused, markup: `<title>${escape(caption)}</title>${markup}`, caption };
}
