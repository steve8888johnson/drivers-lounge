# Drivers Lounge — Store Submission Copy

Release: `2.0.2`
Build: `2000004`

Production identifiers are finalized:

- Android package: `dev.atlasdigital.driverslounge`
- iOS bundle ID: `dev.atlasdigital.driverslounge`
- Apple SKU: `atlas-digital-drivers-lounge-ios`
- Google Play target API: 36

The remaining account-only work is enrollment, agreements, signing, app-record creation, final physical-device screenshots, the background-location demonstration video, privacy questionnaires and submission. The product must remain in beta until independent routing consensus and physical-device evidence are complete.

## Apple App Store

**Name**
Drivers Lounge

**Subtitle**
Truck routes and driver tools

**Promotional text**
Built by drivers for drivers. Plan truck trips, review restrictions, connect with other drivers, and find useful road tools. Core driver services stay free.

**Description**
Drivers Lounge is a driver-first toolkit for commercial drivers.

Plan truck trips, review road intelligence, research carriers, participate in driver community rooms, save useful offers, and access practical road tools from one place.

Key features include:

- Truck-focused route planning using driver-entered height, width, length, weight, axle, trailer and hazmat information.
- Parked route review, restriction notices, route-deviation freeze behavior and privacy-minimized native field diagnostics.
- Issued-permit workflows that keep the original permit route controlling for oversize and overweight movements.
- Road intelligence and driver reports that help drivers prepare before and during a trip.
- Carrier research and current/former-driver reviews.
- Community rooms with reporting, author removal and device-level hidden-driver controls.
- Private driver credentials, document tools, support access and self-service account-deletion access.
- Saved offers and optional communication preferences.

Drivers Lounge is free for drivers. Advertising and sponsor-supported services help fund the platform. Commercial payments are disabled in this release.

When the user starts reviewed native guidance, Drivers Lounge collects precise location data to enable live truck guidance, route progress and deviation warnings even when the screen is locked or another app is open. Location use ends when the user taps Stop guidance. Background location is not used for advertising or analytics.

Important: routing, road intelligence, community reports and other road information are advisory. Posted signs, issued permits, official restrictions, law-enforcement direction and safe driving judgment always control. Do not interact with the app while driving when it would be unsafe or unlawful to do so.

**Keywords**
truck driver,trucking,truck navigation,road reports,carrier reviews,CDL,truck stops,community

**Primary category**
Navigation

**Secondary category**
Business

**Bundle ID**
`dev.atlasdigital.driverslounge`

**SKU**
`atlas-digital-drivers-lounge-ios`

**Version / build**
`2.0.2 (2000004)`

**Privacy policy URL**
https://driverslounge.app/privacy

**Support URL**
https://driverslounge.app/support

**Account-deletion URL**
https://driverslounge.app/delete-account

### Apple App Review Notes

Drivers Lounge is a commercial-driver toolkit. Route planning and public road tools can be reviewed without signing in. Account-only features display a sign-in entry point; a reviewer account can be supplied in App Store Connect when the signed release build is uploaded.

To review location behavior:

1. Open Navigation while parked.
2. Read the prominent location disclosure.
3. Enter a non-sensitive route and truck profile, calculate the route and complete the parked review.
4. Tap Start guidance and allow precise location.
5. Put the app in the background or lock the screen. The iOS system location indicator remains visible while guidance is active.
6. Return to Drivers Lounge and tap Stop guidance. The location watch, speech and system indicator end.

Background location supports real-time navigation instructions, route progress and route-deviation warnings only while user-started guidance is active. It is not used for advertising or analytics. A controlled moving deviation test must be operated and observed by a passenger.

The build contains a Native Field Diagnostics screen. Its exported evidence packet stays on the device unless the user exports it and contains no coordinates, addresses, route geometry, permit contents, account identifiers, device identifiers or free-form notes.

Routing and road intelligence are advisory. Posted signs, issued permits and official restrictions control. Oversize/overweight automatic optimization is blocked; the issued permit route remains controlling.

Community content is user-generated. Signed-in users can report posts, authors can remove their own posts and users can immediately hide another driver’s Community content on their device. Account deletion is available in Account and at the public deletion URL.

