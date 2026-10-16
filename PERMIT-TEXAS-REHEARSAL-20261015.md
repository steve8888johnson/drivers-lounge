# Texas QR map and parked speech rehearsal — October 15, 2026

The QR map now supports a manual row rehearsal, retaining the issuer's 36 instruction rows and showing a broad approximate area from its rounded cumulative mileage. It does not establish precise turn/ramp locations. The original 5,907 m adjacent-point span is drawn separately with a red dash; no additional coordinates, roads or calculated detours are inserted. Generic maneuver geometry checks are unchanged.

## Evidence and limits

The private actual issuer fixture contains 2,818 points and 36 rows. Calculated polyline length is 565.425544 miles versus 565.6 issued miles, a 0.174456 mile discrepancy. That aggregate agreement is a sanity check only; it does not bound local positional error. The locator uses absolute cumulative mileage without stretching the line, displays supplied edges within one mile of that value as viewing context, and never creates a turn pin. Sparse edges retain dashes even inside the blue area. Excessive total mismatch suppresses the area while preserving text review.

Version 2 retains only sequence, road, instruction, segment miles and cumulative miles. Sequence, cumulative order, rounded segment consistency and exact route-text binding are checked. Version 1 device saves reopen with literal-text speech and a request to reload the QR for mileage. Altered identities/text or invalid metadata reject. No maneuver steps, GPS segments, confirmations or account uploads are created.

Manual Read turn aloud expands recognized road/direction abbreviations using the existing PDF reader. It requires an on-device English voice and a visible dialog. Previous/next/select, opening another preview, closing, page hide and visibility loss cancel speech. No automatic queue, GPS trigger or spoken remaining distance. The dashed-span inspection replaces the heading so an unrelated selected row cannot appear to label that span; Read restores the selected row/area before speaking.

## Verification

387 tests pass; final focused UI regression passes after the sparse-inspection heading fix. Syntax: 177 JS files and 4 inline scripts. Links: 57 pages / 833 references. Existing payment, Supabase contract and store metadata checks pass; these are not external launch approvals. Isolated static build passes. Historical 57 tracked dist modifications preserved.

Actual local browser import via the public Texas QR succeeds with 36 rows; saved preview reopens without fetching again. Local device speech reports playing, and changing rows cancels it. At 390px, dialog client/scroll widths are 342px, map 300px and read button 68.4px. Dashed span visibly drawn separately. Physical iPhone speaker, Bluetooth and Safari lifecycle remain for Steve's parked test.

No paid routing calls, purchases, credentials/DNS changes, PR4 merge or operational guidance activation. Friend's permit remains in a separate device practice load; owner's load unchanged. Private source data and identifiers stay outside the repository.

Evidence in workspace outputs: texas-rehearsal-actual-data-20261015.json, texas-rehearsal-all-tests-20261015.txt, texas-rehearsal-ui-tests-20261015.txt. Live deployment receipt follows verification.
