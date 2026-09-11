(function(){
const cfg=window.DRIVERS_LOUNGE_CONFIG||{};
const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
// Capture recovery intent before Supabase consumes and removes the URL fragment.
const callbackParams=new URLSearchParams(location.hash.slice(1));
const queryParams=new URLSearchParams(location.search);
const authCallback={recovery:callbackParams.get('type')==='recovery'||queryParams.get('flow')==='recovery',error:callbackParams.get('error_code')||queryParams.get('error_code')||callbackParams.get('error')||queryParams.get('error')||null};
const client=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
if(client)client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')authCallback.recovery=true;window.dispatchEvent(new CustomEvent('dl-auth-change',{detail:{event}}))});
function requireClient(){if(!client)throw new Error('Drivers Lounge backend is temporarily unavailable.');return client}
window.DLBackend={configured,client,authCallback,
 async session(){if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data.session||null},
 async user(){const s=await this.session();return s?.user||null},
 async signUp(email,password,metadata={}){return requireClient().auth.signUp({email:String(email).trim(),password,options:{data:metadata,emailRedirectTo:location.origin+'/account?confirmed=1'}})},
 async signIn(email,password){return requireClient().auth.signInWithPassword({email:String(email).trim(),password})},
 async signOut(){if(client){const {error}=await client.auth.signOut();if(error)throw error}},
 async reset(email){const {data,error}=await requireClient().auth.resetPasswordForEmail(String(email).trim(),{redirectTo:location.origin+'/account?flow=recovery'});if(error)throw error;return data},
 async updatePassword(password){const {data,error}=await requireClient().auth.updateUser({password});if(error)throw error;authCallback.recovery=false;return data},
 async resendConfirmation(email){const {data,error}=await requireClient().auth.resend({type:'signup',email:String(email).trim(),options:{emailRedirectTo:location.origin+'/account?confirmed=1'}});if(error)throw error;return data},
 async upsert(table,row,conflict){const q=requireClient().from(table).upsert(row,conflict?{onConflict:conflict}:undefined).select().single();const {data,error}=await q;if(error)throw error;return {data,local:false}},
 async insert(table,row){const {data,error}=await requireClient().from(table).insert(row).select().single();if(error)throw error;return {data,local:false}},
 async submit(table,row){const {error}=await requireClient().from(table).insert(row);if(error)throw error;return {local:false}},
 async update(table,values,eq={}){let q=requireClient().from(table).update(values);for(const [k,v] of Object.entries(eq))q=q.eq(k,v);const {data,error}=await q.select();if(error)throw error;return {data:data||[],local:false}},
 async list(table,opts={}){if(!client)return [];let q=client.from(table).select(opts.select||'*').limit(opts.limit||50);if(opts.eq)for(const [k,v] of Object.entries(opts.eq))q=q.eq(k,v);if(opts.order)q=q.order(opts.order,{ascending:opts.ascending===true});const {data,error}=await q;if(error)throw error;return data||[]}
};
})();
