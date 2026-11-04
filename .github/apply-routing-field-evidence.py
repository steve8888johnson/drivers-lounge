from pathlib import Path
import json


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Required patch marker missing in {path}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


write("src/assets/native-field-evidence.mjs", r'''const SCHEMA='dl-native-field-evidence/v1';
const DIAGNOSTICS_SCHEMA='dl-native-diagnostics/v1';
const DEFAULT_STORAGE_KEY='drivers-lounge-native-field-evidence-v1';
const ALLOWED_STATUS=new Set(['not-run','pass','fail','blocked']);

const clean=(value,limit=80)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
const iso=value=>{const date=new Date(value);return Number.isNaN(date.valueOf())?'':date.toISOString();};
const number=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.min(max,Math.max(min,Math.round(parsed))):0;};

export const nativeFieldChecks=Object.freeze([
 Object.freeze({id:'screen-lock',label:'Screen locked for two minutes',description:'Guidance and GPS continued visibly after unlocking.'}),
 Object.freeze({id:'app-switch',label:'Another app open for two minutes',description:'Returning to Drivers Lounge preserved the reviewed route and visible state.'}),
 Object.freeze({id:'speaker-voice',label:'Voice over phone speaker',description:'Maneuver and warning speech was audible and understandable.'}),
 Object.freeze({id:'bluetooth-voice',label:'Voice over Bluetooth',description:'Speech used the intended truck audio output without hiding warnings.'}),
 Object.freeze({id:'network-recovery',label:'Airplane mode and recovery',description:'Loss and restoration were visible; no silent route replacement occurred.'}),
 Object.freeze({id:'permission-denial',label:'Location permission denial',description:'The app showed a clear blocked state and did not claim navigation was active.'}),
 Object.freeze({id:'weak-gps-block',label:'Weak or stale GPS handling',description:'Route-deviation decisions paused instead of using an unreliable fix.'}),
 Object.freeze({id:'route-deviation',label:'Controlled route deviation',description:'Guidance froze and instructed the driver to pull over; no automatic detour was accepted.'}),
 Object.freeze({id:'system-indicator',label:'System location indicator',description:'Android persistent notification or iOS location indicator remained visible during background guidance.'}),
 Object.freeze({id:'stop-guidance',label:'Stop guidance cleanup',description:'Stop ended location tracking, speech and the system indicator.'})
]);
const FIELD_IDS=new Set(nativeFieldChecks.map(item=>item.id));

function sanitizeManual(input={}){
 const checks={};for(const item of nativeFieldChecks){const status=clean(input?.checks?.[item.id],20).toLowerCase();checks[item.id]=ALLOWED_STATUS.has(status)?status:'not-run';}
 return Object.freeze({schema:SCHEMA,checks:Object.freeze(checks),operatorConfirmed:input.operatorConfirmed===true,passengerObserved:input.passengerObserved===true,updatedAt:iso(input.updatedAt)});
}

function safeEvents(report){
 if(report?.schema!==DIAGNOSTICS_SCHEMA||!Array.isArray(report.events))return[];
 return report.events.map(event=>({at:iso(event?.at),type:clean(event?.type,60),details:event?.details&&typeof event.details==='object'?event.details:{}})).filter(event=>event.at&&event.type).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
}
function eventCount(events,type,predicate=()=>true){return events.filter(event=>event.type===type&&predicate(event.details||{},event)).length;}
function laterEvent(events,startIndex,type,predicate=()=>true){for(let index=startIndex+1;index<events.length;index++)if(events[index].type===type&&predicate(events[index].details||{},events[index]))return{event:events[index],index};return null;}

export function evaluateNativeFieldEvidence(report,manualInput={},clock=()=>Date.now()){
 const manual=sanitizeManual(manualInput),events=safeEvents(report),summary=report?.summary&&typeof report.summary==='object'?report.summary:{};
 const goodFixes=eventCount(events,'gps-fix',details=>['excellent','good'].includes(clean(details.accuracyBand,20).toLowerCase())&&number(details.ageMs,0,3600000)<=15000);
 const backgroundFixes=eventCount(events,'gps-fix',details=>details.background===true);
 let longestBackgroundMs=0;
 for(let index=0;index<events.length;index++){
  const event=events[index];if(event.type!=='app-state'||event.details?.active!==false||number(event.details?.watchCount,0,20)<1)continue;
  const resumed=laterEvent(events,index,'app-state',details=>details.active===true);const end=resumed?.event?.at||report?.exportedAt||new Date(clock()).toISOString();
  longestBackgroundMs=Math.max(longestBackgroundMs,Math.max(0,Date.parse(end)-Date.parse(event.at)));
 }
 let networkCycles=0;
 for(let index=0;index<events.length;index++)if(events[index].type==='network-state'&&events[index].details?.online===false&&laterEvent(events,index,'network-state',details=>details.online===true))networkCycles++;
 let cleanStops=0;
 for(let index=0;index<events.length;index++)if(events[index].type==='guidance-stop'&&laterEvent(events,index,'watch-count',details=>number(details.watchCount,0,20)===0))cleanStops++;
 const voiceSuccesses=eventCount(events,'voice-spoken'),voiceFailures=number(summary.voiceFailures,0,10000)||eventCount(events,'voice-unavailable');
 const deviationFreezes=eventCount(events,'guidance-deviation-frozen');
 const maxGapMs=number(summary.maxGpsGapMs,0,86400000);
 const maxWatchCount=number(summary.maxWatchCount,0,20);
 const platform=clean(report?.platform,20).toLowerCase(),revision=clean(report?.revision,40);
 const automatic=[
  {id:'native-build',label:'Installed native build identified',pass:['android','ios'].includes(platform)&&Boolean(revision)&&revision!=='unknown'&&Boolean(iso(report?.createdAt)),evidence:{platform:platform||'unknown',revision:revision||'unknown'}},
  {id:'good-gps',label:'Fresh, precise GPS observed',pass:goodFixes>0,evidence:{goodFixes}},
  {id:'background-continuity',label:'Background GPS continuity observed',pass:backgroundFixes>=2&&longestBackgroundMs>=110000&&maxGapMs<=75000,evidence:{backgroundFixes,longestBackgroundMs,maxGapMs}},
  {id:'network-cycle',label:'Offline and online transition observed',pass:networkCycles>0,evidence:{networkCycles}},
  {id:'voice-runtime',label:'Native voice completed without a recorded failure',pass:voiceSuccesses>0&&voiceFailures===0,evidence:{voiceSuccesses,voiceFailures}},
  {id:'deviation-freeze',label:'Route deviation freeze recorded',pass:deviationFreezes>0,evidence:{deviationFreezes}},
  {id:'watch-cleanup',label:'Guidance stop released the GPS watch',pass:cleanStops>0&&maxWatchCount===1,evidence:{cleanStops,maxWatchCount}}
 ].map(item=>Object.freeze({...item,evidence:Object.freeze(item.evidence)}));
 const manualResults=nativeFieldChecks.map(item=>Object.freeze({...item,status:manual.checks[item.id],pass:manual.checks[item.id]==='pass'}));
 const blockers=[];
 if(report?.schema!==DIAGNOSTICS_SCHEMA)blockers.push('native_diagnostics_missing');
 for(const item of automatic)if(!item.pass)blockers.push(`automatic_${item.id}`);
 for(const item of manualResults)if(!item.pass)blockers.push(`manual_${item.id}_${item.status}`);
 if(!manual.operatorConfirmed)blockers.push('operator_confirmation_missing');
 if(!manual.passengerObserved)blockers.push('passenger_observation_missing');
 const complete=blockers.length===0;
 return Object.freeze({
  schema:SCHEMA,exportedAt:new Date(clock()).toISOString(),platform:platform||'unknown',revision:revision||'unknown',diagnosticsCreatedAt:iso(report?.createdAt),
  privacy:'No coordinates, addresses, route geometry, permit contents, account identifiers, device identifiers or free-form notes are included.',
  deviceGate:complete?'complete':'blocked',complete,blockers:Object.freeze(blockers),
  diagnosticsSummary:Object.freeze({eventCount:number(summary.eventCount,0,100000),gpsFixes:number(summary.gpsFixes,0,100000),backgroundGpsFixes:number(summary.backgroundGpsFixes,0,100000),gpsErrors:number(summary.gpsErrors,0,100000),voiceFailures,offlineTransitions:number(summary.offlineTransitions,0,100000),maxGpsGapMs:maxGapMs,maxWatchCount}),
  automatic:Object.freeze(automatic),manual:Object.freeze(manualResults),confirmations:Object.freeze({operatorConfirmed:manual.operatorConfirmed,passengerObserved:manual.passengerObserved})
 });
}

export function createNativeFieldEvidenceStore({storage,storageKey=DEFAULT_STORAGE_KEY,clock=()=>Date.now(),onChange=()=>{}}={}){
 let deviceStorage=storage;if(deviceStorage===undefined){try{deviceStorage=globalThis.localStorage;}catch{deviceStorage=null;}}
 let state=sanitizeManual({});
 try{const parsed=JSON.parse(deviceStorage?.getItem?.(storageKey)||'null');if(parsed?.schema===SCHEMA)state=sanitizeManual(parsed);}catch{/* Invalid local state starts clean. */}
 const persist=()=>{try{deviceStorage?.setItem?.(storageKey,JSON.stringify(state));}catch{/* Field evidence never breaks diagnostics. */}};
 const changed=()=>{persist();try{onChange();}catch{/* Optional UI callback. */}};
 const update=next=>{state=sanitizeManual({...next,updatedAt:new Date(clock()).toISOString()});changed();return snapshot();};
 const snapshot=()=>sanitizeManual(state);
 function setCheck(id,status){const safeId=clean(id,40),safeStatus=clean(status,20).toLowerCase();if(!FIELD_IDS.has(safeId)||!ALLOWED_STATUS.has(safeStatus))return snapshot();return update({...state,checks:{...state.checks,[safeId]:safeStatus}});}
 function setConfirmation(name,value){if(!['operatorConfirmed','passengerObserved'].includes(name))return snapshot();return update({...state,[name]:value===true});}
 function clear(){state=sanitizeManual({updatedAt:new Date(clock()).toISOString()});changed();return snapshot();}
 persist();return Object.freeze({schema:SCHEMA,storageKey,snapshot,setCheck,setConfirmation,clear,packet:report=>evaluateNativeFieldEvidence(report,state,clock),exportText:report=>JSON.stringify(evaluateNativeFieldEvidence(report,state,clock),null,2)+'\n'});
}
''')

