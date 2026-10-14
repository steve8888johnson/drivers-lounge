# Permitted-load navigation development candidate

Entry: Navigation → **Create a permitted trip** (`/permitted-loads`). This feature targets `rc2-store-ready`; it is not a production release or a change to Highway Automation.

## Implemented

- Loaded dimensions, gross weight, axle count/group notes and hazmat information.
- Multiple state permits, original JPG/PNG/WebP/PDF pages in IndexedDB, local camera/photo QR decoding (vendored jsQR 1.4.0, Apache-2.0 license included), copied-text extraction, raw QR retention and manual entry.
- Separate confirmation of the original permit and its detailed route geometry. Changes invalidate the relevant confirmation. Imported packets never inherit confirmation from another device.
- Directed ordering by state-border roads; missing states, duplicate/ambiguous continuations, road mismatches and geometry gaps block guidance. Geometry is concatenated in permit order. No routing, optimization, geocoding or detour engine is called.
- Route geometry view with labeled state entries, active permit, current and upcoming maneuvers, remaining distance, supplied road/lane text, spoken warnings, lead/chase alerts and a roadside wallet shortcut.
- Accurate/fresh GPS requirements, ordered corridor matching at crossings, deviation hold without automatic rerouting, permit-local effective-date checks and completed single-trip blocking.
- Optional copied movement windows: local time zone, permitted start weekdays, overnight windows and closed dates, with a 15-minute closing warning. Complex restrictions stay verbatim and require departure review; daylight/holiday/municipal rules are not guessed.
- Permit limits compared with loaded dimensions and weight. No live clearance/weight/hazmat/closure dataset is connected.
- Original documents and route data stay in the local wallet; explicit trip-packet export includes originals. Offline app shell and route geometry are cached. Private API/config/account data and street map tiles are not cached.
- Opt-in authenticated live crew publishing, single-use 12-hour lead/chase invitations, route revision checks, acceptance, progress/separation, stale-position labels and revocation. UI is implemented; hosted live crew operation requires the isolated preview migration and authenticated accounts.

## Supplied permit evidence, checked September 24, 2026

Both uploaded audible-guidance QRs decoded locally after adding overlapping image crops and contrast passes. Original photographs, private QR URLs and returned provider credentials are **not committed**.

- **Ohio:** the public navigation endpoint responded without authentication. The allowlisted adapter imported 20 maneuvers and 1,311 coordinates, from `I-80 PA Line` to `US-30 IN Line`. It decodes the endpoint's explicit polyline precision and preserves maneuver text and coordinate order. The photo itself is cropped and lacks the permit number, validity dates and remaining restriction pages. Those remain required. The returned provider API-key field is discarded and never used.
- **Illinois R38740590:** September 22–27, 2026, single trip, Indiana/I-94 → Iowa/I-80. The photo-reference fixture retains the US-6 / I-294-TOLL N / I-80 W fork, I-80 toll segment and exit-5 instruction, including the printed mileage discrepancy. Its QR endpoint returned HTTP 401. The application retains the QR and original and requires manual entry or legitimately authorized route data. It does not retry with credentials or call an authenticated service.
- **Indiana is missing.** The source evidence is not a ready-to-drive multistate trip. No connecting roads or missing permit instructions have been invented.

## Data adapters

`api/permit-route.mjs` allows only the two observed HTTPS host/path formats, refuses redirects, omits credentials, enforces body/response/time limits and returns only permit fields. It never returns the provider API key, scripts, image URLs or SSML. Generic public HTTPS QR references are fetched only after the operator chooses import, using browser CORS and no credentials; unsupported/authenticated data falls back to manual entry. New state formats should receive their own adapters and fixtures.

Supported direct encoded data:

```json
{
  "schema": "dl-permit-route/v1",
  "permit": {
    "state": "OH",
    "number": "ISSUED-PERMIT-NUMBER",
    "kind": "single-trip",
    "validFrom": "2026-09-22",
    "validTo": "2026-09-27",
    "timeZone": "America/New_York",
    "entry": {"label": "Copy issued origin", "state": "PA", "road": "I-80"},
    "exit": {"label": "Copy issued destination", "state": "IN", "road": "US-30"},
    "routeText": "Exact issued instruction, one source line per instruction",
    "restrictions": "Exact issued restriction text",
    "steps": []
  }
}
```

Each step has `routeLine` (one-based source line), `text`, `road`, `lane` and `points` in `[latitude, longitude]` order. Add lawful, verified detailed geometry; empty steps cannot navigate. Imported geometry is never automatically confirmed. Public issuer polylines retain their original simplified straight sections; manual geometry has a stricter spacing check. All geometry requires comparison against the complete controlling permit. A polyline and GPS proximity alone cannot certify legal road occupancy, bridge clearance or lane accuracy.

