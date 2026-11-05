import{readFile}from'node:fs/promises';

const read=path=>readFile(path,'utf8');
const metadata=JSON.parse(await read('store/rc2-store-metadata.json'));
const manifest=JSON.parse(await read('src/manifest.webmanifest'));
const [copy,privacy,runtime,platforms,backgroundDeclaration,releaseRecord]=await Promise.all([
 read('store/rc2-submission-copy.md'),read('src/privacy.html'),read('mobile/src/runtime.mjs'),
 read('mobile/scripts/platforms.mjs'),read('store/background-location-declaration.md'),read('store/native-release-record.md')
]);
const errors=[],need=(ok,message)=>{if(!ok)errors.push(message)};
const exactCopy=(label,value)=>{const heading=`**${label}**`;const section=copy.split(heading)[1];need(section?.trimStart().split('\n')[0].trim()===String(value),`${label} must match machine-readable metadata`)};

need(metadata.release==='2.0.2','Store release must be 2.0.2');
need(metadata.appName===manifest.name,'Store app name must match the manifest');
need(typeof metadata.subtitle==='string'&&metadata.subtitle.length>0&&metadata.subtitle.length<=30,'Apple subtitle must be present and <= 30 characters');
need(typeof metadata.shortDescription==='string'&&metadata.shortDescription.length>0&&metadata.shortDescription.length<=80,'Google Play short description must be present and <= 80 characters');
need(typeof metadata.promotionalText==='string'&&metadata.promotionalText.length<=170,'Apple promotional text must be <= 170 characters');
need(typeof metadata.keywords==='string'&&Buffer.byteLength(metadata.keywords,'utf8')<=100,'Apple keywords must be <= 100 bytes');
for(const key of ['privacy','terms','support','accountDeletion']){
 let url;try{url=new URL(metadata.publicUrls?.[key])}catch{/* handled below */}
 need(url?.protocol==='https:'&&url.hostname==='driverslounge.app',`Store ${key} URL must be an HTTPS driverslounge.app URL`);
}

const native=metadata.nativeBuild||{};
need(native.androidPackageName==='dev.atlasdigital.driverslounge','Android production package is not finalized');
need(native.iosBundleId==='dev.atlasdigital.driverslounge','iOS production bundle ID is not finalized');
need(native.previewPackageAndBundleId==='dev.atlasdigital.driverslounge.preview','Preview package/bundle ID must remain isolated');
need(native.versionName==='2.0.2','Native marketing version must be 2.0.2');
need(native.buildNumber===2000004,'Native build number must be 2000004');
need(native.androidTargetApi===36,'Google Play release must target API 36');
need(native.appleSku==='atlas-digital-drivers-lounge-ios','Apple SKU must remain stable');

for(const[label,key]of[['Subtitle','subtitle'],['Short description','shortDescription'],['Promotional text','promotionalText'],['Keywords','keywords']])exactCopy(label,metadata[key]);
for(const marker of ['## Apple App Store','## Google Play','## Review Notes','## Data-Safety Guardrails','## Final Owner Gates','Google Play background-location declaration','Apple App Review Notes'])need(copy.includes(marker),`Submission copy is missing ${marker}`);
for(const marker of ['dev.atlasdigital.driverslounge','atlas-digital-drivers-lounge-ios','2.0.2','2000004','API level 36'])need(copy.includes(marker),`Submission copy is missing native release marker: ${marker}`);

need(metadata.reviewNotes?.some(item=>/advisory/i.test(item)&&/posted signs|official restrictions/i.test(item)),'Review notes must disclose advisory routing');
need(metadata.reviewNotes?.some(item=>/collects precise location data/i.test(item)&&/screen is locked|another app/i.test(item)),'Review notes must disclose background location');
need(metadata.reviewNotes?.some(item=>/not.*advertising|never.*advertising/i.test(item)),'Review notes must state location is not used for advertising');
need(metadata.reviewNotes?.some(item=>/account deletion/i.test(item)),'Review notes must explain account deletion');
need(metadata.reviewNotes?.some(item=>/user-generated|community/i.test(item)&&/report/i.test(item)),'Review notes must explain UGC reporting');
need(metadata.reviewNotes?.some(item=>/commercial payments.*disabled/i.test(item)),'Review notes must state commercial payments are disabled');

const location=metadata.dataSafety?.backgroundLocation||{};
need(/App functionality/i.test(location.purpose||''),'Data safety must identify background location as app functionality');
need(location.advertisingOrAnalytics===false,'Background location must not be declared for advertising or analytics');
need(location.automaticServerUpload===false,'Background location must not be declared as automatic continuous-history upload');
need(metadata.dataSafety?.collectedDependingOnUse?.some(item=>/background location/i.test(item)),'Data safety inventory must include background location');
need(!metadata.dataSafety?.doNotDeclareUnlessNativeBuildUses?.some(item=>/background location/i.test(item)),'Background location cannot remain in the do-not-declare list');
need(!copy.includes('unless a native build later adds'),'Submission copy contains stale background-location language');

for(const source of [copy,privacy,runtime,backgroundDeclaration]){
 need(/collects precise location data/i.test(source),'A required surface lacks the precise-location disclosure');
 need(/screen is locked|app is closed or not in use|another app is open/i.test(source),'A required surface lacks the background-use explanation');
 need(/not used for advertising or analytics/i.test(source),'A required surface lacks the no-advertising/no-analytics limitation');
 need(/Stop guidance/i.test(source),'A required surface lacks the Stop guidance control');
}
need(/persistent navigation notification/i.test(runtime)&&/system location indicator/i.test(runtime),'Native disclosure must identify Android and iOS indicators');
need(/Google Play permission declaration/.test(backgroundDeclaration)&&/Apple review explanation/.test(backgroundDeclaration),'Background-location declaration must cover both stores');
need(/Android production package/.test(releaseRecord)&&/iOS production bundle ID/.test(releaseRecord),'Native release record is incomplete');

for(const marker of ['versionCode 2000004','versionName "2.0.2"','CURRENT_PROJECT_VERSION = 2000004','MARKETING_VERSION = 2.0.2','dev.atlasdigital.driverslounge.preview'])need(platforms.includes(marker),`Native platform generator is missing ${marker}`);
need(Array.isArray(metadata.externalOwnerGates)&&metadata.externalOwnerGates.length>=8,'External owner gate inventory is incomplete');
need(metadata.externalOwnerGates.some(item=>/second independent/i.test(item)),'Independent routing provider gate must remain');
need(metadata.externalOwnerGates.some(item=>/physical-device/i.test(item)),'Physical-device gate must remain');
need(metadata.externalOwnerGates.some(item=>/leaked-password/i.test(item)),'Supabase leaked-password gate must remain');

if(errors.length){console.error('\nStore submission metadata FAILED:\n');errors.forEach((item,index)=>console.error(`${index+1}. ${item}`));process.exit(1)}
console.log(`Store submission metadata PASSED: release ${metadata.release}, build ${native.buildNumber}, API ${native.androidTargetApi}, ${metadata.reviewNotes.length} reviewer notes, ${metadata.externalOwnerGates.length} external gates.`);
