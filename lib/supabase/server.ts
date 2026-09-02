import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet={name:string;value:string;options?:Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://opwaikfrnpvovnaslvfz.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_K9qvau8Mh7KzJS65oavNQw_zzcZBxP_';

export async function createClient(){
  const store=await cookies();
  return createServerClient(url,key,{
    cookies:{
      getAll(){return store.getAll()},
      setAll(items:CookieToSet[]){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}
    }
  });
}
