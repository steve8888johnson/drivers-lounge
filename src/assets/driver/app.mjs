import { TOOLS, CHECKLIST, ROLES, preferences, defaultFavorites, findTools, dailyChecklist, tripSummaries, esc, dateKey } from './model.mjs';
import { listTrips } from '../permits/storage.mjs';
const $=id=>document.getElementById(id),prefKey='dl-driver-start-v1',checkKey='dl-driver-checklist-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{$('home-status').textContent='This browser cannot save these preferences. Changes will last for this visit only.';return false;}}
let prefs=preferences(read(prefKey)),checklist=dailyChecklist(read(checkKey));
function state(){document.body.classList.toggle('large-text',prefs.largeText);$('role').value=prefs.role;$('large-text').checked=prefs.largeText;}
function favorites(){
  $('favorites').innerHTML=prefs.favorites.map(id=>{const t=TOOLS.find(t=>t.id===id);return `<a class="quick-card" href="${t.url}"><span>${esc(t.group)}</span><strong>${esc(t.title)} →</strong><small>${t.offline?'Device / offline tools':'Online feature'}</small></a>`;}).join('')||'<p>No pinned tools yet. Choose favorites from the tool list.</p>';
}
function tools(){const hits=findTools($('tool-search').value);$('tool-count').textContent=`${hits.length} ${hits.length===1?'tool':'tools'}`;$('all-tools').innerHTML=hits.map(t=>`<article class="tool-card"><p class="eyebrow">${esc(t.group)}</p><h3><a href="${t.url}">${esc(t.title)} →</a></h3><p>${esc(t.detail)}</p><button data-pin="${t.id}" aria-pressed="${prefs.favorites.includes(t.id)}" aria-label="${prefs.favorites.includes(t.id)?'Unpin':'Pin'} ${esc(t.title)}">${prefs.favorites.includes(t.id)?'★ Pinned':'☆ Pin to my day'}</button></article>`).join('')||'<p class="empty">No tools match. Try a shorter search or a different term.</p>';}
function checks(){checklist=dailyChecklist(checklist);$('check-count').textContent=`${checklist.done.length} / ${CHECKLIST.length}`;$('check-date').textContent='For '+checklist.day+' · Resets on a new local day.';$('daily-checklist').innerHTML=CHECKLIST.map(([id,label])=>`<label class="check"><input type="checkbox" data-check="${id}" ${checklist.done.includes(id)?'checked':''}>${esc(label)}</label>`).join('');}
function change(){state();favorites();tools();return save(prefKey,prefs);}
$('role').addEventListener('change',()=>{prefs.role=$('role').value;if(change())$('home-status').textContent=`${ROLES[prefs.role]} view saved. Choose “Use suggested tools” to replace your pins for this role.`;});
$('large-text').addEventListener('change',()=>{prefs.largeText=$('large-text').checked;change();});
$('reset-favorites').addEventListener('click',()=>{prefs.favorites=defaultFavorites(prefs.role);change();});
$('tool-search').addEventListener('input',tools);
$('all-tools').addEventListener('click',e=>{const b=e.target.closest('[data-pin]');if(!b)return;const id=b.dataset.pin;if(prefs.favorites.includes(id))prefs.favorites=prefs.favorites.filter(v=>v!==id);else if(prefs.favorites.length<6)prefs.favorites.push(id);else{$('home-status').textContent='You have six quick tools. Unpin one before adding another.';return;}change();const target=$('all-tools').querySelector(`[data-pin="${id}"]`);target?.focus({preventScroll:true});});
$('daily-checklist').addEventListener('change',e=>{const id=e.target.dataset.check;if(!id)return;checklist=dailyChecklist(checklist);checklist.done=e.target.checked?[...new Set([...checklist.done,id])]:checklist.done.filter(v=>v!==id);save(checkKey,checklist);checks();$('daily-checklist').querySelector(`[data-check="${id}"]`)?.focus({preventScroll:true});});
$('reset-checklist').addEventListener('click',()=>{checklist=dailyChecklist(null);save(checkKey,checklist);checks();});
addEventListener('pageshow',checks);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checks();});
setInterval(()=>{if(checklist.day!==dateKey())checks();},30000);
state();favorites();tools();checks();
try{const rows=tripSummaries(await listTrips(),read('dl-last-permit-trip'));
  $('recent-trips').innerHTML=rows.length?rows.map(t=>`<article class="trip-summary"><h3>${esc(t.name)}</h3><p>${esc(t.departure||'Travel date not entered')} · ${esc(t.states.join(' → ')||'No state permits yet')}</p><span class="muted small">${t.completed?'Marked completed · originals remain available':'Saved draft · review before moving'}</span><div class="actions"><a href="/permitted-loads#trip=${t.id}&tab=route">Review trip →</a><a href="/permitted-loads#trip=${t.id}&tab=wallet">Open wallet</a></div></article>`).join(''):'<p>Your saved loads will appear here. <a href="/permitted-loads#new=1">Create your first permitted load →</a></p>';
}catch{$('recent-trips').textContent='Device wallet unavailable. Enable browser storage to reopen saved trips.';}
if('serviceWorker' in navigator){
  try{const reg=await navigator.serviceWorker.register('/sw.js').catch(()=>navigator.serviceWorker.getRegistration('/'));if(!reg)throw Error();const check=()=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();$('home-offline').textContent='Offline download is preparing or unavailable. Reopen while connected to check.';},4000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();$('home-offline').textContent=e.data?.driverReady?'My day and device tools are saved for offline reopening. Online services still need a connection.':'Offline download is incomplete. Reopen while connected.';};reg.active?.postMessage({type:'driver-cache-status'},[channel.port2]);};if(reg.active)check();else navigator.serviceWorker.ready.then(check);navigator.serviceWorker.addEventListener('controllerchange',check);}
  catch{$('home-offline').textContent='Offline saving is unavailable in this browser session.';}
}else $('home-offline').textContent='This browser does not support offline reopening.';
