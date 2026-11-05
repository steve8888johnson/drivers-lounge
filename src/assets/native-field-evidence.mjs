const SCHEMA='dl-native-field-evidence/v1';
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
