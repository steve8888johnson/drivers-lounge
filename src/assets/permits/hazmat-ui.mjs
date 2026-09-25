import { blankHazmat, blankHazmatRoute, blankMaterial, DIVISIONS, HAZMAT_NOTICE, cameoURL, normalizeUN, cargoReviewed, confirmCargo, confirmHazmatRoute, hazmatActive, hazmatErrors } from './hazmat.mjs';
import { STATE_SOURCES, SOURCE_CHECKED, REGISTRY } from './hazmat-sources.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(values,current)=>'<option value="">Choose…</option>'+values.map(([v,label])=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`).join('');
const field=(key,label,value,attrs='')=>`<label>${label}<input data-hfield="${key}" value="${esc(value)}" ${attrs}></label>`;
const select=(key,label,value,values)=>`<label>${label}<select data-hfield="${key}">${options(values,value)}</select></label>`;
const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
let root;
export function setupHazmat(options) {
  root=document.querySelector('#hazmat-editor');
  root.addEventListener('input',()=>{readHazmat(options.getTrip());options.onChange();});
  const runAction=options.safe(async event=>{
    const button=event.target.closest('[data-haction]');if(!button)return;
    const trip=options.getTrip();options.capture();const action=button.dataset.haction;
    if(action==='add') { if(trip.hazmat.materials.length>=30)throw Error('Use at most 30 materials.');trip.hazmat.materials.push(blankMaterial());trip.hazmat.enabled=true; }
    if(action==='remove')trip.hazmat.materials.splice(Number(button.dataset.index),1);
    if(action==='cargo')confirmCargo(trip.hazmat);
    if(action==='route') {
      const p=trip.permits.find(p=>p.id===button.dataset.permit);
      if(!options.routeConfirmed(p))throw Error('Confirm current route evidence and geometry in Review first.');
      confirmHazmatRoute(trip,p);
    }
    if(action==='add-alert') { const alerts=trip.permits.find(p=>p.id===button.dataset.permit).hazmatRoute.alerts; if(alerts.length>=100)throw Error('Use at most 100 hazmat route alerts.'); alerts.push({routeLine:1,text:'',sourceURL:''}); }
    if(action==='remove-alert')trip.permits.find(p=>p.id===button.dataset.permit).hazmatRoute.alerts.splice(Number(button.dataset.index),1);
    options.onChange();await options.save('Hazmat details saved. Review status reflects the current load and route.');renderHazmat(trip);
  });
  root.addEventListener('click',event=>{if(event.target.closest('[data-haction]'))void runAction(event);});
}
export function readHazmat(trip) {
  if(!root?.querySelector('[data-h-enabled]'))return;
  trip.hazmat??=blankHazmat(); const h=trip.hazmat;
  h.enabled=root.querySelector('[data-h-enabled]').checked;
  root.querySelectorAll('[data-cargo-field]').forEach(el=>h[el.dataset.cargoField]=el.value.trim());
  root.querySelectorAll('[data-material]').forEach(el=>{
    const m=h.materials[Number(el.dataset.material)];if(!m)return;
    el.querySelectorAll('[data-hfield]').forEach(input=>m[input.dataset.hfield]=input.value.trim());
    const a=el.querySelector('[data-cameo-link]');a.href=cameoURL(m.unNumber);a.textContent=`Open CAMEO reference${normalizeUN(m.unNumber)?' for '+normalizeUN(m.unNumber):''} ↗`;
  });
  root.querySelectorAll('[data-hroute]').forEach(el=>{
    const p=trip.permits.find(p=>p.id===el.dataset.hroute);if(!p)return;const r=p.hazmatRoute??=blankHazmatRoute();
    el.querySelectorAll('[data-route-field]').forEach(input=>r[input.dataset.routeField]=input.type==='checkbox'?input.checked:input.value.trim());
    el.querySelectorAll('[data-alert]').forEach(a=>{const value=r.alerts[Number(a.dataset.alert)];a.querySelectorAll('[data-alert-field]').forEach(input=>value[input.dataset.alertField]=input.dataset.alertField==='routeLine'?Number(input.value):input.value.trim());});
  });
}
export function renderHazmat(trip) {
  if(!root)return;const h=trip.hazmat??=blankHazmat();
  root.innerHTML=`<div class="info"><strong>HAZMAT ROUTE REVIEW</strong><p>${HAZMAT_NOTICE}</p></div>
  <label class="check"><input type="checkbox" data-h-enabled ${h.enabled?'checked':''}>This load carries hazardous materials, including uncleaned residue when applicable.</label>
  ${trip.profile.hazmat?`<p class="hazmat-hold">Existing hazmat notes: ${esc(trip.profile.hazmat)}. Complete the material records below.</p>`:''}
  <p class="muted">Copy classification and quantity from shipping papers. The carrier determines applicability; an empty field or an unchecked placard box never establishes an unrestricted route.</p>
  <div class="form-grid">
  <label>Placarding determination<select data-cargo-field="placarding">${options([['unknown','Not yet determined'],['required','Required'],['not-required','Carrier determined not required']],h.placarding)}</select></label>
  <label>Shipping-paper reference<input data-cargo-field="shippingPaperRef" value="${esc(h.shippingPaperRef)}" maxlength="2000"></label>
  <label>Emergency contact from shipping papers<input data-cargo-field="emergencyContact" value="${esc(h.emergencyContact)}" maxlength="2000"></label>
  <label>Written route-plan reference, when required<input data-cargo-field="writtenPlanRef" value="${esc(h.writtenPlanRef)}" maxlength="2000"></label>
  <label class="wide">Mixed-load compatibility / segregation review<textarea data-cargo-field="compatibilityNotes" rows="2" maxlength="2000">${esc(h.compatibilityNotes)}</textarea></label></div>
  <div class="hazmat-materials">${h.materials.map(materialMarkup).join('')}</div>
  <div class="actions"><button data-haction="add">+ Add hazardous material</button><button data-haction="cargo">Confirm cargo against shipping papers</button><button data-haction="save" class="primary">Save hazmat details</button></div>
  <p class="muted">${cargoReviewed(h)?'Cargo confirmed for this revision.':'Cargo needs confirmation.'} Material details, notes and reviews are included in exported packets and private crew sharing. Original shipping papers should remain with the driver.</p>
  <details><summary>Official research and response resources</summary><p>${link(REGISTRY,'FMCSA routes by state')} · ${link('https://cameochemicals.noaa.gov/search/simple','CAMEO Chemicals')} · ${link('https://www.phmsa.dot.gov/training/hazmat/erg/emergency-response-guidebook-erg','PHMSA Emergency Response Guidebook')}</p><p>${link('https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-397','49 CFR Part 397')} · ${link('https://www.fmcsa.dot.gov/mission/field-offices','FMCSA field offices')}</p><p>CAMEO opens at the matching UN/NA reference, which may describe multiple chemicals. Check the exact shipping description. No chemical response data or compatibility verdict is inferred here. Online reference pages need connectivity; use the official offline CAMEO/ERG tools for emergency reference.</p></details>
  <h3>Check every state and each exact route</h3><p class="muted">Review designated/preferred corridors, prohibited roads, tunnels, bridges, local delivery exceptions, times and applicable state/tribal/local rules. Resolve a conflict with the authorities before moving. OS/OW authorization does not settle hazmat applicability.</p>
  <p class="muted">Official source directory checked ${SOURCE_CHECKED}. Linked documents have their own publication dates and may be older. No live national restriction feed is connected. An absent registry entry does not establish permission.</p>
  ${trip.permits.map(p=>routeMarkup(trip,p)).join('')||'<p>Add the state route/permit records first.</p>'}
  <div id="hazmat-check-summary"></div>`;
  const errors=hazmatErrors(trip);root.querySelector('#hazmat-check-summary').innerHTML=!hazmatActive(trip)?'<p class="muted">Hazmat review is off for this load.</p>':errors.length?`<div class="hazmat-hold"><strong>${errors.length} hazmat checks need attention.</strong><p>${esc(errors[0])}</p></div>`:'<p class="good">Recorded hazmat reviews cover this planned trip. Recheck current conditions before departure.</p>';
}
function materialMarkup(m,i) {
  const yn=[['unknown','Not confirmed'],['yes','Yes'],['no','No']];
  return `<article class="hazmat-card" data-material="${i}"><div class="section-head"><h3>Material ${i+1}</h3><button data-haction="remove" data-index="${i}" class="danger">Remove material</button></div><div class="form-grid">
  ${field('unNumber','UN / NA identification',m.unNumber,'maxlength="8" placeholder="UN1203"')}${field('shippingName','Proper shipping name',m.shippingName,'maxlength="300"')}
  ${select('division','Primary class / division',m.division,DIVISIONS.map(v=>[v,v]))}${field('subsidiary','Subsidiary classes / divisions (comma-separated)',m.subsidiary,'maxlength="100"')}
  ${select('packingGroup','Packing group',m.packingGroup,[['I','I'],['II','II'],['III','III'],['not-assigned','Not assigned on shipping papers']])}
  ${field('quantity','Quantity on shipping papers',m.quantity,'type="number" min="0.001" step="any"')}${select('unit','Quantity units',m.unit,['lb','kg','gal','L','ft3','m3'].map(v=>[v,v]))}
  ${select('packaging','Packaging',m.packaging,[['bulk','Bulk'],['non-bulk','Non-bulk'],['residue','Uncleaned residue']])}
  ${select('inhalation','Poison / toxic inhalation hazard',m.inhalation,yn)}${select('hrcq','Highway route-controlled radioactive quantity',m.hrcq,yn)}</div>
  <a data-cameo-link href="${esc(cameoURL(m.unNumber))}" target="_blank" rel="noopener noreferrer">Open CAMEO reference${normalizeUN(m.unNumber)?' for '+esc(normalizeUN(m.unNumber)):''} ↗</a></article>`;
}
function routeMarkup(trip,p) {
  const r=p.hazmatRoute??=blankHazmatRoute(),source=STATE_SOURCES[p.state];
  const input=(k,label,attrs='')=>`<label>${label}<input data-route-field="${k}" value="${esc(r[k])}" ${attrs}></label>`;
  return `<article class="hazmat-card" data-hroute="${esc(p.id)}"><h3>${esc(p.state||'Choose state')} · ${esc(p.number||'Route reference needed')}</h3>
  <p>${link(source?.url||REGISTRY,source?`${source.name} FMCSA registry`:'FMCSA state directory')}</p><div class="form-grid">
  <label class="wide">Route determination<select data-route-field="disposition">${options([['unknown','Unresolved — guidance blocked'],['conflict','Restriction conflicts with this route — blocked'],['clear','Carrier reviewed this exact route and resolved applicability']],r.disposition)}</select></label>
  ${input('checkedOn','Sources checked on','type="date"')}${input('validThrough','Review covers travel through','type="date"')}${input('reviewer','Carrier / reviewer','maxlength="2000"')}${input('authorityURL','Current routing authority / DOT source','type="url" maxlength="2000" placeholder="https://…"')}
  <label class="wide">Authority determination, source dates and applicable conditions<textarea data-route-field="notes" rows="3" maxlength="2000">${esc(r.notes)}</textarea></label></div>
  <label class="check"><input data-route-field="registryChecked" type="checkbox" ${r.registryChecked?'checked':''}>I checked the FMCSA registry, route descriptions and current applicability for this cargo.</label>
  <label class="check"><input data-route-field="authoritiesChecked" type="checkbox" ${r.authoritiesChecked?'checked':''}>I checked the state/tribal/local authorities, tunnels, bridges, delivery exceptions and time restrictions along the entire route.</label>
  <details><summary>Warnings at specific supplied maneuvers (${r.alerts.length})</summary><p>Copy a verified restriction or instruction and link its authority. Any unresolved prohibition must remain a route conflict above.</p>${r.alerts.map((a,i)=>`<div class="hazmat-alert" data-alert="${i}"><label>Source route line<select data-alert-field="routeLine">${options(p.steps.map(s=>[String(s.routeLine),`${s.routeLine} · ${s.text.slice(0,70)}`]),String(a.routeLine))}</select></label><label>Hazmat warning<textarea data-alert-field="text" rows="2" maxlength="1000">${esc(a.text)}</textarea></label><label>Authority source<input data-alert-field="sourceURL" type="url" maxlength="2000" value="${esc(a.sourceURL)}"></label><button data-haction="remove-alert" data-permit="${esc(p.id)}" data-index="${i}">Remove alert</button></div>`).join('')}<button data-haction="add-alert" data-permit="${esc(p.id)}">+ Add maneuver warning</button></details>
  <div class="actions"><button data-haction="route" data-permit="${esc(p.id)}">Confirm hazmat route review</button></div><p class="muted">${r.review?'A confirmation is recorded; current route checks detect changes.':'No current confirmation.'} Changes to cargo, route, travel date or this review require confirmation again.</p></article>`;
}
