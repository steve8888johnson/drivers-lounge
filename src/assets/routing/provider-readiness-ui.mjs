const KNOWN_PROVIDERS=Object.freeze([
 Object.freeze({id:'here',label:'HERE Routing API v8',canonical:'TRUCK_ROUTING_HERE_API_KEY'}),
 Object.freeze({id:'tomtom',label:'TomTom Routing API v1',canonical:'TRUCK_ROUTING_TOMTOM_API_KEY'})
]);
const clean=(value,max=180)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const esc=value=>clean(value,500).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const bool=value=>value===true;
const knownProvider=(providers,id)=>providers.find(item=>clean(item?.id,24).toLowerCase()===id)||{};

function providerView(definition,raw={}){
 const active=bool(raw.active),configured=bool(raw.configured),valid=bool(raw.valid),disabled=bool(raw.disabled);
 const credentialIssue=clean(raw.credentialIssue,64)||'missing';
 let state='Missing',tone='blocked',detail=`Add ${definition.canonical} on the server before this engine can be used.`;
 if(disabled){state='Disabled',detail='This provider is disabled by routing safety policy.';}
 else if(active){state='Active';tone='ready';detail='Credential is valid and this provider is operational in this environment.';}
 else if(configured&&!valid){state='Invalid';detail=`Credential check failed: ${credentialIssue.replace(/_/g,' ')}. Routing remains fail-closed.`;}
 else if(configured){state='Unavailable';detail='The provider is configured but is not operational.';}
 if(raw.credentialNormalized===true&&active)detail='Credential is operational, but outer whitespace was trimmed. Replace the stored value cleanly and migrate to the canonical variable.';
 return Object.freeze({id:definition.id,label:definition.label,state,tone,detail,credentialIssue,canonical:definition.canonical,active,configured,valid,disabled});
}

export function buildRoutingReadinessView(health={}){
 const readiness=health?.readiness&&typeof health.readiness==='object'?health.readiness:{};
 if(readiness.schema!=='dl-routing-provider-readiness/v1')throw Error('Unsupported routing readiness response.');
 const providers=KNOWN_PROVIDERS.map(definition=>providerView(definition,knownProvider(Array.isArray(readiness.providers)?readiness.providers:[],definition.id)));
 const activeCount=Math.max(0,Number(readiness.activeProviderCount)||0),independentCount=Math.max(0,Number(readiness.independentProviderCount)||0);
 const releaseEligible=bool(readiness.releaseEligible),previewEligible=bool(readiness.previewEligible),crossCheckConfigured=bool(readiness.crossCheckConfigured);
 const status=clean(readiness.status,80)||'unknown',blockers=Array.isArray(readiness.blockers)?readiness.blockers.map(item=>clean(item,80)).filter(Boolean).slice(0,12):[];
 let tone='blocked',badge='ROUTING BLOCKED',title='Routing is not ready',summary='No verified truck-routing provider is available. Route generation must remain disabled.';
 if(releaseEligible&&crossCheckConfigured){tone='ready';badge='TWO PROVIDERS READY';title='Independent route verification configured';summary='Two operational routing providers are available. Production still requires the deployed consensus benchmark and physical-device field validation.';}
 else if(previewEligible&&activeCount===1){const activeProvider=providers.find(provider=>provider.active);tone='warning';badge='BETA · ONE PROVIDER';title=`${activeProvider?.label||'Single-provider'} beta routing is active`;summary='One truck-routing provider is operational, but no independent cross-check exists. Use parked review only; production release remains blocked.';}
 else if(status==='invalid_configuration'){title='Provider configuration is invalid';summary='A stored provider credential failed validation. Preview may load, but route generation must remain fail-closed.';}
 const actions=[];
 for(const provider of providers){
  if(!provider.configured)actions.push(`Add ${provider.canonical} to Vercel Preview and Production.`);
  else if(!provider.valid)actions.push(`Correct ${provider.canonical}; current credential state is ${provider.credentialIssue.replace(/_/g,' ')}.`);
  else if(provider.credentialIssue==='outer_whitespace_trimmed')actions.push(`Replace ${provider.canonical} without leading or trailing whitespace.`);
 }
 if(!crossCheckConfigured)actions.push('Keep DL_RELEASE blocked until two independent providers align.');
 else actions.push('Run the deployed consensus benchmark before any production promotion.');
 return Object.freeze({schema:'dl-routing-readiness-view/v1',tone,badge,title,summary,status,activeCount,independentCount,releaseEligible,previewEligible,crossCheckConfigured,providers:Object.freeze(providers),blockers:Object.freeze(blockers),actions:Object.freeze([...new Set(actions)].slice(0,8))});
}

export function routingReadinessHtml(view){
 const providerRows=view.providers.map(provider=>`<article class="mc-provider ${esc(provider.tone)}"><div><strong>${esc(provider.label)}</strong><small>${esc(provider.detail)}</small></div><span>${esc(provider.state)}</span></article>`).join('');
 const actions=view.actions.map(item=>`<li>${esc(item)}</li>`).join('');
 const blockers=view.blockers.length?`<p class="mc-routing-blockers"><strong>Policy blockers:</strong> ${view.blockers.map(item=>esc(item.replace(/_/g,' '))).join(', ')}</p>`:'';
 return `<div class="mc-routing-summary"><span class="mc-routing-badge ${esc(view.tone)}">${esc(view.badge)}</span><div><h2>${esc(view.title)}</h2><p>${esc(view.summary)}</p></div></div><div class="mc-routing-gates"><div><strong>${view.activeCount}</strong><span>active providers</span></div><div><strong>${view.independentCount}</strong><span>independent providers</span></div><div><strong>${view.previewEligible?'OPEN':'BLOCKED'}</strong><span>beta gate</span></div><div><strong>${view.releaseEligible?'OPEN':'BLOCKED'}</strong><span>release gate</span></div></div><div class="mc-provider-list">${providerRows}</div>${blockers}<div class="mc-routing-actions"><h3>Required next actions</h3><ol>${actions}</ol></div>`;
}

export async function loadRoutingReadiness({fetchImpl=globalThis.fetch,documentRef=globalThis.document}={}){
 const root=documentRef?.querySelector?.('#mc-routing-readiness'),content=documentRef?.querySelector?.('#mc-routing-content'),refresh=documentRef?.querySelector?.('#mc-routing-refresh');
 if(!root||!content)return null;
 root.dataset.state='loading';content.innerHTML='<p class="mc-routing-loading" role="status">Checking routing providers and release gates…</p>';if(refresh)refresh.disabled=true;
 try{
  const response=await fetchImpl('/api/truck-route-health',{method:'GET',headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error'});
  if(!response.ok)throw Error(`Readiness request failed (${response.status}).`);
  const type=String(response.headers?.get?.('content-type')||'').toLowerCase();if(!type.includes('application/json'))throw Error('Readiness endpoint did not return JSON.');
  const view=buildRoutingReadinessView(await response.json());root.dataset.state=view.tone;content.innerHTML=routingReadinessHtml(view);return view;
 }catch(_){
  root.dataset.state='blocked';content.innerHTML='<div class="mc-routing-summary"><span class="mc-routing-badge blocked">STATUS UNAVAILABLE</span><div><h2>Routing readiness could not be verified</h2><p>Do not rely on route generation until the health endpoint is restored and provider status is visible.</p></div></div>';return null;
 }finally{if(refresh)refresh.disabled=false;}
}

if(typeof document!=='undefined'){
 const start=()=>{const refresh=document.querySelector('#mc-routing-refresh');if(refresh)refresh.addEventListener('click',()=>void loadRoutingReadiness());void loadRoutingReadiness();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
