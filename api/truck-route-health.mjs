const send=(res,status,body)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Use GET.'});}
 const configured=Boolean(String(process.env.TRUCK_ROUTING_HERE_API_KEY||process.env.HERE_API_KEY||'').trim());
 return send(res,200,{configured,provider:configured?'HERE Routing API v8':null,mode:'truck',status:configured?'configured':'credentials_required'});
}
