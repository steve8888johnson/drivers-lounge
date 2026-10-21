import { readFile } from 'node:fs/promises';

const metadata=JSON.parse(await readFile('store/rc2-store-metadata.json','utf8'));
const manifest=JSON.parse(await readFile('src/manifest.webmanifest','utf8'));
const copy=await readFile('store/rc2-submission-copy.md','utf8');
const requiredUrls=['privacy','terms','support','accountDeletion'];
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg)};

need(metadata.release==='2.0.0-rc.2','Store metadata release must match RC2');
need(metadata.appName===manifest.name,'Store app name must match manifest');
need(typeof metadata.subtitle==='string'&&metadata.subtitle.length>0&&metadata.subtitle.length<=30,'Apple subtitle must be present and <= 30 chars');
need(typeof metadata.shortDescription==='string'&&metadata.shortDescription.length>0&&metadata.shortDescription.length<=80,'Google Play short description must be present and <= 80 chars');
for(const key of requiredUrls) need(String(metadata.urls?.[key]||'').startsWith('/'),`Missing same-origin ${key} URL`);
need(metadata.reviewNotes?.some(x=>/advisory/i.test(x)&&/official|posted signs/i.test(x)),'Review notes must disclose advisory routing');
need(metadata.reviewNotes?.some(x=>/account deletion/i.test(x)),'Review notes must explain account deletion');
need(metadata.reviewNotes?.some(x=>/user-generated|community/i.test(x)&&/report/i.test(x)),'Review notes must explain UGC reporting');
need(typeof metadata.promotionalText==='string'&&metadata.promotionalText.length<=170,'Apple promotional text must be <= 170 chars');
need(typeof metadata.keywords==='string'&&Buffer.byteLength(metadata.keywords,'utf8')<=100,'Apple keywords must be <= 100 bytes');
for(const[label,key]of[['Subtitle','subtitle'],['Short description','shortDescription'],['Promotional text','promotionalText'],['Keywords','keywords']]){
 const heading='**'+label+'**';const section=copy.split(heading)[1];
 need(section?.trimStart().split('\n')[0].trim()===metadata[key],label+' must match the machine-readable store metadata');
}
const prohibited=['background location','contacts','microphone','photos/media library','SMS access','advertising identifier','cross-app tracking','payments'];
for(const p of prohibited) need(metadata.dataSafety?.doNotDeclareUnlessNativeBuildUses?.includes(p),`Permission/data declaration guard missing: ${p}`);
need(metadata.externalOwnerGates?.some(x=>/Supabase/i.test(x)),'Owner gates must retain Supabase migration/QA dependency');
need(metadata.externalOwnerGates?.some(x=>/physical iOS\/Android/i.test(x)),'Owner gates must retain physical-device testing');

if(errors.length){console.error('Store submission validation FAILED:');errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));process.exit(1)}
console.log(`Store submission metadata PASSED: ${requiredUrls.length} public URLs, ${metadata.reviewNotes.length} reviewer notes, ${metadata.dataSafety.doNotDeclareUnlessNativeBuildUses.length} guarded declarations.`);
