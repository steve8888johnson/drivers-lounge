import { createBrowserClient } from '@supabase/ssr';
const fallbackUrl='https://opwaikfrnpvovnaslvfz.supabase.co';
const fallbackKey='sb_publishable_K9qvau8Mh7KzJS65oavNQw_zzcZBxP_';
const rawUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||'';
const rawKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()||'';
const url=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(rawUrl)?rawUrl.replace(/\/$/,''):fallbackUrl;
const key=rawKey.startsWith('sb_publishable_')||rawKey.startsWith('eyJ')?rawKey:fallbackKey;
export function createClient(){return createBrowserClient(url,key)}
