import { mapReview, coordinateText, STREET_TILES, STREET_OPTIONS } from './map-review.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let leafletPromise;
function leaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) leafletPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = '/assets/vendor/leaflet-1.9.4/leaflet.js';
    const timer = setTimeout(() => { script.remove(); reject(Error('Map library timed out. Keep reviewing the saved text; reopen to retry.')); }, 12000);
    script.onload = () => { clearTimeout(timer); window.L ? resolve(window.L) : reject(Error('Map library unavailable.')); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('Street map unavailable. Saved text and originals remain available.')); };
    document.head.append(script);
  }).catch(error => { leafletPromise = null; throw error; });
  return leafletPromise;
}

export function createMapReview() {
  const $ = selector => document.querySelector(selector), dialog = $('#permit-map-dialog');
  let permit, index = 0, map, layers, token = 0, streetRequested = false, onSelection = () => {}, tileTimer;
  const status = message => { $('#permit-map-status').textContent = message; };
  function dispose() { token++; clearTimeout(tileTimer); map?.remove(); map = null; layers = null; streetRequested = false; $('#permit-street-map').hidden = true; $('#permit-map-show').disabled = false; }
  function draw(view) {
    if (!map) return;
    layers.clearLayers();
    if (!view.segments.length) { dispose(); $('#permit-map-show').disabled = true; status('No usable geometry. The street map has been cleared.'); return; }
    const L = window.L;
    // Keep each supplied segment separate. Do not draw a connector over missing data.
    L.polyline(view.segments, { color: '#a94c00', weight: 7, opacity: .9, smoothFactor: 0 }).addTo(layers);
    for (const [point, label] of [[view.start, 'A · instruction start'], [view.end, 'B · instruction end; not arrival']]) {
      if (!point) continue;
      L.circleMarker(point, { radius: 8, color: '#102443', weight: 3, fillColor: '#fff', fillOpacity: 1 }).bindTooltip(label.startsWith('A') ? 'A' : 'B', { permanent: true, direction: 'top' }).addTo(layers);
    }
    const context = [];
    for (const [edge, label] of [[view.previous, 'Previous maneuver ends here'], [view.next, 'Next maneuver starts here']]) {
      if (!edge || edge.gap > 10000) continue;
      context.push(edge.point);
      L.circleMarker(edge.point, { radius: 5, color: '#56657a', weight: 2, fillColor: '#d8e0ec', fillOpacity: 1 }).bindTooltip(label).addTo(layers);
    }
    const bounds = L.latLngBounds([...view.segments.flat(), ...context]);
    map.invalidateSize(); map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
  }
  function render() {
    const view = mapReview(permit, index);
    $('#permit-map-show').disabled = !view.available || !view.segments?.length || streetRequested;
    $('#permit-map-previous').disabled = !view.available || index === 0;
    $('#permit-map-next').disabled = !view.available || index === view.total - 1;
    $('#permit-map-step').disabled = !view.available;
    if (!view.available) { $('#permit-map-step').innerHTML = '<option>No saved maneuvers</option>'; $('#permit-map-comparison').textContent = view.reason; return; }
    $('#permit-map-step').innerHTML = view.choices.map(c => `<option value="${c.index}">${esc(c.label)}</option>`).join(''); $('#permit-map-step').value = String(index);
    $('#permit-map-comparison').innerHTML = `<p class="eyebrow">${esc(view.state)} · ${esc(view.number)} · MANEUVER ${index + 1} OF ${view.total}</p><h3>${esc(view.text || 'Instruction missing')}</h3><p><strong>Saved permit line ${esc(view.line)}</strong></p><blockquote>${esc(view.source || 'No source line saved')}</blockquote><p><strong>Road:</strong> ${esc(view.road || 'Not supplied')}<br><strong>Lane:</strong> ${esc(view.lane || 'Not supplied')}</p><details class="map-inspection-details"><summary>Endpoints &amp; geometry checks</summary><dl><dt>A · Instruction start</dt><dd>${coordinateText(view.start)}</dd><dt>B · Instruction end (not arrival)</dt><dd>${coordinateText(view.end)}</dd></dl><p>${view.pointCount} supplied points. ${view.previous ? `Previous connection: ${Math.round(view.previous.gap)} m. ` : 'First maneuver in this state. '}${view.next ? `Next connection: ${Math.round(view.next.gap)} m.` : 'Last maneuver in this state; check the border or site entrance.'}</p>${view.issues.length ? `<ul class="issue-list">${view.issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul>` : '<p>Point spacing and adjacent endpoints pass the basic checks. Road, ramp, direction, level and access are still unverified.</p>'}</details>${view.issues.length ? `<p class="walkthrough-warning">${esc(view.issues[0])}</p>` : ''}`;
    if (map) draw(view);
  }
  $('#permit-map-step').onchange = () => { index = Number($('#permit-map-step').value); onSelection(index); render(); };
  $('#permit-map-previous').onclick = () => { index--; onSelection(index); render(); };
  $('#permit-map-next').onclick = () => { index++; onSelection(index); render(); };
  $('#permit-map-show').onclick = async () => {
    const generation = ++token; streetRequested = true; $('#permit-map-show').disabled = true; status('Loading street context…');
    try {
      const L = await leaflet(); if (generation !== token || !dialog.open || document.hidden) return;
      const view = mapReview(permit, index); if (!view.available || !view.segments.length) throw Error('No usable geometry to show.');
      $('#permit-street-map').hidden = false;
      map = L.map('permit-street-map', { scrollWheelZoom: false, preferCanvas: true, zoomAnimation: false, fadeAnimation: false, minZoom: 2, maxZoom: 19 });
      layers = L.layerGroup().addTo(map); draw(view);
      let tileErrors = false;
      const loading = () => {
        if (generation !== token || !dialog.open) return;
        clearTimeout(tileTimer);
        status('Loading this map area. Street coverage is incomplete; amber is supplied geometry, not a verified road match.');
        tileTimer = setTimeout(() => { if (generation === token && dialog.open) status('Street tiles have not finished loading. Check connectivity; the saved line alone does not verify the road.'); }, 15000);
      };
      loading();
      L.tileLayer(STREET_TILES, STREET_OPTIONS).on('loading', loading).on('tileerror', () => { if (generation !== token || !dialog.open) return; tileErrors = true; status('Some street tiles failed to load. The amber line is supplied geometry only; do not assume the missing map is clear.'); }).on('load', () => { if (generation === token) clearTimeout(tileTimer); if (generation === token && dialog.open) status(tileErrors ? 'Some street tiles failed to load. Reopen the map to retry; the supplied line does not verify the road.' : 'Street context loaded. Amber: supplied geometry. No road matching, truck clearance or route approval has been established.'); }).addTo(map);
    } catch (error) { if (generation === token) { dispose(); status(error.message); } }
  };
  dialog.addEventListener('close', dispose);
  document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open) { dispose(); status('Map stopped while page was hidden. Tap Show street map to reload while parked.'); } });
  window.addEventListener('pagehide', dispose);
  return { open(value, selected = 0, selectionChanged = () => {}) { dispose(); onSelection = selectionChanged; permit = structuredClone(value); index = selected; render(); status('Compare the original permit with the saved instruction. The map is off until requested.'); dialog.showModal(); } };
}
