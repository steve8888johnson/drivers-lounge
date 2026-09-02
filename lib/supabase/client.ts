import { createBrowserClient } from '@supabase/ssr';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://opwaikfrnpvovnaslvfz.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_K9qvau8Mh7KzJS65oavNQw_zzcZBxP_';
export function createClient(){return createBrowserClient(url,key)}
