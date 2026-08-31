(function(){
const cfg=window.DRIVERS_LOUNGE_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
const client=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
function requireClient(){if(!client)throw new Error('Drivers Lounge backend is temporarily unavailable.');return client}
window.DLBackend={configured,client,
 async session(){if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data.session||null},
 async user(){const s=await this.session();return s?.user||null},
 async signUp(email,password,metadata={}){return requireClient().auth.signUp({email,password,options:{data:metadata}})},
 async signIn(email,password){return requireClient().auth.signInWithPassword({email,password})},
 async signOut(){if(client)await client.auth.signOut()},
 async reset(email){return requireClient().auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account'})},
 async upsert(table,row,conflict){const q=requireClient().from(table).upsert(row,conflict?{onConflict:conflict}:undefined).select().single();const {data,error}=await q;if(error)throw error;return {data,local:false}},
 async insert(table,row){const {data,error}=await requireClient().from(table).insert(row).select().single();if(error)throw error;return {data,local:false}},
 async list(table,opts={}){if(!client)return [];let q=client.from(table).select(opts.select||'*').limit(opts.limit||50);if(opts.eq)for(const [k,v] of Object.entries(opts.eq))q=q.eq(k,v);if(opts.order)q=q.order(opts.order,{ascending:opts.ascending===true});const {data,error}=await q;if(error)throw error;return data||[]}
};
})();