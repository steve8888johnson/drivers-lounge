(function(){
const B=window.DLBackend,$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(message,bad=false){const el=$('#workspace-status');if(el){el.textContent=message;el.dataset.bad=bad?'1':'0'}}
async function identity(){if(!B?.configured)throw Error('The service is unavailable. Please try again shortly.');const user=await B.user();if(!user){notice('Sign in to use your private workspace.');const el=$('#workspace-signin');if(el){el.hidden=false;el.href='/account?return='+encodeURIComponent(location.pathname)}return null}const[profile]=await B.list('profiles',{eq:{auth_user_id:user.id},limit:1});if(!profile)throw Error('Your profile is not available yet. Please contact support.');return {user,profile}}
async function busy(form,task){const controls=[...form.querySelectorAll('button,input,textarea,select')];controls.forEach(e=>e.disabled=true);try{await task()}catch(e){notice(e.message||'Could not save. Please try again.',true)}finally{controls.forEach(e=>e.disabled=false)}}
window.DLUI={B,$,esc,notice,identity,busy,split:s=>s.split(',').map(x=>x.trim()).filter(Boolean)};
})();