## Google Play

**App name**
Drivers Lounge

**Short description**
Plan truck routes, review restrictions, and connect with fellow drivers.

**Full description**
Drivers Lounge is built by drivers for drivers.

Plan commercial-truck trips with a driver-entered vehicle profile, review route restrictions while parked, keep issued permit routes controlling for oversize and overweight work, and use practical tools for the road.

Drivers can also review current road reports, research carriers, participate in community rooms, manage private credentials and documents, find pilot-car and job resources, save useful offers, and request support or account deletion.

When the user starts reviewed native guidance, Drivers Lounge collects precise location data to enable live truck guidance, route progress and deviation warnings even when the app is closed or not in use, including when the screen is locked or another app is open. Location use stops when the user taps Stop guidance. Background location is not used for advertising or analytics. Android displays a persistent navigation notification while background guidance is active.

Drivers Lounge is free for drivers. Advertising and sponsor-supported services help fund the platform; ads never cover an active maneuver or safety warning.

Routing, road intelligence and community reports are advisory. Posted signs, issued permits, official restrictions, law-enforcement direction and safe driving judgment always control.

**Package name**
`dev.atlasdigital.driverslounge`

**Version / versionCode**
`2.0.2 / 2000004`

**Target API**
Android 16 / API level 36

**Category**
Maps & Navigation

**Privacy policy URL**
https://driverslounge.app/privacy

**Account-deletion URL**
https://driverslounge.app/delete-account

### Google Play background-location declaration

Core feature: user-started live commercial-truck guidance. Precise location updates route progress, supplies maneuver guidance, detects unreliable GPS and freezes guidance after a route deviation while the screen is locked or another app is open.

Use starts only after the user reviews a route and taps Start guidance. Android displays a persistent navigation notification. Stop guidance ends the native location watch, speech and notification. Permission denial blocks background guidance. Location is not used for ads, ad targeting or analytics, and continuous coordinates are not automatically uploaded as location history.

Use the exact declaration and video script in `store/background-location-declaration.md` when completing the Play Console permissions form.

## Review Notes

- Routing and road intelligence are advisory; posted signs, issued permits, official restrictions and law-enforcement direction control.
- Route deviation freezes guidance and instructs the driver to pull over. The app does not silently accept an automatic detour.
- Background location starts only during user-started native guidance and ends with Stop guidance.
- Android shows a persistent navigation notification; iOS shows the system location indicator.
- Background location is not used for advertising or analytics.
- Permit scanning uses the camera only after the user chooses that feature.
- Community reporting, author removal and hidden-driver controls are available.
- Account deletion is available in the app and through the public deletion page.
- Saved-offer email and text delivery are opt-in.
- Commercial payments are disabled in release 2.0.2.

## Data-Safety Guardrails

Declare only behavior verified in the signed submission build. Depending on which features a user chooses, Drivers Lounge may process account identifiers, profile and business information, driver credentials, precise foreground location, precise background location during active guidance, community and review content, road reports, permit documents saved to an account, support requests, advertising interaction events, saved offers and optional communication preferences.

Background location is used only for app functionality. It is not sold, used for advertising or used for analytics. The local native field-evidence packet is not automatically collected by Drivers Lounge.

Do not declare contacts, microphone access, health data, financial account credentials or unrestricted photo-library access unless the signed submission build actually adds those capabilities.

## Final Owner Gates

- Apple Developer Program enrollment and current Apple agreements.
- App Store Connect app record for `dev.atlasdigital.driverslounge` and SKU `atlas-digital-drivers-lounge-ios`.
- Google Play Console enrollment and app record for `dev.atlasdigital.driverslounge`.
- Secure Android upload key and Apple distribution signing/provisioning.
- Final screenshots from signed physical-device builds and a background-location demonstration video.
- Apple privacy details and Google Play Data safety/background-location forms.
- A second independent truck-routing provider and a passing deployed consensus benchmark.
- Physical Android and iPhone field-evidence packets.
- Final production Supabase QA and leaked-password protection enabled in the Supabase dashboard.
- Final legal review of Privacy, Terms and location disclosures.
