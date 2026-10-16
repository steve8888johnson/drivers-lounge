import {createWalletSync,walletTransport} from './cloud-sync.mjs';
import {getDocument,importAccountTrip,listTrips,verifyWallet} from './storage.mjs';
import {rememberWalletOwner,offlineWalletOwner} from './wallet-account-state.mjs';
export function mountWalletAccount({element,beforeSave,afterSave,open,ownerChanged,current,confirm,run}) {
  const B=window.DLAccountBackend;let identity=null,turn=0,rows=[],loaded=false,transferring=false;
  let preferences;try{preferences=localStorage;}catch{/* Device preference unavailable. */}
  element.innerHTML='<div class="section-head"><h2>Permits on your phone</h2><a data-signin href="/account?return=%2Fpermitted-loads">Sign in</a></div><p data-cloud-status role="status" aria-live="polite"></p><div class="actions"><button type="button" data-cloud-save>Save trip to account</button><button type="button" data-cloud-refresh>Check account trips</button></div><label for="account-trip-picker">Trips in your account</label><select id="account-trip-picker" data-cloud-picker></select><div class="actions"><button type="button" data-cloud-open>Open account trip</button><button type="button" data-cloud-delete>Remove account copy</button></div><details><summary>Privacy and storage limits</summary><p class="muted">Saves this load’s original PDFs/photos and route privately to your Drivers Lounge account. Sign in to the same account on your phone, then open the account trip. Save again after edits; updates are never merged silently. Sync limits: 20 trips, 45 MB per trip, 15 MB per file. Shared free-service storage and transfer limits also apply; a full allowance pauses sync without changing your device copies. Replaced or removed originals stay in account storage until you remove the account copy. Device copies remain available; exporting a backup is still recommended.</p></details>';
  const $=s=>element.querySelector(s),say=t=>$('[data-cloud-status]').textContent=t;
  const sync=createWalletSync({transport:B?.configured?walletTransport(B.client):null,getDocument,onState:s=>{
    if(s.status==='preparing')say('Checking every original before upload…');
    if(s.status==='uploading')say(`Saving original ${s.done+1} of ${s.total} to your private account…`);
    if(s.status==='publishing')say('Publishing the complete permit trip…');
    if(s.status==='downloading')say(s.total?`Downloading original ${s.done+1} of ${s.total}…`:'Opening your private account trip…');
    if(s.status==='listing')say('Checking account trips…');
    if(s.status==='removing')say('Removing the account copy. Device copies stay here…');
  }});
  function controls(){const signed=!!identity,selected=rows.find(r=>r.id===$('[data-cloud-picker]').value);
    $('[data-signin]').hidden=signed;
    $('[data-cloud-save]').disabled=!signed||transferring;
    $('[data-cloud-refresh]').disabled=!signed||transferring;
    $('[data-cloud-picker]').disabled=!signed||transferring||!rows.length;
    $('[data-cloud-open]').disabled=!selected||transferring||selected.archived||!selected.ready;
    $('[data-cloud-delete]').disabled=!selected||transferring;
  }
  function renderRows(){const id=$('[data-cloud-picker]').value;$('[data-cloud-picker]').replaceChildren();
    for(const row of rows){const o=document.createElement('option');o.value=row.id;o.textContent=`${row.name||'Untitled load'} · ${row.archived?'Removal incomplete':!row.ready?'Upload incomplete':new Date(row.updated_at).toLocaleString()}`;$('[data-cloud-picker]').append(o);}
    if(rows.some(r=>r.id===id))$('[data-cloud-picker]').value=id;controls();
  }
  async function refresh(){if(!identity)return;const user=identity;rows=await sync.list();if(identity!==user)return;loaded=true;renderRows();}
  async function action(fn){if(transferring)return;transferring=true;controls();try{await fn();}catch(e){say(e.message||'Account sync failed. Your device copy is safe.');}finally{transferring=false;controls();}}
  $('[data-cloud-save]').onclick=run(()=>action(async()=>{
    const user=identity;if(!user)throw Error('Sign in before saving to your account.');
    const trip=await beforeSave();if(identity!==user)throw Error('Account changed. Try again after signing in.');
    const link=await sync.save(trip);if(identity!==user)throw Error('Account changed. Check your account trip before retrying.');
    await afterSave(trip.id,link);await refresh();say('Saved to your account. On your phone, sign in and choose Open account trip. Save again here after changing the route or originals.');
  }));
  $('[data-cloud-refresh]').onclick=run(()=>action(async()=>{await refresh();say(rows.length?'Account list updated. Open a trip to download its originals and route.':'No trips saved to this account yet. Save the current trip first.');}));
  $('[data-cloud-picker]').onchange=controls;
  $('[data-cloud-open]').onclick=run(()=>action(async()=>{
    const user=identity,id=$('[data-cloud-picker]').value;await refresh();
    if(identity!==user)throw Error('Account changed.');
    const row=rows.find(r=>r.id===id);if(!row||!user||row.archived||!row.ready)throw Error('This account trip is unavailable or incomplete.');
    const existing=(await listTrips(user)).find(t=>t.accountSync?.tripId===id&&t.accountSync?.version===row.version);
    if(existing){let complete=false;try{await verifyWallet(existing);complete=true;}catch{/* Missing originals: download a fresh complete copy. */}
      if(identity!==user)throw Error('Account changed.');
      if(complete){await open(existing);say('Opened the saved device copy of this account version. Local edits are kept; save to account to upload them.');return;}}
    const packet=await sync.download(id);if(identity!==user)throw Error('Account changed. Download was not opened.');
    const trip=await importAccountTrip(packet);if(identity!==user)throw Error('Account changed. Sign in again to open this private copy.');
    await open(trip);say('Account trip downloaded with every original. Older device copies were preserved. Review current permits and load details before use.');
  }));
  $('[data-cloud-delete]').onclick=run(()=>action(async()=>{
    const row=rows.find(r=>r.id===$('[data-cloud-picker]').value);if(!row)return;
    if(!await confirm('Remove this trip and its originals from your account? All device copies remain. Export a backup first.','Remove account copy'))return;
    await sync.remove(row.id,row.version);await refresh();say('Account copy removed. Copies already downloaded on your devices are unchanged.');
  }));
  async function identify(){const sequence=++turn;let timer;try{
    const {data,error}=await Promise.race([B.client.auth.getUser(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Sign-in check timed out')),10000);})]);if(sequence!==turn)return;if(error)throw error;
    const user=data.user?.id||null;if(user===identity&&loaded)return;
    rememberWalletOwner(preferences,user);
    identity=user;sync.setOwner(user);rows=[];loaded=false;renderRows();await ownerChanged(user);
    if(sequence!==turn)return;
    if(user){await action(async()=>{await refresh();say(rows.length?'Your account trips are available. Open one, or save this device’s trip.':'Signed in. Save this trip to make its originals and route available on your phone.');});}
    else say('Sign in to sync permits and routes. Your existing device wallet stays available.');
  }catch{if(sequence!==turn)return;identity=null;sync.setOwner(null);rows=[];loaded=false;renderRows();const offlineOwner=offlineWalletOwner(preferences,navigator.onLine);try{await ownerChanged(offlineOwner);}catch{/* Keep private panels hidden when device storage fails. */}say(offlineOwner?'Offline: showing downloaded device copies for the last signed-in account. Account transfers require verified sign-in when service returns.':'Sign-in could not be verified. Device copies are safe; sign in and try again.');}finally{clearTimeout(timer);}}
  function invalidate(){turn++;identity=null;sync.setOwner(null);rememberWalletOwner(preferences,null);rows=[];loaded=false;transferring=false;renderRows();void ownerChanged(null).catch(()=>say('Device storage is unavailable. Private trip panels remain hidden; keep this page open and retry sign-in.'));say('Signed out. Account trips are hidden on this device.');}
  window.addEventListener('dl-auth-change',e=>{if(e.detail?.event==='SIGNED_OUT')invalidate();else if(e.detail?.event==='SIGNED_IN'){if(e.detail.userId!==identity)invalidate();setTimeout(()=>void identify(),0);}});
  window.addEventListener('online',()=>{if(B?.configured)void identify();});
  renderRows();
  if(B?.configured)void identify();else say(offlineWalletOwner(preferences,navigator.onLine)?'Offline: downloaded trips for the last signed-in account are available. Reconnect and reload before transferring account updates.':'Account sign-in is unavailable in this environment. Device copies and trip exports still work.');
  return {changed(){if(identity&&!transferring&&current()?.accountSync)say('Device copy saved. Choose Save trip to account to send these changes to your other devices.');}};
}
