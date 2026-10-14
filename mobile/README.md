# Drivers Lounge native projects

Development source only. Not a signed APK/AAB/IPA, not device tested and not store-ready.

- Capacitor core, CLI, Android and iOS pinned to8.5.3 in pnpm-lock.yaml.
- Proposed identifier app.driverslounge.mobile; Google availability checked October13,2026, not reserved/created.
- Android target/compile API36, minimum API24 from the current Capacitor template.
- Native projects use bundled assets, not a remotely loaded server URL. No cleartext override or signing credentials.
- prepare-web.mjs copies existing web source, converts known root page links to explicit .html paths and writes development-only read-only configuration. Does not alter source or tracked historical dist files.
- Account/payment/operational navigation gates remain closed. Online map/vendor scripts still require connectivity. Native location, camera, document import/export, back button, safe areas and offline behavior require device implementation/QA before release.

## Reproduce

From mobile: install exact locked dependencies with pnpm install --frozen-lockfile --ignore-scripts; run node prepare-web.mjs, node check-bundle.mjs, then node node_modules/@capacitor/cli/bin/capacitor sync.
Android: open android in Android Studio with JDK and SDK36; review SDK licenses, run on emulator and real phone, then configure an owner-controlled upload key and create a signed release bundle. Do not commit keystores or credentials.
iOS: open ios/App/App.xcodeproj on macOS with Xcode26+, approved Apple membership and an authorized signing team. Replace template icon/splash assets, verify privacy declarations, run on real iPhone, then archive for TestFlight.

Current machine: no java/adb/gradle on PATH; default Android SDK directory and checked Program Files Android/Java installations absent. iOS compilation unavailable on this Windows host. No APK/AAB/IPA was built or uploaded.

Before shipping: verify native API URL/auth callback handling, replace generated icons, complete privacy/data-safety inventory against actual build, remove unavailable features from store claims, validate full account and deletion flows, test interruption/offline/storage recovery and receive store review approval. A wrapper does not by itself make the product fully functional.
