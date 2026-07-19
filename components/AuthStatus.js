'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getSupabaseBrowser,isSupabaseConfigured} from '../lib/supabase-browser';
export default function AuthStatus(){
 const [user,setUser]=useState(null);
 useEffect(()=>{const s=getSupabaseBrowser();if(!s)return; s.auth.getUser().then(({data})=>setUser(data.user||null)); const {data:l}=s.auth.onAuthStateChange((_e,session)=>setUser(session?.user||null)); return()=>l.subscription.unsubscribe();},[]);
 if(!isSupabaseConfigured()) return <Link className="button-link mini" href="/account">Connect account</Link>;
 return <Link className="button-link mini" href="/account">{user?'My Account':'Sign In'}</Link>;
}
