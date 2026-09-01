import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/index.html','src/dashboard.html','src/navigation.html','src/road-tools.html','src/carriers.html','src/community.html','src/account.html','src/privacy.html','src/terms.html','src/support.html','src/delete-account.html','src/offline.html','src/manifest.webmanifest','src/sw.js','src/assets/backend.js','src/assets/auth.js','src/assets/carriers-rc2.js','src/assets/community-rc2.js','src/assets/delete-account-rc2.js','src/assets/road-intel-rc2.js','scripts/import-fmcsa-carriers.mjs','scripts/check-supabase-preflight.mjs','vercel.json','store/rc2-store-metadata.json','store/rc2-submission-copy.md',
  'supabase/005_rc1_platform_groundwork.sql','supabase/006_v1_auth_and_rls.sql','supabase/007_rc2_carrier_reviews.sql','supabase/008_rc2_security_and_views.sql','supabase/009_rc2_support_and_account_deletion.sql','supabase/010_rc2_load_marketplace.sql','supabase/011_rc2_driver_audio_ads.sql','supabase/012_rc2_advertiser_studio.sql','supabase/013_rc2_ad_pricing_and_billing.sql','supabase/014_rc2_advertiser_analytics.sql','supabase/014_rc2_support_hardening.sql','supabase/015_rc2_community_safety.sql','supabase/016_rc2_welcome_deals.sql','supabase/017_rc2_offer_delivery_preferences.sql'
];

const errors=[]; const pass=m=>console.log(`✓ ${m}`); const fail=m=>errors.push(m);
for(const file of requiredFiles){try{await access(file)}catch{fail(`Missing required launch asset: ${file}`)}}
if(!errors.length)pass(`${requiredFiles.length} launch-critical files are present`);
const read=path=>readFile(path,'utf8');
const includesAll=(text,needles,label)=>{for(const needle of needles)if(!text.includes(needle))fail(`${label} is missing required marker: ${needle}`)};

const manifest=JSON.parse(await read('src/manifest.webmanifest'));
if(manifest.name!=='Drivers Lounge')fail('Manifest name must be Drivers Lounge');
if(manifest.display!=='standalone')fail('Manifest display must be standalone');
if(manifest.scope!=='/')fail('Manifest scope must be /');
if(!String(manifest.start_url||'').startsWith('/'))fail('Manifest start_url must be same-origin');
if(!Array.isArray(manifest.icons)||manifest.icons.length===0)fail('Manifest must provide an install icon');
if(!Array.isArray(manifest.categories)||!manifest.categories.includes('navigation'))fail('Manifest must include navigation category');
if(!Array.isArray(manifest.shortcuts)||manifest.shortcuts.length<4)fail('Manifest should expose at least four driver shortcuts');
if(!errors.some(e=>e.startsWith('Manifest')))pass('PWA manifest passes RC2 installability metadata checks');

