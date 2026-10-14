(function(root){
 'use strict';
 const fields=['truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle'];
 function validate(values){
  const issues=[];
  const number=id=>{const v=values[id];return typeof v==='string' && v.trim()!=='' ? Number(v) : NaN;};
  const rules=[['truck-height-ft',4,20,true,'height in feet'],['truck-height-in',0,11,true,'height inches'],['truck-width-ft',4,20,true,'width in feet'],['truck-width-in',0,11,true,'width inches'],['truck-length',10,200,false,'total length'],['truck-weight',1000,1000000,false,'actual loaded weight'],['truck-axles',2,20,true,'axle count'],['trailer-length',0,100,false,'trailer length']];
  for(const [id,min,max,integer,label] of rules){const n=number(id);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))issues.push(`Enter a valid ${label}.`);}
  const trailer=number('trailer-length'),total=number('truck-length'),kingpin=number('kingpin-rear-axle');
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
 let confirmed=false;
 root.DLTruckFirst.isConfirmed=()=>confirmed;
 const values=()=>Object.fromEntries([...fields,'trailer-type','oversize','hazmat'].map(id=>[id,byId(id).type==='checkbox'?byId(id).checked:byId(id).value]));
 function reset(){confirmed=false;byId('truck-readiness-details').textContent='Confirm the loaded truck details first. Road restrictions have not been verified.';byId('trip-inputs').disabled=true;byId('truck-confirmation').textContent='Confirm your loaded truck before entering a trip.';byId('why-profile').textContent='Truck details have not been confirmed for this session.';}
 root.DLTruckFirst.invalidate=reset;
 button.addEventListener('click',()=>{
  const v=values(),issues=validate(v);
  if(issues.length){reset();byId('truck-confirmation').textContent=issues.join(' ');return;}
  confirmed=true;byId('trip-inputs').disabled=false;
  byId('truck-readiness-details').textContent='Truck details confirmed. No truck-route candidate with complete road restriction evidence is connected.';
  byId('truck-confirmation').textContent='Truck details confirmed for this session. Road restrictions still need verification.';
  byId('why-profile').textContent=`Vehicle used for this check: ${v['truck-width-ft']} ft ${v['truck-width-in']} in wide; ${v['truck-height-ft']} ft ${v['truck-height-in']} in high; ${v['truck-length']} ft long; ${Number(v['truck-weight']).toLocaleString()} lb loaded; ${v['truck-axles']} axles. This does not establish road legality.`;
  byId('origin').focus();
 });
 for(const id of [...fields,'trailer-type','oversize','hazmat','vehicle-preset']){
  byId(id).addEventListener('input',reset);byId(id).addEventListener('change',reset);
 }
 // Capture also blocks programmatic Enter/click paths while the profile is unconfirmed.
 byId('trip-inputs').addEventListener('keydown',e=>{if(!confirmed&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();}},true);
 byId('calculate-route').addEventListener('click',e=>{if(!confirmed){e.preventDefault();e.stopImmediatePropagation();byId('truck-confirmation').textContent='Confirm truck dimensions first.';}},true);
 reset();
})(typeof window==='undefined'?globalThis:window);
