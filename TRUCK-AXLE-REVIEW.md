# Axle measurement and federal baseline review — October 14, 2026

Implemented locally only. No operational guidance, route access determination, state-wide legal envelope or legal certification. A result without detected baseline excess remains REVIEW_REQUIRED with guidanceAllowed=false.

## Problem addressed
The provider adapter previously accepted caller-labeled axle groups and totals without individual axle spacing. A vehicle could satisfy gross/single/tandem totals while an interior bridge group exceeded its baseline. Changing axle spacing also did not change the provider query fingerprint.

The new module requires measured front-to-rear axle positions and individual loaded weights, an exact total, supported configuration, confirmation and revision. It reviews every consecutive group (including single-axle windows), distinguishes the40-inch and96-inch statutory windows, calculates the ordinary bridge baseline and the narrow two-tandem36-foot exception, caps the ordinary gross baseline, and rejects missing/ambiguous/out-of-order inputs. Exact half-way formula rounding uses the lower500lb step, consistent with the FHWA single-unit example. No enforcement tolerance, permit, APU/fuel allowance or grandfather exception is assumed.

The provider request now derives group weights from those measurements, checks current loaded kilograms against the canonical total, and rejects axle span longer than total vehicle length. The initial adapter supports at most6 axles in complete ordered single/tandem partitions; it rejects close sets split into misleading smaller groups and unhandled configurations. Individual group and total conversion round UP separately, so rounding differences are expected and are not repaired by subtracting weight. Spacing, weights, configuration and revision participate in local request binding even when they do not change the provider query. Missing evidence sends no request; changing spacing invalidates a late response.

## Scope and limits
- This is the ordinary federal Interstate baseline, not every applicable law or every road. State/local rules, posted bridge limits, manufacturer/tire ratings and authority/exception review remain required. No country-wide height/width/length clearance is implied.
- Input confirmation is a user assertion, not authenticated scale evidence. Measurement age/load changes still need an end-to-end collection/invalidation flow.
- A grouped scale ticket may not contain individual axle weights. Never divide group weights to invent them. Group-only uncertainty handling is not implemented; these cases remain held.
- Public truck setup still collects only the earlier basic measurements; the detailed axle UI is not implemented. This stricter local adapter consequently cannot be enabled from the existing form.
- Decimal positions support up to0.01inch for arithmetic; this does not claim that physical measurements have that accuracy. No auto-sorting or unit coercion. Complex/triple axle configurations are outside the initial provider mapping.

## Evidence
10 new tests,138 total pass. Published FHWA5-axle and single-unit examples produce the expected group limits and detect interior overloads. Boundary cases cover40/96in, just below36ft, missing measurements, reordered axles, totals, unsupported special cases, rounded-up conversion, provider partition tampering and asynchronous spacing changes. Syntax109 files+4inline plus server check and56pages806links pass. All data synthetic; no provider traffic, fees, deployment or actual load clearance.

Sources reviewed2026-10-14 (eCFR page displayed current through2026-10-09; no claim of legal review):
- https://www.ecfr.gov/current/title-23/chapter-I/subchapter-G/part-658/section-658.5 — definitions, including multi-physical-axle windows.
- https://www.ecfr.gov/current/title-23/chapter-I/subchapter-G/part-658/section-658.17 — scope, ordinary limits, tandem exception and exclusions.
- https://ops.fhwa.dot.gov/FREIGHT/publications/brdg_frm_wghts/index.htm — revised2019 FHWA guidance and numerical examples; prior pamphlet versions are superseded. Governing statute/regulation take precedence over guidance.
