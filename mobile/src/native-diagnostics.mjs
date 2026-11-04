const SCHEMA='dl-native-diagnostics/v1';
const DEFAULT_STORAGE_KEY='drivers-lounge-native-diagnostics-v1';
const DEFAULT_LIMIT=300;
const ALLOWED_BANDS=new Set(['excellent','good','weak','poor','unknown']);

const clean=(value,limit=80)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
const finite=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,Math.round(number))):null;};
const iso=value=>{const date=new Date(value);return Number.isNaN(date.valueOf())?'':date.toISOString();};
const safePage=value=>{const page=clean(value,120);return /^\/[a-z0-9/_-]*(?:\.html)?$/i.test(page)?page:'';};
const accuracyBand=value=>{const accuracy=finite(value,0,100000);return accuracy===null?'unknown':accuracy<=15?'excellent':accuracy<=35?'good':accuracy<=75?'weak':'poor';};

function sanitizeDetails(input={}){
 const details={};
 if(typeof input.active==='boolean')details.active=input.active;
 if(typeof input.background==='boolean')details.background=input.background;
 if(typeof input.online==='boolean')details.online=input.online;
 const watchCount=finite(input.watchCount,0,20);if(watchCount!==null)details.watchCount=watchCount;
 const accuracyM=finite(input.accuracyM??input.accuracy,0,100000);if(accuracyM!==null)details.accuracyM=accuracyM;
 const ageMs=finite(input.ageMs,0,3600000);if(ageMs!==null)details.ageMs=ageMs;
 const gapMs=finite(input.gapMs,0,86400000);if(gapMs!==null)details.gapMs=gapMs;
 const code=clean(input.code,60);if(code)details.code=code;
 const page=safePage(input.page);if(page)details.page=page;
 const band=clean(input.accuracyBand,20).toLowerCase();if(ALLOWED_BANDS.has(band))details.accuracyBand=band;
 return details;
}

function emptyRecord({platform,revision,createdAt}){
 return{schema:SCHEMA,platform:clean(platform,20)||'unknown',revision:clean(revision,40)||'unknown',createdAt:iso(createdAt),events:[]};
}

export function summarizeNativeDiagnostics(events=[]){
 const summary={eventCount:events.length,gpsFixes:0,backgroundGpsFixes:0,weakOrPoorFixes:0,gpsErrors:0,voiceFailures:0,offlineTransitions:0,maxGpsGapMs:0,maxWatchCount:0,firstEventAt:'',lastEventAt:''};
 for(const event of events){
  if(!summary.firstEventAt)summary.firstEventAt=event.at||'';
  summary.lastEventAt=event.at||summary.lastEventAt;
  const details=event.details||{};
  if(event.type==='gps-fix'){
   summary.gpsFixes+=1;if(details.background)summary.backgroundGpsFixes+=1;
   if(['weak','poor'].includes(details.accuracyBand))summary.weakOrPoorFixes+=1;
   summary.maxGpsGapMs=Math.max(summary.maxGpsGapMs,Number(details.gapMs||0));
  }
  if(event.type==='gps-error')summary.gpsErrors+=1;
  if(event.type==='voice-unavailable')summary.voiceFailures+=1;
  if(event.type==='network-state'&&details.online===false)summary.offlineTransitions+=1;
  summary.maxWatchCount=Math.max(summary.maxWatchCount,Number(details.watchCount||0));
 }
 return summary;
}

export function createNativeDiagnostics({storage,storageKey=DEFAULT_STORAGE_KEY,clock=()=>Date.now(),platform='unknown',revision='unknown',limit=DEFAULT_LIMIT,onChange=()=>{}}={}){
 let deviceStorage=storage;
 if(deviceStorage===undefined){try{deviceStorage=globalThis.localStorage;}catch{deviceStorage=null;}}
 const boundedLimit=Math.max(50,Math.min(1000,Number(limit)||DEFAULT_LIMIT));
 let record=emptyRecord({platform,revision,createdAt:clock()}),lastFixAt=0,lastRecordedFixAt=0,lastBand='',lastBackground=null;
 try{
  const parsed=JSON.parse(deviceStorage?.getItem?.(storageKey)||'null');
  if(parsed?.schema===SCHEMA&&Array.isArray(parsed.events)){
   record={...emptyRecord({platform,revision,createdAt:parsed.createdAt||clock()}),events:parsed.events.slice(-boundedLimit).map(event=>({at:iso(event?.at),type:clean(event?.type,60),details:sanitizeDetails(event?.details)})).filter(event=>event.at&&event.type)};
  }
 }catch{/* Corrupt or unavailable device storage starts a fresh local report. */}
 const persist=()=>{try{deviceStorage?.setItem?.(storageKey,JSON.stringify(record));}catch{/* Diagnostics must never break navigation. */}};
 const changed=()=>{persist();try{onChange();}catch{/* UI notification is optional. */}};
 function recordEvent(type,details={}){
  const event={at:iso(clock()),type:clean(type,60),details:sanitizeDetails(details)};
  if(!event.type)return null;
  record.events.push(event);if(record.events.length>boundedLimit)record.events.splice(0,record.events.length-boundedLimit);changed();return event;
 }
 function recordFix(details={}){
  const now=Number(clock()),background=details.background===true,band=accuracyBand(details.accuracyM??details.accuracy),ageMs=finite(details.ageMs,0,3600000)??0;
  const gapMs=lastFixAt?Math.max(0,now-lastFixAt):0;lastFixAt=now;
  const shouldRecord=!lastRecordedFixAt||gapMs>15000||band!==lastBand||background!==lastBackground||now-lastRecordedFixAt>=60000;
  if(!shouldRecord)return null;
  lastRecordedFixAt=now;lastBand=band;lastBackground=background;
  return recordEvent('gps-fix',{background,accuracyM:details.accuracyM??details.accuracy,ageMs,gapMs,accuracyBand:band});
 }
 function snapshot(){
  const events=record.events.map(event=>({at:event.at,type:event.type,details:{...event.details}}));
  return{schema:SCHEMA,exportedAt:iso(clock()),platform:record.platform,revision:record.revision,createdAt:record.createdAt,privacy:'No coordinates, addresses, routes, permits, account identifiers or device identifiers are recorded.',summary:summarizeNativeDiagnostics(events),events};
 }
 function clear(){record=emptyRecord({platform,revision,createdAt:clock()});lastFixAt=0;lastRecordedFixAt=0;lastBand='';lastBackground=null;changed();}
 persist();
 return Object.freeze({schema:SCHEMA,storageKey,record:recordEvent,recordFix,snapshot,exportText:()=>JSON.stringify(snapshot(),null,2)+'\n',clear});
}
