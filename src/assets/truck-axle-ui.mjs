import {reviewAxleForm,TRUCK_CONTEXT_FIELDS} from './truck-axle-form.mjs';
import {createLoadReviewSession} from './truck-load-measurement.mjs';
export function mountAxleReview({document:doc,window:win,clock=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
 const byId=id=>doc.getElementById(id),button=byId('review-axles');if(!button)return;
 const session=createLoadReviewSession({clock});let timer,revision=0;
 const profile=()=>Object.fromEntries(TRUCK_CONTEXT_FIELDS.map(id=>{const el=byId(id);return [id,el.type==='checkbox'?el.checked:el.value];}));
 const status=message=>{byId('axle-review-status').textContent=message;byId('why-axles').textContent=message;};
 function invalidate(message='Axle review needed. Confirm new measurements after any load, fuel, trailer or axle-position change.'){
  session.invalidate();revision++;clearTimer(timer);byId('axle-measured-confirm').checked=false;
  byId('axle-review-groups').replaceChildren();status(message);
 }
 function renderRows(){
  const count=Number(byId('truck-axles').value),container=byId('axle-entry-rows');container.replaceChildren();
  if(!Number.isInteger(count)||count<2||count>20){const p=doc.createElement('p');p.textContent='Enter the truck axle count above to create measurement rows.';container.append(p);return;}
  for(let i=0;i<count;i++){
   const row=doc.createElement('fieldset'),legend=doc.createElement('legend');legend.textContent='Axle '+(i+1)+(i===0?' · front axle':'');row.append(legend);
   for(const [key,label] of [['weight','Measured weight (lb)'],['position','Distance behind front axle (in)']]){
    const wrapper=doc.createElement('label'),input=doc.createElement('input');wrapper.textContent=label;
    input.id='axle-'+i+'-'+key;input.type='number';input.min='0';input.max=key==='weight'?'1000000':'2400';input.step=key==='weight'?'1':'.01';input.inputMode=key==='weight'?'numeric':'decimal';
    if(i===0&&key==='position'){input.value='0';input.readOnly=true;}
    input.addEventListener('input',()=>invalidate());input.addEventListener('change',()=>invalidate());wrapper.append(input);row.append(wrapper);
   }
   container.append(row);
  }
 }
 const draft=()=>{const count=Number(byId('truck-axles').value);return {kind:byId('axle-measurement-kind').value,configuration:byId('axle-configuration').value,loadReference:byId('axle-load-reference').value,
  localTime:byId('axle-weighed-at').value,offset:byId('axle-time-offset').value,confirmed:byId('axle-measured-confirm').checked,
  axles:Number.isInteger(count)&&count>=2&&count<=20?Array.from({length:count},(_,i)=>({weightLb:byId('axle-'+i+'-weight')?.value,positionIn:byId('axle-'+i+'-position')?.value})):[]};};
 const context=()=>({profile:profile(),draft:draft()});
 function setKind(){const kind=byId('axle-measurement-kind').value;byId('axle-individual-fields').hidden=kind!=='individual';byId('axle-group-notes').hidden=kind!=='grouped';invalidate(kind==='grouped'?'Group totals remain notes only. Individual axle and interior bridge checks are still missing.':undefined);}
 const takeSnapshot=()=>{
  const measured=session.snapshot(context());
  if(!measured){invalidate('Axle review needed. Measurements expired, changed, or have not been checked. Truck guidance stays unavailable.');}
  return measured;
 };
 function review(){
  session.invalidate();clearTimer(timer);byId('axle-review-groups').replaceChildren();
  const p=profile();
  const basicIssues=win.DLTruckFirst?.validate(p)||['Truck dimension checks could not load.'];
  const review=reviewAxleForm(draft(),p,{now:clock(),revision:'session-'+revision});
  if(basicIssues.length||review.status==='HOLD'){status([...basicIssues,...review.issues.map(x=>x.message)].join(' '));return;}
  const accepted=session.confirm(review.measurement,context());if(accepted.status==='HOLD'){status(accepted.issues.map(x=>x.message).join(' '));return;}
  status('No excess found in '+review.groups.length+' federal baseline axle-group checks. Local rules, posted limits, tire/manufacturer ratings and road access remain unverified. This is not clearance to drive.');
  for(const group of review.groups){const li=doc.createElement('li');li.textContent='Axles '+group.firstAxle+'–'+group.lastAxle+': '+group.weightLb.toLocaleString('en-US')+' lb; baseline '+group.baselineLimitLb.toLocaleString('en-US')+' lb.';byId('axle-review-groups').append(li);}
  timer=setTimer(()=>invalidate('Axle measurements reached the 24-hour review limit. Reweigh and review this load. Truck guidance stays unavailable.'),Math.max(1,accepted.expiresAt-clock()));
 }
 for(const id of TRUCK_CONTEXT_FIELDS){for(const event of ['input','change'])byId(id).addEventListener(event,()=>{invalidate();if(id==='truck-axles'||id==='vehicle-preset')renderRows();});}
 for(const id of ['axle-load-reference','axle-configuration','axle-weighed-at','axle-time-offset','axle-ticket-notes'])for(const event of ['input','change'])byId(id).addEventListener(event,()=>invalidate());
 byId('axle-measurement-kind').addEventListener('change',setKind);
 byId('axle-measured-confirm').addEventListener('change',()=>{session.invalidate();clearTimer(timer);byId('axle-review-groups').replaceChildren();status('Run the axle check for the measurements shown.');});
 byId('load-changed').addEventListener('click',()=>{win.DLTruckFirst?.invalidate?.();invalidate('Load changed. Reweigh, update dimensions and axle measurements, then review again.');});
 doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')takeSnapshot();});
 win.addEventListener('pagehide',()=>invalidate());
 byId('calculate-route').addEventListener('click',takeSnapshot);
 button.addEventListener('click',review);button.disabled=false;renderRows();setKind();
 win.DLTruckAxles={snapshot:takeSnapshot,invalidate:()=>invalidate()};
 return {review,invalidate,snapshot:takeSnapshot};
}
if(typeof document!=='undefined')mountAxleReview({document,window});
