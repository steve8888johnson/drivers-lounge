const DEFAULT_NOTIFICATION_TITLE='Drivers Lounge navigation active';
const DEFAULT_NOTIFICATION_MESSAGE='Truck guidance is using location. Tap to return; use Stop guidance to end tracking.';

const finite=value=>{const number=Number(value);return Number.isFinite(number)?number:null;};

export function backgroundLocationError(error={}){
  const nativeCode=String(error?.code||'').toUpperCase();
  const code=nativeCode==='NOT_AUTHORIZED'||error?.code===1?1:
    nativeCode==='TIMEOUT'||error?.code===3?3:2;
  return{
    code,
    message:String(error?.message||'Background location is unavailable. Check location permission, notification permission and GPS.'),
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
  clock=()=>Date.now(),
  maxLocationAgeMs=30000,
  notificationTitle=DEFAULT_NOTIFICATION_TITLE,
  notificationMessage=DEFAULT_NOTIFICATION_MESSAGE
}={}){
  if(!foregroundPlugin?.getCurrentPosition)throw Error('Foreground geolocation plugin is required.');
  if(!backgroundPlugin?.addWatcher||!backgroundPlugin?.removeWatcher)throw Error('Background geolocation plugin is required.');
  let sequence=0,appActive=true;
  const watches=new Map();
  const notify=()=>onWatchChange(watches.size);
  const report=(callback,error)=>{if(callback)callback(backgroundLocationError(error));};
  const removeNative=id=>backgroundPlugin.removeWatcher({id}).catch(()=>{});
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

  function clearWatch(id){
    const watch=watches.get(id);if(!watch)return;
    watches.delete(id);notify();
    if(watch.nativeId!==null)void removeNative(watch.nativeId);
  }

  function getCurrentPosition(success,error,options={}){
    foregroundPlugin.getCurrentPosition(foregroundOptions(options)).then(success,problem=>report(error,problem));
  }

  function watchPosition(success,error,options={}){
    const id=++sequence,watch={nativeId:null};watches.set(id,watch);notify();
    Promise.resolve().then(async()=>{
      const allowed=await ensureBackgroundNotification();
      if(!allowed)throw Object.assign(Error('Background guidance requires notification permission so Android can show the active-location indicator.'),{code:'NOT_AUTHORIZED'});
      if(!watches.has(id))return null;
      return backgroundPlugin.addWatcher(backgroundOptions(options),(location,problem)=>{
        if(!watches.has(id))return;
        if(problem){report(error,problem);return;}
        if(!location)return;
        try{
          const position=browserPosition(location,clock());
          if(clock()-position.timestamp>maxLocationAgeMs){
            report(error,{code:'STALE_LOCATION',message:'GPS delivered a stale location. Guidance is paused until a fresh fix arrives.'});return;
          }
          success(position);
        }catch(problem){report(error,problem);}
      });
    }).then(nativeId=>{
      if(nativeId===null||nativeId===undefined)return;
      if(watches.has(id))watch.nativeId=String(nativeId);else void removeNative(String(nativeId));
    }).catch(problem=>{
      if(watches.has(id)){watches.delete(id);notify();report(error,problem);}
    });
    return id;
  }

  function setAppActive(active){appActive=Boolean(active);onAppModeChange({active:appActive,watchCount:watches.size});}
  function stopAll(){for(const id of[...watches.keys()])clearWatch(id);}

  return{
    getCurrentPosition,watchPosition,clearWatch,stopAll,setAppActive,
    openSettings:()=>backgroundPlugin.openSettings?.(),
    get watchCount(){return watches.size;},
    get appActive(){return appActive;},
    get backgroundCapable(){return true;}
  };
}
