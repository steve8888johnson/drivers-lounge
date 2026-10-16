import {createSetupSync,setupTransport} from './truck-setup-sync.mjs';

export function mountSetupAccount({element,kind,read,validate,apply,reset=()=>{},automatic=()=>false}) {
  const B=window.DLAccountBackend||window.DLBackend,M=window.DLTruckSetupMemory;
  element.innerHTML='<strong>Truck setup across devices</strong><p data-status role="status" aria-live="polite"></p><p data-summary></p><div class="setup-actions"><button type="button" data-save>Save setup to account</button><button type="button" data-use>Use account setup</button><button type="button" data-refresh>Check for updates</button><button type="button" data-remove>Delete account setup</button><a href="/account" data-signin>Sign in</a></div><small>Sign in to the same account on your computer and phone. Current load checks and permits remain separate. Use the separate permit account panel to save a load’s originals and route across devices.</small>';
  const $=selector=>element.querySelector(selector),say=text=>$('[data-status]').textContent=text;
  $('[data-signin]').href='/account?return='+encodeURIComponent(location.pathname+location.search+location.hash);
  const details=document.createElement('details'),summaryControl=document.createElement('summary');summaryControl.textContent='Manage saved setup';details.append(summaryControl);
  details.append($('[data-summary]'),$('.setup-actions'),$('small'));element.append(details);
  let deviceSetup=null;
  try{deviceSetup=M.read(localStorage,kind);}catch{/* Device storage is optional. */}
  const deviceButton=document.createElement('button');deviceButton.type='button';deviceButton.textContent='Use this device’s saved setup';deviceButton.hidden=true;
  $('.setup-actions').append(deviceButton);
  const messages={loading:'Checking your account setup…',ready:'Account setup loaded.',empty:'No setup saved to this account yet.',saving:'Saving to your account…',saved:'Saved to your account. Open this page on your other device, or check for updates there.',removing:'Deleting account setup…',deleted:'Account setup deleted. Existing load drafts are unchanged.',conflict:'Another device changed this setup. Your current fields are unchanged. Review the account values below, then use them or explicitly save your current setup instead.',error:'Account sync could not be confirmed. Your current fields are unchanged. Keep this page open; unsaved account edits may be lost on reload. Check for updates before trying another save.','signed-out':'Sign in to save your setup across devices. Guest setups stay in this browser.'};
  function summary(values){return kind==='standard'?`${values['truck-height-ft']} ft ${values['truck-height-in']} in high · ${values['truck-width-ft']} ft ${values['truck-width-in']} in wide · ${values['truck-length']} ft long · ${values['trailer-length']} ft trailer · ${values['truck-axles']} axles · ${values['truck-weight']} lb last loaded weight`:`${values.heightFt} ft high · ${values.widthFt} ft wide · ${values.lengthFt} ft long · ${values.axles} axles · ${values.weightLb} lb last loaded weight`;}
  let initial=true,identity=null,identityTurn=0;
  const sync=createSetupSync({transport:B?.configured?setupTransport(B.client):null,kind,clean:(k,v)=>{const clean=M.clean(k,v);return clean&&!validate(clean).length?clean:null;},onState:state=>{
    say(messages[state.status]);
    if(['conflict','error'].includes(state.status))details.open=true;
    $('[data-summary]').textContent=state.record?'In your account: '+summary(state.record.values):'';
    $('[data-save]').disabled=!state.owner||!state.loaded||state.busy;
    $('[data-save]').textContent=state.status==='conflict'?'Replace account setup with current fields':'Save setup to account';
    $('[data-use]').disabled=!state.record||!state.loaded||state.busy;
    $('[data-remove]').disabled=!state.record||!state.loaded||state.busy;
    $('[data-refresh]').disabled=!state.owner||state.busy;
    $('[data-signin]').hidden=!!state.owner||!B?.configured;
    deviceButton.hidden=!state.owner||!deviceSetup;deviceButton.disabled=state.busy;
    if(state.record&&!state.busy) {
      // Account values are kept in this page's memory, never in guest storage.
      M.save(null,kind,state.record.values);
      if(initial&&state.status==='ready'&&automatic())apply(state.record.values);
    }else if(['deleted','empty'].includes(state.status))M.forget(null,kind);
    if(!state.busy&&!['loading','signed-out'].includes(state.status))initial=false;
  }});
  async function identify(){
    const turn=++identityTurn;
    let timer;
    try {
      const {data,error}=await Promise.race([B.client.auth.getUser(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Sign-in check timed out')),10000);})]);if(turn!==identityTurn)return;
      if(error)throw error;
      const id=data.user?.id||null;if(id===identity)return;
      identity=id;M.setOwner(id);reset();initial=true;await sync.setUser(id);
    }catch{if(turn!==identityTurn)return;identity=null;M.setOwner(null);reset();sync.invalidate();say('Sign-in could not be verified. Account sync is unavailable; your account setup has not been changed.');}
    finally{clearTimeout(timer);}
  }
  async function save(automaticSave=false){
    if(automaticSave&&sync.get().status==='conflict')return false;
    const values=read(),issues=validate(values);
    if(issues.length){say('Check your setup: '+issues.join(' '));return;}
    const before=JSON.stringify(values);
    if(await sync.save(values)&&JSON.stringify(read())!==before)say('The earlier values were saved to your account. Your newer edits have not been saved yet.');
  }
  $('[data-save]').addEventListener('click',()=>void save());
  $('[data-use]').addEventListener('click',()=>{const record=sync.get().record;if(record)say(apply(record.values)?'Account setup applied. Confirm the actual measurements for this load.':'This load already has measurements or permits. Account defaults will be used for a new load; this load was not changed.');});
  deviceButton.addEventListener('click',()=>say(apply(deviceSetup)?'Device setup applied. Save it to your account to use it on your other devices.':'This load already has measurements or permits; it was not changed.'));
  $('[data-refresh]').addEventListener('click',()=>{initial=false;void sync.load();});
  $('[data-remove]').addEventListener('click',()=>void sync.remove());
  sync.invalidate();
  if(!B?.configured){details.hidden=true;say('Saved setups currently stay on this device. Account sync is waiting for sign-in to open.');return {save:async()=>false};}
  window.addEventListener('dl-auth-change',event=>{
    if(event.detail?.event==='SIGNED_OUT'){
      identityTurn++;identity=null;M.setOwner(null);sync.invalidate();reset();
    }else {
      if(event.detail?.event==='SIGNED_IN'&&event.detail.userId&&event.detail.userId!==identity){identityTurn++;identity=null;M.setOwner(null);sync.invalidate();reset();}
      setTimeout(()=>void identify(),0);
    }
  });
  void identify();
  return {save:()=>save(true)};
}
