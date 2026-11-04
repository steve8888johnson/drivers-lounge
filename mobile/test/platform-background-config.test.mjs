import{test}from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Capacitor configuration enables the Android bridge required for persistent location callbacks',async()=>{
 const config=JSON.parse(await read('capacitor.config.json'));
 assert.equal(config.android.useLegacyBridge,true);
 assert.equal(config.android.allowMixedContent,false);
 assert.equal(config.plugins.LocalNotifications.smallIcon,'ic_stat_navigation');
});

test('background plugins are exact-pinned to Capacitor 8 compatible releases',async()=>{
 const pkg=JSON.parse(await read('package.json'));
 assert.equal(pkg.dependencies['@capacitor-community/background-geolocation'],'1.3.1');
 assert.equal(pkg.dependencies['@capacitor/local-notifications'],'8.3.1');
});

test('platform generator declares visible and restricted background location services',async()=>{
 const source=await read('scripts/platforms.mjs');
 for(const token of['POST_NOTIFICATIONS','FOREGROUND_SERVICE_LOCATION','UIBackgroundModes','<string>location</string>','android:exported="false"','ic_stat_navigation'])assert.match(source,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(source,/Location use ends when you stop guidance/);
});

test('native runtime keeps reviewed-route watches alive but scopes background use to navigation screens',async()=>{
 const source=await read('src/runtime.mjs');
 assert.match(source,/createBackgroundNavigationGeolocation/);
 assert.match(source,/backgroundGuidanceSupported:true/);
 assert.match(source,/gps\.setAppActive/);
 assert.doesNotMatch(source,/gps\.pause\(/);
 assert.match(source,/navigation\|permitted-loads/);
 assert.match(source,/beforeunload.*gps\.stopAll/);
 assert.match(source,/persistent navigation notification/);
});

test('screen wake lock is released while background guidance continues',async()=>{
 const source=await read('src/runtime.mjs');
 assert.match(source,/count>0&&active\?KeepAwake\.keepAwake\(\):KeepAwake\.allowSleep\(\)/);
 assert.match(source,/setWakeState\(detail\.watchCount,detail\.active\)/);
 assert.match(source,/beforeunload.*setWakeState\(0,false\)/);
});


test('native build metadata declares background guidance and local privacy-minimized diagnostics',async()=>{
 const source=await read('scripts/build.mjs');
 assert.match(source,/foregroundGuidanceOnly:false/);
 assert.match(source,/backgroundGuidance:true/);
 assert.match(source,/nativeDiagnostics:true/);
 assert.match(source,/diagnosticsPrivacy:'local-no-coordinates'/);
});

test('native runtime exposes diagnostics without coordinates and records app, network and voice failures',async()=>{
 const source=await read('src/runtime.mjs');
 assert.match(source,/createNativeDiagnostics/);
 assert.match(source,/DL_NATIVE_DIAGNOSTICS/);
 assert.match(source,/diagnosticsAvailable:true/);
 assert.match(source,/network-state/);
 assert.match(source,/voice-unavailable/);
 for(const line of source.split('\n').filter(line=>line.includes('diagnostics.record')))assert.doesNotMatch(line,/\b(?:latitude|longitude|address|permitNumber|userId|deviceId)\b/i);
});

test('diagnostics screen and assets are required by the root build and state their privacy boundary',async()=>{
 const rootBuild=await readFile(new URL('../../build.mjs',import.meta.url),'utf8');
 const page=await readFile(new URL('../../src/native-diagnostics.html',import.meta.url),'utf8');
 for(const required of['src/native-diagnostics.html','src/assets/native-diagnostics-ui.js','src/assets/native-diagnostics.css'])assert.match(rootBuild,new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const phrase of['does not record coordinates','route geometry','account identifiers','device identifiers'])assert.match(page,new RegExp(phrase,'i'));
 assert.match(page,/noindex,nofollow/);
});


test('public privacy policy discloses the device-only diagnostics boundary',async()=>{
 const privacy=await readFile(new URL('../../src/privacy.html',import.meta.url),'utf8');
 assert.match(privacy,/Local field diagnostics/);
 assert.match(privacy,/not sent to Drivers Lounge automatically/);
 for(const excluded of['coordinates','addresses','route geometry','permit contents','account identifiers','device identifiers'])assert.match(privacy,new RegExp(excluded,'i'));
 assert.match(privacy,/copy, download or share/);
 assert.match(privacy,/clear it from the device/);
});