write("src/assets/native-field-evidence-ui.mjs", r'''import{createNativeFieldEvidenceStore,nativeFieldChecks}from'./native-field-evidence.mjs';
const $=selector=>document.querySelector(selector);
const store=createNativeFieldEvidenceStore({onChange:()=>render()});
const duration=value=>{const seconds=Math.round(Number(value||0)/1000);if(seconds<60)return`${seconds}s`;const minutes=Math.floor(seconds/60),rest=seconds%60;return`${minutes}m ${rest}s`;};
const status=(message,bad=false)=>{const node=$('#field-evidence-status');if(node){node.textContent=message;node.dataset.state=bad?'bad':'ok';}};
function option(value,label,current){const node=document.createElement('option');node.value=value;node.textContent=label;node.selected=value===current;return node;}
function renderManual(manual){const root=$('#field-manual-checks');if(!root)return;root.replaceChildren();for(const check of nativeFieldChecks){const row=document.createElement('article');row.className='field-check';const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=check.label;const detail=document.createElement('small');detail.textContent=check.description;copy.append(title,detail);const select=document.createElement('select');select.setAttribute('aria-label',check.label);select.dataset.fieldCheck=check.id;select.append(option('not-run','Not run',manual.checks[check.id]),option('pass','Pass',manual.checks[check.id]),option('fail','Fail',manual.checks[check.id]),option('blocked','Blocked',manual.checks[check.id]));select.addEventListener('change',()=>store.setCheck(check.id,select.value));row.append(copy,select);root.append(row);}}
function renderAutomatic(packet){const root=$('#field-auto-checks');if(!root)return;root.replaceChildren();for(const check of packet.automatic){const row=document.createElement('article');row.className=`field-auto ${check.pass?'pass':'blocked'}`;const icon=document.createElement('span');icon.textContent=check.pass?'PASS':'BLOCKED';const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=check.label;const detail=document.createElement('small');const evidence=check.evidence||{};detail.textContent=check.id==='background-continuity'?`${evidence.backgroundFixes||0} background fixes · ${duration(evidence.longestBackgroundMs)} observed · max gap ${duration(evidence.maxGapMs)}`:Object.entries(evidence).map(([key,value])=>`${key.replace(/([A-Z])/g,' $1').toLowerCase()}: ${value}`).join(' · ');copy.append(title,detail);row.append(icon,copy);root.append(row);}}
function render(){const api=window.DL_NATIVE_DIAGNOSTICS,manual=store.snapshot();renderManual(manual);const operator=$('#field-operator-confirmed'),passenger=$('#field-passenger-confirmed');if(operator)operator.checked=manual.operatorConfirmed;if(passenger)passenger.checked=manual.passengerObserved;if(!api){status('Open this page inside the installed test app to build a physical-device packet.',true);$('#field-gate')?.setAttribute('data-state','blocked');return;}const packet=store.packet(api.snapshot());renderAutomatic(packet);const gate=$('#field-gate');if(gate)gate.dataset.state=packet.complete?'complete':'blocked';const badge=$('#field-gate-badge');if(badge)badge.textContent=packet.complete?'DEVICE GATE COMPLETE':'DEVICE GATE BLOCKED';const summary=$('#field-gate-summary');if(summary)summary.textContent=packet.complete?'All automatic evidence, required observations and attestations are complete. Provider consensus and store release gates still remain separate.':`${packet.blockers.length} required item${packet.blockers.length===1?'':'s'} remain. This build must not be promoted as field-validated.`;status(`Device evidence · ${packet.platform} · build ${packet.revision}`);}
function packetText(){const api=window.DL_NATIVE_DIAGNOSTICS;if(!api)return'';return store.exportText(api.snapshot());}
async function copy(){const text=packetText();if(!text)return;try{await navigator.clipboard.writeText(text);status('Physical-device packet copied.');}catch{status('Copy was blocked. Use Download field packet instead.',true);}}
function download(){const text=packetText();if(!text)return;const blob=new Blob([text],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`drivers-lounge-device-field-evidence-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);status('Physical-device packet downloaded locally.');}
function clear(){if(!confirm('Clear the device field-test checklist and attestations? Raw native diagnostics will remain.'))return;store.clear();status('Field-test checklist cleared.');}
addEventListener('DOMContentLoaded',()=>{$('#field-operator-confirmed')?.addEventListener('change',event=>store.setConfirmation('operatorConfirmed',event.target.checked));$('#field-passenger-confirmed')?.addEventListener('change',event=>store.setConfirmation('passengerObserved',event.target.checked));$('#field-download')?.addEventListener('click',download);$('#field-copy')?.addEventListener('click',copy);$('#field-clear')?.addEventListener('click',clear);$('#diagnostics-refresh')?.addEventListener('click',render);addEventListener('dl-native-diagnostics-updated',render);render();},{once:true});
''')

