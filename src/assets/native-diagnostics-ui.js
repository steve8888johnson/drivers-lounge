(()=>{
 const $=selector=>document.querySelector(selector),status=(message,bad=false)=>{const node=$('#diagnostics-status');if(node){node.textContent=message;node.dataset.state=bad?'bad':'ok';}};
 const duration=value=>{const seconds=Math.round(Number(value||0)/1000);if(seconds<60)return`${seconds}s`;const minutes=Math.floor(seconds/60),rest=seconds%60;return`${minutes}m ${rest}s`;};
 const setText=(selector,value)=>{const node=$(selector);if(node)node.textContent=String(value??'—');};
 function render(){
  const api=window.DL_NATIVE_DIAGNOSTICS;if(!api){status('Open this page inside the installed Drivers Lounge test app. Web browsers do not expose native diagnostics.',true);return;}
  const report=api.snapshot(),summary=report.summary||{};status(`Local report ready · ${report.platform} · build ${report.revision}`);
  setText('#diag-events',summary.eventCount);setText('#diag-gps',summary.gpsFixes);setText('#diag-bg-fixes',summary.backgroundGpsFixes);setText('#diag-gap',duration(summary.maxGpsGapMs));setText('#diag-errors',summary.gpsErrors);setText('#diag-voice',summary.voiceFailures);setText('#diag-offline',summary.offlineTransitions);setText('#diag-watch',summary.maxWatchCount);
  const list=$('#diagnostics-events');if(!list)return;list.replaceChildren();
  for(const event of [...(report.events||[])].reverse().slice(0,120)){
   const row=document.createElement('article');row.className='diagnostic-event';
   const title=document.createElement('strong');title.textContent=event.type;
   const time=document.createElement('time');time.dateTime=event.at;time.textContent=new Date(event.at).toLocaleString();
   const details=document.createElement('code');details.textContent=Object.keys(event.details||{}).length?JSON.stringify(event.details):'{}';
   row.append(title,time,details);list.append(row);
  }
  if(!list.childElementCount){const empty=document.createElement('p');empty.textContent='No events recorded yet. Start a parked field test, then refresh this page.';list.append(empty);}
 }
 async function copy(){const api=window.DL_NATIVE_DIAGNOSTICS;if(!api)return;try{await navigator.clipboard.writeText(api.exportText());status('Diagnostics copied.');}catch{status('Copy was blocked. Use Download JSON instead.',true);}}
 function download(){const api=window.DL_NATIVE_DIAGNOSTICS;if(!api)return;const blob=new Blob([api.exportText()],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`drivers-lounge-native-diagnostics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);status('Diagnostics downloaded locally.');}
 function clear(){const api=window.DL_NATIVE_DIAGNOSTICS;if(!api)return;if(!confirm('Clear this device-only diagnostics report?'))return;api.clear();render();status('Local diagnostics cleared.');}
 addEventListener('DOMContentLoaded',()=>{$('#diagnostics-refresh')?.addEventListener('click',render);$('#diagnostics-copy')?.addEventListener('click',copy);$('#diagnostics-download')?.addEventListener('click',download);$('#diagnostics-clear')?.addEventListener('click',clear);addEventListener('dl-native-diagnostics-updated',render);render();},{once:true});
})();
