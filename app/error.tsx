'use client';

export default function ErrorPage({reset}:{reset:()=>void}){return <main className="form"><div className="kicker">TEMPORARY ISSUE</div><h1>We hit a roadblock.</h1><p className="muted">Your data is safe. Try the page again, or return to the dashboard.</p><button className="btn primary" onClick={()=>reset()}>Try Again</button></main>}
