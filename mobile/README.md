# Drivers Lounge native app

This directory packages the existing app into Capacitor 8 iOS and Android projects.
Web pages, Supabase, Leaflet and PDF.js are bundled in the binary. It does not load
the website as its app shell. Live routes, map tiles, account data and other online
services still require internet.

## Build

Use Node 22. Install root dependencies with npm ci, then:

    cd mobile
    npm ci
    npm test
    DL_API_ORIGIN=https://drivers-lounge-7artkb8ai-steves-projects-c46af6ff.vercel.app npm run build
    npm run init

On Windows PowerShell, set $env:DL_API_ORIGIN before npm run build.
The build checks API health, reads the public browser configuration, runs the
existing web packaging step, bundles dependencies, and checks local asset links.
It never retrieves routing keys or privileged Supabase keys.

Generated android/, ios/ and www/ are intentionally ignored. The locked Capacitor
templates plus scripts/platforms.mjs reproduce them, including app icons, native
permissions, versions and plugin setup. Put durable platform changes in that
script; direct edits in generated projects will not be saved in Git. Re-run
npm run sync after changing the web app. Individual platform generation is also
supported: node scripts/platforms.mjs android (or ios).

App ID: dev.atlasdigital.driverslounge
Version: 2.0.0; native build number: 2000001.
The identifier has not been confirmed as registered in either store.

## Current behavior

- Native GPS bridges to the existing route-quality, accuracy and deviation guards.
  A Stop action cancels a watch even if the permission request is still pending.
- Guidance works in the foreground only. Hiding the app or locking the device stops
  GPS watches and speech. Returning does not automatically restart guidance.
- The screen stays awake while a GPS watch is active. No background location
  service or entitlement is requested.
- Native text-to-speech speaks existing guidance prompts; failures show a warning.
- Same-app JSON API calls use native HTTPS to the configured Drivers Lounge backend.
  Other requests retain normal browser transport. API redirects are refused.
- HTTPS links open the system browser sheet. Email confirmation and password reset
  open the production account website; sign in to the app afterward.
- Permit records and originals use the existing device IndexedDB wallet. Export
  important originals separately; uninstalling the app may remove its local data.
- Android automatic app-data backup is disabled. Camera permission is optional,
  requested only when scanning/capturing. No background location is requested.

## Automated build artifacts

The Native preview builds workflow compiles an Android debug APK and an unsigned
iOS simulator app. Artifacts are retained for 14 days. These are test builds;
the iOS simulator app cannot be installed on an iPhone or submitted to the store.
The workflow reads no signing secrets and submits nothing to either store.

Android requires Java 21 and SDK 36. iOS requires macOS and Xcode 26 or newer.
On a configured machine, open the generated project with npm run android / npm run ios.

## Release work still outstanding

Set DL_RELEASE=1 with DL_API_ORIGIN=https://driverslounge.app for production assets.
The production routing API must exist and be configured first; the build refuses
a preview backend for a release. A successful build is not store approval.

Before submission: finish the intended HERE/TomTom provider configuration and live
route validation; validate sign-in, recovery, camera/file import, permit persistence,
voice, GPS denial/low accuracy/deviation, screen lock/resume, Android back, and safe
area layouts on real iPhone and Android devices. Check platform privacy disclosures
against the shipped SDKs and services, including maps and authentication. Finish
store identifiers, signing, screenshots, age/content questionnaires, account access,
privacy/data-safety declarations, and review notes. Update the release record with
actual device results and signed archive/AAB identifiers. No physical-device or
store-submission result is implied by the unit tests.

The CLI currently reports a moderate uuid advisory through its xcode build-tool
dependency. The runtime dependency audit has no known vulnerabilities at the time
of this change. Resolve/reassess build-tool advisories before a signed release;
do not use npm audit fix --force to silently downgrade the Capacitor toolchain.