## Crew privacy and deployment

The generated migration `supabase/migrations/20260925010204_permitted_trip_crew.sql` creates isolated `dl_permit_*` tables and a private invitation helper. It has **not been applied to the production database**. Apply and verify only in an isolated preview database before hosted crew testing.

RLS restricts route reads to the owner/invited members, route writes to the owner, and location writes to the current user and accepted current route revision. Invite tokens are high-entropy, stored hashed, consumed under a row lock and expire. Members cannot change their role or owner. Position timestamps are server-controlled. Stale positions expire from the read policy after two minutes; the UI marks them stale after 20 seconds. Stopping guidance deletes the current position; privacy/race checks prevent an in-flight update from restarting sharing. Trip deletion cascades crew data; local deletion removes local originals separately.

Offline trip packets work without the crew service. A linked live trip currently requires connectivity at guidance startup to verify the shared revision, then cached local guidance continues through signal loss. Location sharing pauses on signal loss. Browser GPS/speech are foreground features; hiding the page stops guidance and sharing. Native background navigation and physical-device road verification remain release gates.

## Validation

Node 22: `npm ci`, then `npm test`. The suite includes domain/import tests, fake-IndexedDB persistence/import/deletion tests and a real local PostgreSQL engine (PGlite) that executes the migration and exercises ownership, invitations, row policies, revision acceptance, location spoofing and revocation. No hosted database is mutated by tests.

Run `npm run build` with the existing public Supabase preview environment. Local build validation can use a dummy publishable configuration, but that does not test hosted authentication. `node scripts/serve-preview.mjs` serves the source and the allowlisted public resolver at `http://127.0.0.1:4318/permitted-loads`.

Browser checks cover load editing, Ohio QR/photo import, Illinois authorization fallback, wallet originals, disabled guidance for incomplete permits, mobile layout and successful wallet/page reload while the local server is stopped. GPS progression and failure cases use synthetic coordinates in unit tests; no road drive is claimed.

Before release: obtain complete permit evidence and legitimate geometry for all states; test the crew migration and two signed-in devices on a dedicated preview; validate permissions/speech/GPS/offline behavior on supported phones; connect licensed restriction/basemap/native-navigation services if required. Keep this feature unmerged until those gates and the production release decision are complete.

## Hazmat routing review

The Hazmat tab now records multiple materials: UN/NA identifier, proper shipping name, primary and subsidiary class/division, packing group, quantity/units, packaging/residue status, inhalation hazard and HRCQ status. The carrier records placarding applicability, shipping-paper/emergency references, compatibility review for mixed cargo and written route-plan references when required. Existing legacy hazmat notes also activate the checks.

Each state route needs a source-backed carrier determination, reviewed-on and coverage-through dates, reviewer, authority URL, current registry/authority checks and notes. Unknown applicability, conflicts, missing evidence, changed cargo/route/date, and expired reviews block guidance and crew publishing. An OS/OW permit does not override a hazmat restriction. The app does not calculate an alternative route. A carrier hazmat route-plan record supports hazmat-only travel without inventing an OS/OW permit; the written plan and detailed geometry must be supplied and reviewed.

Operators can attach source-linked warnings to exact supplied maneuver lines. Driver and lead/chase guidance show and speak these warnings, including upcoming warnings within 800 meters. The wallet retains cargo and route-review references. Offline packets preserve the data while discarding cargo and route confirmations, and crew revision matching includes the cargo and hazmat determinations.

Official reference directory checked September 24, 2026:
- FMCSA National Hazardous Materials Route Registry by State: https://www.fmcsa.dot.gov/regulations/hazardous-materials/national-hazardous-materials-route-registry-state
- CAMEO Chemicals: https://cameochemicals.noaa.gov/about and https://cameochemicals.noaa.gov/browse/unna
- PHMSA Emergency Response Guidebook: https://www.phmsa.dot.gov/training/hazmat/erg/emergency-response-guidebook-erg
- Federal routing requirements: 49 CFR 397.67 and 397.101, linked from the UI, with the FMCSA highway routing guidance and training manuals as supporting references.

The bundled directory contains official FMCSA links for all 50 states and DC plus 2,369 public UN/NA identifiers for CAMEO deep links. It is not a machine-readable, complete road restriction dataset. The link-check date is not a document effective date. State/tribal/local routing authorities, current exceptions, and any delivery-specific requirements still need review. Older state publications and absent entries never produce automatic clearance.

