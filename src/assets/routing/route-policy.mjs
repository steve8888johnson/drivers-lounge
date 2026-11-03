const truthy=value=>/^(1|true|yes|on|required)$/i.test(String(value??'').trim());
const falsey=value=>/^(0|false|no|off|optional)$/i.test(String(value??'').trim());
const csv=value=>String(value??'').split(',').map(item=>item.trim()).filter(Boolean);
const fold=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const integer=(value,fallback,min=1,max=10080)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.min(max,Math.max(min,Math.round(parsed))):fallback;};
function explicitBoolean(value,fallback){if(truthy(value))return true;if(falsey(value))return false;return fallback;}
export function routingPolicyFromEnv(env={}){
 const requested=String(env.DL_ROUTING_RELEASE_MODE||'').trim().toLowerCase();
 const releaseMode=['production','beta','development'].includes(requested)?requested:(truthy(env.DL_RELEASE)||String(env.VERCEL_ENV||'').toLowerCase()==='production'?'production':'beta');
 const production=releaseMode==='production';
 return Object.freeze({schema:'dl-routing-policy/v1',releaseMode,killSwitch:truthy(env.DL_ROUTING_KILL_SWITCH),killSwitchReason:String(env.DL_ROUTING_KILL_REASON||'Routing has been paused by operations.').trim().slice(0,300),requireDualProvider:explicitBoolean(env.DL_ROUTING_REQUIRE_DUAL_PROVIDER,production),requireOfficialCoverage:explicitBoolean(env.DL_ROUTING_REQUIRE_OFFICIAL_COVERAGE,production),officialCoverageComplete:truthy(env.DL_ROUTING_OFFICIAL_COVERAGE_COMPLETE),allowSingleProviderBeta:explicitBoolean(env.DL_ROUTING_ALLOW_SINGLE_PROVIDER_BETA,true),disabledProviders:csv(env.DL_ROUTING_DISABLED_PROVIDERS).map(fold),disabledStates:csv(env.DL_ROUTING_DISABLED_STATES).map(value=>value.toUpperCase()).filter(value=>/^[A-Z]{2}$/.test(value)),routeMaxAgeMinutes:integer(env.DL_ROUTING_ROUTE_MAX_AGE_MINUTES,60,5,1440),safetyRecordTtlMinutes:integer(env.DL_ROUTING_RECORD_TTL_MINUTES,60,5,1440)});
}
function stateFromLabel(label){const text=String(label||'').toUpperCase();const matches=[...text.matchAll(/(?:,|\s)\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?(?:\b|$)/g)];return matches.at(-1)?.[1]||'';}
export function routeJurisdictions(result={},input={}){const values=[...(Array.isArray(input?.jurisdictions)?input.jurisdictions:[]),input?.origin?.state,input?.destination?.state,result?.origin?.state,result?.destination?.state,stateFromLabel(result?.origin?.label),stateFromLabel(result?.destination?.label)];return[...new Set(values.map(value=>String(value||'').toUpperCase()).filter(value=>/^[A-Z]{2}$/.test(value)))];}
function providerBlocked(policy,result){const candidates=[result?.route?.provider,...(result?.crossCheck?.providers||[]),...(result?.route?.crossCheck?.providers||[])].map(fold).filter(Boolean);return policy.disabledProviders.find(disabled=>candidates.some(candidate=>candidate.includes(disabled)||disabled.includes(candidate)))||'';}
function uniqueNotices(notices){const seen=new Set();return notices.filter(item=>{const key=`${item?.code||''}|${item?.title||''}`;if(seen.has(key))return false;seen.add(key);return true;});}
export function applyRoutingReleasePolicy(result={},input={},options={}){
 const now=options.now instanceof Date?options.now:new Date(options.now||Date.now()),policy=options.policy||routingPolicyFromEnv(options.env||{}),route=result.route||{};
 const reasons=[],warnings=[],jurisdictions=routeJurisdictions(result,input),crossCheck=result.crossCheck||route.crossCheck||{},critical=[...(route.criticalNotices||[])];
 if(policy.killSwitch)reasons.push(policy.killSwitchReason||'Routing is paused by operations.');
 const blockedProvider=providerBlocked(policy,result);if(blockedProvider)reasons.push(`Routing provider ${blockedProvider} is disabled by operations.`);
 const blockedStates=jurisdictions.filter(state=>policy.disabledStates.includes(state));if(blockedStates.length)reasons.push(`Routing is paused for ${blockedStates.join(', ')}.`);
 if(!route.guidanceEligible)reasons.push('The provider or route audits already marked this route ineligible for guidance.');
 const crossStatus=String(crossCheck.status||'').toLowerCase();
 if(policy.requireDualProvider&&crossStatus!=='aligned')reasons.push('Production guidance requires two independently aligned commercial routing providers.');
 else if(crossStatus==='single-provider'||!crossStatus)warnings.push('This is a single-provider route candidate and has not been independently verified.');
 if(policy.requireOfficialCoverage&&!policy.officialCoverageComplete)reasons.push('Nationwide official restriction coverage has not been certified complete for production guidance.');
 const calculatedAt=Date.parse(route.calculatedAt||'');if(Number.isFinite(calculatedAt)&&now.valueOf()-calculatedAt>policy.routeMaxAgeMinutes*60000)reasons.push('The route candidate is stale and must be recalculated.');
 if(route.integrityAudit?.status==='blocked'||result.integrityAudit?.status==='blocked')reasons.push('Route-integrity validation failed.');
 if(critical.length)reasons.push('One or more critical route notices remain unresolved.');
 const allowed=reasons.length===0,policyNotice=allowed?null:{code:'routingReleasePolicyBlocked',title:reasons[0]||'Routing release policy blocked guidance.',severity:'critical',blocking:true,audit:'routing-release-policy'};
 const notices=uniqueNotices([...(policyNotice?[policyNotice]:[]),...(route.notices||[])]),criticalNotices=uniqueNotices([...(policyNotice?[policyNotice]:[]),...(route.criticalNotices||[])]);
 const evaluation={...policy,evaluatedAt:now.toISOString(),jurisdictions,decision:allowed?'allow':'block',reasons,warnings,crossCheckStatus:crossStatus||'unavailable'};
 return{...result,releasePolicy:evaluation,route:{...route,notices,criticalNotices,guidanceEligible:Boolean(route.guidanceEligible)&&allowed,releasePolicy:evaluation}};
}
