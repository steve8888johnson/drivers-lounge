import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { createBackgroundNavigationGeolocation } from './background-geolocation.mjs';
import { createApiFetch } from './api.mjs';

const BackgroundGeolocation=registerPlugin('BackgroundGeolocation');

if (Capacitor.isNativePlatform()) {
  let speechVersion=0,wakeQueue=Promise.resolve(),appActive=true,gps;
  const cancelSpeech=()=>{speechVersion++;void TextToSpeech.stop().catch(()=>{});};
  const speak=async text=>{
    const version=++speechVersion;
    try{
      await TextToSpeech.stop();
      if(version!==speechVersion)return;
      await TextToSpeech.speak({text,lang:'en-US',rate:.98,pitch:1,volume:1,category:'playback',queueStrategy:0});
    }catch{window.dispatchEvent(new Event('dl-native-voice-unavailable'));}
  };
  const ensureBackgroundNotification=async()=>{
    if(Capacitor.getPlatform()!=='android')return true;
    try{
      let permission=(await LocalNotifications.checkPermissions()).display;
      if(permission!=='granted'&&permission!=='denied')permission=(await LocalNotifications.requestPermissions()).display;
      return permission==='granted';
    }catch{return false;}
  };
  const setWakeState=(count,active=appActive)=>{
    wakeQueue=wakeQueue.catch(()=>{}).then(()=>count>0&&active?KeepAwake.keepAwake():KeepAwake.allowSleep());
    void wakeQueue.catch(()=>{});
  };
  gps=createBackgroundNavigationGeolocation({
    foregroundPlugin:Geolocation,
    backgroundPlugin:BackgroundGeolocation,
    ensureBackgroundNotification,
    shouldUseBackground:()=>/^\/(?:navigation|permitted-loads)(?:\.html)?$/.test(location.pathname),
    onWatchChange:count=>{
      setWakeState(count,appActive);
      window.dispatchEvent(new CustomEvent('dl-native-location-watch',{detail:{count,backgroundCapable:true}}));
    },
    onAppModeChange:detail=>{
      setWakeState(detail.watchCount,detail.active);
      window.dispatchEvent(new CustomEvent('dl-native-app-state',{detail:{...detail,backgroundCapable:true}}));
    }
  });
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:gps});
  window.DL_NATIVE=Object.freeze({
    apiOrigin:DL_API_ORIGIN,speak,cancelSpeech,
    backgroundGuidanceSupported:true,
    openLocationSettings:()=>gps.openSettings(),
    stopBackgroundGuidance:()=>gps.stopAll()
  });
  window.fetch=createApiFetch({nativeHttp:CapacitorHttp,webFetch:window.fetch.bind(window),localOrigin:location.origin,backendOrigin:DL_API_ORIGIN});

  const setAppActive=active=>{
    appActive=Boolean(active);gps.setAppActive(appActive);
    document.documentElement.dataset.nativeAppState=appActive?'foreground':'background';
  };
  void App.addListener('appStateChange',({isActive})=>setAppActive(isActive));
  void App.addListener('backButton',({canGoBack})=>{
    if(canGoBack)history.back();
    else if(!['/','/index.html'].includes(location.pathname))location.assign('/index.html');
  });
  window.addEventListener('pageshow',()=>setAppActive(!document.hidden));
  window.addEventListener('beforeunload',()=>{gps.stopAll();cancelSpeech();setWakeState(0,false);});
  document.addEventListener('visibilitychange',()=>setAppActive(!document.hidden));

  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href]');
    if(!anchor||anchor.hasAttribute('download')||event.defaultPrevented)return;
    const url=new URL(anchor.href,location.href);
    if(url.origin===location.origin||!/^https?:$/.test(url.protocol))return;
    event.preventDefault();
    if(url.protocol==='https:')void Browser.open({url:url.href}).catch(()=>{});
  });
  document.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.classList.add('dl-native-app');
    document.documentElement.dataset.nativeAppState=appActive?'foreground':'background';
    const css=document.createElement('style');
    css.textContent='body{padding-bottom:env(safe-area-inset-bottom)}#dl-install-app{display:none!important}.dl-background-guidance-note{margin:10px 12px;padding:10px 12px;border:1px solid #3d789c;border-radius:10px;background:#10283a;color:#e8f6ff;font:12px/1.45 system-ui}';
    document.head.append(css);
    if(DL_PREVIEW_BUILD){
      const testNotice=document.createElement('aside');
      testNotice.setAttribute('aria-label','Test build information');
      testNotice.style.cssText='margin:12px;padding:12px;border:1px solid #efb442;border-radius:10px;background:#17202d;color:#fff;font:14px/1.5 system-ui';
      testNotice.textContent='Drivers Lounge Test · '+DL_BUILD_REVISION+'. Use test data. Route verification is incomplete; this is not a validated truck-navigation release.';
      (document.querySelector('main')||document.body).prepend(testNotice);
    }
    if(/^\/(?:navigation|permitted-loads)(?:\.html)?$/.test(location.pathname)){
      const note=document.createElement('p');note.className='dl-background-guidance-note';
      note.textContent='While guidance is active, location continues with the screen locked or another app open. Android shows a persistent navigation notification; iOS shows the system location indicator. Tap Stop guidance to end background location use.';
      (document.querySelector('main')||document.body).prepend(note);
    }
  },{once:true});
}