CAMEO opens the matching UN/NA reference only when the operator follows the link; a number may represent multiple chemical datasheets. Chemical classification, compatibility, emergency-response distances and route legality are never inferred. No third-party CAMEO chemical datasets, CAS proprietary data or NFPA ratings are republished. Official reference pages require connectivity; use official offline CAMEO/ERG products for offline emergency reference.

Release limitation: this implements hazmat profiles, exact-route review gates and reviewed maneuver alerts. Automatic national hazmat route generation, live restriction ingestion, tunnel/bridge geofencing and a validated commercial routing provider remain unconnected. Keep the feature in development until those services and physical-device verification are complete.

## Parked route walkthrough and draft safeguards

The Route tab provides a read-only walkthrough after permit, geometry and hazmat reviews pass. It uses the supplied maneuvers in matched border order, shows the exact instruction, source line, road/lane data, supplied segment distance, state entry and next maneuver. Driver/lead/chase notes and current/upcoming source-linked hazmat warnings appear beside the instruction. Each state links to its original wallet entry. This is explicitly parked review, not GPS simulation, navigation authorization or a substitute for departure checks. It never starts GPS or writes crew positions and is hidden during live guidance. Both modules are cached for offline review.

Discard restores the complete last saved trip, including hazmat edits already reflected in the editor. Draft capture applies all form fields together only after geometry parsing succeeds. Reordering JSON properties leaves an otherwise unchanged geometry confirmation and public-source provenance intact; meaningful instruction/coordinate/lane/source-line edits invalidate geometry. Cargo status updates as fields change. In-app confirmation dialogs allow cancellation before switching, removal or completion. Switching trips and stopping guidance clear old maneuvers, warnings and crew display state; stale or unavailable GPS clears actionable distance/road guidance.

Validation on September 25, 2026: 67 automated tests passed, followed by the full Node 22 build, syntax and existing store/link/contract checks. Browser checks exercised the synthetic three-state workflow, permit/geometry/cargo/state confirmations, no-op save, OH→IN maneuver boundary, lead-escort notes, immediate cargo invalidation, Cancel versus Discard, malformed-geometry rejection, and retained reviews after saving. The latest route walkthrough and hazmat alerts loaded with the local server stopped. A 390×844 viewport had no horizontal document overflow. These are synthetic/software checks, not physical-road or hosted two-account crew tests.

For repeatable UI QA, run `node scripts/create-permit-qa-packet.mjs <output.json>` and import the packet into a local or isolated development wallet. Every field and original placeholder is labeled synthetic; coordinates do not represent real state borders or a lawful route. Packet import strips confirmations, so confirm each record through the UI to exercise the positive workflow. Do not start live guidance with this fixture. The fixture date is the current Chicago date and must be regenerated for a later test day.

## Road rules and glossary

The `/compliance` library adds 165 terms, 52 rule/program entries and official reference desks for all 50 states plus D.C. Search supports acronyms, citations, topics, jurisdictions, entry types and A–Z filtering. Bookmarks, shareable links, printing and an offline reference shell support trip preparation. Premium Navigation and the permitted-trip, Hazmat and Pilot cars views link to the library. The reference never changes a route or a confirmation and does not assert exhaustive state-rule coverage. See `COMPLIANCE_REFERENCE.md` for scope, source types/dates, access limitations and maintenance.

Validation after this addition: all 75 automated tests and the full Node 22 build/readiness checks passed. Desktop/mobile browser checks covered search, bookmarks, state isolation, related/shared links, A–Z and empty results. The library also reopened and remained searchable with the preview server stopped, including a state-filtered URL and saved entries. Physical printing was not tested. Production remains unchanged.
## Permit QR intake readiness — October 14, daytime

Owner clarified the load is about one foot over normal width. This is an estimate, not a measured total; no dimensions were inferred or entered into the trip. Draper–Brunswick remains an overdimensional draft awaiting actual measurements and issued permits.

Prepared an explicit scan/import workflow: several pages selected together become one state-permit record; saved QR actions survive reload; encoded routes require an explicit import choice; a different state/permit number cannot overwrite the selected permit. Changed route text or entry/exit clears old geometry. Imports invalidate approvals, retain originals, and never infer roads or reroutes. Scan failures retain originals; PDF originals are saved but QR decoding still requires a photo or copied contents. Camera sessions are bound to the trip/permit and invalidated on stop, replacement, hidden page or leaving Review. File selectors are keyboard reachable.