const privacy=await read('src/privacy.html'); includesAll(privacy,['/delete-account','/support'],'Privacy policy');
if(!/location/i.test(privacy))fail('Privacy policy must disclose location use'); else pass('Privacy policy links support/deletion and discloses location use');
const terms=await read('src/terms.html');
if(!/advisory/i.test(terms)||!/posted signs|official/i.test(terms))fail('Terms must state that routing/road information is advisory and official restrictions control'); else pass('Terms preserve driver-safety advisory language');
const support=await read('src/support.html'); if(!/support/i.test(support)||!/email/i.test(support))fail('Support page must expose support intake and email contact context'); else pass('Support surface is present');
const deletion=await read('src/delete-account.html'); includesAll(deletion,['delete-account-rc2.js'],'Account deletion page'); if(!/delete|deletion/i.test(deletion))fail('Account deletion page must clearly describe deletion'); else pass('Public account-deletion surface is present');
const account=await read('src/account.html'); if(!/delete-account/i.test(account))fail('In-app Account page must link to account deletion'); else pass('Account page exposes deletion access');
const communityJs=await read('src/assets/community-rc2.js');
if(!/report/i.test(communityJs)||!/delete|remove/i.test(communityJs)||!/block|hide driver/i.test(communityJs))fail('Community client must retain report, author-removal, and abusive-user blocking controls'); else pass('Community reporting, author removal, and user blocking controls are wired');
const roadIntelJs=await read('src/assets/road-intel-rc2.js'); if(!/fresh|stale|expire/i.test(roadIntelJs))fail('Road intelligence must contain freshness/staleness handling'); else pass('Road intelligence includes stale-data protection');
const fmcsaImporter=await read('scripts/import-fmcsa-carriers.mjs'); if(!/dry.run|dryrun|dry_run/i.test(fmcsaImporter)||!/retry/i.test(fmcsaImporter))fail('FMCSA importer must retain dry-run and retry support'); else pass('FMCSA importer includes dry-run and retry safeguards');
const sw=await read('src/sw.js'); if(!/['"]\/offline(?:\.html)?['"]/.test(sw))fail('Service worker must use the driver-safe offline fallback'); if(!errors.some(e=>e.startsWith('Service worker')))pass('Offline fallback is wired');

const vercel=await read('vercel.json');
includesAll(vercel,['X-Frame-Options','Permissions-Policy','/config.js','no-store','/sw.js','Service-Worker-Allowed'],'Vercel security/cache configuration');
if(!errors.some(e=>e.startsWith('Vercel security/cache')))pass('Security headers and stale-runtime-cache protections are enforced');

const shell=await read('src/assets/rc1-design-system.js');
if(!/beforeinstallprompt/.test(shell)||!/appinstalled/.test(shell))fail('Global shell must expose controlled PWA install handling');
if(!/updatefound/.test(shell)||!/Reload when safely parked/.test(shell))fail('Global shell must provide non-disruptive service-worker update messaging');
if(!errors.some(e=>e.startsWith('Global shell')))pass('PWA install and safe-update UX are wired');

const store=JSON.parse(await read('store/rc2-store-metadata.json'));
if(store.appName!=='Drivers Lounge')fail('Store metadata app name must match Drivers Lounge');
for(const key of ['privacy','terms','support','accountDeletion'])if(!String(store.urls?.[key]||'').startsWith('/'))fail(`Store metadata must provide same-origin ${key} URL`);
if(!Array.isArray(store.reviewNotes)||store.reviewNotes.length<5)fail('Store metadata must contain reviewer notes for safety/moderation/deletion/consent');
if(!store.reviewNotes?.some(note=>/hide|block/i.test(note)))fail('Store metadata must document Community abusive-user hiding/blocking behavior for reviewers');
if(!Array.isArray(store.dataSafety?.collectedDependingOnUse)||store.dataSafety.collectedDependingOnUse.length<5)fail('Store metadata must maintain a data-safety inventory');
if(!Array.isArray(store.externalOwnerGates)||store.externalOwnerGates.length<5)fail('Store metadata must preserve external owner launch gates');
if(!errors.some(e=>e.startsWith('Store metadata')))pass('App-store submission metadata is synchronized and complete enough for account-side entry');

const submissionCopy=await read('store/rc2-submission-copy.md');
includesAll(submissionCopy,['## Apple App Store','## Google Play','## Review Notes','## Data-Safety Guardrails','## Final Owner Gates','/privacy','/support','/delete-account'],'Store submission copy');
if(!/free for drivers/i.test(submissionCopy))fail('Store submission copy must preserve the free-for-drivers positioning');
if(!/advisory/i.test(submissionCopy)||!/posted signs/i.test(submissionCopy))fail('Store submission copy must preserve driver-safety advisory language');
if(!/report posts/i.test(submissionCopy)||!/hide another driver/i.test(submissionCopy))fail('Store submission copy must document Community UGC safety controls');
if(!errors.some(e=>e.startsWith('Store submission copy')))pass('Ready-to-paste Apple/Google submission copy is release-gated');

const pkg=JSON.parse(await read('package.json'));
if(pkg.scripts?.['check:supabase']!=='node scripts/check-supabase-preflight.mjs')fail('package.json must expose the read-only Supabase preflight command');
const preflight=await read('scripts/check-supabase-preflight.mjs');
if(!/SUPABASE_URL/.test(preflight)||!/SUPABASE_SERVICE_ROLE_KEY/.test(preflight)||!/limit=0/.test(preflight))fail('Supabase preflight must remain credential-gated and read-only');
if(!errors.some(e=>e.includes('Supabase preflight')||e.includes('package.json')))pass('Supabase post-migration preflight tooling is release-gated');

if(errors.length){console.error('\nDrivers Lounge RC2 store-readiness gate FAILED:\n');errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));process.exit(1)}
console.log('\nDrivers Lounge RC2 store-readiness gate PASSED.');
console.log('External launch gates still require owner action: Supabase migrations/QA, store accounts/signing, final legal contacts, native physical-device tests, and explicit production approval.');
