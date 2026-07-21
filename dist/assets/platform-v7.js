
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function toast(msg){let el=$('.v7-toast');if(!el){el=document.createElement('div');el.className='v7-toast';document.body.appendChild(el)}el.textContent=msg;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2500)}
$$('[data-counter]').forEach(el=>{const end=+el.dataset.counter;let value=Math.max(0,Math.floor(end*.75));const timer=setInterval(()=>{value=Math.min(end,value+1);el.textContent=value.toLocaleString();if(value>=end)clearInterval(timer)},70)});
const ask=$('#home-ask-ai'),q=$('#home-ai-question'),out=$('#home-ai-answer');
function answer(text){const s=text.toLowerCase();if(s.includes('parking'))return 'Stop before Ardmore. Love’s shows 23 reported spaces and historically fills before 8 PM.';if(s.includes('fuel'))return 'Fuel in Gainesville. The current demo route-adjusted price is $3.49, approximately 18¢ below the next major stop.';if(s.includes('scale'))return 'The Gainesville I-35 inspection station is reported likely open with 90% confidence. Prepare paperwork and follow posted signs.';if(s.includes('weather')||s.includes('wind'))return 'Crosswinds are shown near Ardmore with gusts up to 35 mph. Reduce speed and watch high-profile vehicle stability.';return 'Stay on the major commercial corridor, verify official restrictions, and plan fuel, parking and inspection stops before departure.'}
if(ask){ask.addEventListener('click',()=>{if(!q.value.trim()){toast('Ask the copilot a question');return}out.textContent=answer(q.value);localStorage.setItem('dl-v7-ai',JSON.stringify({q:q.value,a:out.textContent}))})}
$$('[data-ai-prompt]').forEach(b=>b.addEventListener('click',()=>{q.value=b.dataset.aiPrompt;ask.click()}));
const modal=$('#home-report-modal');$('#quick-report')?.addEventListener('click',()=>modal.hidden=false);$('#close-home-report')?.addEventListener('click',()=>modal.hidden=true);$$('[data-home-report]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('dl-v7-last-report',JSON.stringify({type:b.dataset.homeReport,time:Date.now()}));modal.hidden=true;toast(`${b.dataset.homeReport} report saved`)}));
const saved=JSON.parse(localStorage.getItem('dl-v7-ai')||'null');if(saved){q.value=saved.q;out.textContent=saved.a}
})();