Validation:218tests pass, including real ordinary/inverted QR pixel decoding using the vendored decoder, conflict rejection, geometry invalidation and stale camera-session tests.136JavaScript files and4inline scripts,815internal references, existing static checks and a build in an isolated output folder pass. Actual localhost browser decoded a synthetic QR photo, saved it and a conditions page under one permit, restored both originals and QR actions after reload, imported the exact synthetic route, and rejected a conflicting-state QR without changing it. Guidance remained disabled.390px layout had no horizontal overflow; no errors/warnings captured for the QA tab. No physical phone camera, real new-load QR, road or GPS field test has occurred.

Release candidate only at time of writing; record exact production result separately. Operational guidance remains disabled; no TomTom route request or credential/DNS/account/payment changes in this pass. Existing57dist edits preserved. Complete originals, all conditions, explicit dates and loaded measurements, legitimate detailed geometry and border continuity remain required before assessing the actual route. No promise of driving readiness from a successful scan.
## Permit scanner live — October 14, 16:18 UTC

Source20d6920f06d3eb2485e9bb5bfa048c06fdcb7e89 pushed to release/atlas-20261006 and released to existing Drivers Lounge production project. Deployment dpl_5tvRE9U5CPD96EEpocwVdo4T2h8H is READY, alias driverslounge.app; remote build completed in10seconds. Four live JS/CSS/service-worker assets match source, pageHTTP200 and exact camera=self policy verified. Config remains readOnlyBeta=true, permitGuidanceEnabled=false, with no browser backend credential. Immediate deployment-scoped10-minute error/fatal counts returned no groups; live tab logs contained no errors/warnings. This is not sustained monitoring or physical-device field evidence.

218localtests pass,136syntaxfiles+4inline,815references and isolated build passed. Actual local browser additionally verified a corrupt image stays saved with a clear scan-failure message, alongside prior originals and QR references. The synthetic test wallet exists only on localhost, not the owner's production load.

Owner's live Draper–Brunswick draft opened to Review, and one empty state-permit placeholder was added to expose the QR photo/camera controls. No real permit, state, route, number, date or measurement was invented. No original uploaded; no guidance started. User clarified approximately one foot over normal width, still unmeasured total. This browser's device wallet is not automatically shared with the phone; export/import is the supported transfer. Production screenshot: outputs/permit-scanner-live-ready.jpg; live checks: outputs/permit-intake-live-check-20261014.json; tests: outputs/permit-intake-tests-20261014.txt.

Next requires actual full permit/QR/conditions pages and measured loaded width, height, length, weight and axle details. Only two previously observed QR endpoint formats have adapters; other-state QR formats need inspection/adapters or legitimate manual route data. Scanning is ready; automatic support for every state and operational guidance are not verified. TomTom standard-truck connection does not authorize oversize detours. No purchases, new charges authorized, DNS/credential/account/payment changes, PR4 merge or automation resume.57preexisting dist changes remain untouched.


## Permit maneuver and border review — October 14, daytime

Prepared for tomorrow's issued Draper–Brunswick permit review; measured load totals and actual permits are still absent. The owner's approximate excess width was not converted to a measured width, and no route/state chain was invented.

Guidance sessions now capture an immutable trip snapshot and reject late callbacks from cancelled/replaced sessions or changes to the load, dates, originals, approvals and crew revision. Withdrawing departure checks stops guidance; disabling speech cancels queued speech. Only accepted GPS fixes advance the freshness timer. The matcher holds on nearby conflicting occurrences even with prior progress, accumulated backward travel, multi-maneuver jumps, missing/invalid/out-of-order GPS and long gaps. A metadata-only permit check cannot substitute for reviewed geometry. Empty source lines and zero-length maneuvers fail geometry review. Separate maneuvers citing the same printed line receive separate speech keys. End-of-line stops without claiming arrival or completing a single-trip permit.

Before a supplied state boundary within800m, the disabled guidance code checks the next permit's dates and copied clock window in its entered timezone. This conservative engineering threshold is not a validated stopping distance, arrival prediction, road/carriageway/heading match, or interpretation of daylight/holiday/escort restrictions. Missing structured windows are not represented as unrestricted travel. Physical-device/GPS/voice/lockscreen evidence and authoritative road/geometry/condition checks remain open; operational guidance stays OFF.

The parked walkthrough now displays the exact saved source line, next-state border roads, permit number, effective dates/timezone, copied window and original conditions, with a direct wallet jump. Its status says Ready for parked review. Current-time warnings are explicitly not permission at future arrival. Imports still require local review and original pages.

