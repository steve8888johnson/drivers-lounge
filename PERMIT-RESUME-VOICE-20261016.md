# Resumable PDF scanning and one-tap parked speech

## Change

A stopped PDF scan previously retained its QR references but reopening the original started again at page 1. Each original now retains bounded, structured page-processing history. Reopening selects the earliest unscanned or failed page and labels the action Continue from page N or Retry page N. Later passes merge by actual page number; duplicate passes do not inflate the count. A new failed attempt replaces an old success. Changed page counts invalidate incompatible history. Invalid or oversized imported history is discarded rather than accepted as completion.

Page history is saved when a scan pass finishes or returns after Stop. It is not crash-proof per-page journaling: abruptly terminating the browser during a pass can lose that pass's progress. Originals saved before scanning remain in the wallet. Up to 40 pages are scanned per pass; stored history is bounded to 10,000 pages. A processed page with no readable QR is explicitly labelled for original inspection. No processing state grants permit approval or proves complete route extraction.

History travels with the original document through explicit account save/open and full trip-packet import, with document hashes and private account protections unchanged. Save the trip to account again after scanning to send the new history to another device. No backend migration, new service, credential or DNS change is required.

Texas issuer map rehearsal and Kansas/Texas printed-PDF rehearsal now offer **Next & read**. One tap selects the next literal instruction, stops old speech and requests the new prompt within that same user interaction. There is no auto-play sequence, timed advance, GPS trigger or wrapping to the beginning. The button disables at the last row; printed-table parsing issues continue to block speech. Hidden/closed views cannot advance and speak. Normal Next/Previous selections remain silent. These controls are for parked tests; exact road positions and live guidance remain unverified/disabled.

## Evidence

- Seven added regressions cover continued PDF passes, failures/retries, repeated pages, changed page counts, malformed/untrusted metadata, account transfer without approvals, and one-tap issuer speech with end/visibility guards.
- Local full suite: 438 tests; 193 JavaScript plus four inline syntax checks; 57 pages / 833 references; static build gates and isolated build pass. Historical tracked root dist changes remain untouched.
- Real Texas PDF browser test stopped after page 1, reloaded the page, resumed at page 2 and retained all four page outcomes without repeating page 1. The QR stayed associated with the original.
- Printed-route tests used the supplied Texas PDF (36 rows) and Kansas PDF (3 rows). Next & read selected row 2 and requested that row's speech. Speech completion did not move the selection; the final row disabled Next & read.
- The actual saved Texas issuer map kept all source geometry unchanged. Row 34 to row 35 selected the literal SH31 merge and requested the matching spoken instruction. Row 36 disabled Next & read. No gap was filled, maneuver coordinate added or route approved.
- Browser QA used a 390px fresh Chromium context with intercepted speech and external network requests. It proves selected text and speech requests, not physical audibility or iPhone Safari. Dialog width/scroll both 356px; Next & read 48px high; no page errors.

Private local evidence: `outputs/permit-resume-voice-browser-20261016.json`, `permit-resume-voice-targeted-20261016.txt`, `permit-resume-voice-build-20261016.txt`, `permit-resume-phone-20261016.png`, `permit-next-read-phone-20261016.png`. These files and real permits are not committed or deployed. Final production receipt follows verification.
