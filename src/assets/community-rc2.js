(function(){
const B=window.DLBackend;
const roomsEl=document.querySelector('#community-rooms');
const roomForm=document.querySelector('#room-form');
const postsEl=document.querySelector('#community-posts');
const postForm=document.querySelector('#post-form');
const roomTitle=document.querySelector('#selected-room-title');
let selectedRoom=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const note=(m,bad=false)=>{const e=document.querySelector('#community-status');if(e){e.textContent=m;e.dataset.bad=bad?'1':'0';}};
async function requireUser(){const u=await B?.user();if(!u)throw new Error('Sign in from Account to post or create a room.');return u;}
async function loadRooms(){
 try{
  const rows=await B.list('community_rooms',{limit:100,order:'created_at'});
  roomsEl.innerHTML=rows.length?rows.map(r=>`<button class="community-room" data-room="${esc(r.id)}"><span>🚛</span><span><strong>${esc(r.name)}</strong><small>${esc(r.topic||'Driver discussion')}</small></span></button>`).join(''):'<p class="page-subtitle">No rooms yet. Start the first one.</p>';
  roomsEl.querySelectorAll('[data-room]').forEach(x=>x.onclick=()=>openRoom(rows.find(r=>String(r.id)===x.dataset.room)));
  if(!selectedRoom&&rows[0])openRoom(rows[0]);
 }catch(e){note(e.message,true)}
}
async function openRoom(room){
 selectedRoom=room;roomTitle.textContent=room.name;postForm.hidden=false;
 try{const rows=await B.list('community_posts',{limit:100,eq:{room_id:room.id},order:'created_at'});postsEl.innerHTML=rows.length?rows.map(p=>`<article class="community-post"><p>${esc(p.body)}</p><small>${new Date(p.created_at).toLocaleString()}</small></article>`).join(''):'<p class="page-subtitle">No posts yet. Start the conversation.</p>';}catch(e){note(e.message,true)}
}
roomForm?.addEventListener('submit',async e=>{e.preventDefault();try{const u=await requireUser();const fd=new FormData(roomForm);await B.insert('community_rooms',{creator_user_id:u.id,name:String(fd.get('name')||'').trim(),topic:String(fd.get('topic')||'').trim(),visibility:'public'});roomForm.reset();note('Room created.');await loadRooms();}catch(err){note(err.message,true)}});
postForm?.addEventListener('submit',async e=>{e.preventDefault();try{if(!selectedRoom)throw new Error('Choose a room first.');const u=await requireUser();const fd=new FormData(postForm);const body=String(fd.get('body')||'').trim();if(!body)throw new Error('Write a message first.');await B.insert('community_posts',{room_id:selectedRoom.id,author_user_id:u.id,body});postForm.reset();note('Posted.');await openRoom(selectedRoom);}catch(err){note(err.message,true)}});
if(B)loadRooms();
})();