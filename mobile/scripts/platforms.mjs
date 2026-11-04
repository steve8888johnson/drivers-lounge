import { readFile, writeFile, access, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const run=(...args)=>execFileSync(process.execPath,[join(mobile,'node_modules/@capacitor/cli/bin/capacitor'),...args],{cwd:mobile,stdio:'inherit'});
const exists=async path=>access(path).then(()=>true,()=>false);
await access(join(mobile,'www/index.html'));
const buildInfo=JSON.parse(await readFile(join(mobile,'www/native-build.json'),'utf8'));
const preview=buildInfo.channel==='preview';
const displayName=preview?'Drivers Lounge Test':'Drivers Lounge';
const applicationId=preview?'dev.atlasdigital.driverslounge.preview':'dev.atlasdigital.driverslounge';
const platforms=process.argv.slice(2);
if(!platforms.length)platforms.push('android','ios');
if(platforms.some(platform=>!['android','ios'].includes(platform)))throw Error('Supported platforms: android, ios.');
const logo=join(mobile,'../src/assets/drivers-lounge-logo.png');
const background='#071522';
for(const platform of platforms){
 if(!await exists(join(mobile,platform)))run('add',platform);
 run('sync',platform);
}
async function patch(path,transform){
 const full=join(mobile,path),before=await readFile(full,'utf8'),after=transform(before);
 await writeFile(full,after);
}
function addPermission(text,permission){
 if(text.includes(`android.permission.${permission}`))return text;
 return text.replace('</manifest>',`<uses-permission android:name="android.permission.${permission}" />\n</manifest>`);
}
function plistString(text,key,value){
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp(`(<key>${escaped}<\\/key>\\s*<string>)[^<]*(<\\/string>)`);
 if(pattern.test(text))return text.replace(pattern,`$1${value}$2`);
 return text.replace(/<\/dict>\s*<\/plist>\s*$/,`<key>${key}</key><string>${value}</string>\n</dict>\n</plist>\n`);
}
if(platforms.includes('android')){
 await patch('android/app/src/main/AndroidManifest.xml',text=>{
  text=text.replace('android:allowBackup="true"','android:allowBackup="false"');
  if(!text.includes('xmlns:tools='))text=text.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">','<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">');
  for(const permission of['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','CAMERA','POST_NOTIFICATIONS','FOREGROUND_SERVICE','FOREGROUND_SERVICE_LOCATION'])text=addPermission(text,permission);
  if(!text.includes('android.hardware.location.gps'))text=text.replace('</manifest>','<uses-feature android:name="android.hardware.location.gps" android:required="false" />\n</manifest>');
  if(!text.includes('android.hardware.camera'))text=text.replace('</manifest>','<uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
  if(!text.includes('android.intent.action.TTS_SERVICE'))text=text.replace('</manifest>','<queries><intent><action android:name="android.intent.action.TTS_SERVICE" /></intent></queries>\n</manifest>');
  const service='com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService';
  if(!text.includes(service))text=text.replace('</application>',`<service android:name="${service}" android:enabled="true" android:exported="false" android:foregroundServiceType="location" tools:replace="android:exported" />\n</application>`);
  return text;
 });
 await patch('android/app/build.gradle',text=>text.replace(/versionCode \d+/,'versionCode 2000003').replace(/versionName "[^"]+"/,'versionName "2.0.1"').replace(/applicationId "[^"]+"/,`applicationId "${applicationId}"`));
 await patch('android/app/src/main/res/values/strings.xml',text=>{
  text=text.replace(/(<string name="app_name">)[^<]+/,'$1'+displayName).replace(/(<string name="title_activity_main">)[^<]+/,'$1'+displayName);
  const values={
   capacitor_background_geolocation_notification_channel_name:'Drivers Lounge navigation',
   capacitor_background_geolocation_notification_icon:'drawable/ic_stat_navigation',
   capacitor_background_geolocation_notification_color:'#FFFFFF'
  };
  for(const[name,value]of Object.entries(values)){
   const pattern=new RegExp(`(<string name="${name}">)[^<]*(<\\/string>)`);
   text=pattern.test(text)?text.replace(pattern,`$1${value}$2`):text.replace('</resources>',`    <string name="${name}">${value}</string>\n</resources>`);
  }
  return text;
 });
 const res=join(mobile,'android/app/src/main/res');
 await mkdir(join(res,'drawable'),{recursive:true});
 await writeFile(join(res,'drawable/ic_stat_navigation.xml'),`<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:fillColor="#FFFFFFFF" android:pathData="M12,2L4.5,20.3l7.5,-3.2 7.5,3.2zM12,6.8l3.8,9.2 -3.8,-1.6 -3.8,1.6z"/>\n</vector>\n`);
 for(const[density,size]of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
  const normal=await sharp(logo).resize(size,size,{fit:'contain',background}).flatten({background}).png().toBuffer();
  await writeFile(join(res,`mipmap-${density}`,'ic_launcher.png'),normal);
  await writeFile(join(res,`mipmap-${density}`,'ic_launcher_round.png'),normal);
  const edge=Math.round(size*108/48),mark=Math.round(edge*.60),foreground=await sharp(logo).resize(mark,mark,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp({create:{width:edge,height:edge,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:foreground,gravity:'centre'}]).png().toFile(join(res,`mipmap-${density}`,'ic_launcher_foreground.png'));
 }
 await patch('android/app/src/main/res/values/ic_launcher_background.xml',text=>text.replace(/#[0-9a-fA-F]{6,8}/g,background));
 for(const path of await readdir(res,{recursive:true}))if(path.endsWith('splash.png')){
  const full=join(res,path),meta=await sharp(full).metadata(),mark=Math.round(Math.min(meta.width,meta.height)*.24),icon=await sharp(logo).resize(mark,mark,{fit:'contain',background}).png().toBuffer();
  await writeFile(full,await sharp({create:{width:meta.width,height:meta.height,channels:3,background}}).composite([{input:icon,gravity:'centre'}]).png().toBuffer());
 }
}
if(platforms.includes('ios')){
 await patch('ios/App/App/Info.plist',text=>{
  text=text.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]+/,'$1'+displayName);
  text=plistString(text,'NSLocationWhenInUseUsageDescription','Drivers Lounge uses precise location to place your truck on the reviewed route and provide turn-by-turn guidance.');
  text=plistString(text,'NSLocationAlwaysAndWhenInUseUsageDescription','While guidance is active, Drivers Lounge uses location with the screen locked or another app open so route-deviation and safety warnings can continue. Location use ends when you stop guidance.');
  text=plistString(text,'NSCameraUsageDescription','Scan permit QR codes and attach permit photos you choose to your trip.');
  if(!text.includes('<key>UIBackgroundModes</key>'))text=text.replace(/<\/dict>\s*<\/plist>\s*$/,'<key>UIBackgroundModes</key><array><string>location</string></array>\n</dict>\n</plist>\n');
  else if(!/<key>UIBackgroundModes<\/key>\s*<array>[\s\S]*?<string>location<\/string>[\s\S]*?<\/array>/.test(text))text=text.replace(/(<key>UIBackgroundModes<\/key>\s*<array>)/,'$1<string>location</string>');
  return text;
 });
 await patch('ios/App/App.xcodeproj/project.pbxproj',text=>text.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,'CURRENT_PROJECT_VERSION = 2000003;').replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 2.0.1;').replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,`PRODUCT_BUNDLE_IDENTIFIER = ${applicationId};`));
 const assets=join(mobile,'ios/App/App/Assets.xcassets');
 await sharp(logo).resize(1024,1024,{fit:'contain',background}).flatten({background}).png().toFile(join(assets,'AppIcon.appiconset/AppIcon-512@2x.png'));
 const icon=await sharp(logo).resize(656,656,{fit:'contain',background}).png().toBuffer(),splash=await sharp({create:{width:2732,height:2732,channels:3,background}}).composite([{input:icon,gravity:'centre'}]).png().toBuffer();
 for(const name of await readdir(join(assets,'Splash.imageset')))if(name.endsWith('.png'))await writeFile(join(assets,'Splash.imageset',name),splash);
}
console.log('Native projects configured: '+platforms.join(', ')+'. Background location runs only while an active guidance watcher exists and is user-visible through system indicators.');
