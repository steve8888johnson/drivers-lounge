const send=(res,status,body)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};
const key=name=>String(process.env[name]||'').trim();
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Use GET.'});}
 const here=Boolean(key('TRUCK_ROUTING_HERE_API_KEY')||key('HERE_API_KEY'));
 const tomtom=Boolean(key('TRUCK_ROUTING_TOMTOM_API_KEY')||key('TOMTOM_API_KEY'));
 const providers=[here?'HERE Routing API v8':null,tomtom?'TomTom Routing API v1':null].filter(Boolean);
 const provider=providers[0]||null,crossCheckConfigured=providers.length>=2;
 return send(res,200,{
  configured:Boolean(provider),
  provider,
  providers,
  fallback:here&&tomtom?'TomTom Routing API v1':null,
  crossCheckConfigured,
  crossCheckMode:crossCheckConfigured?'dual-provider-fail-closed':'single-provider-unverified',
  routeEndpoint:'/api/truck-route-consensus',
  mode:'truck',
  status:provider?'configured':'credentials_required',
  safetyModel:'fail-closed'
 });
}
