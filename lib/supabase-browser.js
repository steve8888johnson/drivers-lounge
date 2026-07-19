import { createBrowserClient } from '@supabase/ssr';

let client;
export function isSupabaseConfigured(){
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT'));
}
export function getSupabaseBrowser(){
  if(!isSupabaseConfigured()) return null;
  if(!client) client=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
export async function ensureProfile(user){
  const supabase=getSupabaseBrowser(); if(!supabase||!user) return null;
  const {data:existing}=await supabase.from('profiles').select('*').eq('auth_user_id',user.id).maybeSingle();
  if(existing) return existing;
  const display=(user.user_metadata?.display_name||user.email?.split('@')[0]||'Driver').slice(0,80);
  const {data,error}=await supabase.from('profiles').insert({auth_user_id:user.id,display_name:display,role:'driver'}).select().single();
  if(error) throw error; return data;
}
