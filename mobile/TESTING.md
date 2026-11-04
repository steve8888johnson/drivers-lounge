# Drivers Lounge testing — November 4, 2026

This is a preview for checking the app. It is not a validated truck-navigation
release. Plan tests while parked; any moving test must be monitored by a passenger.
Keep using your established navigation and issued permits for actual driving.

## Android phone

1. Download Drivers-Lounge-Test.apk from the supplied test download.
2. Open it in the phone's Files/Downloads app. If Android asks, allow this browser
   or file manager to install this specific app, then turn that permission off
   after installation. Do not disable Play Protect; report any blocked installation.
3. Open **Drivers Lounge Test**. This installs separately from the production app.
4. Allow precise location when requested. When reviewed guidance starts, allow
   notifications so Android can display the mandatory persistent navigation notice.
   Denying notifications must block background guidance rather than hide tracking.
   Camera access is optional and requested only for permit scanning.

Use sample trips and non-sensitive test files. This preview shares the existing
account backend: account, community and payment actions can affect live data.
Do not make purchases or submit community posts as part of this test.
Export anything you want to keep before uninstalling. A later debug build may
require uninstalling this one because its signing key can differ.

## iPhone

The native iOS build currently runs in an Xcode simulator only. It is not an IPA,
cannot be installed on an iPhone, and is not a TestFlight invitation.
Apple Developer enrollment/signing and App Store Connect access are needed
before a native iPhone testing link can be issued.

You can test the web app on an iPhone now:
https://beta.driverslounge.app/navigation

Open that link in Safari. To make a home-screen shortcut, use Share > Add to Home
Screen, and Open as Web App if shown. Give location permission when requested.
This tests the web experience; native background GPS and voice still require an
actual signed iPhone/TestFlight build. Browser/PWA behavior does not prove native
screen-lock or background behavior.

## First test: about 10 minutes, parked

Record the build revision shown in the Android test banner.

| Check | Expected result |
| --- | --- |
| Open Navigation and change between portrait/landscape | Controls readable; no overlapping text or clipped buttons |
| Use current location | Precise-location prompt; a current GPS position or a clear permission/error message |
| Decline location, then enable it in phone Settings | Clear error; after retry/reopen, current location works |
| Enter a standard truck profile and two real addresses | A route review with truck dimensions and provider limitations |
| Enter an over-height/over-width load or mark permitted load | Standard automatic guidance is blocked or directed to the permit workflow |
| Attempt guidance before acknowledging the review | Start remains blocked |
| Start reviewed guidance while parked | Map/HUD and voice start, or a clear GPS/readiness reason is shown |
| Switch apps or lock the Android phone during guidance | Persistent navigation notification remains visible; GPS route progress continues; returning shows the same reviewed route and current position |
| Press Stop; use Android Back | Guidance and native location watcher stop cleanly; persistent notification disappears; pages remain usable |
| Import a sample PDF/image in the permit wallet, save, reopen | Saved trip/original can be reopened; incomplete permits stay visibly incomplete |
| Turn on airplane mode and reopen saved permit tools | Bundled tools and saved records open; live routes/maps clearly require a connection |
| Restore connection | Online services recover or show a useful retry message |

Test normal sign-in only with your existing account or a dedicated test account.
Do not test account deletion on an account you need.

## Background-guidance safety matrix

Run these tests on at least one current Android phone and one current iPhone before
any store release:

1. Start an exact-address standard-truck route while parked, confirm the reviewed
   route, then start guidance.
2. Lock the screen for five minutes. Route progress and GPS timestamps should
   continue without creating or substituting a new route.
3. Switch to another app for five minutes. The same route ID and safety record must
   remain active when Drivers Lounge returns.
4. Deny Android notification permission. Background guidance must fail closed with
   a clear explanation; no hidden location watcher may remain.
5. On iPhone, grant only When In Use permission. The app may request Always access
   only when background guidance starts, not during unrelated browsing.
6. Press Stop guidance. Android's persistent notification, iOS's background
   indicator and all native location watchers must end promptly.
7. Force-stop the app and reboot the phone. The app must not silently resume
   tracking. A previous route may be offered only for parked review and must pass
   expiry and integrity checks again.
8. Feed stale, low-accuracy and simulated/mock locations. Guidance must pause or
   reject them rather than map-match them as genuine truck movement.
9. Disable GPS and restore it. No passenger-car connector, automatic detour or
   replacement route may be invented.
10. Run at least a four-hour monitored route and record battery use, device heat,
    voice prompt timing, interruptions, Bluetooth behavior and reconnects.

## Known limits

- TomTom is configured. HERE/cross-provider verification is not configured, so
  production policy must continue to block independently unverified routes.
- Background route tracking is enabled only while an active guidance watcher exists.
  Android must show a persistent notification and iOS must show the system location
  indicator. Denying the required permission must block background guidance clearly.
- Live routing, map tiles, account services and fresh restrictions require internet.
- Offline route packets preserve reviewed evidence but do not calculate a new route
  or authorized detour.
- PDFs/images saved locally can be lost when the app is uninstalled or its data is cleared.
- A successful automated build does not establish road legality or real-device behavior.

## Report a problem

Send this compact report in this chat. Screenshots are useful after hiding permit,
account and other private information.

    Phone model / OS:
    Android native or iPhone web/native:
    Build revision:
    Screen / action:
    Expected:
    What happened:
    Location permission: precise / approximate / denied
    Notification permission: allowed / denied / not asked
    App state: open / another app / screen locked
    Network: Wi-Fi / cellular / offline
    Can it be repeated?

For route problems, include truck dimensions, axle/weight and hazmat settings,
the two test addresses, and the visible error. Do not send passwords or signing keys.

## Developer verification

Native adapter tests: npm test --prefix mobile.
Existing application tests: npm test.
The isolated background-guidance CI compiles Android and iOS simulator projects,
checks required permissions and visible system indicators, and publishes test
artifacts only after the complete test and dependency-audit gates pass.

The platform generator keeps the production identifier for release builds and
uses dev.atlasdigital.driverslounge.preview for preview builds. Preview label:
Drivers Lounge Test. The build records its backend and source revision in
native-build.json. No tester is added and no invitation is sent automatically.

Apple documentation:
https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios
