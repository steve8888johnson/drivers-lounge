'use client';

import { useEffect, useMemo, useState } from 'react';

const defaultProfile = {
  name: '53 ft Dry Van', type: 'Tractor-trailer', height: "13' 6\"", width: "8' 6\"",
  length: "72'", weight: '80,000 lb', axles: '5', hazmat: 'None'
};

const routeTemplates = [
  { id:'safe', name:'Safest truck route', miles:824, time:'12 hr 48 min', tolls:'$46', confidence:98, scales:5, parking:18, notes:'Interstate-heavy route with fewer local restrictions.' },
  { id:'fast', name:'Fastest legal route', miles:806, time:'12 hr 21 min', tolls:'$71', confidence:95, scales:7, parking:14, notes:'Faster corridor with more urban traffic and toll exposure.' },
  { id:'preferred', name:'Driver-preferred route', miles:835, time:'13 hr 02 min', tolls:'$28', confidence:92, scales:4, parking:22, notes:'Avoids downtown segments and favors commonly used truck corridors.' }
];

const reports = [
  { type:'Scale open', icon:'⚖️', location:'I-44 EB · 37 mi', age:'8 min', confidence:91 },
  { type:'Crash', icon:'💥', location:'I-55 NB · 62 mi', age:'12 min', confidence:87 },
  { type:'Parking filling', icon:'🅿️', location:'Pilot · 91 mi', age:'19 min', confidence:79 },
  { type:'High wind', icon:'🌬️', location:'Bridge segment · 118 mi', age:'24 min', confidence:84 }
];