write("scripts/test-native-field-evidence.mjs", r'''import test from'node:test';
import assert from'node:assert/strict';
import{createNativeFieldEvidenceStore,evaluateNativeFieldEvidence,nativeFieldChecks}from'../src/assets/native-field-evidence.mjs';

const at=milliseconds=>new Date(Date.UTC(2026,10,4,12,0,0)+milliseconds).toISOString();
function completeDiagnostics(){const events=[
 {at:at(0),type:'guidance-start',details:{code:'standard'}},{at:at(100),type:'watch-count',details:{watchCount:1}},{at:at(1000),type:'gps-fix',details:{background:false,accuracyBand:'good',ageMs:500,gapMs:0}},
 {at:at(5000),type:'voice-spoken',details:{}},{at:at(10000),type:'app-state',details:{active:false,watchCount:1}},{at:at(15000),type:'gps-fix',details:{background:true,accuracyBand:'good',ageMs:1000,gapMs:14000}},
 {at:at(75000),type:'gps-fix',details:{background:true,accuracyBand:'good',ageMs:1000,gapMs:60000}},{at:at(135000),type:'gps-fix',details:{background:true,accuracyBand:'good',ageMs:1000,gapMs:60000}},{at:at(140000),type:'app-state',details:{active:true,watchCount:1}},
 {at:at(145000),type:'network-state',details:{online:false}},{at:at(155000),type:'network-state',details:{online:true}},{at:at(160000),type:'guidance-deviation-frozen',details:{code:'standard'}},{at:at(165000),type:'guidance-stop',details:{code:'standard'}},{at:at(165100),type:'watch-count',details:{watchCount:0}}
 ];return{schema:'dl-native-diagnostics/v1',platform:'android',revision:'field-1',createdAt:at(0),exportedAt:at(170000),privacy:'fixture',summary:{eventCount:events.length,gpsFixes:4,backgroundGpsFixes:3,weakOrPoorFixes:0,gpsErrors:0,voiceFailures:0,offlineTransitions:1,maxGpsGapMs:60000,maxWatchCount:1},events,secret:'DO_NOT_EXPORT',coordinates:[32,-102]};}
function completeManual(){return{schema:'dl-native-field-evidence/v1',checks:Object.fromEntries(nativeFieldChecks.map(item=>[item.id,'pass'])),operatorConfirmed:true,passengerObserved:true,updatedAt:at(170000)};}

test('complete native evidence produces a device-only completed gate',()=>{const packet=evaluateNativeFieldEvidence(completeDiagnostics(),completeManual(),()=>Date.parse(at(180000)));assert.equal(packet.complete,true);assert.equal(packet.deviceGate,'complete');assert.deepEqual(packet.blockers,[]);assert.ok(packet.automatic.every(item=>item.pass));assert.ok(packet.manual.every(item=>item.pass));});
test('packet is privacy-minimized and ignores arbitrary diagnostics fields',()=>{const packet=evaluateNativeFieldEvidence(completeDiagnostics(),completeManual(),()=>Date.parse(at(180000))),text=JSON.stringify(packet);assert.equal(text.includes('DO_NOT_EXPORT'),false);assert.equal(Object.hasOwn(packet,'coordinates'),false);assert.equal(Object.values(packet).some(value=>Array.isArray(value)&&value.includes(32)),false);assert.match(packet.privacy,/No coordinates/i);});
test('missing automatic evidence and manual failures block the device gate',()=>{const diagnostics={...completeDiagnostics(),events:[],summary:{eventCount:0}};const manual=completeManual();manual.checks['bluetooth-voice']='fail';manual.passengerObserved=false;const packet=evaluateNativeFieldEvidence(diagnostics,manual);assert.equal(packet.complete,false);assert.ok(packet.blockers.includes('automatic_good-gps'));assert.ok(packet.blockers.includes('manual_bluetooth-voice_fail'));assert.ok(packet.blockers.includes('passenger_observation_missing'));});
test('background continuity requires duration, repeated fixes and bounded gaps',()=>{const report=completeDiagnostics();report.events=report.events.filter(event=>!(event.type==='gps-fix'&&event.details.background&&event.at!==at(15000)));report.summary={...report.summary,backgroundGpsFixes:1,maxGpsGapMs:120000};const packet=evaluateNativeFieldEvidence(report,completeManual());const check=packet.automatic.find(item=>item.id==='background-continuity');assert.equal(check.pass,false);assert.equal(check.evidence.backgroundFixes,1);});
test('web or unidentified builds can never complete the physical-device gate',()=>{const report={...completeDiagnostics(),platform:'web',revision:'unknown'};const packet=evaluateNativeFieldEvidence(report,completeManual());assert.equal(packet.complete,false);assert.ok(packet.blockers.includes('automatic_native-build'));});
test('diagnostics page and release build require the field-evidence modules',async()=>{const{readFile}=await import('node:fs/promises');const[html,ui,build,store,testing]=await Promise.all([readFile(new URL('../src/native-diagnostics.html',import.meta.url),'utf8'),readFile(new URL('../src/assets/native-field-evidence-ui.mjs',import.meta.url),'utf8'),readFile(new URL('../build.mjs',import.meta.url),'utf8'),readFile(new URL('../scripts/check-store-readiness.mjs',import.meta.url),'utf8'),readFile(new URL('../mobile/TESTING.md',import.meta.url),'utf8')]);for(const token of['field-gate','field-download','field-passenger-confirmed','/assets/native-field-evidence-ui.mjs'])assert.match(html,new RegExp(token));assert.match(ui,/createNativeFieldEvidenceStore/);assert.doesNotMatch(ui,/<textarea|contenteditable/i);for(const source of[build,store])for(const token of['native-field-evidence.mjs','native-field-evidence-ui.mjs'])assert.match(source,new RegExp(token.replace('.','\.')));assert.match(testing,/observed and operated by a passenger/i);assert.match(testing,/no coordinates, addresses, route geometry/i);});
test('local checklist store accepts only known IDs and fixed statuses',()=>{const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};const store=createNativeFieldEvidenceStore({storage,clock:()=>Date.parse(at(200000))});store.setCheck('screen-lock','pass');store.setCheck('unknown','pass');store.setCheck('app-switch','arbitrary');store.setConfirmation('operatorConfirmed',true);const snapshot=store.snapshot();assert.equal(snapshot.checks['screen-lock'],'pass');assert.equal(snapshot.checks['app-switch'],'not-run');assert.equal('unknown'in snapshot.checks,false);assert.equal(snapshot.operatorConfirmed,true);const reloaded=createNativeFieldEvidenceStore({storage});assert.equal(reloaded.snapshot().checks['screen-lock'],'pass');});
test('export packet never includes free-form state from corrupted storage',()=>{const storage={getItem:()=>JSON.stringify({schema:'dl-native-field-evidence/v1',checks:{'screen-lock':'pass',evil:'DO_NOT_EXPORT_VALUE'},notes:'DO_NOT_EXPORT_VALUE',operatorConfirmed:true,passengerObserved:true}),setItem:()=>{}};const store=createNativeFieldEvidenceStore({storage}),packet=JSON.parse(store.exportText(completeDiagnostics())),text=JSON.stringify(packet);assert.equal(text.includes('DO_NOT_EXPORT_VALUE'),false);assert.equal(Object.hasOwn(packet,'notes'),false);assert.equal(packet.manual.some(item=>item.id==='evil'),false);});
''')

