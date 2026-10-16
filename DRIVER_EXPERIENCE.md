# Driver experience and business-funded growth

Development branch: `feature/permitted-load-navigation`. No production rollout or paid activation is included.

## Implemented

- `/start`: free driver landing page, 18 searchable tools, up to six local favorites, driver/pilot/owner views, larger text, a daily preparation checklist, and recent device trips with direct review/wallet links. The installed app starts here. No account, payment, GPS request or backend request is required on this page.
- Checklist entries reset by local date and never confirm permits, alter routes, certify inspections or approve departure. Changing the home-page role never changes the permitted-trip crew role.
- Wallet links select a saved device UUID and an allowed tab. Reopening a trip leaves GPS and sharing off. Missing links show an explicit warning; new-load links become stable saved-trip links after creation. Normal anchor links do not reload the trip.
- Public app files for My day, permits and the reference library are cached. Offline readiness checks every required dependency. Original permits remain in IndexedDB; the home page only renders a limited local summary. Account pages, business requests, offers, configuration and API responses are excluded from page caching.
- `/offers`: explicit browsing while parked, state/category selection, reviewed and current campaigns only, visible paid/unpaid labels, opt-in audio, and account-owned saving. Nothing automatically texts, emails, changes a route or requests GPS. Old popup code is inert and removed from dashboard/navigation.
- `/business`: three proposed business-funded programs, program selection, consent-based pilot inquiry using existing `support_tickets`, and a local downloadable request. There is no new checkout, price commitment, subscription, provider enrollment or driver-data permission. Failures preserve form values and never report success.
- Dashboard, global navigation, permit workflow, glossary and saved offers link into these entry points.

## Commercial approach

The first paying customers should be businesses receiving measurable administrative or customer-acquisition value. Individual driver tools remain free. Public pricing should follow fulfillment testing and an approved agreement; none is invented or activated by this change.

| Program | Who pays | Value to validate | What is ready | What still needs to be built/agreed |
| --- | --- | --- | --- | --- |
| Fleet team tools | Fleet/carrier | Fewer missed preparation steps; shared administration and document-expiry oversight | Pilot-interest page and inquiry | Organization roles, explicit driver sharing controls, team workspace, billing, support and terms |
| Service-provider introductions | Repair/tire/permit/pilot-car provider | Driver-requested, qualified business opportunities | Pilot-interest page and inquiry | Verified service areas, request acceptance, contact-release consent, fulfillment, dispute/refund policy and fee agreement |
| Merchant offers and redemptions | Merchant | Voluntary offer discovery and attributable redemptions | Explicit offer catalog and existing campaign/save integration | Merchant contract, reliable redemption evidence, attribution, refund rules and any commission settlement |

Existing advertising is a separate near-term path: campaign drafts, review, rate cards and gated checkout already exist. The new catalog gives it a voluntary discovery surface. Payment does not buy safety approval, a route detour, a favorable carrier review or access to private trip data.

