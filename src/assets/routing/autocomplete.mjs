import'./guidance-guard.mjs';
import'./road-context-ui.mjs';

const ENDPOINT='/api/truck-location-search';
const MIN_QUERY=3;
const DEBOUNCE_MS=320;

function escapeText(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();}

function createController(input){
 const label=input.closest('label')||input.parentElement,panel=document.createElement('div');
 panel.className='stop-suggestions';panel.hidden=true;panel.setAttribute('role','listbox');panel.id=`${input.id}-suggestions`;label.append(panel);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',panel.id);input.setAttribute('aria-expanded','false');input.autocomplete='off';
 let timer=null,abort=null,results=[],active=-1,lastQuery='',selecting=false;

 function close(){clearTimeout(timer);if(abort){abort.abort();abort=null;}panel.hidden=true;input.setAttribute('aria-expanded','false');active=-1;}
 function markActive(){[...panel.querySelectorAll('button')].forEach((button,index)=>{button.classList.toggle('active',index===active);button.setAttribute('aria-selected',String(index===active));});if(active>=0)panel.querySelectorAll('button')[active]?.scrollIntoView({block:'nearest'});}
 function choose(result){
  selecting=true;close();results=[];lastQuery=result.label;
  input.value=result.label;input.dataset.selectedLat=String(result.lat);input.dataset.selectedLng=String(result.lng);input.dataset.selectedType=result.resultType;input.dataset.selectedPrecise=String(result.precise);
  input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new CustomEvent('routing-stop-selected',{bubbles:true,detail:result}));
  selecting=false;close();
 }
 function render(message=''){
  panel.replaceChildren();
  if(message){const note=document.createElement('div');note.className='stop-suggestion-note';note.textContent=message;panel.append(note);panel.hidden=false;input.setAttribute('aria-expanded','true');return;}
  for(const[resultIndex,result]of results.entries()){
   const button=document.createElement('button');button.type='button';button.className=`stop-suggestion ${result.precise?'precise':'broad'}`;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.dataset.index=String(resultIndex);
   const copy=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small'),badge=document.createElement('b');
   strong.textContent=escapeText(result.label);small.textContent=escapeText(result.resultType||'Location');badge.textContent=result.precise?'Exact stop':'Planning only';copy.append(strong,small);button.append(copy,badge);
   button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>choose(result));panel.append(button);
  }
  panel.hidden=!results.length;input.setAttribute('aria-expanded',String(results.length>0));markActive();
 }
 async function search(){
  const query=input.value.trim();lastQuery=query;if(query.length<MIN_QUERY){results=[];close();return;}
  if(abort)abort.abort();abort=new AbortController();render('Searching commercial addresses and facilities…');
  try{
   const response=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query}),signal:abort.signal});
   const payload=await response.json().catch(()=>({error:'Location search returned an unreadable response.'}));if(query!==lastQuery)return;
   if(!response.ok)throw Error(payload.error||'Location search failed.');results=Array.isArray(payload.results)?payload.results:[];active=-1;render(results.length?'':'No matching U.S. address or facility found. Add a street number, ZIP code or facility name.');
  }catch(error){if(error.name==='AbortError')return;results=[];render(error.message||'Location search is unavailable. You can still type a full address.');}
 }
 input.addEventListener('input',()=>{
  if(selecting)return;
  delete input.dataset.selectedLat;delete input.dataset.selectedLng;delete input.dataset.selectedType;delete input.dataset.selectedPrecise;
  clearTimeout(timer);timer=setTimeout(search,DEBOUNCE_MS);
 });
 input.addEventListener('focus',()=>{if(selecting)return;if(results.length)render();else if(input.value.trim().length>=MIN_QUERY&&input.value.trim()!==lastQuery){clearTimeout(timer);timer=setTimeout(search,120);}});
 input.addEventListener('blur',()=>setTimeout(close,120));
 input.addEventListener('keydown',event=>{
  if(panel.hidden||!results.length){if(event.key==='ArrowDown'&&input.value.trim().length>=MIN_QUERY){event.preventDefault();void search();}return;}
  if(event.key==='ArrowDown'){event.preventDefault();active=(active+1)%results.length;markActive();}
  else if(event.key==='ArrowUp'){event.preventDefault();active=(active-1+results.length)%results.length;markActive();}
  else if(event.key==='Enter'&&active>=0){event.preventDefault();choose(results[active]);}
  else if(event.key==='Escape'){event.preventDefault();close();}
 });
 return{close};
}

export function attachRoutingAutocomplete(){
 const inputs=['origin','destination'].map(id=>document.getElementById(id)).filter(Boolean);if(!inputs.length)return[];
 const controllers=inputs.map(createController);document.addEventListener('pointerdown',event=>{if(!event.target.closest('.stop-suggestions')&&!inputs.includes(event.target))controllers.forEach(controller=>controller.close());});return controllers;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachRoutingAutocomplete,{once:true});else attachRoutingAutocomplete();