export default function NavigationPlanner(){
  const [profile,setProfile] = useState(defaultProfile);
  const [origin,setOrigin] = useState('Current location');
  const [destination,setDestination] = useState('');
  const [hazmat,setHazmat] = useState(false);
  const [oversize,setOversize] = useState(false);
  const [permit,setPermit] = useState('');
  const [selected,setSelected] = useState('safe');
  const [planned,setPlanned] = useState(false);
  const [notice,setNotice] = useState('');
  const [saved,setSaved] = useState([]);
  const [layers,setLayers] = useState({scales:true,parking:true,stops:true,hazards:true});

  useEffect(()=>{
    try { setSaved(JSON.parse(localStorage.getItem('dl_saved_trips')||'[]')); } catch {}
  },[]);

  const activeRoute = useMemo(()=>routeTemplates.find(r=>r.id===selected),[selected]);

  function planRoute(e){
    e.preventDefault();
    if(!destination.trim()){ setNotice('Enter a destination before planning.'); return; }
    setPlanned(true);
    setNotice(oversize ? 'Permit mode active. Route must match the official permit before dispatch.' : 'Three truck-aware route options prepared for review.');
  }

  function saveTrip(){
    if(!planned) return setNotice('Plan a route before saving it.');
    const trip={id:Date.now(),origin,destination,route:activeRoute.name,profile:profile.name,hazmat,oversize};
    const next=[trip,...saved].slice(0,8); setSaved(next); localStorage.setItem('dl_saved_trips',JSON.stringify(next));
    setNotice('Trip saved on this device. Account sync is the next integration step.');
  }

  function quickReport(label){ setNotice(`${label} report staged. Live GPS verification and community publishing will be connected next.`); }

  return <main className="nav-app">
    <section className="nav-control">
      <div className="nav-title-row"><div><p className="eyebrow">NAVIGATION BETA</p><h1>Truck route planner</h1></div><span className="route-confidence">Route confidence {planned?activeRoute.confidence:'—'}%</span></div>
      <p className="muted">Garmin-style vehicle restrictions with Waze-style driver intelligence. Routes remain planning previews until a licensed truck-routing engine is connected.</p>

      <form onSubmit={planRoute} className="route-form">
        <label>Starting point<input value={origin} onChange={e=>setOrigin(e.target.value)} /></label>
        <label>Destination<input placeholder="Address, facility or city" value={destination} onChange={e=>setDestination(e.target.value)} /></label>
        <button type="submit">Plan truck route</button>
      </form>

      <div className="nav-section-head"><h2>Active truck profile</h2><button className="secondary mini" onClick={()=>setProfile({...profile,name:profile.name==='53 ft Dry Van'?'Hotshot 40 ft':'53 ft Dry Van',type:profile.type==='Tractor-trailer'?'Hotshot':'Tractor-trailer',weight:profile.weight==='80,000 lb'?'40,000 lb':'80,000 lb'})}>Switch profile</button></div>
      <div className="profile-strip">
        <strong>{profile.name}</strong><span>{profile.height} high</span><span>{profile.length} long</span><span>{profile.weight}</span><span>{profile.axles} axles</span>
      </div>

      <div className="mode-grid">
        <label className={`mode-card ${hazmat?'active':''}`}><input type="checkbox" checked={hazmat} onChange={e=>setHazmat(e.target.checked)}/><b>☣️ Hazmat mode</b><span>Apply tunnel, cargo-class and restricted-road rules.</span></label>
        <label className={`mode-card ${oversize?'active':''}`}><input type="checkbox" checked={oversize} onChange={e=>setOversize(e.target.checked)}/><b>📄 Oversize permit mode</b><span>Lock navigation to the approved permit route.</span></label>
      </div>
      {oversize && <label className="permit-field">Permit route / number<textarea value={permit} onChange={e=>setPermit(e.target.value)} placeholder="Permit number, approved highways, movement windows and escort notes" rows="3"/></label>}

      {planned && <div className="route-options">
        <div className="nav-section-head"><h2>Route choices</h2><small>Tap to compare</small></div>
        {routeTemplates.map(r=><button type="button" key={r.id} className={`route-option ${selected===r.id?'selected':''}`} onClick={()=>setSelected(r.id)}>
          <div><strong>{r.name}</strong><p>{r.notes}</p></div><div className="route-numbers"><b>{r.time}</b><span>{r.miles} mi · {r.tolls} tolls</span></div>
        </button>)}
      </div>}

      <div className="nav-actions"><button onClick={saveTrip}>Save trip</button><button className="secondary" onClick={()=>setNotice('Route editing mode ready for waypoint, road avoidance and preferred-corridor integration.')}>Edit route</button></div>
      {notice && <div className="nav-notice">{notice}</div>}

      <div className="quick-reports"><h2>Quick report</h2><div>{['Scale open','Scale closed','Crash','Construction','Parking full','High wind'].map(x=><button className="choice" key={x} onClick={()=>quickReport(x)}>{x}</button>)}</div></div>
    </section>

    <section className="nav-map-panel">
      <div className="map-toolbar">
        {Object.keys(layers).map(k=><button key={k} className={layers[k]?'active':''} onClick={()=>setLayers({...layers,[k]:!layers[k]})}>{k}</button>)}
      </div>
      <div className="real-map-placeholder">
        <div className="road road-a"></div><div className="road road-b"></div><div className="road road-c"></div>
        {planned && <><div className="route-line route-line-a"></div><div className="route-line route-line-b"></div><span className="map-origin">A</span><span className="map-destination">B</span></>}
        {layers.scales && <span className="map-marker marker-scale">⚖️</span>}
        {layers.parking && <span className="map-marker marker-parking">🅿️</span>}
        {layers.stops && <span className="map-marker marker-stop">⛽</span>}
        {layers.hazards && <span className="map-marker marker-hazard">⚠️</span>}
        <div className="map-message">{planned?`${activeRoute.name} preview`:'Enter a destination to preview routes'}</div>
      </div>

      {planned && <div className="trip-summary">
        <div><small>ETA</small><strong>{activeRoute.time}</strong></div><div><small>Distance</small><strong>{activeRoute.miles} mi</strong></div><div><small>Scales</small><strong>{activeRoute.scales}</strong></div><div><small>Parking</small><strong>{activeRoute.parking}</strong></div>
      </div>}

      <div className="live-feed"><div className="nav-section-head"><h2>Live road intelligence</h2><span className="live-dot">LIVE BETA</span></div>
        {reports.map((r,i)=><article key={i}><span className="feed-icon">{r.icon}</span><div><b>{r.type}</b><p>{r.location} · {r.age} ago</p></div><strong>{r.confidence}%</strong></article>)}
      </div>

      <div className="saved-trips"><h2>Saved trips</h2>{saved.length===0?<p className="muted">No trips saved on this device yet.</p>:saved.map(t=><article key={t.id}><b>{t.origin} → {t.destination}</b><span>{t.route} · {t.profile}</span></article>)}</div>
    </section>
  </main>
}
