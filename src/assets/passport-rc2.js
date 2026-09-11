(async function(){
const {B,$,notice,identity,busy,split}=window.DLUI;let me,passport={};
try{me=await identity();if(!me)return;[passport={}]=await B.list('driver_passports',{eq:{profile_id:me.profile.id},limit:1});
for(const name of ['cdl_class','cdl_state','cdl_expires','years_experience','professional_summary','medical_card_expires','twic_expires'])if(passport[name]!=null)document.getElementById(name).value=passport[name];
for(const name of ['endorsements','equipment_experience','preferred_regions'])document.getElementById(name).value=(passport[name]||[]).join(', ');
$('#availability').value=passport.preferences?.availability||'';$('#passport-form').hidden=false;notice('Your passport is private. Documents and credentials are self-reported.');
}catch(e){notice(e.message,true);return}
$('#passport-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;busy(form,async()=>{const row={profile_id:me.profile.id,user_id:me.user.id,preferences:{...passport.preferences,availability:$('#availability').value},discoverable:false,profile_visibility:'private',updated_at:new Date().toISOString()};for(const name of ['cdl_class','cdl_state','cdl_expires','professional_summary','medical_card_expires','twic_expires'])row[name]=document.getElementById(name).value.trim()||null;row.cdl_state=row.cdl_state?.toUpperCase()||null;row.years_experience=$('#years_experience').value===''?null:Number($('#years_experience').value);for(const name of ['endorsements','equipment_experience','preferred_regions'])row[name]=split(document.getElementById(name).value);const result=await B.upsert('driver_passports',row,'profile_id');passport=result.data;notice('Your private passport has been saved.');});});
})();
