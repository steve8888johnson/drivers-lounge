(function(){
 'use strict';
 const byId=id=>document.getElementById(id),body=document.body;
 function screen(name){body.dataset.navScreen=name;byId('profile-editor').hidden=false;window.DLNavigationMap?.invalidateSize();}
 byId('edit-truck').addEventListener('click',()=>{screen('truck');byId('truck-height-ft').focus();});
 byId('confirm-truck').addEventListener('click',()=>{
  if(!window.DLTruckFirst?.isConfirmed())return;
  byId('edit-truck').textContent=`${byId('truck-height-ft').value}′ ${byId('truck-height-in').value}″ high · ${byId('truck-width-ft').value}′ ${byId('truck-width-in').value}″ wide · ${Number(byId('truck-weight').value).toLocaleString()} lb · Edit`;
  screen('trip');byId('origin').focus();
 });
 byId('calculate-route').addEventListener('click',()=>{if(window.DLTruckFirst?.isConfirmed()){byId('route-evidence').open=true;byId('route-evidence').focus();}});
 screen('truck');
})();