Validation:231tests pass, including13new session, deviation, direction, loop, GPS, skipped-turn, border-time, terminal and geometry cases.138JavaScript files plus4inline scripts parse,815internal references and existing static checks pass. Isolated build passes with readOnlyBeta=true and permitGuidanceEnabled=false; original dist not rebuilt. Browser localhost synthetic two-state packet imported through UI, both states reviewed, source lines and closed next-state window displayed, correct wallet opened, terminal Next disabled and operational guidance disabled.390px layout has no horizontal overflow; QA tab error/warning logs empty. No actual permit, phone GPS, speech, camera or road test occurred. Evidence: parent outputs/permit-guidance-tests-20261014.txt, permit-guidance-build-20261014.txt, permit-guidance-desktop-qa.jpg and permit-guidance-mobile-qa.jpg.

Release candidate at this entry; record production verification separately. No provider requests, DNS/credentials/account/payment changes, new charges, PR4 merge or automation resume.57preexisting dist changes preserved. Source and tests do not establish driving readiness.


## Maneuver review released — October 14, 16:35 UTC

Source 31bf98096efedc3212329d3dc7a1dfefb27f6979 pushed to release/atlas-20261006. Production deployment dpl_G6XN9KUQ13BnhAWGFQHEg4LFp7HB is READY with driverslounge.app alias; remote build completed in 15 seconds. Six public assets match the tested source, page HTTP200 and camera/self policy confirmed. Public config remains readOnlyBeta=true, permitGuidanceEnabled=false, with no browser backend credential. Immediate deployment-scoped 10-minute error/fatal query returned no groups, and the live tab reported no error/warning logs; this is not sustained monitoring or physical-device evidence.

Actual live browser retained the owner's existing Draper–Brunswick overdimensional draft and empty state-permit placeholder. Route says Needs review; the parked walkthrough remains unavailable until actual permit/geometry checks pass, and operational guidance remains disabled. No load values, documents, state sequence or route were fabricated. Current real-load tab is left on Route. The synthetic two-state walkthrough and original-file fixture exist only on localhost. 231 tests pass; 138 syntax files plus four inline scripts, 815 references and isolated build passed. Last accepted GPS-only freshness change also parses; production rebuild checks passed.

Evidence: parent outputs/permit-guidance-live-check-20261014.json, permit-guidance-tests-20261014.txt, permit-guidance-build-20261014.txt, permit-guidance-live-hold.jpg and permit-guidance-desktop-qa.jpg. This release supports parked review, not operational driving. Remaining critical gates: measured loaded dimensions/weight/axle details; full issued permits and conditions for every actual state; legitimate detailed geometry and source authenticity; road/ramp/direction/site-access association; temporal/escort/closure checks and physical-device field validation. Copied clock checks and distance heuristics are not complete legal clearance. No TomTom calls, credentials/DNS/account/payment changes, new purchases, PR4 merge or automation resume. All 57 historical dist changes preserved.


## Parked iPhone and speech rehearsal — October 14, 17:08 UTC

Owner selected iPhone Safari for tomorrow's parked test. Added /permit-phone-check with large voice controls, local English voice selection/rate, clearly labeled synthetic approach/turn/border/GPS-loss/permit-change prompts, an optional bounded GPS reception check, explicit keep-screen-on testing, and a downloadable record separating browser observations from human hearing/physical-interruption confirmations. No coordinates or original permits enter that record. Results are not automatically submitted or synced. Device voice preferences alone persist locally. The static shell is added to the service-worker cache; real iPhone offline behavior remains unverified.

The permit walkthrough now reads the exact reviewed supplied maneuver and border reminder with a parked-review prefix. Shared speech cancels obsolete prompts, gives hold warnings priority, rejects unknown/remote voices, catches errors and stalled startup/completion, ignores callbacks from old speech, and requires deliberate retries. Edits, next/previous maneuver, leaving Route and hiding the page cancel speech. Speech failure stops any future enabled guidance session. A voice-off setting no longer corrupts active-state display. Operational guidance remains disabled.

248 tests pass (17 new phone/speech cases); isolated build passes with readOnlyBeta=true and permitGuidanceEnabled=false. Desktop browser observed speech start/end, Stop, synthetic reviewed-maneuver playback and next-step cancellation. Record download verified with human confirmations false, GPS not tested, operationalGuidance=false and no coordinates. A 390px viewport has no horizontal overflow and all buttons measure48px tall; this is Chromium viewport testing, not iPhone Safari. No error/warning logs captured in the local QA tabs. Physical speaker/Bluetooth, GPS, lock/call, keep-screen-on and offline voice checks remain for the owner's phone. Tests and browser events do not prove audible delivery or lawful travel.

