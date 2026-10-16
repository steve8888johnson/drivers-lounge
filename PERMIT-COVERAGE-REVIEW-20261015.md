# Permit instruction coverage and parked turn review — October 15, 2026

Continuous geometry could previously pass review even when a saved route instruction had no maneuver. Geometry confirmation now requires a reference to every nonblank saved route line. Missing first, middle or final instructions hold the master route, parked walkthrough and GPS evaluation. Original line numbers and exact text survive blank lines; multiple maneuvers may cite one instruction. Invalid or blank references remain errors.

The review and route tabs show each saved line alongside its maneuver references, with missing lines highlighted. The list is keyboard focusable and scrollable. A labeled maneuver selector lets a parked reviewer jump directly to a checked turn, updating its source text and sketch while cancelling previous speech. Unready or edited routes keep this control disabled.

## Evidence

- Full suite: 310 tests pass. Six coverage cases include omitted first/middle/last instructions, repeated text, blank lines, CRLF, multiple references, invalid references, imported HTML escaping and checked state order. All six passed again after adding keyboard access to the scrollable list.
- 157 JavaScript files and four inline scripts parse; 57 pages and 831 local references pass. Existing payment, database and static store contracts pass. These are not store approval or road-safety certification.
- Synthetic localhost browser: direct jump to final turn updated map/source text and disabled Next; changing selected turn after requesting speech displayed Speech stopped. Adding an unrepresented third instruction blocked geometry confirmation and all walkthrough controls.
- 390-by-844 desktop viewport: no horizontal page overflow; missing instruction remains readable. This is responsive desktop evidence, not a physical Safari voice or GPS test.
- Clean isolated build passes and contains no synthetic QA import or trip. The repository's 57 historical tracked dist changes are untouched.
- Owner now reports that account truck setup values match desktop on the physical phone. This establishes reported setup reuse only; actual load dimensions and navigation are not verified.

## Limits and release gates

Line references do not prove that instructions or coordinates match a road or original permit. Text omitted from intake cannot be detected by this check. Headers or conditions mixed into route text require manual reconciliation; the code never silently skips them. No permits, originals, route geometry, load dimensions or departure acknowledgments in the owner's production trip were changed.

Operational guidance remains disabled. Full issued permit packet, measured loaded envelope/weights/axles, road and destination access association, border continuity, current conditions and physical phone/field evidence remain required. The friend's Kansas/Texas packet and missing Oklahoma authorization do not authorize Steve's Draper–Brunswick move. No new provider requests, fees, credentials, email DNS changes, account/payment activation or PR4 merge.

Release candidate at this entry. The exact production commit/deployment receipt is recorded separately in RELEASE-GATES.md and parent outputs.
