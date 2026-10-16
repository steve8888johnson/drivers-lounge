# Ramp traversal order and mileage comparison

The selected ramp comparison now also checks its entry and merge order along the complete original issuer line. A road-name match and touching endpoints are insufficient: a reversed traversal, repeated nearby occurrence, overlapping projections or sparse source edge cannot establish the expected order. The comparison validates the current permit identity, literal ramp/merge pair and original candidate records each time; no saved approval flag is trusted.

The UI shows the result beside the existing road-contact evidence, with an expandable comparison of printed ramp distance, candidate drawing length, issuer-line length between nearest positions, printed cumulative totals and geometric cumulative totals. Rounded printed values remain separate; no line is stretched or moved. The order result creates no coordinates, maneuver steps, approval or guidance activation. It requires no additional network call, account, API key or routing service.

## SH31 finding

Using the already preserved issuer geometry and current inventory response, the candidate is 537.827 m (0.334 mi); the issuer line between its nearest entry/merge positions is 535.888 m (0.333 mi). The printed ramp distance is 0.3 mi. The entry precedes the merge, with no repeated near-tie in this source. These observations support the same general movement, not exact turn coordinates. Printed cumulative totals do not coincide with those nearest geometric positions. The previous 44.649 m shape disagreement remains unchanged and displayed as 45 m.

There is still no defensible reason to shift the issuer line or convert either drawing into exact spoken GPS triggers. The saved issuer service exposes an overview line and a separate instruction table; current authoritative maneuver geometry or issuer clarification remains the decisive missing evidence. Existing dated imagery/plans remain historical evidence. No new current road-condition or load-clearance claim.

The official [TxDMV OS/OW page](https://www.txdmv.gov/motor-carriers/oversize-overweight-permits), checked October 16, lists its permit assistance office at (800) 299-1700. A private clarification draft is prepared under outputs/SH31-ISSUER-CLARIFICATION-20261016.md; it has not been sent and no permit was changed or recalculated.

## Verification

Six new regression cases cover forward order without approval, reversed issuer traversal, repeated visits, adjacent/zero-length source vertices, sparse source ambiguity and stale permit/candidate/query rejection. Existing UI tests also verify the order display and cleanup. The new test file is included in the production test command. All diagnostic results retain approved=false and guidanceAllowed=false.

The actual private Texas fixture passes a 390px local browser test: forward order, 0.33 mi candidate versus 0.3 mi printed distance, unchanged 45 m discrepancy, selected literal merge speech, no automatic speech/default candidate, one lookup across both paired rows and cleanup on ordinary Next. Original 2,818 issuer points/36 instructions stay unchanged; no steps created. Dialog client/scroll widths both356px, no page errors. Speech is mocked; physical iPhone audio/Bluetooth/background behavior and owner account transfer remain unverified. Local browser/server closed.

Private evidence: outputs/sh31-order-audit-20261016.json, ramp-route-order-browser-20261016.json and phone screenshot. Actual originals, IDs and precise route data remain outside Git and deployment. The 57 historical tracked dist edits remain untouched; all build work uses a staging directory. No paid routing calls, services, upgrades, DNS/credential/database changes or PR4 merge. Exact full-build and production evidence follows verification.

Local gate: the existing 449-test suite passed with these application changes; the six new order regressions also passed in the targeted run. The new test file was then added to package.json so the production build will run all455 together.197JS+4inline syntax,57pages/833links, all static contracts and isolated build pass. No application source changed after the targeted/browser checks.