write("mobile/test/native-field-evidence-runtime.test.mjs", r'''import{test}from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('native runtime exposes only allowlisted privacy-safe app diagnostic events',async()=>{
 const source=await read('../src/runtime.mjs');
 for(const token of['guidance-start','guidance-stop','guidance-deviation-frozen','guidance-paused','guidance-error','recordAppEvent'])assert.match(source,new RegExp(token));
 assert.doesNotMatch(source,/DL_NATIVE_DIAGNOSTICS=.*record:diagnostics\.record/);
 assert.match(source,/voice-spoken/);
});

test('standard and permitted guidance emit lifecycle evidence without coordinates',async()=>{
 const routing=await read('../../src/assets/routing/app.mjs'),permits=await read('../../src/assets/permits/app.mjs');
 for(const token of['guidance-start','guidance-stop','guidance-deviation-frozen','guidance-error'])assert.match(routing,new RegExp(token));
 for(const token of['guidance-start','guidance-stop','guidance-paused'])assert.match(permits,new RegExp(token));
 for(const source of[routing,permits])assert.doesNotMatch(source,/recordAppEvent\?\.\([^\n]*(?:latitude|longitude|geometry|address)/i);
 assert.match(routing,/guidance-stop[^;]+;if\(state\.watchId/);
 assert.match(permits,/guidance-stop[^;]+; if \(watching !== null\)/);
});
''')

