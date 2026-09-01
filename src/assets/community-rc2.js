(function(){
const B=window.DLBackend;
const roomsEl=document.querySelector('#community-rooms'),roomForm=document.querySelector('#room-form'),postsEl=document.querySelector('#community-posts'),postForm=document.querySelector('#post-form'),roomTitle=document.querySelector('#selected-room-title');
let selectedRoom=null,currentUser=null;
const BLOCK_KEY='drivers-lounge-community-blocked-users-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const note=(m,bad=false)=>{const e=document.querySelector('#community-status');if(e){e.textContent=m;e.dataset.bad=bad?'1':'0';}};
const blockedUsers=()=>{try{return new Set(JSON.parse(localStorage.getItem(BLOCK_KEY)||'[]').map(String));}catch{return new Set();}};
const saveBlocked=set=>localStorage.setItem(BLOCK_KEY,JSON.stringify([...set]));
function renderBlockControls(){
  let controls=document.querySelector('#community-block-controls');
  if(!controls){controls=document.createElement('div');controls.id='community-block-controls';controls.className='community-block-controls';postsEl?.parentNode?.insertBefore(controls,postsEl);}
  const count=blockedUsers().size;
  controls.innerHTML=count?`<small>${count} hidden driver${count===1?'':'s'} on this device.</small> <button type="button" class="community-post-action" id="community-unblock-all">Show hidden drivers</button>`:'';
  const clear=document.querySelector('#community-unblock-all');
  if(clear)clear.onclick=()=>{localStorage.removeItem(BLOCK_KEY);note('Hidden-driver list cleared.');if(selectedRoom)openRoom(selectedRoom);};
}
async function requireUser(){const u=currentUser||await B?.user();if(!u)throw new Error('Sign in from Account to participate in Community.');currentUser=u;return u;}
async function loadRooms(){try{const rows=await B.list('community_rooms',{limit:100,order:'created_at'});roomsEl.innerHTML=rows.length?rows.map(r=>`<button class="community-room" data-room="${esc(r.id)}"><span>🚛</span><span><strong>${esc(r.name)}</strong><small>${esc(r.topic||'Driver discussion')}</small></span></button>`).join(''):'<p class="page-subtitle">No rooms yet. Start the first one.</p>';roomsEl.querySelectorAll('[data-room]').forEach(x=>x.onclick=()=>openRoom(rows.find(r=>String(r.id)===x.dataset.room));if(!selectedRoom&&rows[0])openRoom(rows[0]);}catch(e){note(e.message,true)}}
function postMarkup(p){
  const own=currentUser&&String(currentUser.id)===String(p.author_user_id);
  const actions=own
    ?`<button class="community-post-action" data-remove="${esc(p.id)}">Remove</button>`
    :`<button class="community-post-action" data-report="${esc(p.id)}">Report</button> <button class="community-post-action" data-block-user="${esc(p.author_user_id)}">Hide driver</button>`;
  return `<article class="community-post" data-post="${esc(p.id)}" data-author="${esc(p.author_user_id)}"><p>${esc(p.body)}</p><div class="community-post-meta"><small>${new Date(p.created_at).toLocaleString()}</small><span>${actions}</span></div></article>`;
}
async function openRoom(room){
  selectedRoom=room;roomTitle.textContent=room.name;postForm.hidden=false;
  try{
    currentUser=await B.user();
    const rows=await B.list('community_posts',{limit:100,eq:{room_id:room.id},order:'created_at'}),blocked=blockedUsers();
    const visible=rows.filter(p=>!blocked.has(String(p.author_user_id)));
    postsEl.innerHTML=visible.length?visible.map(postMarkup).join(''):'<p class="page-subtitle">No visible posts in this room yet.</p>';
    postsEl.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>reportPost(b.dataset.report));
    postsEl.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removePost(b.dataset.remove));
    postsEl.querySelectorAll('[data-block-user]').forEach(b=>b.onclick=()=>blockUser(b.dataset.blockUser));
    renderBlockControls();
  }catch(e){note(e.message,true)}
}
async function reportPost(postId){try{const u=await requireUser();const reason=prompt('Why are you reporting this post? Enter: spam, harassment, hate, threat, scam, unsafe, personal_information, or other.','spam');if(!reason)return;const allowed=['spam','harassment','hate','threat','scam','unsafe','personal_information','other'],clean=String(reason).trim().toLowerCase().replace(/\s+/g,'_');if(!allowed.includes(clean))throw new Error('Choose one of the listed report reasons.');const details=prompt('Optional: briefly tell our moderation team what happened.','')||'';await B.insert('community_reports',{reporter_user_id:u.id,post_id:postId,reason:clean,details:details.trim().slice(0,1000)});note('Report received. Thank you for helping protect the driver community.');}catch(e){note(e.message?.toLowerCase().includes('duplicate')?'You already reported this post.':e.message,true)}}
function blockUser(userId){
  if(!userId)return;
  if(currentUser&&String(currentUser.id)===String(userId)){note('You cannot hide your own posts with this control.',true);return;}
  const set=blockedUsers();set.add(String(userId));saveBlocked(set);note('Driver hidden on this device. Their Community posts will no longer appear here.');if(selectedRoom)openRoom(selectedRoom);
}
async function removePost(postId){try{const u=await requireUser();const {error}=await B.client.from('community_posts').update({status:'removed',updated_at:new Date().toISOString()}).eq('id',postId).eq('author_user_id',u.id);if(error)throw error;note('Your post was removed.');await openRoom(selectedRoom);}catch(e){note(e.message,true)}}
roomForm?.addEventListener('submit',async e=>{e.preventDefault();try{const u=await requireUser(),fd=new FormData(roomForm),name=String(fd.get('name')||'').trim(),topic=String(fd.get('topic')||'').trim();if(name.length<3)throw new Error('Room name must be at least 3 characters.');await B.insert('community_rooms',{creator_user_id:u.id,name:name.slice(0,80),topic:topic.slice(0,140),visibility:'public'});roomForm.reset();note('Room created.');await loadRooms();}catch(err){note(err.message,true)}});
postForm?.addEventListener('submit',async e=>{e.preventDefault();try{if(!selectedRoom)throw new Error('Choose a room first.');const u=await requireUser(),fd=new FormData(postForm),body=String(fd.get('body')||'').trim();if(body.length<2)throw new Error('Write a message first.');await B.insert('community_posts',{room_id:selectedRoom.id,author_user_id:u.id,body:body.slice(0,3000),status:'published'});postForm.reset();note('Posted.');await openRoom(selectedRoom);}catch(err){note(err.message,true)}});
(async()=>{if(!B)return;currentUser=await B.user().catch(()=>null);renderBlockControls();loadRooms()})();
})();
