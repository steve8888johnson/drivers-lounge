# Printed permit route rehearsal — October 15, 2026

Recognized Kansas and Texas text PDFs can now be reviewed one printed route row at a time from their saved original. In Review or Wallet, choose **Read printed route**, select a row, then **Read this printed row aloud** while parked. Source page, literal road code, printed mileage and instruction stay together. Reading is local; no document upload, routing request, geometry, permit confirmation or account write occurs.

The reader preserves continued route tables, wrapped instructions, ramp/frontage/connector suffixes, lane wording and arrival rows. It explicitly rejects unsupported/image-only layouts and bounded-size violations. Incomplete, unexpected or decreasing-mileage rows are exposed and hold speech. Changing rows, closing the dialog or hiding the page cancels speech. PDF work is cancellable and bounded to 15 MB, 40 pages and 60 seconds; partial extraction is not returned as a clean result. This is text rehearsal, not GPS-triggered guidance or proof that every route row was matched to a road.

## Evidence

- Full local suite: 339 tests, zero failures. Seven new tests cover source order/page continuation, wrapped lane/ramp wording, preservation of differing road labels, incomplete/decreasing mileage, unsupported layouts and text-placement bounds, unexpected rows and baseline variation.
- 168 JavaScript files plus four inline scripts parse. Existing static contracts and 57 pages / 833 local references pass. Final isolated build validates 17 critical assets and 57 pages; historical tracked dist edits are untouched.
- Actual user-supplied PDFs tested only on localhost: Kansas three route rows on page 2; Texas 36 rows on pages 3–4, no extraction issues. All 36 Texas instruction and road-column strings match the extracted original after whitespace normalization. Original route pages were visually inspected. These private fixtures and identifiers are not in this repository or deployment.
- Browser speech reported finished on two representative Texas exit/lane instructions; Kansas speech reported playing before it was stopped by closing. Row changes cancel prior voice. This is browser-event evidence, not proof of audibility or physical iPhone/Bluetooth behavior.
- Final build reloaded with both real PDFs: 3 and 36 rows. 390×844 layout: 342px dialog/client and scroll width, 48px speech control, no horizontal overflow, no app warning/error entries. Screenshot is local evidence, not an iPhone screenshot.

## Still held

Complete permits, current load/axle details, conditions, authoritative road/entrance association, and physical device validation remain necessary. QR references in these samples do not contain route geometry. Official road inventory comparisons are research evidence only; none is imported as an approved route. No operational guidance, paid provider use, email/DNS/credential changes or draft PR4 merge. Real owner trip remains unchanged. Account setup sync does not transfer permit files.

Exact production receipt is recorded in RELEASE-GATES.md after deployment verification.