replace_once("mobile/src/runtime.mjs", "let speechVersion=0,wakeQueue=Promise.resolve(),appActive=true,gps;", "let speechVersion=0,wakeQueue=Promise.resolve(),appActive=true,gps,speechSuccessRecorded=false;")
replace_once("mobile/src/runtime.mjs", "await TextToSpeech.speak({text,lang:'en-US',rate:.98,pitch:1,volume:1,category:'playback',queueStrategy:0});\n    }catch{diagnostics.record", "await TextToSpeech.speak({text,lang:'en-US',rate:.98,pitch:1,volume:1,category:'playback',queueStrategy:0});\n      if(!speechSuccessRecorded){speechSuccessRecorded=true;diagnostics.record('voice-spoken',{page:location.pathname});}\n    }catch{diagnostics.record")
replace_once("mobile/src/runtime.mjs", "  Object.defineProperty(navigator,'geolocation',{configurable:true,value:gps});\n  window.DL_NATIVE_DIAGNOSTICS=Object.freeze({snapshot:()=>diagnostics.snapshot(),exportText:()=>diagnostics.exportText(),clear:()=>diagnostics.clear()});\n", "  Object.defineProperty(navigator,'geolocation',{configurable:true,value:gps});\n  const appDiagnosticEvents=new Set(['guidance-start','guidance-stop','guidance-deviation-frozen','guidance-paused','guidance-error']);\n  const recordAppEvent=(type,details={})=>{\n    const eventType=String(type||'').trim();if(!appDiagnosticEvents.has(eventType))return false;\n    diagnostics.record(eventType,{code:details?.code,page:location.pathname,watchCount:gps.watchCount});return true;\n  };\n  window.DL_NATIVE_DIAGNOSTICS=Object.freeze({snapshot:()=>diagnostics.snapshot(),exportText:()=>diagnostics.exportText(),clear:()=>diagnostics.clear(),recordAppEvent});\n")

