'use client';
import {useEffect,useMemo,useState} from 'react';

export default function BetaModule({title,kicker,description,items=[],fields=[],storageKey,cta='Save'}){
 const [form,setForm]=useState(()=>Object.fromEntries(fields.map(f=>[f.name,''])));
 const [saved,setSaved]=useState([]);
 useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem(storageKey)||'[]'));}catch{}},[storageKey]);
 const submit=(e)=>{e.preventDefault();const row={...form,id:crypto.randomUUID(),createdAt:new Date().toISOString()};const next=[row,...saved];setSaved(next);localStorage.setItem(storageKey,JSON.stringify(next));setForm(Object.fromEntries(fields.map(f=>[f.name,''])))};
 const count=useMemo(()=>saved.length,[saved]);
 return <main><section className="page-hero"><p className="eyebrow">{kicker}</p><h1>{title}</h1><p className="lead">{description}</p></section>
 <section className="section compact"><div className="module-grid"><div className="stack">
 {items.map((x,i)=><article className="tool" key={i}><div className="icon">{x.icon||'✓'}</div><h3>{x.title}</h3><p>{x.text}</p>{x.tag&&<span className="badge">{x.tag}</span>}</article>)}
 </div>
 {fields.length>0&&<div className="panel"><div className="section-head"><div><p className="eyebrow">INTERACTIVE BETA</p><h2>Add a record</h2></div><span className="badge">{count} saved</span></div><form className="form-grid" onSubmit={submit}>{fields.map(f=><label key={f.name}>{f.label}{f.type==='textarea'?<textarea value={form[f.name]} onChange={e=>setForm({...form,[f.name]:e.target.value})} required={f.required}/>:f.type==='select'?<select value={form[f.name]} onChange={e=>setForm({...form,[f.name]:e.target.value})} required={f.required}><option value="">Choose</option>{f.options.map(o=><option key={o}>{o}</option>)}</select>:<input type={f.type||'text'} value={form[f.name]} onChange={e=>setForm({...form,[f.name]:e.target.value})} required={f.required}/>}</label>)}<button>{cta}</button></form>
 <div className="saved-list">{saved.slice(0,5).map(r=><article key={r.id}><b>{Object.values(r)[0]}</b><p>{Object.entries(r).filter(([k])=>!['id','createdAt'].includes(k)).slice(1).map(([,v])=>v).filter(Boolean).join(' · ')}</p></article>)}</div></div>}
 </div></section></main>
}
