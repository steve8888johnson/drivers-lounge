import { readRoadEvidence, evidenceForRow } from './road-evidence.mjs';

let library;
async function leaflet(){
  if(window.L)return window.L;
  if(!library)library=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='/assets/vendor/leaflet-1.9.4/leaflet.js';
    const timer=setTimeout(()=>{s.remove();reject(Error('Map library timed out. Original text remains available.'));},12000);
    s.onload=()=>{clearTimeout(timer);window.L?resolve(window.L):reject(Error('Map library unavailable.'));};s.onerror=()=>{clearTimeout(timer);s.remove();reject(Error('Map library unavailable.'));};document.head.append(s);
  }).catch(e=>{library=null;throw e;});return library;
}
export function createRoadEvidence({stopSpeech=()=>{},readRow=()=>{},changeRow=()=>{}}={}) {
  const $=s=>document.querySelector(s);let packet=null,review=null,index=0,map=null,group=null,row=null,selected='',generation=0,wantsMap=false;
  const say=s=>$('#printed-road-status').textContent=s;
  const checkLabels={supports:'Supports part of the match',conflict:'Conflict',unresolved:'Still to check'};
  function renderChecks(){
    const box=$('#printed-road-checks');box.replaceChildren();box.hidden=!row?.checks.length;if(box.hidden)return;
    const details=document.createElement('details'),summary=document.createElement('summary');
    const conflicts=row.checks.filter(c=>c.outcome==='conflict').length;
    summary.textContent=`Why this match is held · ${row.checks.length} checks${conflicts?` · ${conflicts} conflict${conflicts===1?'':'s'}`:''}`;
    details.append(summary);
    for(const c of row.checks){
      const item=document.createElement('p'),heading=document.createElement('strong'),body=document.createElement('span'),link=document.createElement('a');
      heading.textContent=`${checkLabels[c.outcome]}: ${c.label}. `;body.textContent=`${c.detail} `;
      link.href=c.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`Source · ${c.date}`;
      item.append(heading,body,link);details.append(item);
    }
    const note=document.createElement('p');note.textContent='These imported checks explain the comparison; they do not authorize a route or establish current road conditions.';details.append(note);box.append(details);
  }
  function clearMap(){generation++;map?.remove();map=null;group=null;$('#printed-road-map').hidden=true;$('#printed-road-fit').disabled=true;}
  function selectFeature(){
    selected=$('#printed-road-feature').value;stopSpeech();
    const movement=row?.movements.find(m=>`movement:${m.id}`===selected);
    const f=row?.features.find(f=>f.id===selected);
    const conflict=movement?.disposition==='conflict',color=conflict?'#a62035':'#a94c00';
    $('#printed-road-detail').textContent=movement?`${conflict?'CONFLICT — DO NOT USE THIS OPTION':'CANDIDATE COMPARISON'} — ${movement.label}. ${movement.note} Geometry: ${(movement.lengthMeters/1609.344).toFixed(2)} mi. Drawn order: ${movement.parts.map((p,i)=>`${i+1}: ${p.compass} on record ${p.featureId}`).join('; ')}. Numbers show the comparison order, not driving instructions. Traffic direction and turn permission remain unverified.`:f?`${f.road} · ${f.kind} · record ${f.id}. Inventory reference direction: ${f.direction||'not supplied'}. This field describes inventory order, not allowed traffic direction.`:'No candidate selected. Inspect the whole junction or choose an individual record.';
    if(!map||!row)return;const L=window.L;group.clearLayers();
    for(const feature of row.features){const active=feature.id===selected;const label=document.createElement('span');label.textContent=`${feature.road.replace(/ · inventory \d+$/,'')} · ${feature.kind==='Grade Separated Connector'?'connector':feature.kind}`;L.polyline(feature.paths,{color:active?'#a94c00':'#73849a',weight:active?7:3,opacity:active?1:.65,smoothFactor:0}).bindTooltip(label,{permanent:active,direction:'top'}).addTo(group);}
    if(movement){
      for(const [i,p]of movement.parts.entries()){
        const label=document.createElement('span');label.textContent=`${i+1}. ${p.road.replace(/ · inventory \d+$/,'')} · drawn ${p.compass}`;
        L.polyline(p.path,{color,weight:7,opacity:1,smoothFactor:0,dashArray:conflict?'9 7':null}).bindTooltip(label,{permanent:false,direction:'top'}).addTo(group);
        const start=document.createElement('span');start.textContent=`${i+1} start`;
        L.circleMarker(p.path[0],{radius:6,color,fillColor:'#fff',fillOpacity:1}).bindTooltip(start,{permanent:true,direction:'top'}).addTo(group);
      }
      const end=document.createElement('span');end.textContent='End of comparison';
      L.circleMarker(movement.parts.at(-1).path.at(-1),{radius:6,color,fillColor:color,fillOpacity:1}).bindTooltip(end,{permanent:true,direction:'bottom'}).addTo(group);
      map.fitBounds(L.latLngBounds(movement.parts.flatMap(p=>p.path)),{padding:[35,35],maxZoom:17,animate:false});
    }else if(f){map.fitBounds(L.latLngBounds(f.paths.flat()),{padding:[30,30],maxZoom:17,animate:false});}
    else map.fitBounds(L.latLngBounds(row.features.flatMap(f=>f.paths.flat())),{padding:[24,24],maxZoom:17,animate:false});
  }
  function render(follow=false){
    clearMap();row=evidenceForRow(packet,review,index);$('#printed-road-open').disabled=!row;$('#printed-road-read').disabled=!row;
    const original=review?.rows[index];$('#printed-road-turn').textContent=row?`PDF page ${original.page} · row ${index+1}: ${original.instruction}`:'';
    const candidates=(row?.movements||[]).filter(m=>m.disposition!=='conflict'),conflicts=(row?.movements||[]).filter(m=>m.disposition==='conflict');
    $('#printed-road-feature').replaceChildren(...(!candidates.length&&conflicts.length?[new Option('Whole junction — no candidate selected','')]:[]),...candidates.map(m=>new Option(`Candidate: ${m.label}`,`movement:${m.id}`)),...conflicts.map(m=>new Option(`Conflict: ${m.label}`,`movement:${m.id}`)),...(row?.features||[]).map(f=>new Option(`${f.road} · ${f.kind} · ${f.id}`,f.id)));
    $('#printed-road-feature').disabled=!row;$('#printed-road-detail').textContent='';
    $('#printed-road-previous').disabled=!review?.rows.length||index===0;$('#printed-road-next').disabled=!review?.rows.length||index===review.rows.length-1;
    $('#printed-road-coverage').textContent=packet?`${packet.rows.length} of ${review.rows.length} printed rows have comparison areas. These are junction windows, not a continuous or approved driving route.`:'';
    $('#printed-road-note').textContent=row?.note||'';
    renderChecks();
    $('#printed-road-source').replaceChildren();
    if(row){const a=document.createElement('a');a.href=row.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Road inventory reference';$('#printed-road-source').append(a,document.createTextNode(` · data date ${row.dataDate}; retrieved ${row.retrievedAt.slice(0,10)}. Imported source label is not independent authentication.`));}
    say(row?'Road evidence found for this exact printed row. Choose a road record to inspect. No route has been approved.':packet?'No road evidence for this row. The previous map has been cleared.':'Optional: open a prepared road comparison file for this PDF. Files stay on this device.');
    if(row)selectFeature();
    if(follow&&row)void openMap();else wantsMap=false;
  }
  $('#printed-road-file').onchange=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;stopSpeech();wantsMap=false;clearMap();packet=null;render();const token=++generation;
    try{if(!review||file.size>4000000)throw Error('Choose a road comparison file up to 4 MB after reading the PDF.');const raw=await file.text();if(token!==generation)return;packet=readRoadEvidence(raw,review);render();}catch(e){if(token===generation){packet=null;render();say(`Comparison not loaded: ${e.message}`);}}
  };
  $('#printed-road-feature').onchange=selectFeature;
  $('#printed-road-read').onclick=readRow;$('#printed-road-stop').onclick=stopSpeech;
  $('#printed-road-previous').onclick=()=>{if(index>0)changeRow(index-1);};$('#printed-road-next').onclick=()=>{if(index<review?.rows.length-1)changeRow(index+1);};
  $('#printed-road-fit').onclick=()=>{if(map&&row)map.fitBounds(window.L.latLngBounds(row.features.flatMap(f=>f.paths.flat())),{padding:[24,24],maxZoom:17,animate:false});};
  async function openMap(){
    if(!row)return;wantsMap=true;stopSpeech();clearMap();const token=++generation;$('#printed-road-open').disabled=true;say('Opening the local road geometry…');
    try{const L=await leaflet();if(token!==generation||document.hidden||!$('#printed-route-dialog').open)return;$('#printed-road-map').hidden=false;map=L.map('printed-road-map',{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,attributionControl:false});group=L.layerGroup().addTo(map);selectFeature();$('#printed-road-fit').disabled=false;say('Amber: candidate. Dashed red: conflict. Gray: context. No GPS, road snapping or approved route. Crossing lines do not establish a legal connection.');}
    catch(e){if(token===generation){wantsMap=false;clearMap();$('#printed-road-open').disabled=!row;say(e.message);}}
    finally{if(token===generation)$('#printed-road-open').disabled=false;}
  }
  $('#printed-road-open').onclick=openMap;
  return {reset(value){wantsMap=false;review=value;packet=null;index=0;render();},select(i){const follow=wantsMap;index=i;render(follow);},stop(){wantsMap=false;clearMap();$('#printed-road-open').disabled=!row;if(row)say('Map stopped. Tap Show road geometry to reopen it while parked.');}};
}
