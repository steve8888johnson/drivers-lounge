(function(){
const B=window.DLBackend,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{const route=JSON.parse(localStorage.getItem('dl-v5-route')||'null');if(route?.origin&&route?.destination){$('#mc-route').textContent=route.origin+' → '+route.destination;$('#mc-route-detail').textContent=Number.isFinite(route.distance)&&Number.isFinite(route.duration)?Math.round(route.distance/1609.344)+' mi · '+Math.round(route.duration/60)+' minutes estimated · Saved '+new Date(route.savedAt).toLocaleString():'Open navigation to refresh the preview.'}}catch(_){}
// Date-only credentials use the driver's local calendar day, without UTC or DST shifts.
function calendarDay(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
 const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.getTime()/86400000:null;
}
let workspaceVersion=0;
async function workspace(){
 const version=++workspaceVersion,status=$('#mc-workspace-status'),credentials=$('#mc-credentials'),signin=$('#mc-signin');
 credentials.innerHTML='';signin.hidden=true;$('#mc-greeting').textContent='Welcome to Mission Control.';
 status.textContent='Loading your private workspace…';
 try{
  if(!B?.configured)throw Error('Connection unavailable');
  const user=await B.user();if(version!==workspaceVersion)return;
  if(!user){status.textContent='Sign in to see your private credential reminders.';signin.hidden=false;return}
  const [profile]=await B.list('profiles',{eq:{auth_user_id:user.id},select:'id,display_name',limit:1});
  if(version!==workspaceVersion)return;
  if(!profile){status.textContent='Your profile is not available yet. Open Account or contact Support.';return}
  if(profile.display_name)$('#mc-greeting').textContent='Welcome, '+profile.display_name+'.';
  const [passport]=await B.list('driver_passports',{eq:{profile_id:profile.id},select:'cdl_expires,medical_card_expires,twic_expires',limit:1});
  if(version!==workspaceVersion)return;
  const now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000;
  const rows=[['CDL','cdl_expires'],['Medical card','medical_card_expires'],['TWIC','twic_expires']].map(([label,key])=>{
   const date=passport?.[key],day=calendarDay(date),remaining=day===null?null:day-today;
   const urgency=remaining===null?'missing':remaining<0?'expired':remaining<=30?'soon':'current';
   const detail=remaining===null?'Expiration not entered':remaining<0?'Expired '+date:remaining===0?'Expires today':remaining===1?'Expires tomorrow':'Expires '+date+(remaining<=30?' (in '+remaining+' days)':'');
   return '<li data-urgency="'+urgency+'"><strong>'+label+'</strong>: '+detail+'</li>';
  });
  credentials.innerHTML=rows.join('');status.textContent='Private reminders from the dates you entered. Credentials are self-reported; verify your original documents.';
 }catch(_){if(version===workspaceVersion)status.textContent='Your workspace could not be loaded. Reload to try again, or open your Driver Passport.'}
}
async function reports(){
 try{if(!B?.configured)throw Error('Connection unavailable');const reports=await B.list('road_reports',{eq:{status:'active'},limit:50,order:'created_at'});const rows=reports.filter(r=>!r.expires_at||new Date(r.expires_at)>new Date()).slice(0,6);$('#mc-road-feed').innerHTML=rows.length?rows.map(r=>'<article><div><strong>'+esc(String(r.report_type||'Road report').replace(/_/g,' '))+'</strong><small>'+esc(r.note||'Driver observation')+' · '+esc(new Date(r.created_at).toLocaleString())+'</small></div></article>').join(''):'<p>No current reports. You can add an observation with + Report.</p>'}catch(_){$('#mc-road-feed').textContent='Reports could not be loaded. Try Road Intelligence again shortly.'}
}
window.addEventListener('dl-auth-change',()=>{void workspace()});
window.addEventListener('dl-report-published',()=>{void reports()});
void workspace();void reports();
})();
