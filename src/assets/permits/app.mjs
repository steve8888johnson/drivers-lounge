import { STATES, blankTrip, blankPermit, buildMaster, crewKey, geometryReviewed, reviewed, confirmPermit, confirmGeometry, locateOnMaster, warnings, sanitizePermit } from './core.mjs';
import { classifyQR, parsePermitText, importPublicQR, scanImage } from './import.mjs';
import { listTrips, saveTrip, addDocument, getDocument, deleteTrip, exportPacket, importPacket, verifyWallet } from './storage.mjs';
import { exampleTrip } from './examples.mjs';
import { Crew } from './crew.mjs';
import { blankHazmat, sanitizeHazmat, hazmatWarnings, hazmatActive } from './hazmat.mjs';
import { setupHazmat, renderHazmat, readHazmat } from './hazmat-ui.mjs';
import { captureTripDraft, applyGeometryDraft, maneuverKey } from './drafts.mjs';
import { walkthrough } from './walkthrough.mjs';
import { walletLaunch } from './launch.mjs';

const $ = selector => document.querySelector(selector);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const crew = new Crew(window.DLBackend);
let trip, selected, tab = 'load', dirty = false, watching = null, timer, lastFix, progress, master, crewTimer, crewBusy = false, lastCrew = 0, camera, cameraTimer, activeState = '', spoken = '', objectURLs = [], guidanceVersion = 0;
let savedTrip, walkthroughIndex = 0;
const currentPermit = () => trip?.permits.find(p => p.id === selected);
function status(text, error = false) { $('#status').textContent = text; $('#status').dataset.error = String(error); }
let working = false;
const spokenHazmat = new Set();
function safe(fn) { return async event => {
  const lock = event?.type !== 'input'; if (lock && working) return;
  if (lock) { working = true; document.querySelectorAll('.layout,.trip-toolbar,.heading').forEach(el => el.inert = true); }
  try { await fn(event); } catch (e) { status(e.message || 'Unable to complete this action. Please retry.', true); }
  finally { if (lock) { working = false; document.querySelectorAll('.layout,.trip-toolbar,.heading').forEach(el => el.inert = false); } }
}; }
function on(selector, event, fn) { $(selector).addEventListener(event, safe(fn)); }
function confirmAction(message, action = 'Continue') {
  const dialog = $('#trip-confirm');
  $('#trip-confirm-message').textContent = message; $('#trip-confirm-accept').textContent = action;
  dialog.returnValue = '';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'accept'), { once: true });
    dialog.showModal();
  });
}
function switchTab(next) {
  tab = next;
  document.querySelectorAll('[data-tab]').forEach(b => { if (b.dataset.tab === next) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== `panel-${next}`);
  if (next === 'route') renderRoute(); if (next === 'wallet') renderWallet(); if (next === 'hazmat') renderHazmat(trip);
  if (trip) history.replaceState(null, '', location.pathname + location.search + '#trip=' + encodeURIComponent(trip.id) + '&tab=' + next);
}
async function persist(message) { await saveTrip(trip); savedTrip = structuredClone(trip); dirty = false; await renderPicker(); if (message) status(message); }
function edit() {
  if (watching !== null) stopGuidance('Route or load changed. Review and restart guidance.');
  dirty = true; trip.revision += 1; $('#conditions-checked').checked = false;
}
async function changeGuard() {
  if (!dirty) return true;
  if (!await confirmAction('Discard unsaved fields before switching? Your last saved load, permit and hazmat details will be restored.', 'Discard changes')) return false;
  trip = structuredClone(savedTrip); dirty = false; render(); status('Unsaved changes discarded. Last saved details restored.');
  return true;
}
async function renderPicker() {
  const all = await listTrips(); $('#trip-picker').innerHTML = all.map(t => `<option value="${esc(t.id)}">${esc(t.name || 'Untitled permitted load')}</option>`).join(''); $('#trip-picker').value = trip.id;
}
function renderLoad() {
  const form = $('#load-form');
  for (const key of ['name', 'departure']) form.elements[key].value = trip[key];
  for (const [key, value] of Object.entries(trip.profile)) if (form.elements[key]) form.elements[key].value = value;
  form.elements.acknowledged.checked = trip.acknowledged;
}
function readLoad(target) {
  const f = new FormData($('#load-form')); target.name = String(f.get('name') || '').trim(); target.departure = String(f.get('departure') || ''); target.acknowledged = f.has('acknowledged');
  for (const key of Object.keys(target.profile)) target.profile[key] = String(f.get(key) || '').trim();
}
function renderList() {
  $('#permit-count').textContent = trip.permits.length;
  $('#permit-list').innerHTML = trip.permits.length ? trip.permits.map((p, i) => `<button class="permit-item ${p.id === selected ? 'selected' : ''}" data-permit="${esc(p.id)}"><b>${i + 1}. ${esc(p.state || 'New state')} <span>${esc(p.number)}</span></b><small>${esc(p.entry.label || 'Origin needed')} → ${esc(p.exit.label || 'Destination needed')}</small><small>${geometryReviewed(p) ? 'Route geometry confirmed' : reviewed(p) ? 'Permit confirmed · geometry needed' : 'Needs your confirmation'}</small></button>`).join('') : '<p class="muted">No permits yet. Add a permit or import its original.</p>';
  document.querySelectorAll('[data-permit]').forEach(b => b.onclick = safe(async () => { if (!await changeGuard()) return; selected = b.dataset.permit; renderReview(); renderList(); switchTab('review'); }));
}
function documentRows(p) { return p.documents.map(doc => `<div class="doc-row"><span>${esc(doc.name)}<br><small>${(doc.size / 1024).toFixed(0)} KB · original</small></span><button data-open-doc="${esc(doc.id)}">Open original</button></div>`).join(''); }
function wireDocuments(container) { container.querySelectorAll('[data-open-doc]').forEach(button => button.onclick = safe(async () => {
  const doc = await getDocument(button.dataset.openDoc); if (!doc?.blob) throw Error('Original is not on this device. Import the trip packet or add the original pages.');
  const url = URL.createObjectURL(doc.blob); objectURLs.push(url);
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click();
})); }
function renderReview() {
  if (camera) void stopCamera();
  const p = currentPermit();
  $('#permit-form').hidden = !p; $('#remove-permit').disabled = !p;
  $('#panel-review').querySelectorAll('details,.originals').forEach(el => el.hidden = !p);
  if (!p) { $('#review-title').textContent = 'Add a state permit'; return; }
  $('#review-title').textContent = `${p.state || 'State permit'} ${p.number || ''}`;
  const f = $('#permit-form');
  for (const key of ['state', 'number', 'kind', 'validFrom', 'validTo', 'timeZone', 'routeText', 'restrictions']) f.elements[key].value = p[key] || '';
  for (const side of ['entry', 'exit']) for (const field of ['label', 'state', 'road']) f.elements[`${side}-${field}`].value = p[side][field] || '';
  for (const key of ['heightFt', 'widthFt', 'lengthFt', 'weightLb', 'axles']) f.elements[`limit-${key}`].value = p.limits[key] || '';
  f.elements['window-from'].value = p.travelWindow?.from || ''; f.elements['window-to'].value = p.travelWindow?.to || ''; f.elements['window-closed'].value = (p.travelWindow?.closedDates || []).join(', ');
  for (const option of f.elements['window-days'].options) option.selected = (p.travelWindow?.days || []).includes(Number(option.value));
  f.elements.complete.checked = p.complete;
  const scores = Object.entries(p.confidence).map(([key, value]) => `${key}: ${Math.round(value.score * 100)}%`);
  $('#confidence').textContent = reviewed(p) ? `Confirmed against original ${new Date(p.review.at).toLocaleString()}. Editing invalidates confirmation.` : `Extraction confidence (heuristic, not verification): ${scores.join(' · ') || 'manual entry; unconfirmed'}. Verify every field and the complete route.`;
  $('#geometry-json').value = JSON.stringify(p.steps, null, 2); $('#geometry-checked').checked = false;
  $('#geometry-state').textContent = geometryReviewed(p) ? 'Geometry confirmed against this permit revision.' : 'GPS guidance remains blocked until all route geometry is confirmed.';
  $('#review-documents').innerHTML = documentRows(p) || '<p class="muted">Add all original route and restriction pages.</p>'; wireDocuments($('#review-documents'));
  $('#qr-contents').value = ''; $('#permit-text').value = ''; $('#qr-results').innerHTML = '';
}
function readPermit(target) {
  const p = target.permits.find(p => p.id === selected); if (!p) throw Error('Add a state permit first.'); const f = new FormData($('#permit-form'));
  for (const key of ['state', 'number', 'kind', 'validFrom', 'validTo', 'timeZone', 'routeText', 'restrictions']) p[key] = String(f.get(key) || '');
  for (const side of ['entry', 'exit']) for (const field of ['label', 'state', 'road']) p[side][field] = String(f.get(`${side}-${field}`) || '');
  p.complete = f.has('complete'); p.limits = {};
  for (const key of ['heightFt', 'widthFt', 'lengthFt', 'weightLb', 'axles']) if (Number(f.get(`limit-${key}`)) > 0) p.limits[key] = Number(f.get(`limit-${key}`));
  p.travelWindow = f.get('window-from') || f.get('window-to') || f.get('window-closed') || f.getAll('window-days').length ? { from: String(f.get('window-from')), to: String(f.get('window-to')), days: f.getAll('window-days').map(Number), closedDates: String(f.get('window-closed') || '').split(',').map(s => s.trim()).filter(Boolean) } : null;
  return p;
}
function captureDrafts() {
  trip = captureTripDraft(trip, draft => {
    readLoad(draft); readHazmat(draft);
    if (draft.permits.some(p => p.id === selected)) applyGeometryDraft(readPermit(draft), $('#geometry-json').value);
  });
}
function mapMarkup(m) {
  const points = m.segments.flatMap(s => [s.a, s.b]); if (!points.length) return '<text x="400" y="165" text-anchor="middle" fill="#627591" font-size="17">Awaiting verified route geometry</text><text x="400" y="195" text-anchor="middle" fill="#627591" font-size="12">Your permit instructions remain available in the wallet.</text>';
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const point of points) { minLat = Math.min(minLat, point[0]); maxLat = Math.max(maxLat, point[0]); minLng = Math.min(minLng, point[1]); maxLng = Math.max(maxLng, point[1]); }
  const k = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  const scale = Math.min(700 / Math.max((maxLng - minLng) * k, .001), 240 / Math.max(maxLat - minLat, .001));
  const xy = p => [400 + (p[1] - (minLng + maxLng) / 2) * k * scale, 170 - (p[0] - (minLat + maxLat) / 2) * scale];
  let svg = '<path d="M0 85H800M0 170H800M0 255H800M200 0V340M400 0V340M600 0V340" stroke="#dde5f0" stroke-width="1"/>';
  for (const [i, p] of m.permits.entries()) {
    for (const step of p.steps) { if (!step.points?.length) continue; svg += `<polyline points="${step.points.map(pt => xy(pt).join(',')).join(' ')}" fill="none" stroke="${i % 2 ? '#b82935' : '#215bcc'}" stroke-width="5" stroke-linecap="round"/>`; }
    const start = p.steps[0]?.points?.[0]; if (start) { const [x, y] = xy(start); svg += `<circle cx="${x}" cy="${y}" r="7" fill="white" stroke="#102443" stroke-width="3"/><text x="${x}" y="${y - 15}" text-anchor="middle" fill="#102443" font-size="13" font-weight="bold">${esc(p.state)}</text>`; }
  }
  return svg;
}
function renderRoute() {
  const m = buildMaster(trip, { geometry: true });
  $('#route-readiness').textContent = m.ready ? 'Ready for departure checks' : 'Needs review';
  $('#state-chain').innerHTML = m.permits.map(p => `<div class="state-stop"><strong>${esc(p.state || '?')}</strong><small>${esc(p.number || 'Permit needed')}</small></div>`).join('<span aria-hidden="true">→</span>');
  $('#route-checks').innerHTML = m.issues.length ? `<p class="info"><strong>${m.issues.length} checks need attention before guidance.</strong><br>${esc(m.issues[0])}</p><details><summary>Review all required checks</summary><ul class="issue-list">${m.issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul></details>` : '<p class="good">Permit order and route connections checked. Verify current travel conditions before starting.</p>';
  $('#route-map').innerHTML = mapMarkup(m);
  $('#start-guidance').disabled = !m.ready || watching !== null;
  $('#map-caption').textContent = 'Permit geometry and labeled state entries · no street basemap. ' + (m.meters ? `${(m.meters / 1609.344).toFixed(1)} mi of supplied geometry.` : 'Import detailed geometry for GPS guidance.');
  renderWalkthrough(m);
}
function renderWalkthrough(m = buildMaster(trip, { geometry: true })) {
  const view = walkthrough(m, walkthroughIndex, $('#crew-role').value);
  $('#walkthrough-panel').hidden = watching !== null;
  $('#walkthrough-previous').disabled = dirty || !view.available || view.index === 0;
  $('#walkthrough-next').disabled = dirty || !view.available || view.index === view.total - 1;
  if (dirty || !view.available) { $('#walkthrough-content').textContent = dirty ? 'Save changes and complete the current route reviews first.' : view.reason; return; }
  walkthroughIndex = view.index;
  $('#walkthrough-content').innerHTML = `<p class="eyebrow">MANEUVER ${view.index + 1} OF ${view.total} · ${esc($('#crew-role').selectedOptions[0].textContent)}</p><h3>${esc(view.step.text)}</h3><p><strong>${view.enteringState ? 'State entry · ' : ''}${esc(view.permit.state)} · ${esc(view.permit.number)}</strong><br>${esc(view.step.road || 'Road not supplied')} · ${esc(view.step.lane || 'Lane guidance not supplied')}<br>${distance(view.meters)} along supplied geometry · source line ${view.step.routeLine}</p><p>${view.next ? `Next${view.next.permit.id !== view.permit.id ? ' · ' + esc(view.next.permit.state) + ' state entry' : ''}: ${esc(view.next.step.text)}` : 'Final supplied maneuver. Check the permit destination instructions.'}</p>${view.alerts.map(a => `<p class="walkthrough-warning">${esc(a)}</p>`).join('')}<button id="walkthrough-original">Open this state in wallet</button>`;
  $('#walkthrough-original').onclick = () => { switchTab('wallet'); document.getElementById(`wallet-${view.permit.id}`)?.scrollIntoView({ behavior: 'smooth' }); };
}
function renderWallet() {
  $('#hazmat-wallet').innerHTML = hazmatActive(trip) ? '<article class="wallet-card"><h3>Hazmat cargo &amp; route references</h3><p>Shipping papers: '+esc(trip.hazmat.shippingPaperRef)+'<br>Emergency contact: '+esc(trip.hazmat.emergencyContact)+'</p>'+trip.hazmat.materials.map(m=>'<p><strong>'+esc(m.unNumber)+' · '+esc(m.shippingName)+'</strong><br>Class/division '+esc(m.division)+' · subsidiary '+esc(m.subsidiary||'none entered')+' · packing group '+esc(m.packingGroup)+' · '+esc(m.quantity)+' '+esc(m.unit)+' · '+esc(m.packaging)+'</p>').join('')+'<p>Written route plan: '+esc(trip.hazmat.writtenPlanRef||'not entered')+'</p>'+trip.permits.map(p=>'<details><summary>'+esc(p.state)+' hazmat review</summary><p>'+esc(p.hazmatRoute?.notes||'Not reviewed')+'</p><p>Review through '+esc(p.hazmatRoute?.validThrough||'unconfirmed')+'</p></details>').join('')+'<p class="muted">Retain the actual shipping papers and required originals. These saved references do not replace them.</p></article>' : '';
  $('#wallet').innerHTML = trip.permits.map(p => `<article class="wallet-card" id="wallet-${esc(p.id)}"><div class="section-head"><h3>${esc(p.state)} · ${esc(p.number || 'Number unconfirmed')}</h3><span class="pill">${esc(p.kind)}</span></div><p class="dates">${esc(p.validFrom || 'Dates needed')} through ${esc(p.validTo || '—')} · ${esc(p.timeZone)}</p>${documentRows(p) || '<p class="muted">Original pages missing on this device.</p>'}<details><summary>Issued route & restrictions</summary><pre>${esc(p.routeText)}</pre><pre>${esc(p.restrictions || 'Restrictions not entered. Consult original permit.')}</pre></details><details><summary>Retained QR contents (${p.qr.length})</summary>${p.qr.map(q => `<pre>${esc(q)}</pre>`).join('')}</details></article>`).join('') || '<p>Add originals to build the inspection wallet.</p>';
  wireDocuments($('#wallet'));
}
function render() { renderLoad(); renderList(); renderReview(); renderRoute(); renderHazmat(trip); if (tab === 'wallet') renderWallet(); }
async function openTrip(value) { stopGuidance(); stopCamera(); trip = value; trip.hazmat ??= blankHazmat(); selected = trip.permits[0]?.id; dirty = false; walkthroughIndex = 0; $('#crew-role').value = trip.shared?.role || trip.localRole || 'driver'; $('#share-consent').checked = false; $('#conditions-checked').checked = false; $('#crew-members').textContent = ''; $('#crew-positions').textContent = ''; $('#invite-code').textContent = ''; $('#cache-status').textContent = ''; await persist(); try { localStorage.setItem('dl-last-permit-trip', JSON.stringify(trip.id)); } catch { /* The IndexedDB wallet remains usable without shortcut preferences. */ } render(); switchTab('load'); $('#crew-status').textContent = trip.shared ? 'Saved crew link. Reconnect before sharing location.' : 'Live sharing is off.'; }
async function ensurePermit() { if (!currentPermit()) { captureDrafts(); edit(); const p = blankPermit(); trip.permits.push(p); selected = p.id; await persist(); renderList(); renderReview(); } return currentPermit(); }
async function mergeImport(imported) {
  await ensurePermit(); captureDrafts(); const p = currentPermit(); edit();
  for (const key of ['state', 'number', 'kind', 'validFrom', 'validTo', 'timeZone', 'routeText', 'restrictions']) if (imported[key]) p[key] = imported[key];
  for (const side of ['entry', 'exit']) for (const field of ['label', 'state', 'road']) if (imported[side]?.[field]) p[side][field] = imported[side][field];
  if (imported.steps?.length) { p.steps = imported.steps; p.geometrySource = imported.geometrySource; } p.confidence = imported.confidence; p.complete = false; p.review = null; p.geometryReview = null;
  if (imported.travelWindow) p.travelWindow = imported.travelWindow;
  if (Object.keys(imported.limits || {}).length) p.limits = imported.limits;
  await persist('Imported draft. Confirm every extracted field against the original.'); renderList(); renderReview();
}
async function handleQR(raw) {
  await ensurePermit(); captureDrafts(); const p = currentPermit(); edit(); const result = classifyQR(raw);
  if (!p.qr.includes(raw)) p.qr.push(String(raw).slice(0, 50000)); p.review = null; p.geometryReview = null; await persist();
  if (result.kind === 'encoded-route') await mergeImport(result.permit);
  const el = document.createElement('div'); el.className = 'info'; const text = document.createElement('p'); text.textContent = result.message || 'Encoded permit route imported; confirmation required.'; el.append(text);
  const code = document.createElement('pre'); code.className = 'qr-data'; code.textContent = raw; el.append(code);
  if (result.kind === 'public-url') { const button = document.createElement('button'); button.textContent = 'Import this public route'; button.onclick = safe(async () => { button.disabled = true; try { await mergeImport(await importPublicQR(result.url)); } finally { button.disabled = false; } }); el.append(button); }
  if (result.kind === 'public-provider') { const button = document.createElement('button'); button.textContent = 'Import issued route data'; button.onclick = safe(async () => { button.disabled = true; try { const response = await fetch('/api/permit-route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: result.url }), signal: AbortSignal.timeout(15000), cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw Error(data.error || 'Public import unavailable. Use manual entry.'); await mergeImport(sanitizePermit(data.permit)); } finally { button.disabled = false; } }); el.append(button); }
  $('#qr-results').append(el); status(result.message || 'Route imported. Review before confirming.'); renderList();
}
async function attach(files, split = false) {
  if (!files.length) return; edit(); captureDrafts();
  for (const file of files) {
    let p; if (split) { p = blankPermit(); trip.permits.push(p); selected = p.id; } else p = await ensurePermit();
    await addDocument(trip, p, file); renderReview();
    if (file.type.startsWith('image/')) { status('Original saved. Scanning QR codes on this device…'); const codes = await scanImage(file); for (const code of codes) await handleQR(code); if (!codes.length) status('Original saved. QR could not be decoded; try a closer photo or enter the route manually.'); }
    else status('PDF original saved. Copy its route text or add a QR photo for decoding.');
  }
  await persist(); renderList(); switchTab('review');
}
async function stopCamera() { clearTimeout(cameraTimer); camera?.getTracks().forEach(track => track.stop()); camera = null; $('#qr-video').srcObject = null; $('#qr-video').hidden = true; $('#camera-stop').hidden = true; $('#camera-start').disabled = false; }
async function startCamera() {
  await ensurePermit(); if (!navigator.mediaDevices?.getUserMedia) throw Error('Camera is unavailable here. Use Scan QR photo instead.');
  camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  const video = $('#qr-video'); video.srcObject = camera; video.hidden = false; $('#camera-stop').hidden = false; $('#camera-start').disabled = true; await video.play();
  const scan = async () => {
    if (!camera) return;
    try { const canvas = document.createElement('canvas'); canvas.width = Math.min(1280, video.videoWidth); canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth); if (canvas.width && canvas.height) { canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); const codes = await scanImage(blob); if (!camera) return; if (codes.length) { const file = new File([blob], 'permit-qr-capture.png', { type: 'image/png' }); await stopCamera(); await safe(() => attach([file]))({type:'capture'}); return; } } }
    catch (e) { await stopCamera(); status(e.message, true); return; }
    cameraTimer = setTimeout(scan, 800);
  }; void scan();
}
function say(message, key = message) {
  if (!$('#voice-enabled').checked || !('speechSynthesis' in window) || key === spoken) return;
  spoken = key; speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(message); utterance.rate = .95; speechSynthesis.speak(utterance);
}
function distance(m) { return m < 160 ? `${Math.round(m * 3.28084 / 10) * 10} ft` : `${(m / 1609.344).toFixed(1)} mi`; }
function navAlert(message, key) { $('#nav-status').textContent = message; say(message, key); }
function pauseFix(message, key) {
  navAlert(message, key); $('#maneuver').textContent = 'Guidance paused — verify route';
  $('#next-maneuver').textContent = 'Follow the issued permit. No automatic reroute.';
  $('#maneuver-distance').textContent = '—'; $('#remaining').textContent = '—'; $('#lane-info').textContent = 'Waiting for reliable GPS'; $('#nav-warnings').textContent = '';
}
function displayFix(fix) {
  if (watching === null) return;
  lastFix = fix; const result = locateOnMaster(master, fix, progress);
  if (result.status !== 'on-route') { if (result.status !== 'gps-uncertain') stopGuidance(result.message); pauseFix(result.message, result.status); return; }
  progress = result; const role = $('#crew-role').value;
  $('#active-permit').textContent = `${result.permit.state} · ${result.permit.number}`; $('#maneuver').textContent = result.step.text;
  $('#next-maneuver').textContent = result.nextStep ? `Next: ${result.nextStep.text}` : 'Final authorized segment. Follow permit destination instructions.';
  $('#maneuver-distance').textContent = distance(result.toManeuver); $('#remaining').textContent = distance(result.remaining);
  $('#lane-info').textContent = `${result.step.road || 'Road not supplied'} · ${result.step.lane || 'Lane guidance not supplied'}`;
  const ahead = result.toManeuver < 800 && result.nextStep ? master.permits.find(p=>p.id===result.nextPermitId) : null;
  const alerts = [...warnings(result.permit, trip.profile, role), ...hazmatWarnings(trip, result.permit, result.step.routeLine), ...(ahead ? hazmatWarnings(trip,ahead,result.nextStep.routeLine).filter(a=>a.startsWith('Hazmat route alert:')).map(a=>'Upcoming '+a) : [])]; $('#nav-warnings').innerHTML = alerts.map(a => `<div class="warning">${esc(a)}</div>`).join('');
  const newHazmat = alerts.filter(a=>a.includes('Hazmat route alert:')&&!spokenHazmat.has(`${result.permit.id}-${result.step.routeLine}-${a}`));
  const timed = alerts.find(a => /movement window closes/.test(a));
  $('#nav-status').textContent = `On reviewed route · GPS ±${Math.round(fix.accuracy)} m${navigator.onLine ? '' : ' · offline; crew progress unavailable'}`;
  if (activeState !== result.permit.id) { activeState = result.permit.id; say(`Active permit ${result.permit.state} ${result.permit.number}. ${alerts.join(' ')}. ${result.step.text}`, `state-${activeState}`); }
  else if (newHazmat.length) { newHazmat.forEach(a=>spokenHazmat.add(`${result.permit.id}-${result.step.routeLine}-${a}`)); say(newHazmat.join(' '), `hazmat-${result.permit.id}-${result.step.routeLine}-${newHazmat.join()}`); }
  else if (timed) say(timed, `curfew-${result.permit.id}`);
  else say(`${result.step.text}. ${distance(result.toManeuver)} to ${result.nextStep?.text || 'the authorized destination'}.`, `${result.permit.id}-${result.step.routeLine}-${result.toManeuver < 150 ? 'near' : result.toManeuver < 800 ? 'approach' : 'far'}`);
  if (trip.shared && $('#share-consent').checked && Date.now() - lastCrew > 7000) { lastCrew = Date.now(); void syncCrew(fix, result); }
}
async function syncCrew(fix, result) {
  if (crewBusy || !trip.shared) return; crewBusy = true; const version = guidanceVersion, shared = { ...trip.shared };
  try {
    if (!navigator.onLine) throw Error('Offline — crew locations are stale. Local permit guidance continues.');
    await crew.ready(); const remote = await crew.read(shared.id); if (version !== guidanceVersion) return;
    if (remote.closed || remote.revision !== shared.revision) { stopGuidance('Crew route changed or closed. Obtain and review the current trip before continuing.'); return; }
    if (fix && result && watching !== null && $('#share-consent').checked) { await crew.position(shared, fix, result.progress); if (version !== guidanceVersion || !$('#share-consent').checked) { await crew.stop(shared); return; } }
    const positions = await crew.positions(shared); if (version !== guidanceVersion) return;
    $('#crew-status').textContent = `Connected · route revision ${remote.revision} · updated ${new Date().toLocaleTimeString()}`;
    $('#crew-positions').innerHTML = positions.map(p => { const age = Math.max(0, Math.floor((Date.now() - Date.parse(p.updated_at)) / 1000)); return `<p>${p.user_id === crew.userId ? 'You' : p.user_id === remote.owner_id ? 'Truck driver' : 'Escort'} · ${age > 20 ? 'STALE — position unavailable' : `${distance(p.progress_m)} along route`} · ${age}s ago${result && p.user_id !== crew.userId && age <= 20 ? ` · ${distance(Math.abs(result.progress - p.progress_m))} separation` : ''}</p>`; }).join('') || '<p>No fresh crew positions.</p>';
    const driver = positions.find(p => p.user_id === remote.owner_id && Date.now() - Date.parse(p.updated_at) <= 20000);
    if (driver && result && $('#crew-role').value !== 'driver' && Math.abs(driver.progress_m - result.progress) > 1609) say('Crew separation is over one mile. Verify radio contact and escort spacing requirements.', 'crew-separation');
  } catch (e) { $('#crew-status').textContent = e.message; $('#crew-positions').textContent = 'Crew locations unavailable. Do not rely on previous positions.'; }
  finally { crewBusy = false; }
}
async function refreshCrew() {
  if (!trip.shared) throw Error('Publish or join a private crew route first.');
  await crew.ready(); const remote = await crew.read(trip.shared.id);
  if (remote.closed) { stopGuidance('Live crew trip is closed.'); throw Error('This live crew trip is closed.'); }
  if (remote.revision !== trip.shared.revision) {
    stopGuidance('Crew route revision changed. Review the updated route before departure.');
    if (!trip.shared.owner && await confirmAction('Download the updated route? Existing originals remain in the saved prior device copy. The new revision requires original pages and confirmation.', 'Download revision')) {
      const updated = blankTrip(); updated.name = String(remote.snapshot.name).slice(0,120); updated.departure = remote.snapshot.departure;
      for (const key of Object.keys(updated.profile)) updated.profile[key] = String(remote.snapshot.profile?.[key] || '').slice(0,500);
      updated.hazmat = sanitizeHazmat(remote.snapshot.hazmat); updated.permits = remote.snapshot.permits.map(sanitizePermit); updated.shared = { ...trip.shared, revision: remote.revision };
      await openTrip(updated); switchTab('crew');
    } else throw Error('Review the current crew revision before guidance.');
  }
  const members = await crew.members(trip.shared);
  $('#crew-members').innerHTML = members.map(m => `<div class="doc-row"><span>${esc(m.role.toUpperCase())} · ${m.user_id === crew.userId ? 'You' : esc(m.user_id.slice(0,8))}<br>${m.accepted_revision === remote.revision ? 'Current route confirmed' : 'Awaiting current route confirmation'}</span>${trip.shared.owner ? `<button data-revoke="${esc(m.user_id)}">Revoke</button>` : ''}</div>`).join('') || '<p>No escorts have joined yet.</p>';
  $('#crew-members').querySelectorAll('[data-revoke]').forEach(button => button.onclick = safe(async () => { await crew.revoke(trip.shared, button.dataset.revoke); await refreshCrew(); }));
  $('#crew-status').textContent = `Private crew revision ${remote.revision}. Location sharing ${watching !== null && $('#share-consent').checked ? 'active' : 'off'}.`;
}
async function startGuidance() {
  if (dirty) throw Error('Save your changes before starting guidance.');
  if (!$('#conditions-checked').checked) throw Error('Confirm current restrictions, travel windows and escort arrangements before departure.');
  master = buildMaster(trip, { geometry: true }); if (!master.ready) throw Error(master.issues[0]);
  await verifyWallet(trip);
  if (trip.shared) {
    await crew.ready(); const remote = await crew.read(trip.shared.id);
    if (remote.closed || remote.revision !== trip.shared.revision) throw Error('Crew route changed or closed. Obtain the current trip and review it first.');
    if (crewKey(trip) !== crewKey(remote.snapshot)) throw Error('Local route or load differs from the shared crew revision. Publish or obtain the reviewed current route before guidance.');
    if (!trip.shared.owner) await crew.accept(trip.shared);
  }
  if (!navigator.geolocation) throw Error('GPS is unavailable on this device. Your permit wallet remains available.');
  progress = null; lastFix = null; activeState = ''; spoken = ''; spokenHazmat.clear();
  watching = navigator.geolocation.watchPosition(position => displayFix({ point: [position.coords.latitude, position.coords.longitude], accuracy: position.coords.accuracy, timestamp: position.timestamp }), () => pauseFix('GPS unavailable. Guidance paused; follow the issued permit.', 'gps-error'), { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });
  $('#stop-guidance').disabled = false; $('#start-guidance').disabled = true;
  $('#walkthrough-panel').hidden = true;
  $('#guidance-role').textContent = ({ driver: 'TRUCK DRIVER', lead: 'LEAD PILOT CAR', chase: 'CHASE PILOT CAR' })[$('#crew-role').value];
  navAlert('Permitted guidance started. Waiting for accurate GPS. Issued permits and restrictions control.', 'start');
  timer = setInterval(() => { if (!lastFix || Date.now() - lastFix.timestamp > 15000) pauseFix('GPS is stale. Guidance paused; follow the issued permit.', 'stale'); }, 5000);
  if (trip.shared) crewTimer = setInterval(() => void syncCrew(), 10000);
}
function stopGuidance(message = 'Guidance is off. Location sharing stopped.') {
  guidanceVersion += 1;
  if (watching !== null) navigator.geolocation?.clearWatch(watching); watching = null; clearInterval(timer); clearInterval(crewTimer);
  if (trip?.shared) void crew.stop(trip.shared).catch(() => {});
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  progress = null; lastFix = null; master = null; activeState = ''; spoken = ''; spokenHazmat.clear();
  $('#active-permit').textContent = 'NO ACTIVE PERMIT'; $('#maneuver').textContent = 'Guidance is off';
  $('#next-maneuver').textContent = 'Review the current trip and restart when ready.';
  $('#maneuver-distance').textContent = '—'; $('#remaining').textContent = '—'; $('#lane-info').textContent = 'Not supplied'; $('#nav-warnings').textContent = '';
  $('#stop-guidance').disabled = true; $('#nav-status').textContent = message; $('#start-guidance').disabled = !trip || !buildMaster(trip, { geometry: true }).ready;
  $('#walkthrough-panel').hidden = false;
}
async function prepareOffline() {
  if (dirty) throw Error('Save changes before preparing offline.'); await verifyWallet(trip); await persist();
  if (!('serviceWorker' in navigator)) throw Error('Offline page loading is not supported here. Export a trip packet and keep the originals separately.');
  const registration = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
  const installing = registration.installing || registration.waiting;
  if (installing && installing.state !== 'activated') await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(Error('Offline installation is still pending. Retry before departure.')), 15000); installing.addEventListener('statechange', () => { if (installing.state === 'activated') { clearTimeout(timeout); resolve(); } if (installing.state === 'redundant') { clearTimeout(timeout); reject(Error('Offline app installation failed.')); } }); });
  if (!(await caches.match('/permitted-loads'))) throw Error('Offline page is not cached yet. Reconnect and retry before departure.');
  const keep = await navigator.storage?.persist?.();
  $('#cache-status').textContent = `Trip data and originals saved on this device. Offline app shell ready. ${keep ? 'Persistent storage granted.' : 'The browser may evict storage; keep an exported backup.'} Street map tiles and live crew updates are not available offline.`;
}

