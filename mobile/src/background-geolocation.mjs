const DEFAULT_NOTIFICATION_TITLE='Drivers Lounge navigation active';
const DEFAULT_NOTIFICATION_MESSAGE='Truck guidance is using location. Tap to return; use Stop guidance to end tracking.';

const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:null;};

export function backgroundLocationError(error={}){
  const nativeCode=String(error?.code||'').toUpperCase();
  const code=nativeCode==='NOT_AUTHORIZED'||nativeCode==='OS-PLUG-GLOC-0003'||error?.code===1?1:
    nativeCode==='TIMEOUT'||nativeCode==='OS-PLUG-GLOC-0010'||error?.code===3?3:2;
  return{
    code,
    message:String(error?.message||'Location is unavailable. Check location permission, notification permission and GPS.'),
    nativeCode,
    PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3
  };
}

export function browserPosition(location={},now=Date.now()){
  const latitude=finite(location.latitude),longitude=finite(location.longitude),accuracy=finite(location.accuracy),timestamp=finite(location.time)??now;
  if(latitude===null||longitude===null||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Object.assign(Error('Native location returned invalid coordinates.'),{code:'INVALID_POSITION'});
  if(location.simulated===true)throw Object.assign(Error('Simulated location detected. Truck guidance is paused until genuine GPS is available.'),{code:'SIMULATED_LOCATION'});
  return{
    coords:{
      latitude,longitude,accuracy:accuracy??999,
      altitude:finite(location.altitude),altitudeAccuracy:finite(location.altitudeAccuracy),
      heading:finite(location.bearing),speed:finite(location.speed)
    },
    timestamp
  };
}

export function createBackgroundNavigationGeolocation({
  foregroundPlugin,
  backgroundPlugin,
  ensureBackgroundNotification=async()=>true,
  onWatchChange=()=>{},
  onAppModeChange=()=>{},
  onDiagnostic=()=>{},
  clock=()=>Date.now(),
  maxLocationAgeMs=30000,
  notificationTitle=DEFAULT_NOTIFICATION_TITLE,
  notificationMessage=DEFAULT_NOTIFICATION_MESSAGE,
  shouldUseBackground=()=>false
}={}){
  if(!foregroundPlugin?.getCurrentPosition)throw Error('Foreground geolocation plugin is required.');
  if(!backgroundPlugin?.addWatcher||!backgroundPlugin?.removeWatcher)throw Error('Background geolocation plugin is required.');
  let sequence=0,appActive=true,appStateVersion=0;
  const watches=new Map();
  const notify=()=>onWatchChange(watches.size);
  const diagnose=(type,details={})=>{try{onDiagnostic(type,details);}catch{/* Diagnostics are optional. */}};
  const report=(callback,error)=>{if(callback)callback(backgroundLocationError(error));};
  const removeBackground=id=>backgroundPlugin.removeWatcher({id}).catch(()=>{});
  const removeForeground=id=>Promise.resolve(foregroundPlugin.clearWatch?.({id})).catch(()=>{});
  const foregroundOptions=options=>({
    enableHighAccuracy:options?.enableHighAccuracy===true,
    timeout:options?.timeout??15000,
    maximumAge:options?.maximumAge??0
  });
  const backgroundOptions=options=>({
    backgroundTitle:notificationTitle,
    backgroundMessage:notificationMessage,
    requestPermissions:true,
    stale:false,
    distanceFilter:Math.max(3,Math.min(25,Number(options?.distanceFilter)||5))
  });

  function clearNative(watch){
    if(watch.nativeId===null)return;
    void(watch.background?removeBackground(watch.nativeId):removeForeground(watch.nativeId));
  }

  function clearWatch(id){
    const watch=watches.get(id);if(!watch)return;
    watches.delete(id);notify();clearNative(watch);
  }

  function getCurrentPosition(success,error,options={}){
    if(!appActive){queueMicrotask(()=>report(error,{code:'APP_BACKGROUND',message:'Bring Drivers Lounge to the foreground to request the current location.'}));return;}
    const requestVersion=appStateVersion;
    foregroundPlugin.getCurrentPosition(foregroundOptions(options)).then(position=>{
      if(!appActive||requestVersion!==appStateVersion){report(error,{code:'APP_BACKGROUND',message:'The location request was cancelled when Drivers Lounge left the foreground.'});return;}
      if(position)success(position);else report(error,{code:'POSITION_UNAVAILABLE',message:'The device did not return a current location.'});
    },problem=>report(error,problem));
  }

  function watchPosition(success,error,options={}){
    const background=shouldUseBackground(options)===true;
    const id=++sequence,watch={nativeId:null,background};watches.set(id,watch);notify();
    Promise.resolve().then(async()=>{
      if(!background){
        if(!foregroundPlugin?.watchPosition)throw Error('Foreground location watcher is unavailable.');
        return foregroundPlugin.watchPosition(foregroundOptions(options),(position,problem)=>{
          if(!watches.has(id))return;
          if(problem){diagnose('gps-error',{background:false,code:problem?.code});report(error,problem);return;}
          if(position){diagnose('gps-fix',{background:false,accuracy:position.coords?.accuracy,ageMs:Math.max(0,clock()-Number(position.timestamp||clock()))});success(position);}
        });
      }
      const allowed=await ensureBackgroundNotification();
      if(!allowed)throw Object.assign(Error('Background guidance requires notification permission so Android can show the active-location indicator.'),{code:'NOT_AUTHORIZED'});
      if(!watches.has(id))return null;
      return backgroundPlugin.addWatcher(backgroundOptions(options),(location,problem)=>{
        if(!watches.has(id))return;
        if(problem){diagnose('gps-error',{background:true,code:problem?.code});report(error,problem);return;}
        if(!location)return;
        try{
          const position=browserPosition(location,clock()),ageMs=Math.max(0,clock()-position.timestamp);
          if(ageMs>maxLocationAgeMs){diagnose('gps-error',{background:true,code:'STALE_LOCATION'});report(error,{code:'STALE_LOCATION',message:'GPS delivered a stale location. Guidance is paused until a fresh fix arrives.'});return;}
          diagnose('gps-fix',{background:true,accuracy:position.coords.accuracy,ageMs});success(position);
        }catch(problem){diagnose('gps-error',{background:true,code:problem?.code});report(error,problem);}
      });
    }).then(nativeId=>{
      if(nativeId===null||nativeId===undefined)return;
      watch.nativeId=String(nativeId);
      if(!watches.has(id))clearNative(watch);
    }).catch(problem=>{
      if(watches.has(id)){watches.delete(id);notify();diagnose('gps-error',{background,code:problem?.code});report(error,problem);}
    });
    return id;
  }

  function setAppActive(active){
    const next=Boolean(active);if(next===appActive)return;
    appActive=next;appStateVersion+=1;
    let removed=false;
    if(!appActive){
      for(const[id,watch]of[...watches])if(!watch.background){watches.delete(id);clearNative(watch);removed=true;}
    }
    if(removed)notify();
    onAppModeChange({active:appActive,watchCount:watches.size});
  }

  function stopAll(){
    if(!watches.size)return;
    const active=[...watches.values()];watches.clear();notify();
    for(const watch of active)clearNative(watch);
  }

  return{
    getCurrentPosition,watchPosition,clearWatch,stopAll,setAppActive,
    openSettings:()=>backgroundPlugin.openSettings?.(),
    get watchCount(){return watches.size;},
    get appActive(){return appActive;},
    get backgroundCapable(){return true;}
  };
}
