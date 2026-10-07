# Drivers Lounge — RC2 Store Submission Copy

Release: `2.0.0-rc.2`

This file is the human-readable, ready-to-paste companion to `rc2-store-metadata.json`. Final account-specific contact details, bundle/package IDs, screenshots, signing, production Supabase QA, and physical-device testing remain owner gates.

## Apple App Store

**Name**  
Drivers Lounge

**Subtitle**  
Free tools and community for commercial drivers

**Promotional text**  
Built by drivers for drivers. Plan truck trips, check road intelligence, research carriers, connect with the driver community, and save useful offers without charging drivers for core services.

**Description**  
Drivers Lounge is a driver-first toolkit for commercial drivers.

Use one place to plan truck trips, review road intelligence, research carriers, participate in driver community rooms, save useful offers, and access practical road tools.

Key features include:
- Truck-focused trip planning with driver-entered vehicle and route considerations.
- Road intelligence and driver reports designed to help drivers prepare before and during a trip.
- Carrier research and current/former-driver reviews.
- Community rooms for driver discussion and information sharing.
- Community safety controls that let signed-in users report posts, let authors remove their own posts, and let users immediately hide another driver's Community content on their device.
- Account controls, support access, privacy information, and self-service account-deletion access.
- Saved offers and optional communication preferences.

Drivers Lounge is free for drivers. Advertising and sponsor-supported services help fund the platform.

Important: routing, road intelligence, community reports, and other road information are advisory. Posted signs, permits, official restrictions, law-enforcement direction, and safe driving judgment always control. Do not interact with the app while driving when it would be unsafe or unlawful to do so.

**Keywords**  
truck driver,trucking,truck navigation,road reports,carrier reviews,CDL,truck stops,community

**Primary category**  
Navigation

**Secondary category**  
Business

## Google Play

**App name**  
Drivers Lounge

**Short description**  
Driver-first navigation planning, road intelligence, carrier research and community tools.

**Full description**  
Drivers Lounge brings practical commercial-driver tools together in one driver-first app.

Plan truck trips, review road intelligence, research carriers, connect with other drivers, and save useful offers from a consistent mobile experience built around the needs of commercial drivers.

Drivers Lounge includes truck-focused trip planning, driver road reports, carrier research and reviews, Community rooms, road tools, account controls, support and account-deletion access.

Community content is user-generated. Signed-in users can report posts, authors can remove their own posts, and users can immediately hide another driver's Community content on their device.

Drivers Lounge does not charge drivers for core services. The platform is supported through advertising and sponsor opportunities.

Routing, road intelligence, community reports, and related information are advisory. Posted signs, permits, official restrictions, law-enforcement direction, and safe driving judgment always control. Drivers should only interact with the app when it is safe and lawful to do so.

## Review Notes

- Routing and road intelligence are advisory; posted signs, permits and official restrictions control.
- Location is requested only for features that need it. Background location must not be declared unless a later native build actually uses it.
- Community content is user-generated. Signed-in users can report posts, authors can remove their own posts, and users can immediately hide another driver's Community content on their device.
- The hidden-driver list is local to the device/browser and is not uploaded as a server-side profile attribute.
- Account deletion is available from the Account screen and from the public account-deletion page.
- Saved-offer email/SMS delivery is opt-in; saving an offer in-app does not require marketing consent.
- Drivers Lounge Free Finds are curated public offers and are not represented as paid sponsorships.

## Public URLs

Use the production Drivers Lounge origin plus these same-origin paths:

- Privacy: `/privacy`
- Terms: `/terms`
- Support: `/support`
- Account deletion: `/delete-account`

## Data-Safety Guardrails

Depending on feature use, the app may collect account identifiers, user-supplied profile/business information, user-supplied driver credential/profile information, location for location-dependent features, community posts/reports, carrier reviews/reports, road reports, marketplace content, support requests, advertising interaction events, saved offers, and optional mobile number/communication preferences.

Do **not** declare background location, contacts, microphone, photos/media library, SMS access, advertising identifier, cross-app tracking, or payments unless the final native build actually introduces and uses those capabilities.

## Final Owner Gates

Before store submission: apply and verify production Supabase migrations, complete authenticated QA, confirm legal/business/support contact information, choose final bundle/package identifiers, complete Apple/Google signing, test on physical iOS and Android devices, capture final store screenshots/artwork, and explicitly approve production promotion.
