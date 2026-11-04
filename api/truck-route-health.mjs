import{readRoutingPolicy}from'../src/assets/routing/routing-policy.mjs';
import{readRoutingProviderReadiness}from'../src/assets/routing/provider-readiness.mjs';
const send=(res,status,body)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Use GET.'});}
 const policy=readRoutingPolicy(),readiness=readRoutingProviderReadiness(process.env,policy);
 const providers=readiness.providers.filter(item=>item.active).map(item=>item.label);
 return send(res,200,{
  configured:readiness.validProviderCount>0,guidanceAllowed:readiness.guidanceAllowed,
  provider:readiness.primaryProvider?.label||null,providers,fallback:readiness.secondaryProvider?.label||null,
  crossCheckConfigured:readiness.crossCheckConfigured,
  crossCheckMode:readiness.crossCheckConfigured?'dual-provider-fail-closed':readiness.activeProviderCount?'single-provider-unverified':'not-configured',
  routeEndpoint:'/api/truck-route-consensus',mode:'truck',status:readiness.status,safetyModel:'fail-closed',
  policy:{version:policy.version,environment:policy.environment,requireCrossCheck:policy.requireCrossCheck,globalDisabled:policy.globalDisabled,blockers:readiness.blockers},
  readiness:{
   schema:readiness.schema,status:readiness.status,configuredProviderCount:readiness.configuredProviderCount,
   validProviderCount:readiness.validProviderCount,activeProviderCount:readiness.activeProviderCount,independentProviderCount:readiness.independentProviderCount,
   previewEligible:readiness.previewEligible,releaseEligible:readiness.releaseEligible,
   providers:readiness.providers,blockers:readiness.blockers
  }
 });
}
