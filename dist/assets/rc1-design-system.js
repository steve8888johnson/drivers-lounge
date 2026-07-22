
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const path=(location.pathname.replace(/\/$/,'')||'/');
const links=[
 ['/', 'Home'],['/mission-control','Mission Control'],['/navigation','Navigation'],
 ['/road-tools','Road Intel'],['/loads','Loads'],['/carriers','Carriers'],
 ['/community','Community'],['/pilot-cars','Pilot Cars'],['/marketplace','Marketplace'],
 ['/driver-hub','Driver Passport'],['/create','Create']
];
function header(){
 const h=document.createElement('header');h.className='dl-unified-header';
 h.innerHTML=`<a class="dl-unified-brand" href="/"><img src="/assets/drivers-lounge-logo.png" alt="Drivers Lounge"><span><strong>Drivers Lounge</strong><small>Built by drivers for drivers</small></span></a>
 <nav class="dl-unified-nav">${links.map(([u,n])=>`<a href="${u}" class="${path===u?'active':''}">${n}</a>`).join('')}</nav>
 <div class="dl-unified-actions"><a href="/launch">Launch</a><a href="/portal">Portal</a><button id="dl-report-button">+ Report</button><a class="primary" href="/account">Account</a></div>`;
 return h;
}
function footer(){
 const f=document.createElement('footer');f.className='dl-unified-footer';
 f.innerHTML=`<div><strong>Drivers Lounge</strong><span>Built by drivers for drivers · Release Candidate 1</span></div><nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="/feedback">Feedback</a><a href="/advertise">Advertise</a></nav>`;
 return f;
}
function modal(){
 const m=document.createElement('div');m.className='dl-report-modal';m.id='dl-global-report';m.hidden=true;
 m.innerHTML=`<div class="dl-report-card"><div class="dl-report-head"><div><small style="color:#72adff;font-weight:900">DRIVER REPORT</small><h2>What do drivers need to know?</h2></div><button id="dl-close-report">×</button></div><div class="dl-report-options"><button data-dl-report="Scale open">⚖️ Scale open</button><button data-dl-report="Scale closed">⚖️ Scale closed</button><button data-dl-report="Parking full">🅿️ Parking full</button><button data-dl-report="Crash">💥 Crash</button><button data-dl-report="Construction">🚧 Construction</button><button data-dl-report="High wind">🌬️ High wind</button><button data-dl-report="Road closure">⛔ Road closure</button><button data-dl-report="Truck restriction">⚠️ Truck restriction</button><button data-dl-report="Fuel outage">⛽ Fuel outage</button></div></div>`;
 return m;
}
function toast(msg){let e=$('.dl-global-toast');if(!e){e=document.createElement('div');e.className='dl-global-toast';document.body.appendChild(e)}e.textContent=msg;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2500)}
function install(){
 const existing=$$('body > header, .header, .platform-header, .v7-header, .mc-header, .nav-app-header');
 existing.forEach((e,i)=>{if(i===0)e.replaceWith(header());else e.remove()});
 if(!$('.dl-unified-header')) document.body.prepend(header());
 document.body.prepend(Object.assign(document.createElement('div'),{className:'dl-rc-banner'}));
 if(!$('.dl-demo-notice')){const n=document.createElement('div');n.className='dl-demo-notice';n.innerHTML='<strong>Public RC1:</strong> Live-data integrations are being connected. Demo and community-submitted records are labeled throughout the platform.';const h=$('.dl-unified-header');h?.insertAdjacentElement('afterend',n)}
 const existingFoot=$$('body > footer, .footer, .v7-footer');existingFoot.forEach(x=>x.remove());document.body.appendChild(footer());document.body.appendChild(modal());
 $('#dl-report-button')?.addEventListener('click',()=>$('#dl-global-report').hidden=false);$('#dl-close-report')?.addEventListener('click',()=>$('#dl-global-report').hidden=true);
 $$('[data-dl-report]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('dl-rc1-report',JSON.stringify({type:b.dataset.dlReport,time:Date.now()}));$('#dl-global-report').hidden=true;toast(`${b.dataset.dlReport} report saved`)}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
