(function(){
const B=window.DLBackend,$=s=>document.querySelector(s),esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));let user=null,trip=null,watchId=null,lastPoint=null,lastSavedAt=0,lastCameraQuery=null,cameras=[],crossed=new Set(),cameraLayer=null;
const status=(message,bad=false)=>{const el=$('#camera-journal-status');if(el){el.textContent=message;el.dataset.bad=bad?'1':'0'}};
const radians=n=>n*Math.PI/180;
function distance(a,b){const dLat=radians(b.lat-a.lat),dLon=radians(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function renderCameras(){if(!window.L||!window.DLNavigationMap)return;if(cameraLayer)cameraLayer.clearLayers();else cameraLayer=L.layerGroup().addTo(window.DLNavigationMap);for(const camera of cameras)L.circleMarker([camera.lat,camera.lon],{radius:5,color:'#ef4444',weight:2,fillColor:'#ef4444',fillOpacity:.65}).bindPopup('<strong>Mapped ALPR camera</strong><br><small>DeFlock/OpenStreetMap · location may be incomplete or outdated</small>').addTo(cameraLayer)}
async function nearby(point){
 if(lastCameraQuery&&Date.now()-lastCameraQuery.at<60000&&distance(point,lastCameraQuery)<1000)return;
 const response=await fetch(`/api/cameras-nearby?lat=${encodeURIComponent(point.lat)}&lon=${encodeURIComponent(point.lon)}&radius=2500`),data=await response.json();if(!response.ok)throw Error(data.error||'Camera map unavailable');cameras=data.cameras||[];lastCameraQuery={...point,at:Date.now()};renderCameras();
}
async function saveCrossing(camera,point,meters){
 if(crossed.has(camera.id))return;crossed.add(camera.id);
 const row={trip_id:trip.id,user_id:user.id,camera_source_id:camera.id,detected_at:new Date(point.time).toISOString(),vehicle_latitude:point.lat,vehicle_longitude:point.lon,camera_latitude:camera.lat,camera_longitude:camera.lon,distance_m:Math.round(meters),heading_deg:Number.isFinite(point.heading)?point.heading:null,camera_brand:camera.brand,camera_operator:camera.operator,source:'deflock_osm',classification:'estimated_crossing'};
 const {error}=await B.client.from('driver_camera_crossings').upsert(row,{onConflict:'trip_id,camera_source_id',ignoreDuplicates:true});if(error){crossed.delete(camera.id);throw error}renderRecent();
}
async function record(position){
 const point={lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy,speed:position.coords.speed,heading:position.coords.heading,time:position.timestamp};
 try{
  const moved=lastPoint?distance(lastPoint,point):Infinity;if(Date.now()-lastSavedAt>=30000||moved>=100){const {error}=await B.client.from('driver_trip_points').insert({trip_id:trip.id,user_id:user.id,recorded_at:new Date(point.time).toISOString(),latitude:point.lat,longitude:point.lon,accuracy_m:point.accuracy,speed_mps:Number.isFinite(point.speed)?point.speed:null,heading_deg:Number.isFinite(point.heading)?point.heading:null});if(error)throw error;lastSavedAt=Date.now();lastPoint=point}
  await nearby(point);for(const camera of cameras){const meters=distance(point,camera);if(meters<=120)await saveCrossing(camera,point,meters)}status(`Trip recording · GPS accuracy ${Math.round(point.accuracy)} m · ${cameras.length} mapped cameras checked nearby`);
 }catch(error){status(error.message||'Trip location could not be saved.',true)}
}
function startWatch(){if(watchId!==null||!trip)return;if(!navigator.geolocation){status('Location is unavailable in this browser.',true);return}watchId=navigator.geolocation.watchPosition(record,error=>status(error.code===1?'Location permission was not granted.':'Current location is unavailable.',true),{enableHighAccuracy:true,maximumAge:5000,timeout:15000});$('#start-camera-journal').hidden=true;$('#stop-camera-journal').hidden=false}
async function begin(){
 if(!B?.configured)throw new Error('Private trip storage is temporarily unavailable.');
 if(!$('#camera-journal-consent').checked){status('Confirm that you want to store this private location history.',true);return}user=await B.user();if(!user){location.href='/account?return='+encodeURIComponent('/navigation');return}
 const origin=$('#origin').value.trim()||null,destination=$('#destination').value.trim()||null,{data,error}=await B.client.from('driver_trip_journals').insert({user_id:user.id,title:[origin,destination].filter(Boolean).join(' to ')||'Camera awareness trip',origin,destination}).select().single();if(error)throw error;trip=data;crossed.clear();startWatch();status('Trip journal started. Keep this page open while driving.');
}
async function stop(){if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;if(trip){const {error}=await B.client.from('driver_trip_journals').update({status:'completed',ended_at:new Date().toISOString()}).eq('id',trip.id).eq('user_id',user.id);if(error){status(error.message,true);return}}trip=null;$('#start-camera-journal').hidden=false;$('#stop-camera-journal').hidden=true;status('Trip journal stopped and saved privately.');renderRecent()}
async function renderRecent(){if(!B?.configured)return;if(!user)user=await B.user();if(!user)return;const {data,error}=await B.client.from('driver_camera_crossings').select('id,detected_at,distance_m,camera_brand,camera_operator,camera_latitude,camera_longitude,classification').order('detected_at',{ascending:false}).limit(5);if(error)return;const rows=data||[],el=$('#camera-crossing-list');if(el)el.innerHTML=rows.length?rows.map(x=>`<li><strong>Estimated crossing</strong> · ${new Date(x.detected_at).toLocaleString()}<br><small>${Number(x.camera_latitude).toFixed(5)}, ${Number(x.camera_longitude).toFixed(5)} · within ${Math.round(x.distance_m)} m${x.camera_brand?' · '+esc(x.camera_brand):''}</small></li>`).join(''):'<li>No estimated crossings saved.</li>'}
$('#start-camera-journal')?.addEventListener('click',()=>begin().catch(e=>status(e.message||'Could not start the trip journal.',true)));$('#stop-camera-journal')?.addEventListener('click',()=>stop());
window.addEventListener('beforeunload',()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId)});renderRecent();
})();
