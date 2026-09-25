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
