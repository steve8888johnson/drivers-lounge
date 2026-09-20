(async function(){
  const B=window.DLBackend,$=s=>document.querySelector(s);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const status=$('#journal-status'),container=$('#journal-trips');
  function download(filename,contents,type){const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function csvCell(value){return `"${String(value??'').replaceAll('"','""')}"`}
  try{
    if(!B?.configured)throw new Error('Private trip history is temporarily unavailable.');
    const user=await B.user();
    if(!user){container.innerHTML='<p>Sign in to view your private trips.</p><a class="btn" href="/account?return=%2Fcamera-journal">Sign in</a>';return}
    const [{data:trips,error:tripError},{data:crossings,error:crossingError}]=await Promise.all([
      B.client.from('driver_trip_journals').select('id,title,origin,destination,status,started_at,ended_at').order('started_at',{ascending:false}).limit(50),
      B.client.from('driver_camera_crossings').select('id,trip_id,detected_at,vehicle_latitude,vehicle_longitude,camera_latitude,camera_longitude,distance_m,camera_brand,camera_operator,classification').order('detected_at',{ascending:true}).limit(1000)
    ]);
    if(tripError)throw tripError;if(crossingError)throw crossingError;
    const rows=trips||[],events=crossings||[];
    status.textContent=`${rows.length} trip${rows.length===1?'':'s'} · ${events.length} estimated crossing${events.length===1?'':'s'}`;
    if(!rows.length){container.innerHTML='<p>No private camera trips yet. Start one from Navigation.</p>';return}
    container.innerHTML=rows.map(trip=>{const own=events.filter(event=>event.trip_id===trip.id);return `<article class="card" data-trip="${esc(trip.id)}"><span class="badge blue">${esc(trip.status)}</span><h3>${esc(trip.title||'Camera awareness trip')}</h3><p>${new Date(trip.started_at).toLocaleString()}${trip.ended_at?' – '+new Date(trip.ended_at).toLocaleString():''}</p><p>${esc(trip.origin||'Origin not entered')}${trip.destination?' → '+esc(trip.destination):''}</p><p><strong>${own.length}</strong> estimated camera crossing${own.length===1?'':'s'}</p><div>${own.length?`<ol>${own.map(event=>`<li><strong>${new Date(event.detected_at).toLocaleString()}</strong><br><small>Camera ${Number(event.camera_latitude).toFixed(5)}, ${Number(event.camera_longitude).toFixed(5)} · vehicle ${Number(event.vehicle_latitude).toFixed(5)}, ${Number(event.vehicle_longitude).toFixed(5)} · within ${Math.round(event.distance_m)} m${event.camera_brand?' · '+esc(event.camera_brand):''}${event.camera_operator?' · '+esc(event.camera_operator):''}</small></li>`).join('')}</ol>`:'<p>No estimated crossings recorded for this trip.</p>'}</div><p><button class="btn" data-export="${esc(trip.id)}">Export CSV</button> <button class="btn" data-delete="${esc(trip.id)}">Delete trip</button></p></article>`}).join('');
    document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.export,trip=rows.find(item=>item.id===id),own=events.filter(item=>item.trip_id===id),header=['trip_id','trip_title','date_time','vehicle_latitude','vehicle_longitude','camera_latitude','camera_longitude','distance_m','classification'],lines=[header.map(csvCell).join(','),...own.map(event=>[id,trip?.title,event.detected_at,event.vehicle_latitude,event.vehicle_longitude,event.camera_latitude,event.camera_longitude,event.distance_m,event.classification].map(csvCell).join(','))];download(`drivers-lounge-camera-journal-${id}.csv`,lines.join('\n'),'text/csv;charset=utf-8')}));
    document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('Delete this private trip, its GPS points and its estimated camera crossings? This cannot be undone.'))return;button.disabled=true;const {error}=await B.client.from('driver_trip_journals').delete().eq('id',button.dataset.delete).eq('user_id',user.id);if(error){button.disabled=false;status.textContent=error.message;return}button.closest('[data-trip]')?.remove();status.textContent='Private trip deleted.'}));
  }catch(error){console.error(error);status.textContent=error.message||'Could not load private camera history.';container.innerHTML='<p>Please retry or return to Navigation.</p>'}
})();
