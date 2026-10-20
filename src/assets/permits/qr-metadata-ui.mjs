import{classifyPermitQrSupplement}from'./qr-metadata.mjs';

const hasDocument=typeof document!=='undefined';
const $=selector=>hasDocument?document.querySelector(selector):null;
const processedCards=new WeakSet();

function dispatch(element,type='input'){element?.dispatchEvent(new Event(type,{bubbles:true}));}
function setStatus(message,error=false){const status=$('#status');if(status){status.textContent=message;status.dataset.error=String(error);}}
function safePreview(supplement){
 if(supplement.kind==='permit-metadata')return['QR metadata retained privately.',...(supplement.safeSummary||[]),'Route and restrictions not supplied by this QR.'].join('\n');
 return`Official ${supplement.state||''} permit lookup retained privately.\nPermit ${supplement.permitNumber||'reference'}\nAuthorized sign-in and the complete original permit are required.`;
}
function redactRawPreview(card,supplement){
 const pre=card?.querySelector('.qr-data');if(!pre)return;pre.textContent=safePreview(supplement);pre.setAttribute('aria-label','Sensitive QR contents hidden from this on-screen preview');pre.dataset.redacted='true';
}
function addSummary(card,supplement,conflicts=[]){
 if(!card||card.querySelector('.qr-supplement'))return;
 const block=document.createElement('div');block.className=`qr-supplement ${supplement.kind}`;
 const heading=document.createElement('strong');heading.textContent=supplement.kind==='permit-metadata'?'QR metadata — route still required':'Official lookup requires authorized access';
 const message=document.createElement('p');message.textContent=supplement.message;block.append(heading,message);
 if(supplement.safeSummary?.length){const list=document.createElement('ul');for(const item of supplement.safeSummary){const li=document.createElement('li');li.textContent=item;list.append(li);}block.append(list);}
 if(conflicts.length){const warning=document.createElement('p');warning.className='qr-supplement-warning';warning.textContent=`Not overwritten: ${conflicts.join('; ')}`;block.append(warning);}
 card.querySelector('.qr-data')?.insertAdjacentElement('beforebegin',block);
 if(supplement.kind==='official-authenticated')card.querySelectorAll('button').forEach(button=>button.remove());
 redactRawPreview(card,supplement);
}
function applyField(form,name,value,conflicts){
 if(!value||!form?.elements?.[name])return false;const element=form.elements[name],current=String(element.value||'').trim(),incoming=String(value).trim();
 if(current&&current!==incoming){conflicts.push(`${name} already contains ${current}`);return false;}
 if(current===incoming)return false;element.value=incoming;dispatch(element,'input');dispatch(element,'change');return true;
}
function applyPermitMetadata(supplement,card){
 const form=$('#permit-form');if(!form)return;
 const permit=supplement.permit,conflicts=[];let changed=false;
 for(const key of['state','number','validFrom','validTo','timeZone','kind'])changed=applyField(form,key,permit?.[key],conflicts)||changed;
 if(form.elements.complete){form.elements.complete.checked=false;dispatch(form.elements.complete,'change');}
 addSummary(card,supplement,conflicts);
 const confidence=$('#confidence');if(confidence)confidence.textContent='QR metadata is a draft only. The complete original permit must supply and confirm the route, restrictions, border handoffs, dimensions, axle data and any escort or travel-window requirements.';
 setStatus(changed?'QR identity and dates added as an unconfirmed draft. Review the original PDF, then save and confirm the permit.':'QR metadata reviewed. Existing permit fields were not silently overwritten.',false);
}
function applyAuthenticatedReference(supplement,card){
 const form=$('#permit-form'),conflicts=[];let changed=false;
 if(form){changed=applyField(form,'state',supplement.state,conflicts)||changed;changed=applyField(form,'number',supplement.permitNumber,conflicts)||changed;}
 addSummary(card,supplement,conflicts);
 setStatus(changed?'Utah permit reference retained. State and permit number were added as an unconfirmed draft; import the original PDF for the route.':supplement.message,false);
}
function processCard(card){
 if(!card||processedCards.has(card))return false;const pre=card.querySelector('.qr-data');if(!pre||pre.dataset.redacted==='true')return false;
 const raw=String(pre.textContent||'').trim(),supplement=classifyPermitQrSupplement(raw);if(!supplement)return false;
 processedCards.add(card);
 if(supplement.kind==='permit-metadata')applyPermitMetadata(supplement,card);
 else if(supplement.kind==='official-authenticated')applyAuthenticatedReference(supplement,card);
 return true;
}
function scanResults(){if(hasDocument)for(const card of document.querySelectorAll('#qr-results .info'))processCard(card);}
function installStyles(){
 if(!hasDocument||$('#qr-metadata-styles'))return;const style=document.createElement('style');style.id='qr-metadata-styles';style.textContent=`.qr-supplement{margin:10px 0;padding:10px 12px;border:1px solid #bdcad9;border-radius:10px;background:#eef5ff;color:#17324e}.qr-supplement strong{display:block}.qr-supplement p{margin:5px 0;font-size:12px;line-height:1.45}.qr-supplement ul{margin:7px 0 0;padding-left:19px;font-size:12px}.qr-supplement.official-authenticated{border-color:#c78b32;background:#fff3dc;color:#5f3b00}.qr-supplement-warning{color:#8b1f2d!important;font-weight:800}.qr-data[data-redacted="true"]{border-color:#9fb1c4;background:#f6f8fb;color:#44586c;white-space:pre-wrap}`;document.head.append(style);
}
function mount(){
 installStyles();const results=$('#qr-results'),button=$('#decode-qr');if(!results||!button)return;
 button.addEventListener('click',()=>{setTimeout(scanResults,0);setTimeout(scanResults,60);},true);
 new MutationObserver(()=>queueMicrotask(scanResults)).observe(results,{childList:true,subtree:true});scanResults();
}
if(hasDocument){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
