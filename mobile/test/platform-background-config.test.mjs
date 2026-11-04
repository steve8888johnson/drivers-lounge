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
