'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {parkingLocations,fuelLocations,weatherAlerts,roadEvents,truckStops,serviceLocations} from '../lib/road-data';

const tabs=['Overview','Parking','Fuel','Weather','Road Events','Truck Stops','Services'];
export default function RoadIntelligenceDashboard(){
 const [tab,setTab]=useState('Overview');
 const [query,setQuery]=useState('');
 const q=query.toLowerCase();
 const filtered=useMemo(()=>({
  parking:parkingLocations.filter(x=>(x.name+' '+x.city).toLowerCase().includes(q)),
  fuel:fuelLocations.filter(x=>(x.name+' '+x.city).toLowerCase().includes(q)),
  stops:truckStops.filter(x=>(x.name+' '+x.city).toLowerCase().includes(q)),
  services:serviceLocations.filter(x=>(x.name+' '+x.city+' '+x.kind).toLowerCase().includes(q))
 }),[q]);
 return <div className="road-intel">
  <div className="road-intel-toolbar"><div><h2>Live Road Intelligence</h2><p>One dashboard for parking, fuel, weather, restrictions, stops and service.</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search city, stop or service"/></div>
  <div className="intel-tabs">{tabs.map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
  {(tab==='Overview')&&<div className="intel-overview">
   <div className="intel-stat"><small>Parking ahead</small><strong>54 spaces</strong><span>Best confidence: 86%</span></div>
   <div className="intel-stat"><small>Best diesel</small><strong>$3.55</strong><span>Route-adjusted $3.61</span></div>
   <div className="intel-stat alert"><small>Weather</small><strong>High wind</strong><span>I-80 corridor</span></div>
   <div className="intel-stat"><small>Road events</small><strong>3 active</strong><span>30 min combined delay</span></div>
   <section className="intel-section"><div className="intel-heading"><h3>Parking forecast</h3><Link href="/parking">Open parking →</Link></div><div className="intel-card-grid">{parkingLocations.map(p=><ParkingCard key={p.id} p={p}/>)}</div></section>
   <section className="intel-section"><div className="intel-heading"><h3>Route alerts</h3><Link href="/weather">Weather details →</Link></div><div className="alert-list">{[...weatherAlerts.slice(0,2),...roadEvents.slice(0,2)].map(a=><article key={a.id}><b>{a.title}</b><span>{a.route}</span><p>{a.detail||`${a.type} · ${a.delay}`}</p></article>)}</div></section>
  </div>}
  {tab==='Parking'&&<div className="intel-card-grid">{filtered.parking.map(p=><ParkingCard key={p.id} p={p}/>)}</div>}
  {tab==='Fuel'&&<div className="intel-table">{filtered.fuel.map(f=><article key={f.id}><div><b>{f.name}</b><span>{f.city} · {f.detour} mi detour</span></div><strong>${f.diesel.toFixed(2)}</strong><span>Effective ${f.effective.toFixed(2)}</span><small>{f.updated}</small></article>)}</div>}
  {tab==='Weather'&&<div className="alert-list">{weatherAlerts.map(a=><article key={a.id} className="weather-card"><b>{a.severity}: {a.title}</b><span>{a.route}</span><p>{a.detail}</p><small>Expires in {a.expires}</small></article>)}</div>}
  {tab==='Road Events'&&<div className="alert-list">{roadEvents.map(a=><article key={a.id}><b>{a.type}: {a.title}</b><span>{a.route}</span><p>{a.delay} · {a.confidence}% confidence</p></article>)}</div>}
  {tab==='Truck Stops'&&<div className="intel-card-grid">{filtered.stops.map(s=><article className="intel-card" key={s.id}><div className="intel-card-top"><b>{s.name}</b><span>★ {s.rating}</span></div><p>{s.city} · {s.parking} spaces</p><div className="amenities">{[s.diesel&&'Diesel',s.def&&'DEF',s.cat&&'CAT Scale',s.showers&&'Showers',s.dogPark&&'Dog park',s.rv&&'RV'].filter(Boolean).map(x=><span key={x}>{x}</span>)}</div><small>{s.food.join(' · ')}</small></article>)}</div>}
  {tab==='Services'&&<div className="intel-card-grid">{filtered.services.map(s=><article className="intel-card" key={s.id}><div className="intel-card-top"><b>{s.name}</b><span>★ {s.rating}</span></div><p>{s.kind} · {s.city}</p><div className="amenities">{s.services.map(x=><span key={x}>{x}</span>)}</div><small>{s.open}</small></article>)}</div>}
 </div>
}
function ParkingCard({p}){return <article className="intel-card"><div className="intel-card-top"><b>{p.name}</b><span className={p.status==='Almost full'?'warn':''}>{p.status}</span></div><p>{p.city}</p><strong>{p.available} estimated spaces</strong><div className="parking-meter"><i style={{width:`${Math.min(100,p.available/p.spaces*100)}%`}}/></div><small>{p.confidence}% confidence · {p.updated}</small><div className="amenities">{p.amenities.map(x=><span key={x}>{x}</span>)}</div></article>}
