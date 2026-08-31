import { readFile } from 'node:fs/promises';

const metadata=JSON.parse(await readFile('store/rc2-store-metadata.json','utf8'));
const manifest=JSON.parse(await readFile('src/manifest.webmanifest','utf8'));
const requiredUrls=['privacy','terms','support','accountDeletion'];
const errors=[];
const need=(ok,msg)=>{if(!ok)errors.push(msg)};

need(metadata.release==='2.0.0-rc.2','Store metadata release must match RC2');
need(metadata.appName===manifest.name,'Store app name must match manifest');
need(typeof metadata.subtitle==='string'&&metadata.subtitle.length<=50,'Subtitle must be present and <= 50 chars');
need(typeof metadata.shortDescription==='string'&&metadata.shortDescription.length<=120,'Short description must be present and <= 120 chars');
for(const key of requiredUrls) need(String(metadata.urls?.[key]||'').startsWith('/'),`Missing same-origin ${key} URL`);
need(metadata.reviewNotes?.some(x=>/advisory/i.test(x)&&/official|posted signs/i.test(x)),'Review notes must disclose advisory routing');
need(metadata.reviewNotes?.some(x=>/account deletion/i.test(x)),'Review notes must explain account deletion');
need(metadata.reviewNotes?.some(x=>/user-generated|community/i.test(x)&&/report/i.test(x)),'Review notes must explain UGC reporting');
const prohibited=['background location','contacts','microphone','photos/media library','SMS access','advertising identifier','cross-app tracking','payments'];
for(const p of prohibited) need(metadata.dataSafety?.doNotDeclareUnlessNativeBuildUses?.includes(p),`Permission/data declaration guard missing: ${p}`);
need(metadata.externalOwnerGates?.some(x=>/Supabase/i.test(x)),'Owner gates must retain Supabase migration/QA dependency');
need(metadata.externalOwnerGates?.some(x=>/physical iOS\/Android/i.test(x)),'Owner gates must retain physical-device testing');

if(errors.length){console.error('Store submission validation FAILED:');errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));process.exit(1)}
console.log(`Store submission metadata PASSED: ${requiredUrls.length} public URLs, ${metadata.reviewNotes.length} reviewer notes, ${metadata.dataSafety.doNotDeclareUnlessNativeBuildUses.length} guarded declarations.`);
