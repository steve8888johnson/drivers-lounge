import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Geolocation } from '@capacitor/geolocation';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { createGeolocation } from './geolocation.mjs';
import { createApiFetch } from './api.mjs';

if (Capacitor.isNativePlatform()) {
  let speechVersion = 0, wakeQueue = Promise.resolve();
  const cancelSpeech = () => { speechVersion++; void TextToSpeech.stop().catch(() => {}); };
  const speak = async text => {
    const version = ++speechVersion;
    try {
      await TextToSpeech.stop();
      if (version !== speechVersion) return;
      await TextToSpeech.speak({ text, lang: 'en-US', rate: .98, pitch: 1, volume: 1,
        category: 'playback', queueStrategy: 0 });
    } catch { window.dispatchEvent(new Event('dl-native-voice-unavailable')); }
  };
  const gps = createGeolocation(Geolocation, count => {
    // Serialize start/stop so an in-flight keepAwake cannot win after Stop.
    wakeQueue = wakeQueue.catch(() => {}).then(() => count ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
    void wakeQueue.catch(() => {});
  });
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: gps });
  window.DL_NATIVE = Object.freeze({ apiOrigin: DL_API_ORIGIN, speak, cancelSpeech });
  window.fetch = createApiFetch({ nativeHttp: CapacitorHttp, webFetch: window.fetch.bind(window),
    localOrigin: location.origin, backendOrigin: DL_API_ORIGIN });
  const pause = () => {
    gps.pause(); cancelSpeech();
    window.dispatchEvent(new Event('dl-native-pause'));
  };
  void App.addListener('appStateChange', ({ isActive }) => { if (isActive) gps.resume(); else pause(); });
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back();
    else if (!['/','/index.html'].includes(location.pathname)) location.assign('/index.html');
    // Stay on the home page; never exit while guidance might still be running.
  });
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', () => { if (!document.hidden) gps.resume(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else gps.resume(); });
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || event.defaultPrevented) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin === location.origin || !/^https?:$/.test(url.protocol)) return;
    event.preventDefault();
    if (url.protocol === 'https:') void Browser.open({ url: url.href }).catch(() => {});
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('dl-native-app');
    const css = document.createElement('style');
    css.textContent = 'body{padding-bottom:env(safe-area-inset-bottom)}#dl-install-app{display:none!important}';
    document.head.append(css);
    if (DL_PREVIEW_BUILD) {
      const testNotice=document.createElement('aside');
      testNotice.setAttribute('aria-label','Test build information');
      testNotice.style.cssText='margin:12px;padding:12px;border:1px solid #efb442;border-radius:10px;background:#17202d;color:#fff;font:14px/1.5 system-ui';
      testNotice.textContent='Drivers Lounge Test · '+DL_BUILD_REVISION+'. Use test data. Route verification is incomplete; this is not a validated truck-navigation release.';
      (document.querySelector('main') || document.body).prepend(testNotice);
    }
    if (/\/(?:navigation|permitted-loads)(?:\.html)?$/.test(location.pathname)) {
      const note = document.createElement('p');
      note.className = 'inline-status';
      note.textContent = 'Keep this app open for guidance. Locking the screen or switching apps stops guidance; restart when safely parked.';
      (document.querySelector('main') || document.body).prepend(note);
    }
  }, { once: true });
}