Release candidate at this entry; exact source and deployment verification will be recorded separately. See PERMIT-PHONE-TESTING.md for the phone procedure and primary API references. Actual Draper–Brunswick measurements and issued permits remain missing; the approximately one-foot excess width was not converted into a measurement. No real trip data or state route was invented. No provider requests, charges, purchases, credentials/DNS/account/payment changes, PR4 merge or automation resume. Existing57dist edits preserved; original dist was not rebuilt.


## iPhone rehearsal and spoken review live — October 14, 17:12 UTC

Source 98a07e1bf6e3563562c591d51732da2fce7f9432 pushed to release/atlas-20261006. Existing Drivers Lounge production deployment dpl_GdeSHe565T17zs7MyxYb6dBUWuV6 is READY, alias driverslounge.app, remote build about15seconds. Public /permit-phone-check and /permitted-loads returnHTTP200. Six live assets match the tested source. Camera remains denied on the phone-check page and self-only on the permit scanner; location is self-only. Public config confirms readOnlyBeta=true, permitGuidanceEnabled=false and no browser backend credential. Immediate deployment-scoped10-minute error/fatal counts returned no groups; the live phone-check tab reported no error/warning logs. These are bounded checks, not sustained monitoring.

Live desktop browser reports speech playing after Play sound check and stopped after Stop voice. Hearing, Bluetooth and physical-interruption checkboxes remain unconfirmed. The existing live Draper–Brunswick draft and empty state placeholder survived reload. The Route tab now links to the phone check, still says Needs review, and operational guidance remains disabled. No production load data was modified in this pass.

248tests,142syntaxfiles+4inline scripts,822internal references and isolated build passed. 390px viewport had no horizontal overflow and48px buttons. Desktop test evidence does not establish iPhone Safari support: actual speaker/Bluetooth audibility, GPS, physical lock/call, keep-screen-on and offline voice behavior still require the owner's parked phone test. Tomorrow's full permits and measured loaded totals remain prerequisites to reviewing the actual route. Reviewed supplied maneuvers can be read aloud; navigation is not operational and no road legality is certified.

Evidence: outputs/permit-phone-live-check-20261014.json, permit-phone-tests-20261014.txt, permit-phone-build-20261014.txt, permit-phone-mobile-qa.jpg and permit-phone-live-ready.jpg. Phone procedure: work/drivers-lounge/PERMIT-PHONE-TESTING.md. New code is committed and pushed; this release receipt is documentation only. All57preexisting dist edits remain unchanged. No provider requests, new purchases/charges, credentials/DNS/account/payment changes, PR4 merge or automation resume.


## Permit import fidelity and end coverage — October 14, daytime

Prepared the expected October15 scan/review workflow without inventing actual load data or states. QR/text import now previews the full saved and proposed field text, changed/retained values, maneuver counts and obsolete geometry before applying. Cancel leaves the saved route intact. Apply resets complete-page/original/geometry reviews; existing originals and QR references remain. The dialog initially focuses its heading, has stacked48px controls at390px width, and identifies retained conditions as unverified by the new import. Changed/switched permit context rejects late fetch/approval results.

Permit/QR/provider boundaries now reject oversized supported text whole rather than silently slice it; invalid stated vehicle limits and excess QR references also reject explicitly. Text extraction no longer guesses issuing state from incidental border/destination names. Supported public endpoint responses must match the state encoded by the endpoint. First or last saved permit pointing to an uncovered state now holds the master review, including an otherwise reviewed chain. Synthetic fixtures were corrected to have their actual synthetic pickup/delivery inside their first/last states; tests separately assert uncovered endpoints fail. This still cannot establish real pickup/delivery access, road association or all-state coverage without originals.

259tests pass, including11new source-fidelity, endpoint-coverage, response-state, preview-preservation and stale-context cases. Local browser created a separate SYNTHETIC IMPORT COMPARISON ONLY record: cancellation left fields/geometry unchanged; applying the initial draft retained two exact maneuvers; a revised route preview warned that2maneuvers would be removed and conditions retained; applying removed stale geometry; a GA QR could not replace the selected UT record. Reload retained saved QR actions.390px modal has no horizontal overflow and317px-wide48px-high buttons. Local browser error/warning logs empty. No real permits or provider calls; iPhone camera/Safari/field behavior untested. Isolated build keeps readOnlyBeta=true/permitGuidanceEnabled=false and does not touch historicaldistchanges.