Market evidence supports testing business-funded products: [Trucker Path for Business](https://truckerpath.com/truckerpath-business) offers business access to a driver audience, and [COMMAND](https://command.truckerpath.com/overview?point=TPhomepageTopbar) offers fleet workflow tools. This does not establish demand, audience size or pricing for Drivers Lounge. Clearly identify paid placements and disclose compensation when affiliate relationships are introduced, consistent with the [FTC native-ad guide](https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses) and [endorsement guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking).

Start with a small, manually supported pilot in one region. Measure business retention, accepted requests or verified redemptions and the time/cost to fulfill them before adding automated charging. Do not represent a page view as a qualified lead or a saved coupon as a sale. A provider has not agreed to pay merely by submitting this form.

## Additional convenience work worth prioritizing

1. **Recover after a lost or replaced phone.** Guided export/restore, a backup reminder before a trip, and a clear explanation of device-only storage. Optional encrypted account backup requires a deliberate design for keys, retention and recovery; never silently upload originals.
2. **One expiry center.** Permit travel windows, CDL, medical certificate, insurance and escort credentials in one view, with driver-chosen reminders and time zones. A missing or stale date must stay visibly uncertain.
3. **Driver-controlled arrival sharing.** A revocable, expiring ETA link for a chosen dispatcher or receiver, with coarse progress by default. Precise location and originals require separate permission.
4. **Better units and input.** Feet/inches alongside decimal feet, pounds/tons, axle-group explanations, autofill from a saved truck profile and explicit review when moving to a different trailer/load. Values must never change silently during conversion.
5. **Parking and stop confidence.** Show report age, truck access, contact details and availability uncertainty; allow a driver to call a location before arrival. Any fuel or parking stop on a permitted move needs a lawful, reviewed route connection.
6. **A brief crew readiness check.** Driver/lead/chase acknowledgement of the same route revision, radio channel, planned stops and reconnection instructions before departure. Loss of signal must not resemble live progress.
7. **Accessibility on real phones.** Larger touch targets, sunlight/high-contrast readability, screen-reader labels, glove-friendly choices and recorded pronunciation checks for route warnings. Test low-memory devices, screen lock and foreground/background transitions before road release.
8. **Straightforward issue reporting.** Let drivers preview and remove diagnostics from an app-error report. Include app version and steps, with trip documents and coordinates excluded unless deliberately attached.

Possible later revenue experiments are clearly labeled recruiting campaigns paid by carriers and employer-funded training access. Keep basic job applications and reference material free. These are ideas, not newly implemented programs. Do not sell driver location or private profiles to fund the app.

## Implementation and validation notes

- `assets/driver/model.mjs` owns local preferences/search/checklist and summary projection; `permits/launch.mjs` owns safe device links.
- `business.mjs` validates bounded contact data and explicit reply permission, then awaits `DLBackend.submit('support_tickets', ...)`. Anonymous inserts use `user_id: null`; signed-in requests use the current user. Existing support intake RLS/grants apply. No migration is added.
- `offers.mjs` filters approval, active flag, paid/comped status for paid campaigns, HTTPS destinations, validity windows and chosen state/category. Save errors propagate; saved-offer delivery is `in_app` only.
- Catalog events use existing `impression`, `open_later`, `save`, `audio_play`, `audio_complete` types. Signed-in visible impressions require at least half the card visible and are counted once per catalog visit; browsers without IntersectionObserver do not report them. These client events are best-effort, incomplete and spoofable, so they must not be used as invoice-grade proof. No redemption or conversion metric is fabricated.
- A catalog load retrieves up to 100 recent active campaigns. Filters apply to that loaded selection. Server pagination and server-authoritative revalidation belong in a larger marketplace release.
- 88 automated tests pass. The full local Node 22 build passes syntax, Stripe, Supabase contract, store readiness/submission and internal-link checks (56 pages / 822 local links).
- Browser checks: preference persistence, role suggestions, pinning, larger text, checklist reload/reset, tool search, exact-trip wallet opening with guidance off, required consent, unavailable-backend failure with form preservation, local request download, and explicit offer loading. No real inquiry, payment or merchant enrollment was submitted.
- With the local server stopped, My day reloaded, search worked, recent device trips appeared and the linked wallet opened with guidance off. The server was restarted afterward.
- Desktop layout was inspected. The browser's requested 390-pixel viewport override did not take effect (reported width remained 1280), so this change does **not** claim a completed phone-width browser check. Responsive CSS is present; real-phone layout and usability remain release checks.
- The local build uses non-production placeholder public configuration solely to exercise build gates. Hosted preview and authenticated business/offer end-to-end tests still need an isolated test backend with valid public configuration. Existing crew, licensed routing, physical GPS/voice and production release gates remain in `PERMITTED_NAVIGATION.md`.

## Rollback

Revert the driver-experience feature commit as a unit, because the My day tool list links to the new public business/offer routes. This restores the prior start URL, navigation, cached shell and advertising behavior. The accompanying documentation commit can be reverted separately. No database rollback or production migration is necessary for this addition. Keep existing trip data and original files in the device wallet.