replace_once("src/assets/routing/app.mjs", "if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;", "if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-deviation-frozen',{code:'standard'});")
replace_once("src/assets/routing/app.mjs", "function guidanceError(error){const message=", "function guidanceError(error){window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-error',{code:String(error?.code||'unknown')});const message=")
replace_once("src/assets/routing/app.mjs", "state.watchId=navigator.geolocation.watchPosition(updateGuidance,guidanceError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000});setTimeout", "state.watchId=navigator.geolocation.watchPosition(updateGuidance,guidanceError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000});window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-start',{code:'standard'});setTimeout")
replace_once("src/assets/routing/app.mjs", "if(state.watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;if(state.wakeLock)", "window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-stop',{code:'standard'});if(state.watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;if(state.wakeLock)")

replace_once("src/assets/permits/app.mjs", "function pauseFix(message, key) {\n  navAlert(message, key);", "function pauseFix(message, key) {\n  window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-paused', { code: key });\n  navAlert(message, key);")
permit_watch = "watching = navigator.geolocation.watchPosition(position => displayFix({ point: [position.coords.latitude, position.coords.longitude], accuracy: position.coords.accuracy, timestamp: position.timestamp }), () => pauseFix('GPS unavailable. Guidance paused; follow the issued permit.', 'gps-error'), { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });"
replace_once("src/assets/permits/app.mjs", permit_watch, permit_watch + "\n  window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-start', { code: 'permit' });")
replace_once("src/assets/permits/app.mjs", "if (watching !== null) navigator.geolocation?.clearWatch(watching); watching = null; clearInterval(timer); clearInterval(crewTimer);", "window.DL_NATIVE_DIAGNOSTICS?.recordAppEvent?.('guidance-stop', { code: 'permit' }); if (watching !== null) navigator.geolocation?.clearWatch(watching); watching = null; clearInterval(timer); clearInterval(crewTimer);")