Release candidate here; exact production receipt follows separately. See PERMIT-INTAKE-CHECKLIST.md and PERMIT-PHONE-TESTING.md. Source changes remain within the authorized parked-review scope; operational guidance/accounts/payments stay off. No purchases, credentials/DNS changes, PR4 merge or automation resume. Physical phone testing remains with the owner.


## Import review released — October 14, 17:43 UTC

Source e173a9215ab6864d99a6de533ee341188bf7a124 pushed to release/atlas-20261006 and deployed to the existing Drivers Lounge production project. Deployment dpl_5j4jYENswv2gj424FBGNNVvz3Gid READY, driverslounge.app alias, about15seconds remote build. Seven live assets match the tested source; /permitted-loads includes the new comparison dialog and returnsHTTP200, /permit-phone-check still returnsHTTP200. Camera/self scanner policy preserved. Public config remains readOnlyBeta=true, permitGuidanceEnabled=false with no browser backend credential. The bounded10-minute deployment-scoped error/fatal query returned no groups; the live route tab had no captured error/warning logs. No sustained monitoring claim.

Live browser reloaded the owner's Draper–Brunswick draft and confirmed one empty state placeholder, Needs review, comparison UI present and operational guidance disabled. No actual load fields or original documents were changed. All cancel/apply/conflict/maneuver-clearing UI tests used a separate synthetic localhost record; no synthetic route was put in production.

259tests passed;142syntaxfiles+4inline scripts,822internal references, existing static contracts and isolated build passed. Physical iPhone tests remain with the owner. Issued permits, loaded measurements, exact state chain, actual QR formats, authoritative road/direction/entrance coverage and field evidence remain missing. Updated intake procedure: PERMIT-INTAKE-CHECKLIST.md. No provider request, charge/purchase, credentials/DNS change, account/payment/guidance activation, PR4 merge or automation resume. All57preexisting dist edits preserved. Release source is pushed; this receipt is documentation only.

Evidence: outputs/permit-import-review-live-check-20261014.json, permit-import-review-tests-20261014.txt, permit-import-review-build-20261014.txt, permit-import-comparison-qa.jpg and permit-import-comparison-mobile-qa.jpg.


## GPS continuity and parked route sketch — October 14, 2026

A reproduced synthetic failure accepted about 153 m of forward progress in one second because of a fixed 200 m allowance. Forward progress now uses elapsed time plus both accuracy estimates. The 45 m/s cap is an engineering rejection bound, not a speed limit or proof of road position. Ordinary forward movement and small jitter still pass. Existing parallel-occurrence, wrong-direction, skipped-turn, border-time and terminal holds remain.

The new GPS watcher ends the session on permission failure, timeout, inaccurate/stale/future/out-of-order fixes, lost continuity, or exceptions during trip/position checks. It uses both wall-clock fix freshness and a monotonic 15-second receipt gap; a callback arriving before a suspended timer cannot hide the gap. Every stop invalidates callback generations, clears the watch (including ID zero) and timer. Recovery requires a deliberate new start. Location loss no longer auto-resumes on the next fix. UI explicitly says stopped and position unconfirmed. These paths remain behind the disabled operational-guidance gate.

Parked review now has Full route / Selected turn controls, a bold selected instruction, A/B instruction endpoints and text describing what is shown. Previous/Next updates the highlighted instruction; pending/dirty reviews cannot select a turn. The sketch draws supplied segments individually, never fills missing-state gaps, and labels itself as neither a street map nor live GPS. B is not confirmed arrival. Mobile controls are 48 px tall; line thickness and endpoint letters remain readable. Phone rehearsal version 2026-10-14.2 adds GPS-return/manual-restart and position-jump examples. No real location requests are made by those examples.

Validation: 279 tests pass (17 added), 146 JavaScript files + 4 inline scripts parse, 822 internal references and existing static contracts pass. After a mobile sizing refinement, all 5 sketch tests passed again. Isolated build passes with readOnlyBeta=true and permitGuidanceEnabled=false. Local browser verified incomplete-review holds, a separately imported synthetic OH/IN packet, map focus/full/next transitions, preserved closed-window border warning, reload, 390 px layout without horizontal overflow, 48 px controls, and desktop speech playing/stopped events. Local QA console warning/error lists were empty. Audibility, actual iPhone Safari, GPS/road/lane position and offline behavior are not established. Evidence: parent outputs/permit-gps-refinement-tests-20261014.txt, permit-gps-refinement-build-20261014.txt and permit-gps-map-mobile-qa.jpg.

