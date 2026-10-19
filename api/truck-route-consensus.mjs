import{calculateTruckRoute,providerSequenceFromOptions}from'./truck-route.mjs';
import{applyRouteConsensus}from'../src/assets/routing/route-consensus.mjs';

const send=(res,status,body)=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};

async function readJsonBody(req,limit=16384){
 let body=req.body;if(body&&typeof body==='object')return body;let raw=typeof body==='string'?body:'';
 if(!raw){for await(const chunk of req){raw+=chunk;if(raw.length>limit)throw Object.assign(Error('Request too large.'),{statusCode:413});}}
 if(raw.length>limit)throw Object.assign(Error('Request too large.'),{statusCode:413});
 try{return JSON.parse(raw||'{}')}catch{throw Object.assign(Error('Send valid JSON.'),{statusCode:400});}
}

const providerSummary=provider=>({id:provider.id,label:provider.label});

export async function calculateConsensusTruckRoute(input,{calculator=calculateTruckRoute,providers=providerSequenceFromOptions()}={}){
 if(!Array.isArray(providers)||!providers.length)throw Object.assign(Error('Commercial truck routing is not configured yet.'),{statusCode:503});
 const primaryProvider=providers[0],primary=await calculator(input,{providers:[primaryProvider]});
 if(providers.length<2){
  const crossCheck={
   schema:'dl-route-consensus/v1',status:'single-provider',confidence:'unverified',checkedAt:new Date().toISOString(),
   providers:[primaryProvider.label],guidanceEligible:Boolean(primary.route?.guidanceEligible),
   reasons:['Only one professional truck-routing provider is configured. This route has not been independently cross-checked.'],
   notice:{code:'singleProviderRoute',title:'Independent provider cross-check is not configured. Treat this as a single-provider route candidate.',severity:'warning',blocking:false}
  };
  const notices=[...(primary.route?.notices||[]),crossCheck.notice];
  return{
   ...primary,
   route:{...primary.route,notices,crossCheck},
   crossCheck:{...crossCheck,configuredProviders:providers.map(providerSummary)}
  };
 }
 const secondaryProvider=providers[1];
 const secondaryInput={
  ...input,
  origin:{lat:primary.origin.lat,lng:primary.origin.lng,label:primary.origin.label},
  destination:{lat:primary.destination.lat,lng:primary.destination.lng,label:primary.destination.label}
 };
 let secondary;
 try{secondary=await calculator(secondaryInput,{providers:[secondaryProvider]});}
 catch(error){
  const notice={code:'secondaryProviderUnavailable',title:`${secondaryProvider.label} could not independently verify this route. Guidance is blocked until the cross-check succeeds or an authorized reviewer clears the route.`,severity:'critical',blocking:true};
  const notices=[...(primary.route?.notices||[]),notice],criticalNotices=[...(primary.route?.criticalNotices||[]),notice];
  return{
   ...primary,
   route:{...primary.route,notices,criticalNotices,guidanceEligible:false,crossCheck:{schema:'dl-route-consensus/v1',status:'blocked',confidence:'blocked',providers:[primaryProvider.label,secondaryProvider.label],guidanceEligible:false,reasons:[String(error?.message||'Secondary provider unavailable')],notice}},
   crossCheck:{status:'blocked',providers:[primaryProvider.label,secondaryProvider.label],secondaryError:String(error?.message||'Secondary provider unavailable'),configuredProviders:providers.map(providerSummary)}
  };
 }
 const result=applyRouteConsensus(primary,secondary,{primaryProvider:primaryProvider.label,secondaryProvider:secondaryProvider.label});
 result.crossCheck.configuredProviders=providers.map(providerSummary);
 return result;
}

export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST.'});}
 const origin=req.headers.origin,host=req.headers.host;let sameOrigin=false;try{sameOrigin=!origin||new URL(origin).host===host}catch{/* Reject malformed Origin. */}
 if(!sameOrigin)return send(res,403,{error:'Same-origin request required.'});
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Send JSON.'});
 if(Number(req.headers['content-length']||0)>16384)return send(res,413,{error:'Request too large.'});
 try{return send(res,200,await calculateConsensusTruckRoute(await readJsonBody(req)))}
 catch(error){return send(res,Number(error?.statusCode)||503,{error:String(error?.message||'Unable to calculate independently checked truck route.')});}
}
