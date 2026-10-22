import { readFile, writeFile, access, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
const mobile=fileURLToPath(new URL('../',import.meta.url));
const run=(...args)=>execFileSync(process.execPath,[join(mobile,'node_modules/@capacitor/cli/bin/capacitor'),...args],{cwd:mobile,stdio:'inherit'});
const exists=async path=>access(path).then(()=>true,()=>false);
await access(join(mobile,'www/index.html'));
const platforms=process.argv.slice(2);
if(!platforms.length) platforms.push('android','ios');
if(platforms.some(p=>!['android','ios'].includes(p)))throw Error('Supported platforms: android, ios.');
const logo=join(mobile,'../src/assets/drivers-lounge-logo.png');
const background='#071522';
for(const platform of platforms) {
 if(!await exists(join(mobile,platform)))run('add',platform);
 run('sync',platform);
}
async function patch(path, transform) {
 const full=join(mobile,path),before=await readFile(full,'utf8'),after=transform(before);
 await writeFile(full,after);
}
if(platforms.includes('android')) {
 await patch('android/app/src/main/AndroidManifest.xml',text=>{
  text=text.replace('android:allowBackup="true"','android:allowBackup="false"');
  const permissions=['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','CAMERA'];
  const tags=permissions.filter(p=>!text.includes('android.permission.'+p)).map(p=>'<uses-permission android:name="android.permission.'+p+'" />');
  if(!text.includes('android.hardware.location.gps')) tags.push('<uses-feature android:name="android.hardware.location.gps" android:required="false" />');
  if(!text.includes('android.hardware.camera')) tags.push('<uses-feature android:name="android.hardware.camera" android:required="false" />');
  if(!text.includes('android.intent.action.TTS_SERVICE'))tags.push('<queries><intent><action android:name="android.intent.action.TTS_SERVICE" /></intent></queries>');
  return text.replace('</manifest>',tags.join('\n')+'\n</manifest>');
 });
 await patch('android/app/build.gradle',text=>text.replace(/versionCode \d+/,'versionCode 2000001').replace(/versionName "[^"]+"/,'versionName "2.0.0"'));
 const res=join(mobile,'android/app/src/main/res');
 // Use the existing brand art for legacy and adaptive icons.
 for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})) {
  const normal=await sharp(logo).resize(size,size,{fit:'contain',background}).flatten({background}).png().toBuffer();
  await writeFile(join(res,'mipmap-'+density,'ic_launcher.png'),normal);
  await writeFile(join(res,'mipmap-'+density,'ic_launcher_round.png'),normal);
  const edge=Math.round(size*108/48),mark=Math.round(edge*.60);
  const foreground=await sharp(logo).resize(mark,mark,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp({create:{width:edge,height:edge,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite([{input:foreground,gravity:'centre'}]).png().toFile(join(res,'mipmap-'+density,'ic_launcher_foreground.png'));
 }
 await patch('android/app/src/main/res/values/ic_launcher_background.xml',text=>text.replace(/#[0-9a-fA-F]{6,8}/g,background));
 // Android's template includes density-specific launch images.
 for(const path of await readdir(res,{recursive:true}))if(path.endsWith('splash.png')) {
  const full=join(res,path),meta=await sharp(full).metadata(),mark=Math.round(Math.min(meta.width,meta.height)*.24);
  const icon=await sharp(logo).resize(mark,mark,{fit:'contain',background}).png().toBuffer();
  const image=await sharp({create:{width:meta.width,height:meta.height,channels:3,background}})
    .composite([{input:icon,gravity:'centre'}]).png().toBuffer();
  await writeFile(full,image);
 }
}
if(platforms.includes('ios')) {
 await patch('ios/App/App/Info.plist',text=>{
  const descriptions={
   NSLocationWhenInUseUsageDescription:'Drivers Lounge uses your location for current-position lookup and foreground truck guidance.',
   NSLocationAlwaysAndWhenInUseUsageDescription:'Drivers Lounge uses location only while the app is open. Background guidance is not supported.',
   NSCameraUsageDescription:'Scan permit QR codes and attach permit photos you choose to your trip.'
  };
  const extra=Object.entries(descriptions).filter(([key])=>!text.includes('<key>'+key+'</key>')).map(([key,value])=>'<key>'+key+'</key><string>'+value+'</string>').join('\n');
  return text.replace(/<\/dict>\s*<\/plist>\s*$/,extra+'\n</dict>\n</plist>\n');
 });
 await patch('ios/App/App.xcodeproj/project.pbxproj',text=>text.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,'CURRENT_PROJECT_VERSION = 2000001;').replace(/MARKETING_VERSION = [^;]+;/g,'MARKETING_VERSION = 2.0.0;'));
 const assets=join(mobile,'ios/App/App/Assets.xcassets');
 await sharp(logo).resize(1024,1024,{fit:'contain',background}).flatten({background}).png()
  .toFile(join(assets,'AppIcon.appiconset/AppIcon-512@2x.png'));
 const icon=await sharp(logo).resize(656,656,{fit:'contain',background}).png().toBuffer();
 const splash=await sharp({create:{width:2732,height:2732,channels:3,background}}).composite([{input:icon,gravity:'centre'}]).png().toBuffer();
 for(const name of await readdir(join(assets,'Splash.imageset')))if(name.endsWith('.png'))await writeFile(join(assets,'Splash.imageset',name),splash);
}
console.log('Native projects configured: '+platforms.join(', ')+'. Guidance is foreground only; no background location entitlement requested.');
