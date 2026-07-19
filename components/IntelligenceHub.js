'use client';
import {useState} from 'react';
const places=[
 {type:'Shipper',name:'Midwest Distribution Center',city:'Joliet, IL',rating:4.1,wait:'1h 20m',facts:['Overnight parking','Restrooms','Tight docks']},
 {type:'Repair',name:'Interstate Diesel Service',city:'Gary, IN',rating:4.6,wait:'45 min',facts:['Mobile repair','24 hours','Warranty']},
 {type:'Broker',name:'National Freight Example',city:'Nationwide',rating:3.9,wait:'Pays 28 days',facts:['Detention reported','QuickPay','Reefer']},
 {type:'Parking',name:'Prairie Travel Plaza',city:'Morris, IL',rating:4.3,wait:'68% full',facts:['Predicted full 9:10 PM','Showers','Dog area']}
];
export default function IntelligenceHub(){const [filter,setFilter]=useState('All');const [query,setQuery]=useState('');const filtered=places.filter(p=>(filter==='All'||p.type===filter)&&(`${p.name} ${p.city}`.toLowerCase().includes(query.toLowerCase())));return <><div className="toolbar"><input className="searchbox" placeholder="Search shippers, brokers, shops or parking" value={query} onChange={e=>setQuery(e.target.value)}/><div className="choice-row">{['All','Shipper','Broker','Repair','Parking'].map(x=><button key={x} className={filter===x?'choice active':'choice'} onClick={()=>setFilter(x)}>{x}</button>)}</div></div><div className="cards">{filtered.map(p=><article className="card intelligence-card" key={p.name}><div className="card-head"><span className="badge">{p.type}</span><b className="rating">★ {p.rating}</b></div><h3>{p.name}</h3><p>{p.city}</p><strong>{p.wait}</strong><div className="tag-row">{p.facts.map(f=><span key={f}>{f}</span>)}</div><button className="secondary">View intelligence</button></article>)}</div></>}
