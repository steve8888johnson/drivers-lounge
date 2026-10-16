import { mapReview, routeOverview, coordinateText, STREET_TILES, STREET_OPTIONS } from './map-review.mjs';
import { issuerRehearsal, issuerRowSpeech, issuerRampPair } from './issuer-rehearsal.mjs';
import { createSpeech, speechPreferences } from './speech.mjs';
import { junctionRequest, junctionView, roadEndpointContacts, sanitizeRoadContext, compareRoadShape } from './junction-evidence.mjs';
import { joinedRampComparisons } from './ramp-comparison.mjs';
import { comparePrintedIssuerRoute } from './printed-map-match.mjs';

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
  let rowIndex=0, rehearsal, focus='all',printedReview=null,printedName='';
  let chainId='',chainFocus=false;
  const chains=()=>joinedRampComparisons(junction?.features[junctionIndex],junction,rehearsal);
  const selectedChain=()=>focus==='junction'?chains().find(c=>c.id===chainId):null;
  let junction=null,junctionIndex=-1,junctionWide=true,junctionMessage='',junctionGeneration=0,junctionController,endpointIndex=-1;
  function clearJunction(){chainId='';chainFocus=false;junctionGeneration++;junctionController?.abort();junctionController=null;junction=null;junctionMessage='';junctionIndex=-1;endpointIndex=-1;junctionWide=true;$('#issuer-junction-details').hidden=true;$('#issuer-junction-summary').hidden=true;$('#issuer-junction-load').disabled=false;}
  const speech=createSpeech({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,visible:()=>!document.hidden&&dialog.open,onState:s=>{$('#issuer-voice-status').textContent=s.message;}});
  const status = message => { $('#permit-map-status').textContent = message; if (/failed|timed out|unavailable|cleared|stopped|not finished/i.test(message)) $('#permit-map-source').open=true; };
  function dispose() { clearJunction(); speech.stop(); token++; clearTimeout(tileTimer); map?.remove(); map = null; layers = null; streetRequested = false; $('#permit-street-map').hidden = true; $('#permit-map-show').disabled = false; $('#permit-map-show').hidden = false; }
  function draw(view) {
    if (!map) return;
    layers.clearLayers();
    const paths = overview ? whole.paths : view.segments, sparse=overview?whole.sparsePaths||[]:[], all=[...paths,...sparse];
    if (!all.length) { dispose(); $('#permit-map-show').disabled = true; status('No usable geometry. The street map has been cleared.'); return; }
    const L = window.L;
    if(focus==='junction'&&junction)for(const [i,f] of junction.features.entries())L.polyline(f.paths,{color:i===junctionIndex?'#7139a8':'#6b7280',weight:i===junctionIndex?4:2,opacity:1,smoothFactor:0}).addTo(layers);
    // Keep each supplied segment separate. Do not draw a connector over missing data.
    L.polyline(paths, { color: '#a94c00', weight: 7, opacity: .9, smoothFactor: 0 }).addTo(layers);
    if(sparse.length) L.polyline(sparse,{color:'#b82935',weight:6,dashArray:'9 10',opacity:1,smoothFactor:0}).addTo(layers);
    if(whole.issuerOverview && focus==='sparse' && whole.spanEvidence?.length) L.polyline(whole.spanEvidence.map(e=>e.detail),{color:'#7139a8',weight:3,opacity:1,smoothFactor:0}).addTo(layers);
    if(focus==='junction'&&junction?.features[junctionIndex])L.polyline(junction.features[junctionIndex].paths,{color:'#7139a8',weight:3,opacity:1,smoothFactor:0}).addTo(layers);
    const chain=selectedChain(),pair=issuerRampPair(rehearsal);
    if(chain)L.polyline(chain.path,{color:'#7139a8',weight:5,opacity:1,smoothFactor:0}).addTo(layers);
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
    const jb=junction?.query.bounds,jf=junction?.features[junctionIndex],endpoint=focus==='junction'&&!chain?roadEndpointContacts(jf,junction)[endpointIndex]:null;
    if(endpoint)L.circleMarker(endpoint.point,{radius:8,color:'#7139a8',weight:3,fillColor:'#fff',fillOpacity:1}).bindTooltip(`Displayed endpoint ${endpointIndex+1} · not a confirmed turn`,{permanent:true,direction:'top'}).addTo(layers);
    const chainPoint=chain&&chainFocus?chain.path[rowIndex===pair.entry?0:chain.path.length-1]:null;
    if(chain)for(const [point,label] of [[chain.path[0],'A · comparison start'],[chain.path.at(-1),'B · comparison end']])L.circleMarker(point,{radius:7,color:'#7139a8',weight:3,fillColor:'#fff',fillOpacity:1}).bindTooltip(`${label} · turn unverified`,{permanent:true,direction:label.startsWith('A')?'top':'bottom'}).addTo(layers);
    const inspected=chainPoint||endpoint?.point;
    const bounds = L.latLngBounds(inspected?[[inspected[0]-.0015,inspected[1]-.0018],[inspected[0]+.0015,inspected[1]+.0018]]:chain?chain.path:focus==='junction'&&jb?(!junctionWide&&jf?jf.paths.flat():[[jb[1],jb[0]],[jb[3],jb[2]]]):[...focused.flat(), ...context]);
    map.invalidateSize(); map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: false });
  }
  function renderRehearsal() {
    rehearsal=whole.issuerOverview?issuerRehearsal(permit,rowIndex):null;
    const printedRow=printedReview?.rows[rowIndex];
    $('#issuer-printed-match').hidden=!printedRow||focus==='sparse';
    $('#issuer-printed-match').textContent=printedRow?`${printedName} · PDF page ${printedRow.page}, row ${rowIndex+1}. Text matches; turn location unverified.`:'';
    $('#issuer-rehearsal').hidden=!rehearsal?.available;
    $('#issuer-rehearsal-heading').hidden=!rehearsal?.available;
    $('#issuer-rehearsal-voice').hidden=!rehearsal?.available;
    const pair=issuerRampPair(rehearsal);$('#issuer-ramp-pair').hidden=!pair||focus==='sparse';
    $('#issuer-pair-entry').setAttribute('aria-pressed',String(pair?.entry===rowIndex));$('#issuer-pair-merge').setAttribute('aria-pressed',String(pair?.merge===rowIndex));
    $('#issuer-pair-note').textContent=pair?`Rows ${pair.entry+1}–${pair.merge+1} share the same printed ramp and direction. Use these two buttons to keep the same road comparison. Exact positions remain unverified.`:'';
    $('#issuer-row-legend').hidden=focus==='sparse'||focus==='junction';
    $('#issuer-junction-summary').hidden=focus!=='junction';$('#issuer-junction-summary').textContent=junctionMessage;
    $('#issuer-junction-details').hidden=focus!=='junction'||!junction;
    $('#issuer-junction-load').disabled=!!junctionController||!rehearsal?.estimated;
    $('#issuer-junction-select').innerHTML='<option value="-1">Choose a road shape to inspect</option>'+(junction?.features||[]).map((f,i)=>`<option value="${i}">${esc(junction.query.prefix+junction.query.number)} · ${esc(f.kind)} · record ${f.id}</option>`).join('');$('#issuer-junction-select').value=String(junctionIndex);
    const jf=junction?.features[junctionIndex];let jm='';
    const candidates=chains(),chain=selectedChain();
    $('#issuer-chain-section').hidden=!candidates.length;
    $('#issuer-chain-select').innerHTML='<option value="">Inspect one record only</option>'+candidates.map(c=>`<option value="${esc(c.id)}">Records ${c.recordIds.join(' + ')} · ${(c.lengthMeters/1609.344).toFixed(2)} mi · drawn ${c.drawnDirection}</option>`).join('');$('#issuer-chain-select').value=chain?.id||'';
    $('#issuer-chain-fit').disabled=!chain;
    $('#issuer-chain-note').textContent=chain?`Joined comparison only. These two shapes share an exact recorded vertex and are drawn ${chain.drawnDirection}, as worded in the permit. That does not verify traffic direction or permission. A/B are comparison endpoints, not confirmed turn locations. Use Ramp entry / Merge to inspect them; tap Read separately.`:'Optional joined shapes share one exact recorded vertex. No gap is bridged. Each is a candidate; none is automatically selected or approved.';
    if(chain)$('#issuer-junction-summary').textContent='Purple: joined candidate. Amber: unchanged issuer overview. A/B: comparison endpoints, not verified turn locations.';
    if(jf){try{const c=compareRoadShape(chain?{paths:[chain.path]}:jf,junctionView(permit,rowIndex).area);jm=`<strong>${c.closeShape?'Close shape · turn unverified':'Shapes differ · turn unresolved'}</strong><p>Largest sampled distance from this ${chain?'joined candidate':'road record'} to the issuer line: ${Math.ceil(c.maxOffset)} m. Only the portion in this viewing area is compared. Distances run from the displayed comparison to the issuer line. They do not identify a permitted turn or travel direction.</p>`;}catch{jm='<strong>Turn unresolved · shape comparison exceeds the inspection limit.</strong>';}
      jm+=`<p>${chain?`Joined records ${chain.recordIds.join(' + ')}`:`Record ${jf.id} · ${esc(jf.road)} · ${esc(jf.kind)}`}<br>Inventory: ${esc(jf.date)} · retrieved ${esc(new Date(junction.retrievedAt).toLocaleString())}. <a href="${esc(junction.source)}" target="_blank" rel="noopener noreferrer">TxDOT roadway source</a></p>`;}
    $('#issuer-junction-detail').innerHTML=jm;
    const ends=roadEndpointContacts(jf,junction);$('#issuer-endpoints').hidden=!ends.length||!!chain;
    $('#issuer-endpoint-note').textContent=ends.length?'These are ends of the displayed inventory shape, not confirmed ramp-entry or merge positions. Long records may continue outside this viewing area. Point order does not establish travel direction; touching lines may be at different levels.':'';
    $('#issuer-endpoint-contacts').innerHTML=ends.map(e=>`<p><strong>Endpoint ${e.index+1}:</strong> ${e.contacts.length?e.contacts.map(c=>`${esc(c.kind)} · record ${c.id} (${c.distance.toFixed(2)} m from its line)`).join('; '):'No other returned road line meets this endpoint within 1 m. The query may not include the approach road.'}</p>`).join('');
    for(const i of [0,1])$('#issuer-endpoint-'+i).setAttribute('aria-pressed',String(endpointIndex===i));
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
    $('#issuer-row-next-read').disabled=rowIndex===rehearsal.total-1;
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
  $('#permit-map-all').onclick = () => { clearJunction();speech.stop(); focus='all'; overview = true; render(); };
  $('#permit-map-sparse').onclick=async()=>{clearJunction();speech.stop();focus='sparse';render();if(!map)await showMap();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  function selectRow(value){ if(!rehearsal?.available||!Number.isInteger(value)||value<0||value>=rehearsal.total)return; clearJunction();speech.stop('Row changed. Tap Read turn aloud for the selected row.');rowIndex=value;focus='row';render(); }
  function selectPair(which){
    const pair=issuerRampPair(rehearsal);if(!pair)return;const value=pair[which];
    let retain=false;try{retain=focus==='junction'&&!!junction&&!junctionController&&JSON.stringify(junction.query)===JSON.stringify(junctionRequest(permit,value));}catch{}
    if(!retain)clearJunction();else if(selectedChain())chainFocus=true;speech.stop('Row changed. Tap Read turn aloud for the selected row.');rowIndex=value;focus=retain?'junction':'row';render();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});
  }
  $('#issuer-pair-entry').onclick=()=>selectPair('entry');$('#issuer-pair-merge').onclick=()=>selectPair('merge');
  $('#issuer-row-select').onchange=()=>selectRow(Number($('#issuer-row-select').value));
  $('#issuer-row-previous').onclick=()=>selectRow(rowIndex-1);
  $('#issuer-row-next').onclick=()=>selectRow(rowIndex+1);
  $('#issuer-row-area').onclick=async()=>{if(!rehearsal?.estimated)return;clearJunction();focus='row';render();if(!map)await showMap();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  function readIssuerRow(){const text=issuerRowSpeech(rehearsal,{candidateComparison:!!selectedChain(),printedPage:printedReview?.rows[rowIndex]?.page});if(!text)return;if(focus!=='junction')focus='row';render();let prefs;try{prefs=speechPreferences(localStorage);}catch{prefs=speechPreferences(null);}speech.play(text,{...prefs,key:'issuer-row',repeat:true});}
  $('#issuer-row-read').onclick=readIssuerRow;
  $('#issuer-row-next-read').onclick=()=>{if(!dialog.open||document.hidden||!rehearsal?.available||rowIndex>=rehearsal.total-1)return;selectRow(rowIndex+1);readIssuerRow();};
  $('#issuer-junction-select').onchange=()=>{const value=Number($('#issuer-junction-select').value);if(!Number.isInteger(value)||(value!==-1&&!junction?.features[value]))return;speech.stop();chainId='';chainFocus=false;junctionIndex=value;endpointIndex=-1;junctionWide=value===-1;render();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  $('#issuer-junction-fit').onclick=()=>{speech.stop();chainId='';chainFocus=false;junctionWide=true;endpointIndex=-1;render();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  $('#issuer-chain-select').onchange=()=>{const value=$('#issuer-chain-select').value;if(value&&!chains().some(c=>c.id===value))return;speech.stop();chainId=value;chainFocus=false;endpointIndex=-1;render();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  $('#issuer-chain-fit').onclick=()=>{if(!selectedChain())return;speech.stop();chainFocus=false;render();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  for(const i of [0,1])$('#issuer-endpoint-'+i).onclick=()=>{if(!roadEndpointContacts(junction?.features[junctionIndex],junction)[i])return;endpointIndex=i;focus='junction';render();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});};
  $('#issuer-junction-load').onclick=async()=>{
    clearJunction();speech.stop();focus='junction';const generation=junctionGeneration;let timer;
    try{const query=junctionRequest(permit,rowIndex),controller=new AbortController();junctionController=controller;timer=setTimeout(()=>controller.abort(),10000);junctionMessage='Loading nearby official road shapes…';render();
      const response=await fetch('/api/permit-road-context',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(query),signal:junctionController.signal});
      if(!response.ok)throw Error('Official road comparison unavailable. Saved permit text and map are unchanged.');
      const body=await response.json();if(generation!==junctionGeneration||!dialog.open||document.hidden)return;
      junction=sanitizeRoadContext(body.context,query);junctionMessage=junction.features.length?'Amber: issuer line. Purple: selected road record. Gray: nearby records. No exact turn match established.':'No detailed road records returned for this area. Exact turn remains unresolved.';
      junctionController=null;render();if(!map)await showMap();$('#issuer-rehearsal-heading').scrollIntoView?.({block:'start'});
    }catch(error){if(generation===junctionGeneration){junction=null;junctionMessage=error.name==='AbortError'?'Road comparison timed out. Original map remains available.':error.message;junctionController=null;render();}}
    finally{clearTimeout(timer);}
  };
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
  return { open(value, selected = 0, selectionChanged = () => {}, options = {}) {
    const nextPermit=structuredClone(value),nextReview=options.printedReview?structuredClone(options.printedReview):null;
    if(nextReview){const match=comparePrintedIssuerRoute(nextReview,nextPermit);if(!match.matched)throw Error(match.message);if(!Number.isInteger(options.issuerRow)||!nextReview.rows[options.issuerRow])throw Error('The printed row is unavailable. Reopen its PDF.');}
    dispose();printedReview=nextReview;printedName=String(options.printedName||'Printed permit');rowIndex=nextReview?options.issuerRow:0;focus=nextReview?'row':'all';onSelection=selectionChanged;permit=nextPermit;index=selected;whole=routeOverview(permit);overview=options.overview===true||whole.issuerOverview===true;render();status('Compare the original permit with the saved instruction. The map is off until requested.');dialog.showModal();if(options.showMap&&whole.available)return showMap();
  } };
}
