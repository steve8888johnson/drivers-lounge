(function(){
const B=window.DLBackend;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const criteria=[
 ['overall_experience','Overall experience'],['pay_accuracy','Pay accuracy'],['pay_level','Pay level'],['miles_load_consistency','Miles / load consistency'],['home_time_promises','Home-time promises kept'],['dispatch_quality','Dispatch quality'],['driver_respect','Driver respect'],['equipment_condition','Equipment condition'],['maintenance_response','Maintenance response'],['safety_culture','Safety culture / HOS pressure'],['accessorial_pay','Detention / layover / breakdown pay'],['benefits','Benefits'],['management_communication','Management communication'],['hiring_promises','Hiring promises vs. actual job'],['would_work_again','Would work there again']
];
let carriers=[];
let selected=null;

function toast(msg){ if(window.DLToast) return window.DLToast(msg); const t=document.createElement('div');t.className='dl-global-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600); }
function locationText(c){return [c.physical_city,c.physical_state].filter(Boolean).join(', ')||'Location unavailable';}
function carrierName(c){return c.dba_name||c.legal_name||('USDOT '+c.usdot_number);}
function renderRows(rows){
 const body=$('#carrier-results');
 if(!rows.length){body.innerHTML='<tr><td colspan="6"><div class="empty-state">No carriers found yet. Once the FMCSA import is loaded, this directory will search the full carrier database.</div></td></tr>';return;}
 body.innerHTML=rows.map(c=>`<tr>
  <td><strong>${esc(carrierName(c))}</strong><br><small>USDOT ${esc(c.usdot_number)}${c.mc_number?' · MC '+esc(c.mc_number):''}<br>${esc(locationText(c))}</small></td>
  <td>${esc(c.operating_status||'—')}</td><td>${esc(c.power_units??'—')}</td><td>${esc(c.drivers??'—')}</td>
  <td><span class="badge blue" data-score-for="${esc(c.usdot_number)}">Loading…</span></td>
  <td><button class="primary-btn" data-review-usdot="${esc(c.usdot_number)}">View / Review</button></td>
 </tr>`).join('');
 hydrateScores(rows);
}
async function hydrateScores(rows){
 if(!B?.configured) return document.querySelectorAll('[data-score-for]').forEach(x=>x.textContent='Not connected');
 for(const c of rows){
  try{const scores=await B.list('carrier_review_scores',{eq:{carrier_usdot:c.usdot_number},limit:1});const s=scores[0];const el=document.querySelector(`[data-score-for="${c.usdot_number}"]`);if(el)el.textContent=s?`${Number(s.driver_score).toFixed(2)} / 5 · ${s.review_count} reviews`:'No reviews yet';}catch{}
 }
}
async function loadCarriers(){
 try{carriers=await B.list('carriers',{limit:250,order:'legal_name'});renderRows(carriers);}catch(e){console.error(e);renderRows([]);toast('Carrier database needs the RC2 Supabase migration.');}
}
function filterCarriers(){const q=$('#carrier-search').value.trim().toLowerCase();if(!q)return renderRows(carriers);renderRows(carriers.filter(c=>[c.legal_name,c.dba_name,c.usdot_number,c.mc_number,c.physical_city,c.physical_state].some(v=>String(v??'').toLowerCase().includes(q))));}
function reviewForm(){return criteria.map(([key,label])=>`<label class="rating-row"><span>${esc(label)}</span><select name="${key}" required><option value="">Rate</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${n} / 5</option>`).join('')}</select></label>`).join('');}
function openCarrier(c){selected=c;$('#carrier-modal-title').textContent=carrierName(c);$('#carrier-modal-sub').textContent=`USDOT ${c.usdot_number} · ${locationText(c)}`;$('#ratings-grid').innerHTML=reviewForm();$('#carrier-modal').hidden=false;loadReviews(c.usdot_number);}
async function loadReviews(usdot){
 const box=$('#carrier-review-list');box.innerHTML='<p class="page-subtitle">Loading driver reviews…</p>';
 try{const rows=await B.list('carrier_reviews',{eq:{carrier_usdot:usdot,moderation_status:'published'},limit:50,order:'created_at'});if(!rows.length){box.innerHTML='<p class="page-subtitle">No published driver reviews yet. Be the first.</p>';return;}box.innerHTML=rows.map(r=>`<article class="review-card"><div><strong>${r.employment_status==='current_driver'?'Current driver':'Former driver'}</strong> <span class="badge ${r.verification_status==='verified'?'green':'blue'}">${esc(r.verification_status)}</span></div><div class="review-score">${Number(r.overall_experience).toFixed(1)} / 5 overall</div><p>${esc(r.review_text||'No written comments.')}</p></article>`).join('');}
 catch(e){box.innerHTML='<p class="page-subtitle">Reviews will appear after the RC2 migration is applied.</p>';}
}
async function submitReview(e){
 e.preventDefault(); if(!selected)return; const user=await B.user(); if(!user){toast('Sign in before leaving a carrier review.');location.href='/account';return;}
 const f=new FormData(e.currentTarget);const row={carrier_usdot:Number(selected.usdot_number),reviewer_user_id:user.id,employment_status:f.get('employment_status'),review_text:String(f.get('review_text')||'').trim(),verification_status:'unverified',moderation_status:'published'};for(const [k] of criteria)row[k]=Number(f.get(k));
 try{await B.upsert('carrier_reviews',row,'carrier_usdot,reviewer_user_id');toast('Your carrier review was saved.');e.currentTarget.reset();loadReviews(selected.usdot_number);hydrateScores([selected]);}catch(err){console.error(err);toast(err.message||'Could not save review.');}
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-review-usdot]');if(b){const c=carriers.find(x=>String(x.usdot_number)===b.dataset.reviewUsdot);if(c)openCarrier(c);}if(e.target.matches('[data-close-carrier]'))$('#carrier-modal').hidden=true;});
$('#carrier-search')?.addEventListener('input',filterCarriers);$('#carrier-search-btn')?.addEventListener('click',filterCarriers);$('#carrier-review-form')?.addEventListener('submit',submitReview);
loadCarriers();
})();