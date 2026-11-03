const $=selector=>document.querySelector(selector);
function setMapMessage(message){const box=$('#map-message');if(!box||!message)return;box.textContent=message;box.className='map-message bad';box.hidden=false;}
export async function refreshRoutingPolicyStatus({fetcher=fetch}={}){
 const badge=$('#engine-badge');if(!badge)return null;
 try{
  const response=await fetcher('/api/truck-route-health',{cache:'no-store'}),data=await response.json();
  if(!response.ok)throw Error(data?.error||'Routing health check failed.');
  if(data.configured&&data.guidanceAllowed!==false){badge.textContent=data.crossCheckConfigured?'Dual-provider engine ready':'Commercial engine configured';badge.className='status-chip good';}
  else if(data.configured){
   const killed=Boolean(data.policy?.globalDisabled);badge.textContent=killed?'Routing safety hold active':'Guidance requires independent verification';badge.className='status-chip bad';
   setMapMessage(killed?'Routing guidance is temporarily disabled by the safety operations policy.':'Production guidance remains blocked until two professional truck-routing providers are configured and aligned.');
  }else{badge.textContent='Engine setup required';badge.className='status-chip warning';}
  badge.dataset.policyVersion=String(data.policy?.version||'');return data;
 }catch(error){badge.textContent='Engine status unavailable';badge.className='status-chip bad';return{error:String(error?.message||error)};}
}
function attach(){void refreshRoutingPolicyStatus();}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();}
