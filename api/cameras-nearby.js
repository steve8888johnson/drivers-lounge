function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',status===200?'private, max-age=60':'no-store');res.end(JSON.stringify(body))}
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const url=new URL(req.url,'https://drivers-lounge.invalid'),lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon')),radius=Math.min(5000,Math.max(100,Number(url.searchParams.get('radius'))||2500));
 if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lon)||lon < -180||lon > 180)return send(res,400,{error:'Valid latitude and longitude are required'});
 const around=`(around:${Math.round(radius)},${lat.toFixed(6)},${lon.toFixed(6)})`,query=`[out:json][timeout:20];(node["man_made"="surveillance"]["surveillance:type"="ALPR"]${around};way["man_made"="surveillance"]["surveillance:type"="ALPR"]${around};);out center tags;`;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000),response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Drivers-Lounge/2 camera-awareness'},body:new URLSearchParams({data:query}),signal:controller.signal});clearTimeout(timer);
  if(!response.ok)throw Error('Camera map service unavailable');const data=await response.json(),cameras=(data.elements||[]).map(item=>({id:`osm-${item.type}-${item.id}`,lat:item.lat??item.center?.lat,lon:item.lon??item.center?.lon,brand:item.tags?.brand||item.tags?.manufacturer||null,operator:item.tags?.operator||null,direction:item.tags?.direction||null})).filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lon));
  return send(res,200,{source:'DeFlock/OpenStreetMap',classification:'mapped_camera_locations',cameras});
 }catch(error){return send(res,503,{error:error.name==='AbortError'?'Camera map request timed out':'Camera map service is unavailable'})}
}
