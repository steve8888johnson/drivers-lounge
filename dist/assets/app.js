
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab]');
  if(t){
    $$('[data-tab]').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const group=t.dataset.tab;
    $$('[data-group]').forEach(x=>x.hidden=group!=='all'&&x.dataset.group!==group);
    updateResultCount();
  }
});

$$('[data-report]').forEach(b=>b.addEventListener('click',()=>{
  const original=b.textContent;
  b.textContent='Saved ✓';
  b.classList.add('blue');
  b.disabled=true;
  const key='dl-report-'+location.pathname+'-'+original;
  localStorage.setItem(key,new Date().toISOString());
}));

const routeBtn=$('[data-route]');
if(routeBtn)routeBtn.addEventListener('click',()=>{
  const result=$('#route-result');
  if(result) result.hidden=false;
  routeBtn.textContent='Route calculated ✓';
  localStorage.setItem('dl-last-route',new Date().toISOString());
});

const search=$('#road-search');
function updateResultCount(){
  const visible=$$('[data-group]').filter(x=>!x.hidden && x.style.display!=='none').length;
  const out=$('#result-count');
  if(out) out.textContent=`${visible} result${visible===1?'':'s'}`;
}
if(search){
  search.addEventListener('input',()=>{
    const q=search.value.trim().toLowerCase();
    $$('[data-group]').forEach(row=>{
      row.style.display=!q||row.textContent.toLowerCase().includes(q)?'':'none';
    });
    updateResultCount();
  });
  updateResultCount();
}

$$('[data-live-time]').forEach(el=>{
  const d=new Date();
  el.textContent=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
});

$$('[data-counter]').forEach(el=>{
  const end=Number(el.dataset.counter||0);
  let value=Math.max(0,Math.floor(end*.92));
  const step=Math.max(1,Math.ceil((end-value)/18));
  const timer=setInterval(()=>{
    value=Math.min(end,value+step);
    el.textContent=value.toLocaleString();
    if(value>=end) clearInterval(timer);
  },35);
});

// Installable PWA support
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));
}

// Preserve small user preferences locally.
$$('select,input[type="checkbox"]').forEach((el,i)=>{
  const key=`dl-pref-${location.pathname}-${el.name||el.id||i}`;
  if(localStorage.getItem(key)!==null){
    if(el.type==='checkbox') el.checked=localStorage.getItem(key)==='true';
    else el.value=localStorage.getItem(key);
  }
  el.addEventListener('change',()=>localStorage.setItem(key,el.type==='checkbox'?String(el.checked):el.value));
});
