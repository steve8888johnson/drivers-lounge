# Drivers Lounge testing — October 22, 2026

This is a preview for checking the app. It is not a validated truck-navigation
release. Plan tests while parked; any moving test must be monitored by a passenger.
Keep using your established navigation and issued permits for actual driving.

## Android phone

1. Download Drivers-Lounge-Test.apk from the supplied test download.
2. Open it in the phone's Files/Downloads app. If Android asks, allow this browser
   or file manager to install this specific app, then turn that permission off
   after installation. Do not disable Play Protect; report any blocked installation.
3. Open **Drivers Lounge Test**. This installs separately from the production app.
4. Allow precise location **while using the app** when you press the location button.
   Camera access is optional, requested only for permit scanning.

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
https://drivers-lounge-d5b2e2l0y-steves-projects-c46af6ff.vercel.app/navigation

Open that link in Safari. To make a home-screen shortcut, use Share > Add to Home
Screen, and Open as Web App if shown. Give location permission when requested.
This tests the web experience; native GPS/voice plugins still need TestFlight
device testing. Keep the web app open while using its location features.

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
| Switch apps or lock the Android phone during guidance | Guidance and voice stop; returning does not silently restart |
| Press Stop; use Android Back | Guidance stops cleanly and pages remain usable |
| Import a sample PDF/image in the permit wallet, save, reopen | Saved trip/original can be reopened; incomplete permits stay visibly incomplete |
| Turn on airplane mode and reopen saved permit tools | Bundled tools and saved records open; live routes/maps clearly require a connection |
| Restore connection | Online services recover or show a useful retry message |

Test normal sign-in only with your existing account or a dedicated test account.
Do not test account deletion on an account you need.

## Known limits

- TomTom is configured. HERE/cross-provider verification is not configured.
- Native guidance works only while the app is visible; no background navigation.
- Live routing, map tiles, account services and fresh restrictions require internet.
- PDFs/images saved locally can be lost when the app is uninstalled or its data is cleared.
- A successful automated build does not establish road legality or real-device behavior.

## Report a problem

Send this compact report in this chat. Screenshots are useful after hiding permit,
account and other private information.

    Phone model / OS:
    Android native or iPhone web:
    Build revision:
    Screen / action:
    Expected:
    What happened:
    Location permission: precise / approximate / denied
    Network: Wi-Fi / cellular / offline
    Can it be repeated?

For route problems, include truck dimensions, axle/weight and hazmat settings,
the two test addresses, and the visible error. Do not send passwords or signing keys.

## Developer verification

Native adapter tests: npm test --prefix mobile.
Existing application tests: npm test.
CI generates both Android and iOS simulator builds and checks the Android signature,
package ID and app label before publishing its test artifact.

The platform generator keeps the production identifier for release builds and
uses dev.atlasdigital.driverslounge.preview for preview builds. Preview label:
Drivers Lounge Test. The build records its backend and source revision in
native-build.json. No tester is added and no invitation is sent automatically.

Apple documentation:
https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios
