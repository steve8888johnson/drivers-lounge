import{listTrips}from'./storage.mjs';
import{buildIssuedRouteReview}from'./route-review.mjs';

const $=selector=>document.querySelector(selector);
let panel=null,timer=null,renderToken=0;

function element(tag,className='',text=''){
 const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
}
function tripId(){return $('#trip-picker')?.value||'';}
function permitId(){return $('#permit-list .permit-item.selected')?.dataset.permit||'';}
function confidence(score){return Number.isFinite(score)&&score>0?`${Math.round(score*100)}% extraction confidence`:'Unscored extraction';}
function mileage(line){
 const parts=[];if(Number.isFinite(line.distanceMiles))parts.push(`${line.distanceMiles<.1?'< 0.1':line.distanceMiles} mi`);if(Number.isFinite(line.cumulativeMiles))parts.push(`${line.cumulativeMiles} mi cumulative`);if(line.estimatedTime)parts.push(line.estimatedTime);return parts.join(' · ');
}
function installStyles(){
 if($('#issued-route-review-styles'))return;const style=document.createElement('style');style.id='issued-route-review-styles';style.textContent=`
 .issued-route-preview{margin:18px 0;padding:16px;border:1px solid #b8c9db;border-radius:14px;background:#f8fbff;color:#102443}.issued-route-preview[hidden]{display:none}.issued-route-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.issued-route-head .eyebrow{margin:0;color:#526b86;font-size:10px;font-weight:900;letter-spacing:.09em}.issued-route-head h3{margin:3px 0 0;font-size:20px}.issued-route-badge{flex:none;padding:5px 9px;border-radius:999px;background:#ffefd2;color:#704300;font-size:10px;font-weight:900;text-transform:uppercase}.issued-route-badge.ready{background:#dff5e8;color:#155d35}.issued-route-lock{margin:12px 0;padding:11px;border:1px solid #d95a67;border-radius:10px;background:#fff0f2;color:#7a1722;font-size:12px;font-weight:800;line-height:1.45}.issued-route-lock.ready{border-color:#56a876;background:#e9f8ef;color:#175e35}.issued-route-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}.issued-route-summary div{padding:9px;border:1px solid #d4dfeb;border-radius:10px;background:white}.issued-route-summary small{display:block;color:#667b90;font-size:9px;font-weight:900}.issued-route-summary strong{display:block;margin-top:3px;font-size:16px}.issued-route-lines{display:grid;gap:8px;padding:0;list-style:none;counter-reset:route-line}.issued-route-line{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;padding:11px;border:1px solid #d7e0ea;border-radius:10px;background:white;counter-increment:route-line}.issued-route-line::before{content:counter(route-line);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#173e66;color:#fff;font-size:11px;font-weight:900}.issued-route-line strong{display:block;font-size:12px}.issued-route-line p{margin:3px 0;color:#253c55;font-size:12px;line-height:1.4}.issued-route-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.issued-route-meta span{padding:3px 6px;border-radius:999px;background:#e7eef6;color:#445b72;font-size:9px;font-weight:800}.issued-route-meta .no-geometry{background:#ffead1;color:#714300}.issued-route-meta .geometry{background:#def4e7;color:#195e37}.issued-route-issues{padding-left:18px;color:#6d2630;font-size:12px;line-height:1.5}.issued-route-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.issued-route-actions button{min-height:40px}.issued-route-preview details{margin-top:12px}.issued-route-preview details pre{max-height:280px;overflow:auto;white-space:pre-wrap;padding:10px;border-radius:8px;background:#0f2235;color:#edf6ff;font-size:11px;line-height:1.45}
 @media(max-width:620px){.issued-route-head{display:grid}.issued-route-badge{justify-self:start}.issued-route-summary{grid-template-columns:1fr}.issued-route-line{grid-template-columns:1fr}.issued-route-line::before{width:24px;height:24px}.issued-route-actions{display:grid}.issued-route-actions button{width:100%}}
 `;document.head.append(style);
}
function createPanel(){
 if(panel)return panel;installStyles();panel=element('section','issued-route-preview');panel.id='issued-route-preview';panel.hidden=true;
 const geometry=$('#geometry-details');geometry?.insertAdjacentElement('beforebegin',panel);return panel;
}
function empty(node){while(node.firstChild)node.firstChild.remove();}
function renderLine(line){
 const item=element('li','issued-route-line'),copy=element('div'),road=element('strong','',line.road||'Road name requires confirmation'),instruction=element('p','',line.instruction),meta=element('div','issued-route-meta');
 meta.append(element('span','',line.sourceLine?`Permit source line ${line.sourceLine}`:'Source line missing'));
 if(line.sourceKind)meta.append(element('span','',line.sourceKind.replace(/-/g,' ')));
 const distance=mileage(line);if(distance)meta.append(element('span','',distance));
 meta.append(element('span',line.hasGeometry?'geometry':'no-geometry',line.hasGeometry?`${line.pointCount} reviewed geometry points`:'Text only · no GPS geometry'));
 if(line.lane)meta.append(element('span','',line.lane));copy.append(road,instruction,meta);item.append(copy);return item;
}
function focus(selector){const target=$(selector);if(!target)return;target.hidden=false;if(target.tagName==='DETAILS')target.open=true;target.scrollIntoView({behavior:'smooth',block:'start'});}
async function render(){
 const token=++renderToken,node=createPanel(),currentTrip=tripId(),currentPermit=permitId();if(!node||!currentTrip||!currentPermit){if(node)node.hidden=true;return;}
 const trips=await listTrips();if(token!==renderToken)return;const trip=trips.find(item=>item.id===currentTrip),permit=trip?.permits?.find(item=>item.id===currentPermit);if(!permit){node.hidden=true;return;}
 const review=buildIssuedRouteReview(permit);empty(node);node.hidden=false;
 const header=element('div','issued-route-head'),title=element('div'),eyebrow=element('p','eyebrow','ISSUED ROUTE EVIDENCE'),heading=element('h3','',`${review.state||'State'} ${review.number||'permit'} route lines`),badge=element('span',`issued-route-badge ${review.guidanceReady?'ready':''}`,review.guidanceReady?'Reviewed geometry':'Parked review only');title.append(eyebrow,heading);header.append(title,badge);node.append(header);
 const lock=element('div',`issued-route-lock ${review.guidanceReady?'ready':''}`,review.guidanceReady?'Every listed maneuver has reviewed geometry and the permit evidence is confirmed. Final departure checks still control.':'NOT READY FOR GUIDANCE · These are extracted permit instructions for parked review. Missing geometry, originals or confirmation keeps navigation locked.');node.append(lock);
 const summary=element('div','issued-route-summary');for(const[label,value]of[['Route lines',review.counts.total],['With geometry',review.counts.withGeometry],['Still text-only',review.counts.withoutGeometry]]){const box=element('div');box.append(element('small','',label.toUpperCase()),element('strong','',String(value)));summary.append(box);}node.append(summary);
 const routeInfo=element('p','muted',`${review.entry||'Origin needs confirmation'} → ${review.exit||'Destination needs confirmation'} · ${confidence(Math.max(review.evidence.routeConfidence,review.evidence.stepConfidence))}`);node.append(routeInfo);
 if(review.lines.length){const list=element('ol','issued-route-lines');review.lines.forEach(line=>list.append(renderLine(line)));node.append(list);}else node.append(element('p','issued-route-lock','No structured route lines were isolated. Review the exact route text and original pages manually.'));
 if(review.issues.length){const details=document.createElement('details'),summaryNode=document.createElement('summary'),issues=element('ul','issued-route-issues');summaryNode.textContent=`${review.issues.length} blocking review item${review.issues.length===1?'':'s'}`;review.issues.forEach(issue=>issues.append(element('li','',issue)));details.append(summaryNode,issues);details.open=true;node.append(details);}
 if(review.restrictions){const details=document.createElement('details'),summaryNode=document.createElement('summary'),pre=document.createElement('pre');summaryNode.textContent='Exact extracted restrictions and conditions';pre.textContent=review.restrictions;details.append(summaryNode,pre);node.append(details);}
 const actions=element('div','issued-route-actions'),originals=element('button','','Open original permit section'),geometry=element('button','','Open geometry review');originals.type='button';geometry.type='button';originals.addEventListener('click',()=>focus('.originals'));geometry.addEventListener('click',()=>focus('#geometry-details'));actions.append(originals,geometry);node.append(actions);
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>void render().catch(()=>{if(panel)panel.hidden=true;}),80);}
function mount(){
 const anchor=$('#geometry-details'),permitList=$('#permit-list'),picker=$('#trip-picker');if(!anchor||!permitList||!picker){setTimeout(mount,100);return;}
 createPanel();new MutationObserver(schedule).observe(permitList,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-permit']});
 picker.addEventListener('change',schedule);$('#save-trip')?.addEventListener('click',()=>setTimeout(schedule,150));$('#permit-form')?.addEventListener('submit',()=>setTimeout(schedule,150));document.addEventListener('click',event=>{if(event.target.closest?.('[data-permit]'))setTimeout(schedule,50);});schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
