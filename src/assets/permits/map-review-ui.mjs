import { mapReview, routeOverview, coordinateText, STREET_TILES, STREET_OPTIONS } from './map-review.mjs';
import { issuerRehearsal, issuerRowSpeech } from './issuer-rehearsal.mjs';
import { createSpeech, speechPreferences } from './speech.mjs';

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
  let permit, index = 0, map, layers, token = 0, streetRequested = false, onSelection = () => {}, tileTimer, overview = false, whole;
  let rowIndex=0, rehearsal, focus='all';
  const speech=createSpeech({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,visible:()=>!document.hidden&&dialog.open,onState:s=>{$('#issuer-voice-status').textContent=s.message;}});
  const status = message => { $('#permit-map-status').textContent = message; if (/failed|timed out|unavailable|cleared|stopped|not finished/i.test(message)) $('#permit-map-source').open=true; };
  function dispose() { speech.stop(); token++; clearTimeout(tileTimer); map?.remove(); map = null; layers = null; streetRequested = false; $('#permit-street-map').hidden = true; $('#permit-map-show').disabled = false; $('#permit-map-show').hidden = false; }
  function draw(view) {
    if (!map) return;
    layers.clearLayers();
    const paths = overview ? whole.paths : view.segments, sparse=overview?whole.sparsePaths||[]:[], all=[...paths,...sparse];
    if (!all.length) { dispose(); $('#permit-map-show').disabled = true; status('No usable geometry. The street map has been cleared.'); return; }
    const L = window.L;
    // Keep each supplied segment separate. Do not draw a connector over missing data.
    L.polyline(paths, { color: '#a94c00', weight: 7, opacity: .9, smoothFactor: 0 }).addTo(layers);
    if(sparse.length) L.polyline(sparse,{color:'#b82935',weight:6,dashArray:'9 10',opacity:1,smoothFactor:0}).addTo(layers);
    if(whole.issuerOverview && focus==='sparse' && whole.spanEvidence?.length) L.polyline(whole.spanEvidence.map(e=>e.detail),{color:'#7139a8',weight:3,opacity:1,smoothFactor:0}).addTo(layers);
    if(whole.issuerOverview && focus==='row' && rehearsal?.estimated) {
      if(rehearsal.area.length) L.polyline(rehearsal.area,{color:'#215bcc',weight:10,opacity:1,smoothFactor:0}).addTo(layers);
      if(rehearsal.sparseArea.length) L.polyline(rehearsal.sparseArea,{color:'#215bcc',weight:10,dashArray:'9 10',opacity:1,smoothFactor:0}).addTo(layers);
    }
    const start = overview ? permit.issuerMap?.paths[0][0] || all[0][0] : view.start, end = overview ? permit.issuerMap?.paths[0].at(-1) || all.at(-1).at(-1) : view.end;
    for (const [point, label] of [[start, 'A · supplied geometry start'], [end, 'B · supplied geometry end; not arrival']]) {
      if (!point) continue;
      L.circleMarker(point, { radius: 8, color: '#102443', weight: 3, fillColor: '#fff', fillOpacity: 1 }).bindTooltip(label.startsWith('A') ? 'A' : 'B', { permanent: true, direction: 'top' }).addTo(layers);
    }
    const context = [];
    for (const [edge, label] of overview ? [] : [[view.previous, 'Previous maneuver ends here'], [view.next, 'Next maneuver starts here']]) {
      if (!edge || edge.gap > 10000) continue;
      context.push(edge.point);
      L.circleMarker(edge.point, { radius: 5, color: '#56657a', weight: 2, fillColor: '#d8e0ec', fillOpacity: 1 }).bindTooltip(label).addTo(layers);
    }
    const focused=whole.issuerOverview && focus==='row' && rehearsal?.estimated ? [...rehearsal.area,...rehearsal.sparseArea] : whole.issuerOverview && focus==='sparse' && sparse.length ? sparse : all;
    const bounds = L.latLngBounds([...focused.flat(), ...context]);
    map.invalidateSize(); map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
  }
  function renderRehearsal() {
    rehearsal=whole.issuerOverview?issuerRehearsal(permit,rowIndex):null;
    $('#issuer-rehearsal').hidden=!rehearsal?.available;
    $('#issuer-rehearsal-heading').hidden=!rehearsal?.available;
    $('#issuer-row-legend').hidden=focus==='sparse';
    $('#permit-map-sparse').hidden=!whole.sparsePaths?.length;
    $('#issuer-span-details').hidden=focus!=='sparse'||!whole.issuerOverview;
    $('#issuer-span-summary').hidden=focus!=='sparse'||!whole.issuerOverview;
    $('#issuer-span-summary').textContent=whole.spanEvidence?.length?'Purple: detailed TxDOT road shape. Dashed red: original issuer span. Drawing agreement does not confirm clearance.':'No detailed road-shape comparison is available for this saved span.';
    $('#issuer-span-details').innerHTML=whole.issuerOverview?`<p>${esc(whole.spanCheckNote)}</p>${(whole.spanEvidence||[]).map(e=>`<p><strong>${esc(e.road)}</strong> · ${e.detail.length} inventory points<br>Largest sampled offset: ${Math.ceil(e.comparison.maxOffset)} m. Source endpoints: ${e.comparison.endpointOffsets.map(n=>Math.ceil(n)+' m').join(' / ')}.<br>Inventory date: ${esc(e.dataDate)} · retrieved ${esc(new Date(e.retrievedAt).toLocaleString())}. <a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">TxDOT record ${e.featureId}</a></p>`).join('')}<p>No road, detour, turn position or approval was added. This inventory comparison is not a current closure, lane-direction or bridge-clearance check.</p>`:'';
    if(!rehearsal?.available)return;
    $('#issuer-row-select').innerHTML=rehearsal.rows.map((row,i)=>`<option value="${i}">${i+1}. ${esc(row.instruction)}</option>`).join('');
    $('#issuer-row-select').value=String(rowIndex);
    $('#issuer-row-position').textContent=focus==='sparse'?'ISSUER MAP INSPECTION · NOT A TURN':`PARKED REHEARSAL · ROW ${rowIndex+1} OF ${rehearsal.total}`;
    $('#issuer-row-instruction').textContent=focus==='sparse'?'Sparse span supplied by Texas':rehearsal.row.instruction;
    $('#issuer-row-source').textContent=rehearsal.source;
    $('#issuer-row-location').textContent=focus==='sparse'?whole.issues.join(' '):rehearsal.reason;
    $('#issuer-row-distance').textContent=Number.isFinite(rehearsal.row.cumulativeMiles)?`Issued cumulative mileage: ${rehearsal.row.cumulativeMiles} mi. Not distance from your position.`:'';
    $('#issuer-row-previous').disabled=rowIndex===0;$('#issuer-row-next').disabled=rowIndex===rehearsal.total-1;
    $('#issuer-row-area').disabled=!rehearsal.estimated;
    $('#issuer-row-area').setAttribute('aria-pressed',String(focus==='row'));
    $('#issuer-row-read').disabled=false;
  }
  function render() {
    const view = mapReview(permit, index);
    renderRehearsal();
    $('#permit-map-show').disabled = !(overview ? whole.available : view.segments?.length) || streetRequested;
    $('#permit-map-all').disabled = !whole.available;
    $('#permit-map-all').setAttribute('aria-pressed', String(overview && (!whole.issuerOverview || focus==='all')));
    $('#permit-map-one').setAttribute('aria-pressed', String(!overview));
    $('#permit-map-one').disabled = !view.available;
    $('#permit-map-one').hidden = whole.issuerOverview === true;
    $('#permit-map-maneuvers').hidden = whole.issuerOverview === true;
    $('#permit-map-overview').hidden = !overview;
    $('#permit-map-overview').textContent = overview ? `${whole.issuerOverview ? `Texas issuer map · ${whole.pointCount} supplied coordinates. Amber: issuer line. Dashed red: sparse issuer span. Inspect it for available road-shape evidence. Exact turn positions are not supplied.` : `${whole.drawn} of ${whole.total} instructions plotted. ${whole.issues.length ? 'Geometry checks remain; gaps stay open. ' : ''}`} Parked preview only; this does not activate guidance.` : '';
    $('#permit-map-previous').disabled = !view.available || index === 0;
    $('#permit-map-next').disabled = !view.available || index === view.total - 1;
    $('#permit-map-step').disabled = !view.available;
    if (!view.available) {
      $('#permit-map-step').innerHTML = '<option>No saved maneuvers</option>';
      $('#permit-map-comparison').innerHTML = whole.issuerOverview ? `<p>Loaded from the Texas issuer on ${esc(new Date(whole.retrievedAt).toLocaleString())}. Compare this saved overview with the current original.</p><p><a href="${esc(whole.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open Texas issuer map and conditions</a></p><details><summary>Issued route text (${permit.routeText.split('\n').length} rows)</summary><pre>${esc(permit.routeText)}</pre></details>${whole.issues.length ? `<p>${esc(whole.issues[0])}</p>` : ''}` : esc(whole.issues?.[0] || view.reason);
      if (map) draw(view); return;
    }
    $('#permit-map-step').innerHTML = view.choices.map(c => `<option value="${c.index}">${esc(c.label)}</option>`).join(''); $('#permit-map-step').value = String(index);
    $('#permit-map-comparison').innerHTML = `<p class="eyebrow">${esc(view.state)} · ${esc(view.number)} · MANEUVER ${index + 1} OF ${view.total}</p><h3>${esc(view.text || 'Instruction missing')}</h3><p><strong>Saved permit line ${esc(view.line)}</strong></p><blockquote>${esc(view.source || 'No source line saved')}</blockquote><p><strong>Road:</strong> ${esc(view.road || 'Not supplied')}<br><strong>Lane:</strong> ${esc(view.lane || 'Not supplied')}</p><details class="map-inspection-details"><summary>Endpoints &amp; geometry checks</summary><dl><dt>A · Instruction start</dt><dd>${coordinateText(view.start)}</dd><dt>B · Instruction end (not arrival)</dt><dd>${coordinateText(view.end)}</dd></dl><p>${view.pointCount} supplied points. ${view.previous ? `Previous connection: ${Math.round(view.previous.gap)} m. ` : 'First maneuver in this state. '}${view.next ? `Next connection: ${Math.round(view.next.gap)} m.` : 'Last maneuver in this state; check the border or site entrance.'}</p>${view.issues.length ? `<ul class="issue-list">${view.issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul>` : '<p>Point spacing and adjacent endpoints pass the basic checks. Road, ramp, direction, level and access are still unverified.</p>'}</details>${view.issues.length ? `<p class="walkthrough-warning">${esc(view.issues[0])}</p>` : ''}`;
    if (map) draw(view);
  }
  $('#permit-map-all').onclick = () => { speech.stop(); focus='all'; overview = true; render(); };
  $('#permit-map-sparse').onclick=async()=>{speech.stop();focus='sparse';render();if(!map)await showMap();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  function selectRow(value){ if(!rehearsal?.available||!Number.isInteger(value)||value<0||value>=rehearsal.total)return; speech.stop('Row changed. Tap Read turn aloud for the selected row.');rowIndex=value;focus='row';render(); }
  $('#issuer-row-select').onchange=()=>selectRow(Number($('#issuer-row-select').value));
  $('#issuer-row-previous').onclick=()=>selectRow(rowIndex-1);
  $('#issuer-row-next').onclick=()=>selectRow(rowIndex+1);
  $('#issuer-row-area').onclick=async()=>{if(!rehearsal?.estimated)return;focus='row';render();if(!map)await showMap();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  $('#issuer-row-read').onclick=()=>{const text=issuerRowSpeech(rehearsal);if(!text)return;focus='row';render();let prefs;try{prefs=speechPreferences(localStorage);}catch{prefs=speechPreferences(null);}speech.play(text,{...prefs,key:'issuer-row',repeat:true});};
  $('#issuer-row-stop').onclick=()=>speech.stop();
  $('#permit-map-one').onclick = () => { overview = false; render(); };
  $('#permit-map-step').onchange = () => { overview = false; index = Number($('#permit-map-step').value); onSelection(index); render(); };
  $('#permit-map-previous').onclick = () => { overview = false; index--; onSelection(index); render(); };
  $('#permit-map-next').onclick = () => { overview = false; index++; onSelection(index); render(); };
  async function showMap() {
    const generation = ++token; streetRequested = true; $('#permit-map-show').disabled = true; $('#permit-map-show').hidden = true; status('Loading street context…');
    try {
      const L = await leaflet(); if (generation !== token || !dialog.open || document.hidden) return;
      const view = mapReview(permit, index); if (!(overview ? whole.available : view.segments?.length)) throw Error('No usable geometry to show.');
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
  }
  $('#permit-map-show').onclick = showMap;
  dialog.addEventListener('close', dispose);
  document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open) { dispose(); status('Map stopped while page was hidden. Tap Show street map to reload while parked.'); } });
  window.addEventListener('pagehide', dispose);
  return { open(value, selected = 0, selectionChanged = () => {}, options = {}) { dispose(); rowIndex=0;focus='all'; onSelection = selectionChanged; permit = structuredClone(value); index = selected; whole = routeOverview(permit); overview = options.overview === true || whole.issuerOverview === true; render(); status('Compare the original permit with the saved instruction. The map is off until requested.'); dialog.showModal(); if (options.showMap && whole.available) return showMap(); } };
}
