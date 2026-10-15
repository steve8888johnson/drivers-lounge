import { readPDFRoute, printedRowSpeech } from './pdf-route-review.mjs';
import { createSpeech, speechPreferences } from './speech.mjs';

export function createPrintedRouteReview(stopOtherSpeech=()=>{}) {
  const $=s=>document.querySelector(s), dialog=$('#printed-route-dialog');
  let controller, generation=0, review=null,index=0;
  const say=message=>$('#printed-route-status').textContent=message;
  const speech=createSpeech({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,visible:()=>!document.hidden&&dialog.open,onState:s=>$('#printed-route-voice-status').textContent=s.message});
  function stop() {generation++;controller?.abort();controller=null;speech.stop();}
  function render() {
    const row=review?.rows[index];
    $('#printed-route-previous').disabled=!row||index===0;$('#printed-route-next').disabled=!row||index===review.rows.length-1;
    $('#printed-route-read').disabled=!row||!!review.issues.length;
    $('#printed-route-select').disabled=!row;
    $('#printed-route-select').replaceChildren(...(review?.rows||[]).map((r,i)=>new Option(`${i+1}. Page ${r.page} · ${r.instruction}`,String(i))));
    $('#printed-route-select').value=String(index);
    $('#printed-route-position').textContent=row?`${review.state} · PDF page ${row.page} · ROW ${index+1} OF ${review.rows.length}`:'';
    $('#printed-route-instruction').textContent=row?.instruction||'Read the original PDF';
    $('#printed-route-road').textContent=row?`Road column: ${row.road}`:'';
    $('#printed-route-miles').textContent=row?`Printed segment: ${row.miles} mi · printed cumulative: ${row.cumulative} mi. These are document values, not distance from your position.`:'';
    $('#printed-route-issues').textContent=review?.issues.join('\n')||'';
  }
  function select(value) {speech.stop('Row changed. Tap to read this row.');index=value;render();}
  $('#printed-route-select').onchange=()=>select(Number($('#printed-route-select').value));
  $('#printed-route-previous').onclick=()=>select(index-1);$('#printed-route-next').onclick=()=>select(index+1);
  $('#printed-route-read').onclick=()=>{const text=printedRowSpeech(review,index);if(text){let prefs;try{prefs=speechPreferences(localStorage);}catch{prefs=speechPreferences(null);}speech.play(text,{...prefs,key:'printed-row',repeat:true});}};
  $('#printed-route-stop-voice').onclick=()=>speech.stop();
  $('#printed-route-stop').onclick=()=>{stop();say('Reading stopped. Original unchanged.');$('#printed-route-stop').disabled=true;};
  dialog.addEventListener('close',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open){stop();say('Review paused while the page was hidden. Reopen the PDF review if extraction was unfinished.');$('#printed-route-stop').disabled=true;}});
  window.addEventListener('pagehide',stop);
  return {async open(file,name) {
    stop();stopOtherSpeech();review=null;index=0;render();$('#printed-route-name').textContent=name;$('#printed-route-voice-status').textContent='Audio has not been checked.';
    dialog.showModal();controller=new AbortController();const token=++generation;$('#printed-route-stop').disabled=false;say('Reading printed route columns locally…');
    try {const result=await readPDFRoute(file,{signal:controller.signal,onPage:(page,total)=>{if(token===generation)say(`Reading PDF page ${page} of ${total} locally…`);}});
      if(token!==generation||!dialog.open)return;review=result;render();say(`${result.rows.length} printed rows on page${result.tablePages.length===1?'':'s'} ${result.tablePages.join(', ')}. Compare every row and all condition pages with the original. Nothing was added to the route.`);
    }catch(e){if(token===generation){say(e.name==='AbortError'?'Reading stopped. Original unchanged.':`Could not read this route table: ${e.message}`);}}
    finally{if(token===generation)$('#printed-route-stop').disabled=true;}
  }};
}
