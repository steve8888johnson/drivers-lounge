
document.addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(!t)return;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));t.classList.add('active');const group=t.dataset.tab;document.querySelectorAll('[data-group]').forEach(x=>x.hidden=group!=='all'&&x.dataset.group!==group)});
document.querySelectorAll('[data-report]').forEach(b=>b.addEventListener('click',()=>{b.textContent='Report saved ✓';b.classList.add('blue')}));
const routeBtn=document.querySelector('[data-route]');if(routeBtn)routeBtn.addEventListener('click',()=>{document.querySelector('#route-result').hidden=false;routeBtn.textContent='Route calculated ✓'});
