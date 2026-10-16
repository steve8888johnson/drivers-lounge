import { ENTRIES, BY_ID, COUNTS, SOURCES, CATEGORIES, STATE_DIRECTORY, STATE_CHECKLISTS, readFilters, filterQuery, findEntries, cleanBookmarks, escapeHTML as esc, sourceURL } from './core.mjs';
const $=id=>document.getElementById(id), bookmarkKey='drivers-lounge-reference-bookmarks-v1', pageSize=30;
let filters=readFilters(location.search), limit=pageSize, bookmarks=[];
try{bookmarks=cleanBookmarks(JSON.parse(localStorage.getItem(bookmarkKey)||'[]'));}catch{}
const types={term:'Glossary',rule:'Rules & programs',state:'State desk'};
$('coverage-counts').innerHTML=`<span><strong>${COUNTS.terms}</strong>glossary terms</span><span><strong>${COUNTS.rules}</strong>rule & program entries</span><span><strong>${COUNTS.states}</strong>state desks, including D.C.</span>`;
$('category').insertAdjacentHTML('beforeend',Object.entries(CATEGORIES).map(([v,label])=>`<option value="${v}">${esc(label)}</option>`).join(''));
$('jurisdiction').insertAdjacentHTML('beforeend',STATE_DIRECTORY.map(s=>`<option value="${s.code}">${esc(s.name)}</option>`).join(''));
function syncControls(){
  $('search').value=filters.q;$('category').value=filters.category;$('jurisdiction').value=filters.state;$('entry-type').value=filters.type;$('saved-only').checked=filters.saved;
  $('alphabet').innerHTML=['',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter=>`<button type="button" data-letter="${letter}" aria-pressed="${filters.letter===letter}" aria-label="${letter?'Titles starting with '+letter:'All letters'}">${letter||'All'}</button>`).join('');
}
function card(entry,prefix=''){
  const isSaved=bookmarks.includes(entry.id), jurisdiction=entry.jurisdiction==='US'?'Federal / general':STATE_DIRECTORY.find(s=>s.code===entry.jurisdiction)?.name;
  const related=entry.related.filter(id=>BY_ID.has(id));
  return `<article class="entry" data-type="${entry.type}" id="${prefix}${entry.id}"><div class="tags"><span>${types[entry.type]}</span><span>${esc(jurisdiction)}</span></div><h2><a href="/compliance#${entry.id}" data-entry="${entry.id}">${esc(entry.title)}</a></h2>${entry.citation?`<p class="citation">${esc(entry.citation)}</p>`:''}<p>${esc(entry.summary)}</p>${entry.type==='state'?`<details><summary>What to verify for this state</summary><ul class="state-checks">${Object.entries(STATE_CHECKLISTS).filter(([key])=>filters.category==='all'||filters.category===key||filters.category==='general').map(([key,value])=>`<li><strong>${esc(CATEGORIES[key])}</strong>${esc(value)}</li>`).join('')}</ul><p class="scope">Checklist only. This desk does not establish state-specific limits, credential acceptance or permission to move.</p></details>`:''}<details><summary>Official sources (${entry.sources.length})</summary><ul class="sources">${entry.sources.map(id=>{const s=SOURCES[id];return `<li><span class="source-kind">${esc(s.kind)}</span><a href="${esc(sourceURL(id))}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>${s.note?`<small>${esc(s.note)}</small>`:''}<small>Indexed ${s.indexedOn} · Check the source's effective date.</small></li>`;}).join('')}</ul></details>${related.length?`<details><summary>Related entries</summary><ul class="related">${related.map(id=>`<li><a href="/compliance#${id}" data-entry="${id}">${esc(BY_ID.get(id).title)}</a></li>`).join('')}</ul></details>`:''}<p class="scope">${entry.type==='term'?esc(CATEGORIES[entry.category])+' · Plain-language explanation':entry.type==='state'?'State resources · Federal requirements may also apply':'Reference summary · Check applicability and exceptions'}</p><div class="entry-foot"><button class="bookmark" data-save="${entry.id}" aria-pressed="${isSaved}" aria-label="${isSaved?'Unsave':'Save'} ${esc(entry.title)}">${isSaved?'★ Saved':'☆ Save'}</button><a href="/compliance#${entry.id}" data-entry="${entry.id}">Entry link</a></div></article>`;
}
function focusEntry(){
  const id=location.hash.slice(1), entry=BY_ID.get(id), panel=$('focused-entry');
  panel.hidden=!id;
  panel.innerHTML=id?`<p>${entry?'Linked entry · shown independently of your filters':'That entry could not be found.'} <a href="/compliance${esc(filterQuery(filters))}" id="close-entry">Back to results</a></p>${entry?card(entry,'linked-'):''}`:'';
}
function render(){
  const results=findEntries(filters,bookmarks), shown=results.slice(0,limit);
  $('result-status').textContent=`${results.length} ${results.length===1?'entry':'entries'}${results.length>limit?' · showing '+shown.length:''}${filters.state!=='all'&&filters.state!=='US'?' · '+STATE_DIRECTORY.find(s=>s.code===filters.state).name+' + federal / general':''}`;
  $('results').innerHTML=shown.length?shown.map(e=>card(e)).join(''):'<div class="empty"><h2>No matching entries</h2><p>Try fewer words, another topic, or clear the filters. A missing entry does not mean no rule applies.</p></div>';
  $('more').hidden=results.length<=limit;focusEntry();
}
function change(){
  filters={...filters,q:$('search').value,category:$('category').value,state:$('jurisdiction').value,type:$('entry-type').value,saved:$('saved-only').checked};limit=pageSize;
  history.replaceState(null,'','/compliance'+filterQuery(filters));render();
}
$('filters').addEventListener('submit',e=>{e.preventDefault();change();});
$('filters').addEventListener('input',change);
$('clear').addEventListener('click',()=>{filters=readFilters();syncControls();change();$('search').focus();});
$('alphabet').addEventListener('click',e=>{const b=e.target.closest('button[data-letter]');if(!b)return;filters.letter=b.dataset.letter;syncControls();change();});
$('more').addEventListener('click',()=>{const before=limit;limit+=pageSize;render();const next=$('results').children[before]?.querySelector('h2 a');next?.focus({preventScroll:true});});
document.addEventListener('click',e=>{
  const save=e.target.closest('button[data-save]');
  if(save){
    const id=save.dataset.save, removing=bookmarks.includes(id);bookmarks=removing?bookmarks.filter(x=>x!==id):[...bookmarks,id];
    let persisted=true;try{localStorage.setItem(bookmarkKey,JSON.stringify(bookmarks));}catch{persisted=false;}
    $('action-status').textContent=persisted?(removing?'Entry removed from saved references.':'Entry saved on this device.'):'Browser storage is unavailable. This selection will last only for this page visit.';
    if(filters.saved){render();return;}
    for(const b of document.querySelectorAll('button[data-save]'))if(b.dataset.save===id){b.textContent=removing?'☆ Save':'★ Saved';b.setAttribute('aria-pressed',String(!removing));b.setAttribute('aria-label',`${removing?'Save':'Unsave'} ${BY_ID.get(id).title}`);}return;
  }
  const link=e.target.closest('a[data-entry]');
  if(link&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();history.pushState(null,'','/compliance'+filterQuery(filters)+'#'+link.dataset.entry);focusEntry();$('focused-entry').scrollIntoView({behavior:'auto',block:'start'});$('focused-entry').querySelector('h2 a')?.focus({preventScroll:true});}
});
addEventListener('popstate',()=>{filters=readFilters(location.search);limit=pageSize;syncControls();render();});
addEventListener('hashchange',focusEntry);
$('print').addEventListener('click',()=>{limit=ENTRIES.length;render();for(const d of $('results').querySelectorAll('details'))d.open=true;window.print();});
addEventListener('storage',e=>{if(e.key===bookmarkKey){try{bookmarks=cleanBookmarks(JSON.parse(e.newValue||'[]'));}catch{bookmarks=[];}render();}});
syncControls();render();
if(location.hash)$('focused-entry').scrollIntoView();
async function offlineStatus(registration){
  const worker=registration.active;if(!worker)return;
  const channel=new MessageChannel();
  const timer=setTimeout(()=>{channel.port1.close();$('offline-state').textContent='Offline copy is preparing or unavailable. Keep this page open while connected, then reload to check.';},4000);
  channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();$('offline-state').textContent=event.data?.referenceReady?'Offline library saved on this device. Terms, summaries and links are available after a reload without a connection. External sources still require internet.':'Offline reference is incomplete. Reopen this page with a connection to download it.';};
  worker.postMessage({type:'reference-cache-status'},[channel.port2]);
}
if('serviceWorker' in navigator){
  try{
    const registration=await navigator.serviceWorker.register('/sw.js').catch(()=>navigator.serviceWorker.getRegistration('/'));
    if(!registration)throw Error('No offline registration');
    // A failed network update must not hide an already complete offline copy.
    registration.update().catch(()=>{});
    navigator.serviceWorker.addEventListener('controllerchange',()=>offlineStatus(registration));
    if(registration.active)await offlineStatus(registration);
    else navigator.serviceWorker.ready.then(()=>offlineStatus(registration));
  }
  catch{$('offline-state').textContent='Offline saving is unavailable in this browser session. The current page can still be used while open.';}
}else $('offline-state').textContent='This browser does not support downloading the reference library for offline reopening.';
