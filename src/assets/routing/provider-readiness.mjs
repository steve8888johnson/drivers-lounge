const DEFINITIONS=Object.freeze([
 Object.freeze({id:'here',label:'HERE Routing API v8',canonical:'TRUCK_ROUTING_HERE_API_KEY',aliases:Object.freeze(['HERE_API_KEY'])}),
 Object.freeze({id:'tomtom',label:'TomTom Routing API v1',canonical:'TRUCK_ROUTING_TOMTOM_API_KEY',aliases:Object.freeze(['TOMTOM_API_KEY'])})
]);

const clean=value=>String(value??'').trim();
const unique=values=>[...new Set(values)];
const placeholder=value=>{
 const folded=value.toLowerCase().replace(/[\s_-]+/g,'-');
 return /^<.*>$/.test(value)||/^(?:change|replace)(?:-me)?$/.test(folded)||
  /^(?:your|my|example|sample|test|testing|dummy|placeholder|insert|paste)(?:-.*)?(?:key|api-key|token|credential)?$/.test(folded)||
  /^(?:none|null|undefined|false|true|x+|0+)$/.test(folded);
};

export function inspectRoutingCredential(value){
 const raw=String(value??''),text=clean(raw);
 if(!text)return{state:'missing',valid:false};
 if(/[\u0000-\u001f\u007f]/.test(raw)||/\s/.test(text))return{state:'malformed',valid:false};
 if(text.length<16||text.length>512)return{state:'malformed',valid:false};
 if(placeholder(text))return{state:'placeholder',valid:false};
 if(!/^[!-~]+$/.test(text))return{state:'malformed',valid:false};
 return{state:'present',valid:true};
}

function resolveProvider(env,definition){
 const names=[definition.canonical,...definition.aliases];
 const entries=names.map(name=>({name,value:clean(env?.[name]),inspection:inspectRoutingCredential(env?.[name])})).filter(entry=>entry.value);
 const invalid=entries.filter(entry=>!entry.inspection.valid),distinct=unique(entries.map(entry=>entry.value));
 const issues=[];
 if(invalid.length)issues.push('invalid_provider_credential');
 if(distinct.length>1)issues.push('conflicting_provider_aliases');
 const selected=entries.find(entry=>entry.name===definition.canonical&&entry.inspection.valid)||entries.find(entry=>entry.inspection.valid)||entries[0]||null;
 const valid=entries.length>0&&invalid.length===0&&distinct.length===1;
 return{
  definition,value:valid?selected.value:'',public:{
   id:definition.id,label:definition.label,configured:entries.length>0,valid,
   state:entries.length===0?'missing':valid?'configured':'invalid',
   credentialState:selected?.inspection.state||'missing',
   source:selected?.name||definition.canonical,
   canonicalConfigured:entries.some(entry=>entry.name===definition.canonical),
   aliasesConfigured:definition.aliases.filter(name=>entries.some(entry=>entry.name===name)),
   issues:unique(issues)
  }
 };
}

export function readRoutingProviderReadiness(env={},policy={}){
 const resolved=DEFINITIONS.map(definition=>resolveProvider(env,definition));
 const validResolved=resolved.filter(item=>item.public.valid);
 const duplicate=validResolved.length>=2&&unique(validResolved.map(item=>item.value)).length<validResolved.length;
 const disabledNames=(policy.disabledProviders||[]).map(item=>clean(item).toLowerCase()).filter(Boolean);
 const providers=resolved.map(item=>{
  const disabled=item.public.valid&&disabledNames.some(name=>item.definition.id===name||item.definition.label.toLowerCase().includes(name));
  return{...item.public,disabled,active:item.public.valid&&!disabled,issues:[...item.public.issues,...(disabled?['provider_disabled_by_policy']:[])]};
 });
 if(duplicate)for(const provider of providers.filter(item=>item.valid))provider.issues.push('duplicate_provider_credentials');
 const configuredProviderCount=providers.filter(item=>item.configured).length;
 const validProviderCount=providers.filter(item=>item.valid).length;
 const activeProviderCount=providers.filter(item=>item.active).length;
 const hasInvalid=providers.some(item=>item.configured&&!item.valid);
 const hasAliasConflict=providers.some(item=>item.issues.includes('conflicting_provider_aliases'));
 const hasDisabled=providers.some(item=>item.disabled);
 const crossCheckConfigured=activeProviderCount>=2&&!duplicate&&!hasInvalid;
 const blockers=[];
 const add=code=>{if(!blockers.includes(code))blockers.push(code);};
 if(validProviderCount===0)add('credentials_required');
 if(hasInvalid)add('invalid_provider_credentials');
 if(hasAliasConflict)add('conflicting_provider_aliases');
 if(duplicate)add('duplicate_provider_credentials');
 if(hasDisabled)add('routing_provider_disabled');
 if(policy.globalDisabled===true)add('kill_switch_active');
 if(policy.requireCrossCheck===true&&!crossCheckConfigured)add('independent_cross_check_required');
 const configurationValid=!hasInvalid&&!duplicate;
 const previewEligible=activeProviderCount>=1&&configurationValid&&policy.globalDisabled!==true;
 const releaseEligible=previewEligible&&crossCheckConfigured;
 const guidanceAllowed=previewEligible&&(policy.requireCrossCheck!==true||crossCheckConfigured);
 const frozenProviders=Object.freeze(providers.map(provider=>Object.freeze({...provider,aliasesConfigured:Object.freeze(provider.aliasesConfigured),issues:Object.freeze(unique(provider.issues))})));
 const activeProviders=frozenProviders.filter(item=>item.active);
 const status=configuredProviderCount===0?'credentials_required':!configurationValid?'invalid_configuration':
  policy.globalDisabled===true?'disabled':activeProviderCount===0?'provider_disabled':crossCheckConfigured?'dual_provider_ready':'single_provider_unverified';
 return Object.freeze({
  schema:'dl-routing-provider-readiness/v1',status,configuredProviderCount,validProviderCount,activeProviderCount,
  independentProviderCount:duplicate?Math.max(0,activeProviderCount-1):activeProviderCount,
  crossCheckConfigured,previewEligible,releaseEligible,guidanceAllowed,blockers:Object.freeze(blockers),
  providers:frozenProviders,
  primaryProvider:activeProviders[0]||null,secondaryProvider:crossCheckConfigured?activeProviders[1]||null:null
 });
}

export const routingProviderDefinitions=DEFINITIONS;
