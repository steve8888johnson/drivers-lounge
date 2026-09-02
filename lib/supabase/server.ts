import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet={name:string;value:string;options?:Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]};
const fallbackUrl='https://opwaikfrnpvovnaslvfz.supabase.co';
const fallbackKey='sb_publishable_K9qvau8Mh7KzJS65oavNQw_zzcZBxP_';
const rawUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'';
const rawKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()||'';
const url=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(rawUrl)?rawUrl.replace(/\/$/,''):fallbackUrl;
const key=rawKey.startsWith('sb_publishable_')||rawKey.startsWith('eyJ')?rawKey:fallbackKey;
export async function createClient(){const store=await cookies();return createServerClient(url,key,{cookies:{getAll(){return store.getAll()},setAll(items:CookieToSet[]){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}}})}
