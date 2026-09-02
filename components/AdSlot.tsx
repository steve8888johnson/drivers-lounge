'use client';
import {useEffect,useState} from 'react';

type Ad={id:string;headline:string;body:string;cta_text:string;cta_url:string;placement:string};
export default function AdSlot({placement='loadboard_inline'}:{placement?:string}){const[ad,setAd]=useState<Ad|null>(null);useEffect(()=>{fetch(`/api/ads?placement=${placement}`).then(r=>r.ok?r.json():null).then(d=>setAd(d?.ad||null)).catch(()=>{})},[placement]);if(!ad)return null;return <aside className="sponsor" data-ad-id={ad.id}><div className="sponsorTag">SPONSORED</div><strong>{ad.headline}</strong><p>{ad.body}</p><a className="btn primary" href={`/api/ads/click?id=${ad.id}`} target="_blank" rel="sponsored noopener">{ad.cta_text||'Learn More'}</a></aside>}
