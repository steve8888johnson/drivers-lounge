(function(){
 'use strict';
 const byId=id=>document.getElementById(id),body=document.body;
 function screen(name){body.dataset.navScreen=name;byId('profile-editor').hidden=false;window.DLNavigationMap?.invalidateSize();}
 byId('edit-truck').addEventListener('click',()=>{window.DLTruckFirst?.invalidate?.();screen('truck');byId('truck-height-ft').focus();});
 const showTrip=()=>{
  if(!window.DLTruckFirst?.isConfirmed())return;
  byId('edit-truck').textContent='Change truck, trailer or load';
  screen('trip');byId('origin').focus();
 };
 byId('confirm-truck').addEventListener('click',showTrip);
 byId('reuse-truck').addEventListener('click',showTrip);
 byId('calculate-route').addEventListener('click',()=>{if(window.DLTruckFirst?.isConfirmed()){byId('route-evidence').open=true;byId('route-evidence').focus();}});
 screen(window.DLTruckFirst?.hasSavedSetup?.()?'trip':'truck');
})();
