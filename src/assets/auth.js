(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],B=window.DLBackend;
const query=new URLSearchParams(location.search);
let refreshing=false;
function msg(text,type='info'){const e=$('#auth-message');if(!e)return;e.textContent=text;e.className='auth-message '+type;e.hidden=false}
function errorMessage(err){
 const code=err?.code||'',text=err?.message||'';
 if(code==='invalid_credentials')return 'Email or password is incorrect. Try again or request a password reset below.';
 if(code==='email_not_confirmed')return 'Confirm your email before signing in. You can request a fresh confirmation email below.';
 if(code==='over_email_send_rate_limit'||/rate limit|too many requests/i.test(text))return 'Too many requests. Please wait a few minutes before trying again.';
 if(/fetch|network|timeout/i.test(text))return 'Account services could not be reached. Check your connection and try again.';
 return text||'That did not work. Please try again.';
}
function destination(){
 const candidate=query.get('return')||'/mission-control';
 try{const u=new URL(candidate,location.origin);if(u.origin===location.origin&&!candidate.includes('\\')&&!['/account','/account.html'].includes(u.pathname))return u.pathname+u.search+u.hash}catch(_){}
 return '/mission-control';
}
async function loadCommunicationPreferences(user){const f=$('#communication-form');if(!f||!user)return;try{const rows=await B.list('communication_preferences',{eq:{user_id:user.id},limit:1});const p=rows[0]||{};f.elements.email_offers.checked=!!p.email_offers;f.elements.sms_offers.checked=!!p.sms_offers;f.elements.mobile_phone.value=p.mobile_phone||''}catch(_){msg('Your account is signed in, but delivery preferences could not be loaded. Please retry later.','warning')}}
async function refresh(){
 if(refreshing)return;refreshing=true;
 try{
  if(!B?.configured)throw new Error('Drivers Lounge account services are temporarily unavailable. Please try again shortly.');
  const user=await B.user(),recovery=!!B.authCallback.recovery;
  $$('[data-auth-only]').forEach(x=>x.hidden=!user||recovery);
  $$('[data-guest-only]').forEach(x=>x.hidden=!!user&&(!recovery||!B.authCallback.error));
  if(recovery&&!user)$$('[data-guest-only]').forEach(x=>x.hidden=false);
  const passwordPanel=$('#password-panel');if(passwordPanel)passwordPanel.hidden=!user;
  if($('#account-title'))$('#account-title').textContent=recovery&&user?'Set your new password':user?'Your account':'Sign in';
  $$('[data-user-email]').forEach(x=>x.textContent=user?.email||'');
  if(user&&$('#account-email'))$('#account-email').textContent=user.email;
  if(user&&$('#account-id'))$('#account-id').textContent=user.id;
  if(B.authCallback.error){
   msg('This email link has expired or has already been used. Sign in with your password, or request a fresh reset or confirmation email below.','error');
   history.replaceState(null,'',location.pathname);
  }else if(recovery){msg(user?'Choose a new password below to finish resetting your account.':'Open the newest password-reset email to continue. If that link has expired, request a new one below.',user?'info':'warning');}
  else if(query.get('confirmed'))msg(user?'Email confirmed. Your account is ready.':'Email confirmed. Sign in to continue.','success');
  if(user&&!recovery)await loadCommunicationPreferences(user);
  const onboard=$('#onboarding-form');
  if(onboard&&user&&!onboard.dataset.loaded){const rows=await B.list('profiles',{eq:{id:user.id},limit:1});const p=rows[0];if(p){onboard.elements.name.value=p.display_name||'';onboard.elements.company.value=p.company_name||'';onboard.elements.role.value=['driver','carrier','pilot_car','business'].includes(p.role)?p.role:'driver';}onboard.dataset.loaded='1';}
 }catch(err){msg(errorMessage(err),'error')}finally{refreshing=false}
}
async function submit(form,label,action){const button=form.querySelector('button[type="submit"],button:not([type])');if(button?.disabled)return;const old=button?.textContent;if(button){button.disabled=true;button.textContent=label}try{await action(new FormData(form))}catch(err){msg(errorMessage(err),'error')}finally{if(button){button.disabled=false;button.textContent=old}}}
$('#signup-form')?.addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'Creating account…',async f=>{msg('Creating your account…');const {data,error}=await B.signUp(f.get('email'),f.get('password'),{display_name:String(f.get('name')).trim(),role:f.get('role')});if(error)throw error;if(data.session){msg('Account created.','success');location.href=query.has('return')?destination():'/onboarding'}else{msg('Check your email for a confirmation link. If you already have an account, sign in or reset your password.','success');e.target.reset()}})});
$('#login-form')?.addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'Signing in…',async f=>{const {error}=await B.signIn(f.get('email'),f.get('password'));if(error)throw error;msg('Signed in.','success');location.href=destination()})});
$('#reset-form')?.addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'Sending reset email…',async f=>{await B.reset(f.get('email'));msg('If an account exists for that email, a reset link is on its way. Open the newest email and choose a new password on this page.','success')})});
$('#resend-form')?.addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'Sending confirmation…',async f=>{await B.resendConfirmation(f.get('email'));msg('If the account needs confirmation, a fresh email is on its way. Use only the newest link.','success')})});
$('#password-form')?.addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;submit(form,'Saving password…',async f=>{
 if(f.get('password')!==f.get('confirm_password'))throw new Error('The passwords do not match. Enter the same new password twice.');
 if(!(await B.user()))throw new Error('Your reset session has expired. Request a new reset email.');
 await B.updatePassword(f.get('password'));form.reset();B.authCallback.error=null;query.delete('flow');query.delete('confirmed');history.replaceState(null,'','/account');await refresh();msg('Your new password is saved. You can continue to Drivers Lounge.','success');
})});
$$('[data-signout]').forEach(b=>b.addEventListener('click',async()=>{try{await B.signOut();location.href='/account'}catch(err){msg(errorMessage(err),'error')}}));
window.addEventListener('dl-auth-change',()=>setTimeout(refresh,0));
$('#communication-form')?.addEventListener('submit',async e=>{e.preventDefault();const user=await DLBackend.user();if(!user)return msg('Sign in before saving preferences.','error');const f=new FormData(e.currentTarget),emailOffers=f.get('email_offers')==='on',smsOffers=f.get('sms_offers')==='on',phone=String(f.get('mobile_phone')||'').trim();if(smsOffers&&!phone)return msg('Add a mobile number before enabling text delivery.','error');try{await DLBackend.upsert('communication_preferences',{user_id:user.id,email_offers:emailOffers,sms_offers:smsOffers,mobile_phone:phone||null,updated_at:new Date().toISOString()},'user_id');msg('Saved-offer delivery preferences updated.','success')}catch(err){msg(err.message,'error')}});
$('#delete-account-form')?.addEventListener('submit',async e=>{e.preventDefault();const user=await DLBackend.user();if(!user)return msg('Sign in before requesting account deletion.','error');const f=new FormData(e.currentTarget);try{await DLBackend.upsert('account_deletion_requests',{user_id:user.id,email:user.email||null,reason:String(f.get('reason')||'').trim()||null,status:'requested'},'user_id');msg('Account deletion request received. You can continue using the app while the request is reviewed.','success');e.currentTarget.reset()}catch(err){msg(err.message,'error')}});
$('#onboarding-form')?.addEventListener('submit',async e=>{e.preventDefault();const user=await DLBackend.user();if(!user)return msg('Sign in before saving a profile.','error');const f=new FormData(e.currentTarget);const role=e.currentTarget.elements.role.value;const profile={id:user.id,display_name:f.get('name'),company_name:f.get('company')||null};try{await DLBackend.update('profiles',{display_name:profile.display_name,company_name:profile.company_name,onboarding_complete:true},{id:user.id});if(role==='driver'){const passports=await DLBackend.list('driver_passports',{eq:{profile_id:profile.id},limit:1});await DLBackend.upsert('driver_passports',{profile_id:profile.id,user_id:profile.id,cdl_class:f.get('cdl_class'),preferences:{...(passports[0]?.preferences||{}),availability:f.get('availability')}},'profile_id');}localStorage.setItem('dl-role',role);msg('Profile saved.','success');setTimeout(()=>location.href=role==='driver'?'/mission-control':'/portal',600)}catch(err){msg(err.message,'error')}});
refresh();
})();
