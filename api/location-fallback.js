function send(res,status,body){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.end(JSON.stringify(body));
}
function first(value){return Array.isArray(value)?value[0]:value}
module.exports=async function handler(req,res){
 if(req.method!=='GET'){
  res.setHeader('Allow','GET');
  return send(res,405,{ok:false,error:'Method not allowed'});
 }
 const lat=Number(first(req.headers['x-vercel-ip-latitude']));
 const lng=Number(first(req.headers['x-vercel-ip-longitude']));
 if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180){
  return send(res,404,{ok:false,error:'Approximate network location unavailable'});
 }
 return send(res,200,{
  ok:true,
  latitude:lat,
  longitude:lng,
  accuracy:'approximate_network',
  city:first(req.headers['x-vercel-ip-city'])||null,
  region:first(req.headers['x-vercel-ip-country-region'])||null,
  country:first(req.headers['x-vercel-ip-country'])||null
 });
}