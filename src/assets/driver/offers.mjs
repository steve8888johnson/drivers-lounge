export function publicHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function activeOffers(rows,{state='',category='',now=Date.now()}={}){
  if(!Number.isFinite(now))return [];
  return (Array.isArray(rows)?rows:[]).filter(a=>{
    if(a?.active!==true||a.review_status!=='approved'||!publicHttps(a.destination_url))return false;
    if(a.source_type!=='curated_public'&&!(a.source_type==='paid'&&['paid','comped'].includes(a.billing_status)))return false;
    for(const key of ['starts_at','ends_at','offer_expires_at'])if(a[key]&&!Number.isFinite(Date.parse(a[key])))return false;
    if(a.starts_at&&Date.parse(a.starts_at)>now||a.ends_at&&Date.parse(a.ends_at)<=now||a.offer_expires_at&&Date.parse(a.offer_expires_at)<=now)return false;
    if(a.target_states!=null&&(!Array.isArray(a.target_states)||a.target_states.some(s=>typeof s!=='string'||!/^[A-Z]{2}$/.test(s))))return false;
    const states=a.target_states||[];
    return (!state||!states.length||states.includes(state))&&(!category||(a.category||'Other')===category);
  });
}
export async function saveOffer(backend,offer,now=Date.now()){
  if(!activeOffers([offer],{now}).length)throw Error('This offer is no longer available. Refresh the list.');
  if(!backend?.configured)throw Error('Saved offers are unavailable. Try again when connected.');
  const user=await backend.user();if(!user)throw Error('Sign in to save this offer to your account.');
  await backend.upsert('saved_offers',{campaign_id:offer.id,user_id:user.id,delivery_preference:'in_app',requested_delivery:'in_app',delivery_status:'saved',delivered_to:null},'campaign_id,user_id');
  return user;
}
