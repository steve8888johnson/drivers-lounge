# Drivers Lounge iOS preparation — October 16, 2026

The owner completed Apple membership checkout. The live developer account still reports purchase processing (up to 48 hours); App Store Connect has not admitted the account. Payment is not membership activation or app approval. Do not repeat checkout.

## Free Mac build route

Drivers Lounge's existing GitHub repository is public. GitHub's standard hosted Mac runners are free for public repositories. The iOS simulator build check uses macos-15 / Xcode 26.3 with a 20-minute timeout, read-only repository permission, no stored checkout credential, no signing secrets, no caches and no artifact upload. A job condition skips private repositories. It only runs for mobile/workflow changes on the existing release branch, or manual dispatch after the workflow is available on the default branch. It does not merge PR4 or publish an app.

This checks compilation only. A real iPhone/TestFlight build still needs active Apple membership, the registered app identifier/team, owner-controlled signing credentials and provisioning, and authorized upload setup. No signing credential has been created or copied.

Alternatives reviewed: Codemagic offers 500 free macOS M2 minutes on individual personal accounts, not Teams; paid billing must remain disabled. Xcode Cloud includes 25 hours per month with Apple membership, but its first workflow is configured in Xcode, which does not solve the immediate lack of a Mac. No new service account was created.

Sources checked October 16:
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://docs.codemagic.io/billing/pricing/
- https://developer.apple.com/xcode-cloud/get-started/

## App record draft, not submitted

| Field | Prepared value |
| --- | --- |
| Name | Drivers Lounge (availability unverified) |
| Platform | iOS |
| Primary language | English (US) |
| Proposed bundle identifier | app.driverslounge.mobile |
| Internal SKU | drivers-lounge-ios |
| Initial version / build | 1.0 / 1 |
| Support URL | https://driverslounge.app/support |
| Privacy URL | https://driverslounge.app/privacy |
| Release | Manual, after review and device validation |

Draft subtitle: Truck tools & permit planning.

Draft positioning: Tools for commercial drivers to organize permit documents and review supplied route information while parked. Final listing text and screenshots must describe only the tested native build. Do not claim nationwide legal truck routing, verified clearance, automated permitted navigation, offline street maps or production-ready native account sync.

## Native blockers found in source

1. Added the required camera and foreground location purpose strings to Info.plist for explicit QR scanning and parked GPS checks. These declarations do not grant permission by themselves; actual prompts/denials still need iPhone testing. No microphone, background location or Always-location access was added.
2. The copied web code calls relative /api/permit-route and /api/permit-road-context URLs. A bundled Capacitor origin does not provide those server endpoints. Current server functions require same-origin requests. Design and verify a native transport without broadly weakening origin checks before claiming QR-to-map works in the app.
3. Development config intentionally has empty backend credentials and keeps accounts, payments and operational guidance unavailable. Website account sync is not evidence of native callback/session behavior.
4. Complete the dependency privacy-manifest review, final app icon and actual-build privacy labels; assess account deletion, external navigation, file import/export, location denial, Safari/WebView differences, speech interruptions and offline/storage recovery on the native build.

Unsigned simulator compilation, when verified, is a useful milestone rather than release clearance. A signed IPA, TestFlight installation and physical iPhone QA are still required.
