# Equipment and source-evidence review — October14, 2026

Local implementation only. Public production remains4b8d06d. No deployment, road-service request, account activation or tire-pressure recommendation was performed in this pass.

## Manufacturer and tire comparisons
The disabled request preparer now requires a preliminary installed-equipment review in addition to measured axle weights. It distinguishes single-vehicle GVWR from manufacturer GCWR for a combination, checks each axle against its supplied GAWR, and compares individual measured tire loads with the installed single/dual rating and supplied load-table capacity at measured cold pressure. It refuses missing, wrong-position, duplicated, mismatched, stale/changed or inferred measurements. Lower capacities cannot be hidden by a sufficient overall axle total. Tire loads must sum to their measured axle; the code never balances them automatically.

The new tire path supports only individual tire measurements and explicit single/dual fitments. That is a deliberately narrow prototype input contract, **not a statement that the law requires a particular weighing method**. Ordinary group-only tickets and wheel-end totals cannot satisfy it. An alternate manufacturer-supported wheel-end method needs its own evidence and implementation; do not divide a total and label it measured. Cold-pressure limits are supplied evidence, not generated recommendations. Hot-pressure correction, permits and special allowances are outside this diagnostic.

The equipment review is bound to the load reference, axle revision, weighing time and equipment inspection/revision. The request signature includes ratings and pressure readings, so a late response is rejected after equipment changes. Tests prove missing/overloaded equipment produces zero simulated provider calls. Ratings are not mapped automatically to HERE grossWeight; that separate parameter still needs documented legal applicability before a real integration.

Also corrected an omission in the offline HERE request: trailerCount is now explicit (zero for a single unit, one for the supported combinations). Trailer-specific restrictions must not depend on an omitted default.

## Official references checked
- [49 CFR571.3](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-571/subpart-A/section-571.3): manufacturer GVWR, GAWR and GCWR definitions have distinct scopes. A statutory road limit cannot stand in for installed equipment ratings. eCFR displayed Title49 current through October9 when checked October14.
- [49 CFR393.75](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-G/section-393.75): tire loading and cold inflation requirements are separate from vehicle/road totals. The regulation includes exceptions and hot-pressure provisions that this prototype does not implement. Condition and application/speed requirements still need separate review.
- [HERE vehicle properties](https://docs.here.com/routing/docs/routing-v8-vehicle-properties): trailerCount affects trailer restrictions; combined dimensions/weights must include the trailer. Documentation is not a license or coverage guarantee.
- Michelin's official document index was found; the2023 manual PDF request failed. No manufacturer-specific capacity table was extracted or claimed verified. No repeated retry.

## Road-source safeguards
Preliminary route evidence now requires a directed restriction record, complete coverage assertion and source record identifier. Directory links, inventory points and partial feeds hold. A separate source-observation time is required; checking/fetching an old page today cannot renew it. Observation validity must cover arrival inside a conservative24-hour diagnostic window. This is our internal policy, not a source update guarantee or legal interval. Actual closures can change sooner; this alone never establishes current safety.

The supplied fields remain untrusted. Even a complete synthetic example returns REVIEW_REQUIRED with guidanceAllowed=false. Authentication, licensed feeds, provenance, authority, road/lane mapping and field validation remain open.

## Evidence and open gates
174 tests pass (13 new this pass),120 syntax files+4inline scripts and server syntax;809 internal references. Tests include an overloaded individual tire under the axle total, wrong single/dual ratings, fake divided weights, low/high/hot pressure, changed equipment, zero-trailer requests, partial inventory misuse and old observations hidden by fresh retrieval dates. These are synthetic failure tests, not actual truck/scale/device evidence.

- HIGH/contained locally: omitted trailer count, unchecked lower equipment capacities and stale observations in the preliminary request/review path.
- CRITICAL/open: authentic installed ratings and individual-vehicle GVWRs within combinations, coupling/wheel/rim limits, tire condition/application/speed, source authenticity, and real-load validation.
- CRITICAL/open: complete current road coverage, provider approval/cost controls, server identity/rate limiting, directed topology, truck entrance verification and field tests. No API endpoint exists and the connector remains disabled.
- Public axle UI does not collect equipment/tire records or explicit provider grouping. Do not bypass missing records or populate production profiles with synthetic fixtures.

Next useful work: trustworthy segment/entrance binding and complete source retrieval handling, or a documented manufacturer-supported measurement method. Avoid adding more fields to the clean public UI before the input method is practical and validated.
