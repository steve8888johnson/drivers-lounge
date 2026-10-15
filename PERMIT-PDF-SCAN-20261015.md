# PDF QR scanning and spoken source review — October 15, 2026

## Behavior

Saved PDF originals now offer **Scan PDF QR codes**. Scanning runs locally, one page at a time, with a visible result for each page: QR found, no readable QR, or scan failed. Duplicate codes are retained once. Cancellation preserves the originals and completed results; late canceled results are discarded. A starting-page field supports continuation after the 40-page pass limit. File size is limited to 15 MB, rendering to 4 million pixels / 2300 pixels on the longest edge, and scanning to 120 seconds. These limits reduce resource use but cannot guarantee that every PDF renders on every phone.

The scanner does not extract a complete route, infer connecting roads, follow QR links automatically, or confirm a permit. Existing QR classification and review gates still apply. Scanning clears existing permit/geometry review because retained evidence changed. Missing/failed pages remain visible. Unsupported/password-protected PDFs keep their original and offer the photo fallback. Originals and permit packets are still device-local; account truck-setup sync does not sync permits.

The parked walkthrough now offers **Read saved permit line aloud** beside maneuver speech. It reads the exact saved source line, identifies its state/line, and requires the reviewed route. Changing turns, leaving the page or stopping voice cancels obsolete playback. This comparison cannot establish that entered text matches an original that was never checked.

## Evidence

- 319 local tests pass, including nine PDF/source-speech cases: duplicate references, per-page failures, cancellation/late results, page caps/continuation, invalid ranges, malformed payloads, empty decoder detections, render bounds and source text.
- Supplied friend examples tested only in a localhost wallet: Kansas 3/3 pages, zero failures, one repeated QR reference; Texas 4/4 pages, zero failures, one QR on page 1 and no readable QR on pages 2–4. Neither yielded an approved route. The original files were not uploaded to a remote service or added to Steve's live trip.
- Actual decoder behavior exposed an empty detection on the Kansas first page. Empty detections are now ignored; malformed nonempty payloads still fail the page atomically. The fixed three-page scan was verified again.
- Stop scan was exercised during PDF processing; completed original/QR records remained. Kansas scan summary persisted after reload.
- A 390×844 desktop viewport fits the dialog with 48px controls. Screenshot: parent outputs/pdf-scan-mobile-qa-20261015.png. This is not physical iPhone evidence.
- Separate synthetic route fixture: source-speech click produced the browser's playing event; Next maneuver changed the source line and reported speech stopped. No human audibility claim. Application warning/error log list empty in that synthetic test.
- Isolated release build restored after QA, with no injected fixture. Historical 57 tracked dist changes remain untouched. Remote build and deployment receipt are recorded separately.

## Dependency and boundaries

Pinned local PDF.js 6.4.299 legacy minified distribution, Apache-2.0 license and provenance in src/assets/vendor/pdfjs-6.4.299/README.md. Official npm archive SHA-512 verified. The local worker receives file bytes, with eval/XFA/Wasm/worker resource fetching disabled; no remote PDF URL, OCR service, credential or provider route request is introduced. Vendor files are included in the existing same-origin shell cache; offline availability still depends on a successful cache fill and device storage.

Operational guidance remains disabled. Full issued permits, every condition page, measured loaded dimensions/axles, matching border connections, exact road/entrance association, current restrictions and physical phone evidence are still needed. A QR reference alone cannot produce safe turn-by-turn instructions. The friend's missing Oklahoma permit and reported US83 deviation remain unresolved and were not treated as authorization.

## Parked iPhone test when the permits arrive

1. Open https://driverslounge.app/permitted-loads in Safari; select the correct load. Add one issued state permit at a time, including all pages, from Files.
2. Tap **Scan PDF QR codes**, then **Scan PDF pages**. Keep Safari foregrounded. Inspect each result; compare every original page even when scanning reports no failure.
3. Retain information/reference-only QR results as references. Enter/review the actual issued route and conditions; do not invent missing turns or connecting roads.
4. After reviewed geometry and the complete permit chain are available, use Route → **Walk through the reviewed route**. Compare maneuver and saved permit-line speech with the originals; test Stop, Next, Bluetooth output and screen-lock interruption while parked.
5. Use https://driverslounge.app/permit-phone-check for the separate parked sound/GPS reception rehearsal. Do not use these tests as authorization to drive the load.

Release candidate at creation; see RELEASE-GATES.md for exact live receipt.

## Live release receipt

Verified October15 at16:52UTC: source4a5212d908e7490654a922697da67ffaf68903f2, READY productiondpl_3NerqjzuDTMHCf7oo8AuGktENZ7p, driverslounge.app. Remote319tests and all build checks passed. Eight public assets match source; account/permit pagesHTTP200. Account-only access remains enabled; operational guidance disabled. Owner draft unchanged. See RELEASE-GATES.md for evidence limits.