Release candidate at this entry; record exact deployment separately. Actual Draper–Brunswick trip and friend's private originals were not edited. Missing Oklahoma authorization/user-reported US83 travel remain unresolved evidence, not a usable detour. Full permits, matching load measurements/axles, road/entrance association, current restrictions and physical tests remain required. No provider calls, charges, credentials/DNS changes, PR4 merge or account/payment/guidance activation. Historical 57 dist edits preserved.


## GPS refinements live — October 14, 23:01 UTC

Source 796671770db785cadc0bd608f51b01257341af9f is pushed to release/atlas-20261006. Production deployment dpl_CoPxRmEHe7WyVJjdKLindDMk78z4 is READY with driverslounge.app alias; remote build about 15 seconds. Seven changed public assets match source, permit page HTTP200, scanner camera/self and geolocation/self policy preserved. Config remains readOnlyBeta=true and permitGuidanceEnabled=false. The immediate deployment-scoped 10-minute error/fatal query returned no groups; this is not sustained monitoring. Live route tab warning/error log list was empty.

Live browser retained Steve's Draper–Brunswick draft and empty state placeholder after reload. It says Needs review, no route geometry saved, selected-turn disabled and operational guidance unavailable. No real trip fields or originals were changed. The phone rehearsal shows the new GPS-return and position-jump examples. Synthetic selected-turn/focus, next-instruction and border checks ran only on localhost. 279 tests plus 5 sketch checks after the mobile refinement, syntax/static contracts and isolated build passed. A 390 px desktop viewport fits with 48 px map buttons; no physical iPhone or GPS/road/voice-audibility test occurred. No real provider/location requests, charges, credential/DNS changes, PR4 merge or operational/account/payment activation. 57 historical dist edits preserved. Temporary local test tabs/server were closed; live permit and phone-check tabs retained.

Evidence: outputs/permit-gps-refinement-live-check-20261014.json, permit-gps-refinement-tests-20261014.txt, permit-gps-refinement-build-20261014.txt, permit-gps-map-mobile-qa.jpg (synthetic only), permit-gps-refinement-live.jpg. Actual complete permits, measured loaded dimensions/weights/axles, matching authorizations/geometry/borders/conditions and physical phone evidence remain open. The friend's missing Oklahoma authorization and reported US83 deviation remain unresolved; neither was added to Steve's trip.


## Remember truck setup without repeating the form — October 14, 2026

Owner requested one-time truck dimensions, reused until truck/trailer changes. Standard navigation now remembers a deliberately saved setup on this browser and opens the trip screen on return. The compact summary shows height, width, total/trailer length, axle count and last loaded gross weight. A single current-load confirmation replaces repeated size entry. Change truck, trailer or load opens the existing values for editing and revokes the shortcut/current-load confirmation. Pending edits survive reload as drafts; they cannot activate the shortcut until saved again. Malformed/unsupported storage and failed writes fall back visibly to manual setup. This is browser-local convenience, not account or cross-device sync.

New permitted drafts reuse the last explicitly confirmed permit-workspace measurements with a collapsed editable summary. They start with acknowledgement false, no dates, routes, permits, axle measurements or cargo notes. Existing/imported/shared trips are never overwritten by a saved setup. Editing dimensions, gross weight, axles or cargo notes clears the load checkbox. The checkbox now explicitly confirms those measurements match this load. Remembering a trailer cannot establish a new load's envelope, axle weights or permit compliance. Standard and oversize defaults are stored separately to avoid silently moving an oversize configuration into the standard workflow.

286 tests pass, including seven new persistence, corruption, draft, overwrite and confirmation-boundary cases. After pending-edit preservation was refined, all 11 targeted setup tests passed again. Final 149 JavaScript files + 4 inline scripts parse; 824 internal links and existing static contracts pass. Isolated build keeps readOnlyBeta=true/permitGuidanceEnabled=false and does not touch the 57 historical dist changes. Local browser verified initial save, reload to compact trip view, visible blocked-review prompt before load confirmation, one-tap reuse, trailer edit/reload with remaining dimensions retained, and new permit draft reuse with no date/permits/axle notes/acknowledgement. Editing a reused dimension clears the checkbox. Final 390 px screen fits with a 48 px confirmation button; desktop browser only, not physical Safari. Local QA warning/error logs were empty. All measurements in tests are synthetic; no owner's production values were fabricated or changed.

Release candidate at this entry; record exact production result separately. No provider routing/location requests, credentials/DNS changes, charges, account/payment/guidance activation or PR4 merge. Evidence: parent outputs/saved-truck-setup-tests-20261014.txt, saved-truck-setup-build-20261014.txt, saved-truck-setup-mobile-qa.jpg. Real permits, current load/axle measurements, authoritative road/entrance checks and field evidence remain required for operational navigation.
