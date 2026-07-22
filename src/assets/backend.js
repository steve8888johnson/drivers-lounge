(function(){
const cfg=window.DRIVERS_LOUNGE_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
const client=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
window.DLBackend={
 configured, client,
 async session(){if(!client)return null;const {data}=await client.auth.getSession();return data.session||null},
 async user(){const s=await this.session();return s?.user||null},
 async signUp(email,password,metadata={}){if(!client)throw new Error('Supabase is not configured');return client.auth.signUp({email,password,options:{data:metadata}})},
 async signIn(email,password){if(!client)throw new Error('Supabase is not configured');return client.auth.signInWithPassword({email,password})},
 async signOut(){if(client)await client.auth.signOut()},
 async reset(email){if(!client)throw new Error('Supabase is not configured');return client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account'})},
 async upsert(table,row,conflict){if(!client){const key='dl-local-'+table;const rows=JSON.parse(localStorage.getItem(key)||'[]');rows.unshift({...row,id:crypto.randomUUID?.()||String(Date.now()),created_at:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(rows.slice(0,200)));return {data:rows[0],local:true}}const q=client.from(table).upsert(row,conflict?{onConflict:conflict}:undefined).select().single();const {data,error}=await q;if(error)throw error;return {data,local:false}},
 async insert(table,row){if(!client)return this.upsert(table,row);const {data,error}=await client.from(table).insert(row).select().single();if(error)throw error;return {data,local:false}},
 async list(table,opts={}){if(!client)return JSON.parse(localStorage.getItem('dl-local-'+table)||'[]');let q=client.from(table).select(opts.select||'*').limit(opts.limit||50);if(opts.eq)for(const [k,v] of Object.entries(opts.eq))q=q.eq(k,v);if(opts.order)q=q.order(opts.order,{ascending:false});const {data,error}=await q;if(error)throw error;return data||[]}
};
})();