panel = '''<section id="field-gate" class="card field-gate" data-state="blocked" aria-labelledby="field-gate-heading"><div class="field-gate-head"><div><p class="page-kicker">PHYSICAL-DEVICE RELEASE EVIDENCE</p><h2 id="field-gate-heading">Guidance field-test gate</h2></div><span id="field-gate-badge" class="field-gate-badge">DEVICE GATE BLOCKED</span></div><p id="field-gate-summary">Run the installed app tests and complete every required observation. This packet never replaces provider consensus or store release review.</p><div class="field-evidence-grid"><section><h3>Automatic native evidence</h3><div id="field-auto-checks" class="field-auto-checks"></div></section><section><h3>Required observations</h3><div id="field-manual-checks" class="field-manual-checks"></div></section></div><div class="field-confirmations"><label><input id="field-operator-confirmed" type="checkbox"> I personally completed the listed device tests and did not include private route, permit, account or device-identifying information.</label><label><input id="field-passenger-confirmed" type="checkbox"> A passenger observed every moving route-deviation test; the driver did not operate this page while moving.</label></div><div class="diagnostics-actions"><button class="btn" id="field-download" type="button">Download field packet</button><button class="btn secondary" id="field-copy" type="button">Copy field packet</button><button class="btn secondary danger" id="field-clear" type="button">Clear checklist</button></div><p id="field-evidence-status" class="diagnostics-status" role="status"></p><p class="diagnostics-note">A complete device packet proves only the physical-device gate. HERE/TomTom consensus, live restriction validation, signing, store review and production promotion remain separate blockers.</p></section>'''
replace_once("src/native-diagnostics.html", '<section class="diagnostics-summary"', panel + '<section class="diagnostics-summary"')
replace_once("src/native-diagnostics.html", '<script src="/assets/native-diagnostics-ui.js"></script>', '<script src="/assets/native-diagnostics-ui.js"></script><script type="module" src="/assets/native-field-evidence-ui.mjs"></script>')

css = r'''
.field-gate{border-color:#365269}.field-gate[data-state="complete"]{box-shadow:inset 0 3px 0 #20c67a}.field-gate[data-state="blocked"]{box-shadow:inset 0 3px 0 #ef4444}.field-gate-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.field-gate-head h2{margin:3px 0 0}.field-gate-badge{white-space:nowrap;border:1px solid #8e353b;background:#3a1618;color:#ffc0c0;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:950;letter-spacing:.5px}.field-gate[data-state="complete"] .field-gate-badge{border-color:#247f5a;background:#0d3328;color:#a7f3d0}.field-evidence-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.field-evidence-grid h3{margin:0 0 8px;font-size:13px}.field-auto-checks,.field-manual-checks{display:grid;gap:7px}.field-auto,.field-check{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border:1px solid #284356;background:#0b1b28;border-radius:10px;padding:10px}.field-auto>span{min-width:68px;text-align:center;border-radius:999px;padding:5px 7px;font-size:9px;font-weight:950}.field-auto.pass>span{background:#0d3328;color:#a7f3d0;border:1px solid #247f5a}.field-auto.blocked>span{background:#3a1618;color:#ffc0c0;border:1px solid #8e353b}.field-auto strong,.field-auto small,.field-check strong,.field-check small{display:block}.field-auto small,.field-check small{color:#8ca2b1;font-size:10px;line-height:1.4;margin-top:3px}.field-check select{min-width:100px;background:#102638;color:#fff;border:1px solid #31536b;border-radius:8px;padding:7px;font-size:11px;font-weight:800}.field-confirmations{display:grid;gap:8px;margin-top:14px;padding:11px;background:#0a1926;border:1px solid #20394b;border-radius:10px}.field-confirmations label{display:flex;gap:9px;align-items:flex-start;color:#b6c6cf;font-size:11px;line-height:1.45}.field-confirmations input{margin-top:2px}.diagnostics-status[data-state="ok"]{color:#9be9ba}.danger{border-color:#8e353b!important;color:#ffc0c0!important}.diagnostics-note{font-size:.78rem;color:#9fb5c5;line-height:1.5}
@media(max-width:820px){.field-evidence-grid{grid-template-columns:1fr}.field-gate-head{display:grid}.field-gate-badge{justify-self:start}.field-check{display:grid}.field-check select{width:100%}}
'''
css_path = Path("src/assets/native-diagnostics.css")
css_text = css_path.read_text(encoding="utf-8")
if ".field-gate{" not in css_text:
    css_path.write_text(css_text + css, encoding="utf-8")

