import { loadRoadContext } from '../server/texas-road-context.mjs';
const send=(res,status,body)=>{res.statusCode=status;res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST.'});}
  try{if(new URL(req.headers.origin).host!==req.headers.host)throw Error();}catch{return send(res,403,{error:'Same-origin request required.'});}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||Number(req.headers['content-length']||0)>2048)return send(res,400,{error:'Send a small JSON map area.'});
  try{let body=req.body;if(!body){let raw='';for await(const part of req){raw+=part;if(raw.length>2048)throw Error();}body=raw;}if(typeof body==='string')body=JSON.parse(body);if(JSON.stringify(body).length>2048)throw Error();return send(res,200,{context:await loadRoadContext(body)});}
  catch{return send(res,422,{error:'Official road comparison unavailable or unsupported. Original permit map and speech remain available.'});}
}