setupHazmat({ getTrip: () => trip, safe, capture: captureDrafts, routeConfirmed: p => reviewed(p) && geometryReviewed(p), onChange: () => { edit(); status('Hazmat changed. Save and reconfirm cargo and route reviews.'); }, save: async message => { await persist(message); renderRoute(); } });
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
for (const name of ['state', 'entry-state', 'exit-state']) $('#permit-form').elements[name].innerHTML = '<option value="">Select state / not a border</option>' + STATES.map(s => `<option>${s}</option>`).join('');
for (const selector of ['#load-form', '#permit-form', '#geometry-json']) on(selector, 'input', () => { edit(); status('Unsaved changes. Save and reconfirm any changed route before guidance.'); });
on('#load-form', 'submit', async e => { e.preventDefault(); captureDrafts(); await persist('Load details saved on this device.'); renderRoute(); });
on('#permit-form', 'submit', async e => { e.preventDefault(); captureDrafts(); await persist('Permit details saved. Confirmation is required after changes.'); renderList(); renderReview(); });
on('#save-trip', 'click', async () => { captureDrafts(); await persist('Trip saved on this device.'); render(); });
on('#new-trip', 'click', async () => { if (await changeGuard()) await openTrip(blankTrip()); });
on('#trip-picker', 'change', async e => { if (!await changeGuard()) { e.target.value = trip.id; return; } const all = await listTrips(); await openTrip(all.find(t => t.id === e.target.value)); });
on('#examples', 'click', async () => { if (!await changeGuard()) return; await openTrip(exampleTrip()); status('Photo-reference example loaded. Originals, Ohio route remainder, Indiana permit, load dimensions and geometry must be supplied.'); switchTab('route'); });
on('#add-permit', 'click', async () => { if (!await changeGuard()) return; edit(); const p = blankPermit(); trip.permits.push(p); selected = p.id; await persist(); renderList(); renderReview(); switchTab('review'); });
on('#remove-permit', 'click', async () => { const p = currentPermit(); if (!p || !await confirmAction(`Remove ${p.state || 'this'} permit from this load?`, 'Remove permit')) return; captureDrafts(); edit(); trip.permits = trip.permits.filter(x => x.id !== p.id); selected = trip.permits[0]?.id; await persist(); render(); });
on('#delete-trip', 'click', async () => { if (!await confirmAction('Delete this device copy and its original documents? Export a backup first. This does not close a shared crew trip.', 'Delete device copy')) return; stopGuidance(); await deleteTrip(trip); const all = await listTrips(); await openTrip(all[0] || blankTrip()); });
on('#order-permits', 'click', async () => { if (dirty) throw Error('Save changes before ordering permits.'); const m = buildMaster(trip); edit(); trip.permits = m.permits; await persist(m.issues.find(i => /order|mismatch|gap|Overlapping/.test(i)) || 'Permits ordered by matching state border crossings.'); renderList(); switchTab('route'); });
on('#confirm-permit', 'click', async () => { captureDrafts(); const p = currentPermit(); confirmPermit(p); await persist('Permit confirmed against original. Geometry must be reviewed separately.'); renderList(); renderReview(); });
on('#save-geometry', 'click', async () => { edit(); captureDrafts(); const p = currentPermit(); $('#geometry-json').value = JSON.stringify(p.steps, null, 2); await persist('Geometry saved; check it against every authorized route instruction.'); renderList(); renderRoute(); });
on('#confirm-geometry', 'click', async () => { if (dirty) throw Error('Save all changed fields and reconfirm the permit before confirming geometry.'); const p = currentPermit(); if (!$('#geometry-checked').checked) throw Error('Check every road, ramp, direction and border against the permit before confirming.'); if (maneuverKey(JSON.parse($('#geometry-json').value)) !== maneuverKey(p.steps)) throw Error('Save geometry changes before confirming.'); confirmGeometry(p); await persist('Geometry confirmed for this permit revision.'); renderList(); renderReview(); renderRoute(); });
on('#decode-qr', 'click', async () => { const raw = $('#qr-contents').value.trim(); if (!raw) throw Error('Paste QR contents first.'); await handleQR(raw); });
on('#extract-text', 'click', async () => { const text = $('#permit-text').value; if (!text.trim()) throw Error('Paste the original permit text first.'); await mergeImport(parsePermitText(text)); });
on('#import-originals', 'change', async e => { const files = [...e.target.files]; e.target.value = ''; await attach(files, true); });
on('#add-pages', 'change', async e => { const files = [...e.target.files]; e.target.value = ''; await attach(files); });
on('#qr-photo', 'change', async e => { const files = [...e.target.files]; e.target.value = ''; await attach(files); });
on('#camera-start', 'click', startCamera); on('#camera-stop', 'click', stopCamera);
on('#start-guidance', 'click', startGuidance); on('#stop-guidance', 'click', () => stopGuidance());
for (const [selector, delta] of [['#walkthrough-previous', -1], ['#walkthrough-next', 1]]) on(selector, 'click', () => { if (dirty || watching !== null) throw Error('Park and save changes before reviewing maneuvers.'); walkthroughIndex += delta; renderWalkthrough(); });
on('#finish-trip', 'click', async () => { if (dirty) throw Error('Save or discard changes before completing this move.'); if (!await confirmAction('Mark this permitted move complete? A single-trip permit cannot be used for a second move.', 'Mark complete')) return; stopGuidance('Permitted move marked complete.'); trip.completedAt = new Date().toISOString(); await persist('Move complete. Original permits remain in the inspection wallet.'); if (trip.shared?.owner) await crew.close(trip.shared); renderRoute(); });
on('#read-warnings', 'click', () => { const p = progress?.permit || currentPermit(); if (!p) throw Error('Choose a state permit first.'); spoken = ''; say([...warnings(p, trip.profile, $('#crew-role').value), ...hazmatWarnings(trip, p)].join(' ') || 'No restrictions entered. Consult the original permit.'); });
on('#active-wallet', 'click', e => { e.preventDefault(); switchTab('wallet'); if (activeState) document.getElementById(`wallet-${activeState}`)?.scrollIntoView({ behavior: 'smooth' }); });
on('#cache-trip', 'click', prepareOffline);
on('#export-trip', 'click', async () => { if (dirty) throw Error('Save changes before exporting.'); const packet = await exportPacket(trip), url = URL.createObjectURL(new Blob([JSON.stringify(packet)], { type: 'application/json' })); objectURLs.push(url); const a = document.createElement('a'); a.href = url; a.download = `permitted-load-${trip.id}.json`; a.click(); status('Trip packet exported. It includes private permits; share only with your trip crew.'); });
on('#import-packet', 'change', async e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; if (!await changeGuard()) return; if (file.size > 65000000) throw Error('Trip packet exceeds 65 MB.'); const imported = await importPacket(JSON.parse(await file.text())); await openTrip(imported); status('Trip and originals imported. Confirm each permit and geometry on this device.'); });
on('#crew-role', 'change', async () => { captureDrafts(); if (watching !== null) stopGuidance('Role changed. Restart guidance to use the selected role.'); trip.localRole = $('#crew-role').value; await persist(); render(); });
on('#share-consent', 'change', () => { if (!$('#share-consent').checked && trip.shared) { void crew.stop(trip.shared).catch(() => {}); $('#crew-status').textContent = 'Location sharing is off.'; } });
on('#publish-crew', 'click', async () => { if (!$('#share-consent').checked) throw Error('Choose to share this trip with the crew first.'); if (dirty) throw Error('Save changes before publishing.'); if (!buildMaster(trip, { geometry: true }).ready) throw Error('Resolve all route checks before publishing a crew route.'); stopGuidance('Publishing a new crew route. Restart guidance after crew review.'); trip.shared = await crew.publish(trip); await persist(); $('#crew-status').textContent = 'Private route published. Export originals for the crew, then create a one-use invite.'; });
for (const role of ['lead', 'chase']) on(`#invite-${role}`, 'click', async () => { if (!trip.shared?.owner) throw Error('Publish this private crew route first.'); const code = await crew.invite(trip.shared.id, role); $('#invite-code').textContent = `${role.toUpperCase()} · one use · expires in 12 hours: ${code}`; });
on('#join-crew', 'click', async () => {
  if (!await changeGuard()) return; const remote = await crew.join($('#join-code').value); const matches = crewKey(trip) === crewKey(remote.snapshot); const imported = matches ? trip : blankTrip();
  if (!matches) { imported.name = remote.snapshot.name; imported.departure = remote.snapshot.departure; for (const key of Object.keys(imported.profile)) imported.profile[key] = String(remote.snapshot.profile?.[key] || '').slice(0, 500); imported.hazmat = sanitizeHazmat(remote.snapshot.hazmat); imported.permits = remote.snapshot.permits.map(p => sanitizePermit(p)); }
  imported.shared = { id: remote.id, revision: remote.revision, owner: false, role: remote.role };
  await openTrip(imported); $('#crew-role').value = remote.role; switchTab('crew'); $('#crew-status').textContent = 'Joined. Add the original permit pages and confirm the route and geometry on this device before guidance. Location sharing is off.';
});
on('#close-crew', 'click', async () => { if (!trip.shared?.owner) throw Error('Only the trip owner can close live sharing.'); stopGuidance(); await crew.close(trip.shared); delete trip.shared; delete savedTrip.shared; await saveTrip(savedTrip); $('#crew-status').textContent = 'Live trip closed. Crew access to fresh positions is disabled.'; });
on('#refresh-crew', 'click', refreshCrew);
function connection() { $('#connection').textContent = navigator.onLine ? 'Device wallet · online' : 'Offline · device wallet'; if (!navigator.onLine) { $('#crew-status').textContent = 'Offline — crew positions are unavailable.'; $('#crew-positions').textContent = ''; } }
window.addEventListener('online', connection); window.addEventListener('offline', connection);
document.addEventListener('visibilitychange', () => { if (document.hidden) { void stopCamera(); if (watching !== null) stopGuidance('Guidance paused while app was hidden. Restart when safely in the foreground.'); } });
window.addEventListener('pagehide', () => { stopGuidance(); void stopCamera(); objectURLs.forEach(URL.revokeObjectURL); });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
async function launchWallet() {
  let lastId = ''; try { lastId = JSON.parse(localStorage.getItem('dl-last-permit-trip') || 'null') || ''; } catch { /* Use the available device trips. */ }
  const launch = walletLaunch(await listTrips(), location.hash, lastId);
  await openTrip(launch.trip || blankTrip()); switchTab(launch.missing ? 'load' : launch.tab);
  status(launch.missing ? 'The linked trip is not saved on this device. Showing another available load; check the load name or import its backup before proceeding.' : 'Private device wallet ready. Create a load and import every state permit.', launch.missing);
}
window.addEventListener('hashchange', safe(async () => { const params = new URLSearchParams(location.hash.slice(1)); if (!['trip','tab','new'].some(key => params.has(key))) return; if (await changeGuard()) await launchWallet(); else switchTab(tab); }));
try { await launchWallet(); connection(); if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {}); }
catch (e) { status(`Device storage unavailable: ${e.message}. Enable browser storage before using the permit wallet.`, true); document.querySelectorAll('button,input,select,textarea').forEach(el => el.disabled = true); }
