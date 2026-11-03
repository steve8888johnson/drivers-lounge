const TRUE=/^(?:1|true|yes|on)$/i;
const FALSE=/^(?:0|false|no|off)$/i;
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const bool=(value,fallback=false)=>{const text=clean(value);if(!text)return fallback;if(TRUE.test(text))return true;if(FALSE.test(text))return false;return fallback;};
const list=value=>[...new Set(clean(value).split(',').map(item=>item.trim()).filter(Boolean))];
const upperList=value=>list(value).map(item=>item.toUpperCase());
const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;};
const notice=(code,title,details={})=>({code,title,severity:'critical',blocking:true,audit:'routing-policy',...details});

export function stateCodeFromStop(stop={}){
 const direct=clean(stop.stateCode||stop.state||'').toUpperCase();if(/^[A-Z]{2}$/.test(direct))return direct;
 const label=clean(stop.label||stop.address||'').toUpperCase();
 const zip=label.match(/,\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/);if(zip)return zip[1];
 const tokens=label.match(/\b([A-Z]{2})\b/g)||[];return tokens.at(-1)||'';
}

export function readRoutingPolicy(env=globalThis.process?.env||{}){
 const environment=clean(env.VERCEL_ENV||env.NODE_ENV||'development').toLowerCase();
 const production=environment==='production';
 const explicitCrossCheck=clean(env.DL_REQUIRE_ROUTE_CROSS_CHECK);
 return Object.freeze({
  schema:'dl-routing-policy/v1',
  version:clean(env.DL_ROUTING_POLICY_VERSION||'2026-11-03.1'),
  environment,
  globalDisabled:bool(env.DL_ROUTING_KILL_SWITCH,false)||bool(env.DL_ROUTING_DISABLED,false),
  disableReason:clean(env.DL_ROUTING_DISABLE_REASON||'Routing guidance is temporarily disabled by the safety operations team.'),
  disabledProviders:list(env.DL_ROUTING_DISABLED_PROVIDERS).map(item=>item.toLowerCase()),
  disabledStates:upperList(env.DL_ROUTING_DISABLED_STATES),
  requireCrossCheck:explicitCrossCheck?bool(explicitCrossCheck,production):production,
  safetyRecordTtlMinutes:clamp(env.DL_ROUTE_RECORD_TTL_MINUTES,5,240,60)
 });
}

function providerDisabled(provider,disabled=[]){
 const value=clean(provider).toLowerCase();return Boolean(value)&&disabled.some(item=>value===item||value.includes(item));
}
function pushUnique(items,item){if(!items.some(existing=>existing.code===item.code&&existing.title===item.title))items.push(item);}

export function applyRoutingPolicy(result={},input={},policy=readRoutingPolicy()){
 const route=result.route||{},notices=[...(route.notices||[])],critical=[...(route.criticalNotices||[])];
 const blockers=[];
 const add=item=>{pushUnique(notices,item);pushUnique(critical,item);pushUnique(blockers,item);};
 if(policy.globalDisabled)add(notice('routingKillSwitchActive',policy.disableReason,{policyVersion:policy.version}));
 if(providerDisabled(route.provider,policy.disabledProviders))add(notice('routingProviderDisabled',`${route.provider||'The selected routing provider'} is disabled by the current safety policy.`,{provider:route.provider||'',policyVersion:policy.version}));
 const originState=stateCodeFromStop(result.origin),destinationState=stateCodeFromStop(result.destination);
 for(const state of[originState,destinationState].filter(Boolean))if(policy.disabledStates.includes(state))add(notice('routingStateDisabled',`Truck guidance is temporarily disabled for ${state} pending route-safety review.`,{state,policyVersion:policy.version}));
 const crossCheck=route.crossCheck||result.crossCheck||{},crossStatus=clean(crossCheck.status).toLowerCase();
 if(policy.requireCrossCheck&&crossStatus!=='aligned')add(notice('independentCrossCheckRequired','Production guidance requires two aligned professional truck-routing providers. This route is available only for parked review.',{crossCheckStatus:crossStatus||'missing',policyVersion:policy.version}));
 if(input?.profile?.permittedLoad===true)add(notice('issuedPermitWorkflowRequired','Issued-permit movements cannot use ordinary truck routing. Import and verify every controlling permit in Permitted Loads.',{policyVersion:policy.version}));
 const guidanceEligible=Boolean(route.guidanceEligible)&&blockers.length===0;
 const decision={
  schema:'dl-routing-policy-decision/v1',policyVersion:policy.version,environment:policy.environment,
  evaluatedAt:new Date().toISOString(),guidanceEligible,originState,destinationState,
  requireCrossCheck:policy.requireCrossCheck,blockers:blockers.map(item=>({code:item.code,title:item.title}))
 };
 return{...result,route:{...route,notices,criticalNotices:critical,guidanceEligible,policyDecision:decision},policyDecision:decision};
}