root_package = Path("package.json")
root_data = json.loads(root_package.read_text(encoding="utf-8"))
field_test = "scripts/test-native-field-evidence.mjs"
if field_test not in root_data["scripts"]["test"]:
    root_data["scripts"]["test"] += " " + field_test
root_package.write_text(json.dumps(root_data, indent=2) + "\n", encoding="utf-8")

replace_once("build.mjs", "'src/native-diagnostics.html','src/assets/native-diagnostics-ui.js','src/assets/native-diagnostics.css','src/assets/routing/provider-readiness.mjs'", "'src/native-diagnostics.html','src/assets/native-diagnostics-ui.js','src/assets/native-diagnostics.css','src/assets/native-field-evidence.mjs','src/assets/native-field-evidence-ui.mjs','src/assets/routing/provider-readiness.mjs'")
replace_once("scripts/check-store-readiness.mjs", "'src/assets/routing/provider-readiness.mjs','src/assets/routing/provider-readiness-ui.mjs','vercel.json'", "'src/assets/routing/provider-readiness.mjs','src/assets/routing/provider-readiness-ui.mjs','src/assets/native-field-evidence.mjs','src/assets/native-field-evidence-ui.mjs','vercel.json'")

for old, new in [
    ("versionCode 2000003", "versionCode 2000004"),
    ('versionName "2.0.1"', 'versionName "2.0.2"'),
    ("CURRENT_PROJECT_VERSION = 2000003;", "CURRENT_PROJECT_VERSION = 2000004;"),
    ("MARKETING_VERSION = 2.0.1;", "MARKETING_VERSION = 2.0.2;"),
]:
    replace_once("mobile/scripts/platforms.mjs", old, new)

mobile_package_path = Path("mobile/package.json")
mobile_package = json.loads(mobile_package_path.read_text(encoding="utf-8"))
mobile_package["version"] = "2.0.2-rc.1"
mobile_package_path.write_text(json.dumps(mobile_package, indent=2) + "\n", encoding="utf-8")
mobile_lock_path = Path("mobile/package-lock.json")
mobile_lock = json.loads(mobile_lock_path.read_text(encoding="utf-8"))
mobile_lock["version"] = "2.0.2-rc.1"
if "" in mobile_lock.get("packages", {}):
    mobile_lock["packages"][""]["version"] = "2.0.2-rc.1"
mobile_lock_path.write_text(json.dumps(mobile_lock, indent=2) + "\n", encoding="utf-8")

field_section = '''
## Physical-device evidence packet

Open **Native field diagnostics** from the installed test app before starting the physical-device run. Clear the old raw diagnostics and the field checklist, then complete every item while parked except the controlled deviation test, which must be observed and operated by a passenger.

The field gate combines privacy-minimized automatic evidence with fixed pass/fail observations. Automatic checks require a fresh precise fix, at least two background fixes over roughly two minutes with bounded gaps, an offline/online cycle, a successful native voice event, a recorded route-deviation freeze, and a guidance stop that releases the only GPS watch. The checklist separately covers screen lock, app switching, phone speaker, Bluetooth, network recovery, permission denial, weak/stale GPS, deviation behavior, the system location indicator, and Stop guidance cleanup.

After every item passes, select both attestations and download **field packet**. The JSON intentionally contains no coordinates, addresses, route geometry, permit contents, account identifiers, device identifiers or free-form notes. Keep the raw diagnostic JSON separately only when engineering needs the bounded event timeline. A completed field packet proves the physical-device gate only; it does not prove provider consensus, route legality, store approval or production readiness.
'''
testing_path = Path("mobile/TESTING.md")
testing = testing_path.read_text(encoding="utf-8")
if "## Physical-device evidence packet" not in testing:
    marker = "## Report a problem\n"
    if marker not in testing:
        raise SystemExit("Testing guide insertion marker missing")
    testing_path.write_text(testing.replace(marker, field_section + "\n" + marker, 1), encoding="utf-8")

readme_path = Path("mobile/README.md")
readme = readme_path.read_text(encoding="utf-8")
bullet = "- Native field diagnostics can export a separate privacy-minimized physical-device evidence packet. It combines fixed observations with safe GPS/background/network/voice/deviation/stop lifecycle counters and never includes coordinates or route content.\n"
readme_marker = "- Same-app JSON API calls use native HTTPS to the configured Drivers Lounge backend.\n"
if bullet not in readme:
    if readme_marker not in readme:
        raise SystemExit("Mobile README insertion marker missing")
    readme_path.write_text(readme.replace(readme_marker, bullet + readme_marker, 1), encoding="utf-8")

print("Applied native field-evidence patch.")
