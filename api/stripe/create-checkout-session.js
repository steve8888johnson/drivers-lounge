function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
function env(){return{stripeKey:process.env.STRIPE_SECRET_KEY||'',supabaseUrl:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'',anonKey:process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''}}
async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>64*1024)throw new Error('Request too large');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
async function supabaseFetch(url,path,{token,anonKey,method='GET',body:payload}={}){const r=await fetch(`${url.replace(/\/$/,'')}${path}`,{method,headers:{apikey:anonKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});const text=await r.text();if(!r.ok)throw new Error(`Supabase request failed (${r.status})${text?`: ${text.slice(0,240)}`:''}`);return text?JSON.parse(text):null}
async function stripeRequest(key,params){const form=new URLSearchParams();for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)form.append(k,String(v));const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error?.message||`Stripe checkout creation failed (${r.status})`);return data}
module.exports=async function handler(req,res){
 const {stripeKey,supabaseUrl,anonKey}=env();
 if(req.method==='GET')return send(res,200,{ok:true,service:'drivers-lounge-stripe-checkout',mode:process.env.VERCEL_ENV||'unknown',stripeSecretConfigured:Boolean(stripeKey),supabaseAuthConfigured:Boolean(supabaseUrl&&anonKey)});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{ok:false,error:'Method not allowed'})}
 if(!stripeKey)return send(res,503,{ok:false,error:'Stripe secret key is not configured'});
 if(!supabaseUrl||!anonKey)return send(res,503,{ok:false,error:'Supabase authentication environment is not configured'});
 const auth=String(req.headers.authorization||'');const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return send(res,401,{ok:false,error:'Sign in before starting checkout'});
 let input;try{input=await body(req)}catch(e){return send(res,400,{ok:false,error:e.message})}
 const campaignId=String(input.campaign_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(campaignId))return send(res,400,{ok:false,error:'A valid campaign ID is required'});
 try{
  const user=await supabaseFetch(supabaseUrl,'/auth/v1/user',{token,anonKey});if(!user?.id)return send(res,401,{ok:false,error:'Your session is no longer valid'});
  const campaigns=await supabaseFetch(supabaseUrl,`/rest/v1/ad_campaigns?id=eq.${encodeURIComponent(campaignId)}&submitted_by=eq.${encodeURIComponent(user.id)}&select=id,title,placement,budget_cents,billing_status`,{token,anonKey});
  const campaign=Array.isArray(campaigns)?campaigns[0]:null;if(!campaign)return send(res,404,{ok:false,error:'Campaign not found'});
  if(campaign.billing_status==='paid')return send(res,409,{ok:false,error:'This campaign is already paid'});
  const placement=campaign.placement||'driver_card';
  const rates=await supabaseFetch(supabaseUrl,`/rest/v1/ad_rate_cards?placement=eq.${encodeURIComponent(placement)}&active=eq.true&select=id,name,billing_model,unit_price_cents,minimum_spend_cents&limit=1`,{token,anonKey});
  const rate=Array.isArray(rates)?rates[0]:null;if(!rate)return send(res,409,{ok:false,error:'No active rate card is available for this campaign placement'});
  const floor=Math.max(Number(rate.minimum_spend_cents)||0,rate.billing_model==='flat'?Number(rate.unit_price_cents)||0:0);
  const requested=Number(campaign.budget_cents)||0;const amount=Math.max(floor,requested);if(!Number.isInteger(amount)||amount<50)return send(res,409,{ok:false,error:'Campaign amount is not configured'});
  const origin=`https://${req.headers['x-forwarded-host']||req.headers.host}`;
  const session=await stripeRequest(stripeKey,{
   mode:'payment',
   success_url:`${origin}/advertiser-dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
   cancel_url:`${origin}/advertiser-dashboard?checkout=cancelled`,
   'line_items[0][quantity]':1,
   'line_items[0][price_data][currency]':'usd',
   'line_items[0][price_data][unit_amount]':amount,
   'line_items[0][price_data][product_data][name]':`Drivers Lounge — ${rate.name}`,
   'line_items[0][price_data][product_data][description]':String(campaign.title||'Advertising campaign').slice(0,500),
   'metadata[campaign_id]':campaign.id,
   'metadata[submitted_by]':user.id,
   'payment_intent_data[metadata][campaign_id]':campaign.id,
   'payment_intent_data[metadata][submitted_by]':user.id
  });
  return send(res,200,{ok:true,url:session.url,session_id:session.id,amount_cents:amount,campaign_id:campaign.id});
 }catch(e){console.error('Stripe checkout creation failed',{message:e.message,campaignId});return send(res,500,{ok:false,error:e.message||'Could not start checkout'})}
};
