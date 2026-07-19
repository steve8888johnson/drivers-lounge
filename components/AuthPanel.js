'use client';
import {useEffect,useState} from 'react';
import {ensureProfile,getSupabaseBrowser,isSupabaseConfigured} from '../lib/supabase-browser';
export default function AuthPanel(){
 const [user,setUser]=useState(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[mode,setMode]=useState('signin'),[message,setMessage]=useState('');
 useEffect(()=>{const s=getSupabaseBrowser();if(!s)return; s.auth.getUser().then(async({data})=>{setUser(data.user||null);if(data.user)await ensureProfile(data.user)});const {data:l}=s.auth.onAuthStateChange(async(_e,session)=>{setUser(session?.user||null);if(session?.user)await ensureProfile(session.user)});return()=>l.subscription.unsubscribe()},[]);
 async function submit(e){e.preventDefault();const s=getSupabaseBrowser();if(!s){setMessage('Add Supabase credentials to .env.local to enable accounts.');return}setMessage('Working…');
  const result=mode==='signup'?await s.auth.signUp({email,password,options:{data:{display_name:name}}}):await s.auth.signInWithPassword({email,password});
  if(result.error)setMessage(result.error.message);else setMessage(mode==='signup'?'Account created. Check your email if confirmation is enabled.':'Signed in.');
 }
 async function signOut(){const s=getSupabaseBrowser();await s?.auth.signOut();setMessage('Signed out.');}
 if(!isSupabaseConfigured()) return <div className="card"><h2>Supabase setup required</h2><p>The app remains usable in local beta mode. Add the project URL and anonymous key to <code>.env.local</code> to activate secure accounts and cross-device sync.</p></div>;
 if(user)return <div className="card"><p className="eyebrow">SIGNED IN</p><h2>{user.user_metadata?.display_name||user.email}</h2><p>Your Driver Passport and My Truck records can now sync across devices.</p><button onClick={signOut}>Sign out</button>{message&&<p>{message}</p>}</div>;
 return <div className="card"><div className="choice-row"><button className={mode==='signin'?'choice active':'choice'} onClick={()=>setMode('signin')}>Sign in</button><button className={mode==='signup'?'choice active':'choice'} onClick={()=>setMode('signup')}>Create account</button></div><form onSubmit={submit} className="auth-form">{mode==='signup'&&<label>Display name<input required value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button type="submit">{mode==='signup'?'Create free account':'Sign in'}</button></form>{message&&<p>{message}</p>}</div>
}
