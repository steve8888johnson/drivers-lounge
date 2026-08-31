# Drivers Lounge RC2 — Store Release Checklist

Branch: `rc2-store-ready` only. Do not merge or promote to production until the owner explicitly approves launch.

## Public product URLs
- Privacy: `/privacy`
- Terms: `/terms`
- Support: `/support`
- Account deletion: `/delete-account`
- Account/preferences: `/account`

## Store positioning
**App name:** Drivers Lounge

**Subtitle / short description:** Free tools and community for commercial drivers.

**Long description draft:** Drivers Lounge brings commercial-driver tools into one driver-first app: route planning groundwork, road intelligence, carrier research and structured driver reviews, community rooms, load listings, pilot-car resources, marketplace tools, and one-tap Saved Offers. Road and routing information is advisory; drivers must verify posted signs, permits, restrictions, clearances and official sources.

**Primary categories:** Navigation / Business / Social (select the closest supported category in each store).

## App-review notes
- Navigation is a general road-route preview and is not represented as certified truck routing.
- Location is requested only for features that need it, including current-location routing and nearby road intelligence.
- Community content is user-generated. Signed-in users can report posts and authors can remove their own posts; support is available for escalations.
- Carrier reviews are structured around a driver's own current/former employment experience and include reporting/moderation groundwork.
- Account deletion can be initiated from the app Account screen or the public web deletion page.
- Saved-offer email/SMS delivery is opt-in. In-app saving works without marketing-message consent.
- Curated public deals are labeled as Drivers Lounge Free Finds and not represented as paid sponsorships.
- Paid advertising and curated public offers use separate source metadata.

## Privacy / data-safety inventory for store forms
Potential data collected depending on feature use:
- Email and account identifier
- Display/profile and business information supplied by the user
- Driver credential/profile information supplied by the user
- Approximate/precise location when the user permits location-dependent features
- Community posts and content reports
- Carrier reviews and review reports
- Road reports
- Marketplace/load/job/pilot-car content submitted by users
- Support requests
- Advertising interaction events and Saved Offers
- Optional mobile number and communication preferences for saved-offer delivery

Do not declare background location, contacts, photos, microphone, payments, advertising identifiers, tracking, SMS access or other permissions unless the shipping native wrapper actually requests/uses them.

## Required Supabase migrations before RC2 functional QA
Apply in order and verify in a DEVELOPMENT Supabase project first:
1. `005_rc1_platform_groundwork.sql`
2. `006_v1_auth_and_rls.sql`
3. `007_rc2_carrier_reviews.sql`
4. `008_rc2_security_and_views.sql`
5. `009_rc2_support_and_account_deletion.sql`
6. `010_rc2_load_marketplace.sql`
7. `011_rc2_driver_audio_ads.sql`
8. `012_rc2_advertiser_studio.sql`
9. `013_rc2_ad_pricing_and_billing.sql`
10. `014_rc2_advertiser_analytics.sql`
11. `014_rc2_support_hardening.sql`
12. `015_rc2_community_safety.sql`
13. `016_rc2_welcome_deals.sql`
14. `017_rc2_offer_delivery_preferences.sql`

Note: two historical migrations use the `014` prefix; preserve their filenames and execute both in the sequence above.

## Functional QA before submission
- Create account, confirm email if enabled, sign in/out, reset password.
- Complete onboarding and verify account/profile persistence.
- Submit and read a road report with location permission allowed/denied.
- Open Community, create room/post, report another user's post, remove own post.
- Search carrier/FMCSA data and submit/report a structured carrier review.
- Browse load listings; confirm unauthorized users cannot edit another account's listings.
- Create advertiser campaign with image/audio; verify it remains inactive pending review.
- Verify curated Free Find label cannot imply sponsorship.
- Save an offer in-app; verify email/SMS is only queued after explicit account opt-in.
- Submit support request while signed out and signed in.
- Submit account deletion request from Account and public deletion page.
- Install PWA on iOS/Android; test offline fallback and return online.
- Test primary screens at small-phone, large-phone, tablet and desktop widths.

## Native/store packaging blockers that require owner accounts
- Apple Developer Program enrollment / App Store Connect access.
- Google Play Console enrollment/access.
- Final bundle/package identifiers and signing credentials.
- Native wrapper choice/build (Capacitor or equivalent) if shipping native store binaries rather than PWA-only distribution.
- Store screenshots, icon renditions and final listing artwork generated to each store's current required dimensions.
- Final legal/business entity and support contact information.
- Production Supabase migration approval and execution.
- Final production-domain deployment approval.

## Launch gate
RC2 is not ready to merge to `main` merely because previews build. Launch requires: migrations applied and QA passed, store accounts/signing configured, legal/support information finalized, app binaries tested on physical iOS/Android devices, and explicit owner approval to promote production.
