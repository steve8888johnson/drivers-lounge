(function(root){
 'use strict';
 const fields=['truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle'];
 function validate(values){
  const issues=[];
  const number=id=>{const v=values[id];return typeof v==='string' && v.trim()!=='' ? Number(v) : NaN;};
  const rules=[['truck-height-ft',4,20,true,'height in feet'],['truck-height-in',0,11,true,'height inches'],['truck-width-ft',4,20,true,'width in feet'],['truck-width-in',0,11,true,'width inches'],['truck-length',10,200,false,'total length'],['truck-weight',1000,1000000,false,'actual loaded weight'],['truck-axles',2,20,true,'axle count'],['trailer-length',0,100,false,'trailer length']];
  for(const [id,min,max,integer,label] of rules){const n=number(id);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))issues.push(`Enter a valid ${label}.`);}
  const trailer=number('trailer-length'),total=number('truck-length'),kingpin=number('kingpin-rear-axle');
  if(!['semi-53','reefer','flatbed','hotshot','tanker','auto','rv','none'].includes(values['trailer-type']))issues.push('Choose a supported trailer type.');
  if(trailer>total)issues.push('Trailer length cannot exceed total vehicle length.');
  if(values['trailer-type']==='none'&&trailer!==0)issues.push('Use zero trailer length for a vehicle without a trailer.');
  if(values['trailer-type']!=='none'&&!(trailer>0))issues.push('Enter the attached trailer length.');
  if(['semi-53','reefer','flatbed','tanker'].includes(values['trailer-type'])&&(!Number.isFinite(kingpin)||kingpin<=0||kingpin>trailer))issues.push('Enter kingpin-to-rear-axle distance within the trailer length.');
  if(values.oversize||values.hazmat)issues.push('This setup is for standard, non-hazmat trucks. Use the separate permit workflow for this load.');
  return issues;
 }
 root.DLTruckFirst={validate};
 if(!root.document)return;
 const doc=root.document,byId=id=>doc.getElementById(id),button=byId('confirm-truck');
 if(!button)return;
 let confirmed=false,savedSetup=false,storage,edited=false;
 try{storage=root.localStorage;}catch{/* A blocked store cannot provide remembered measurements. */}
 const memory=root.DLTruckSetupMemory;
 root.DLTruckFirst.isConfirmed=()=>confirmed;
 const values=()=>Object.fromEntries([...fields,'trailer-type','oversize','hazmat'].map(id=>[id,byId(id).type==='checkbox'?byId(id).checked:byId(id).value]));
 root.DLTruckFirst.values=values;
 root.DLTruckFirst.edited=()=>edited;
 root.DLTruckFirst.applyAccount=v=>{
  if(validate(v).length)return false;
  for(const id of [...fields,'trailer-type'])byId(id).value=v[id];
  byId('oversize').checked=false;byId('hazmat').checked=false;
  savedSetup=true;byId('saved-truck-summary').textContent=describe(v);reset(false);
  doc.body.dataset.navScreen='trip';edited=false;return true;
 };
 root.DLTruckFirst.resetAccount=()=>{
  confirmed=false;savedSetup=false;edited=false;
  for(const id of [...fields,'trailer-type'])byId(id).value='';
  byId('oversize').checked=false;byId('hazmat').checked=false;
  byId('saved-truck-summary').textContent='';reset(false);doc.body.dataset.navScreen='truck';
  byId('profile-summary-text').textContent='Enter loaded measurements';byId('profile-status').textContent='';
 };
 function reset(forget=true){confirmed=false;if(forget){savedSetup=false;memory?.saveDraft(storage,'standard',values());}byId('saved-truck-card').hidden=!savedSetup;byId('truck-readiness-details').textContent='Confirm the loaded truck details first. Road restrictions have not been verified.';byId('trip-inputs').disabled=!savedSetup;byId('truck-confirmation').textContent='Confirm your loaded truck before entering a trip.';byId('why-profile').textContent='Loaded measurements have not been confirmed for this load.';}
 root.DLTruckFirst.invalidate=reset;
 root.DLTruckFirst.hasSavedSetup=()=>savedSetup;
 function describe(v){return `${v['truck-height-ft']} ft ${v['truck-height-in']} in high · ${v['truck-width-ft']} ft ${v['truck-width-in']} in wide · ${v['truck-length']} ft long · ${v['trailer-length']} ft trailer · ${v['truck-axles']} axles. Last loaded weight: ${Number(v['truck-weight']).toLocaleString()} lb.`;}
 function confirm(){
  const v=values(),issues=validate(v);
  if(issues.length){reset();byId('truck-confirmation').textContent=issues.join(' ');return;}
  confirmed=true;byId('trip-inputs').disabled=false;
  savedSetup=memory?.save(storage,'standard',v)===true;
  byId('saved-truck-card').hidden=true;
  byId('truck-readiness-details').textContent='Truck details confirmed. No truck-route candidate with complete road restriction evidence is connected.';
  byId('truck-confirmation').textContent=memory?.accountActive()?'Current load confirmed. Check the account sync status below for whether it saved.':savedSetup?'Setup saved on this device. Current load confirmed; road restrictions still need verification.':'Current load confirmed. This browser could not remember the setup; keep a separate record.';
  byId('why-profile').textContent=`Vehicle used for this check: ${v['truck-width-ft']} ft ${v['truck-width-in']} in wide; ${v['truck-height-ft']} ft ${v['truck-height-in']} in high; ${v['truck-length']} ft long; ${Number(v['truck-weight']).toLocaleString()} lb loaded; ${v['truck-axles']} axles. This does not establish road legality.`;
  byId('origin').focus();
  root.dispatchEvent?.(new CustomEvent('dl-setup-confirmed'));
 }
 button.addEventListener('click',confirm);
 byId('reuse-truck').addEventListener('click',confirm);
 for(const id of [...fields,'trailer-type','oversize','hazmat','vehicle-preset']){
  byId(id).addEventListener('input',()=>{edited=true;reset();});byId(id).addEventListener('change',()=>{edited=true;reset();});
 }
 // Capture also blocks programmatic Enter/click paths while the profile is unconfirmed.
 byId('trip-inputs').addEventListener('keydown',e=>{if(!confirmed&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();}},true);
 byId('calculate-route').addEventListener('click',e=>{if(!confirmed){e.preventDefault();e.stopImmediatePropagation();byId('truck-confirmation').textContent='Confirm truck dimensions first.';byId('saved-load-confirmation').textContent='Confirm that this load matches the saved measurements, or change the setup above.';}},true);
 const draft=memory?.draft(storage,'standard');
 if(draft)for(const [id,value]of Object.entries(draft))byId(id).value=value;
 const saved=memory?.read(storage,'standard');
 if(saved&&!validate({...saved,oversize:byId('oversize').checked,hazmat:byId('hazmat').checked}).length){
  for(const [id,value]of Object.entries(saved))byId(id).value=value;
  savedSetup=true;byId('saved-truck-summary').textContent=describe(saved);
 }
 reset(false);
})(typeof window==='undefined'?globalThis:window);
