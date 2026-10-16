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

Private local evidence: `outputs/permit-resume-voice-browser-20261016.json`, `permit-resume-voice-targeted-20261016.txt`, `permit-resume-voice-build-20261016.txt`, `permit-resume-phone-20261016.png`, `permit-next-read-phone-20261016.png`. These files and real permits are not committed or deployed.

## Production verification — October 16, 16:15 UTC

- Production: https://driverslounge.app/permitted-loads
- Exact source: `e5cd5a56a6b2a2386bc8eef3d733104664c9031a`
- READY deployment: `dpl_BFZtiYV6GnmbPNgE1MvGyoxNozJE`
- Deployment URL: https://drivers-lounge-otfebrxee-steves-projects-c46af6ff.vercel.app
- Existing drivers-lounge / steves-projects-c46af6ff production target. Static frontend and Node functions; Node 22.x standard build, 15 seconds.

Remote 438 tests, syntax/static gates and build pass. Seven changed JavaScript/service-worker assets match Git exactly. The live HTML includes both new controls. Permit, account and navigation pages return 200. Flags remain accountsEnabled=true, readOnlyBeta=true, permitGuidanceEnabled=false. No migration, operational activation or payment/account changes.

Production-browser rehearsal repeated the real Texas scan/stop/reload/resume and retained all four page outcomes. The supplied Texas (36 rows) and Kansas (3 rows) printed routes selected and spoke the expected next-row requests; neither auto-advanced on speech completion, and final-row controls disabled. The saved issuer map retained all original geometry and selected the SH31 merge on Next & read. The 390px dialog had equal 356px client/scroll widths and a 48px Next & read control, with no page errors.

Speech, external network and API requests were intercepted in this isolated production-asset test. Private PDFs were placed only in temporary browser storage and never uploaded to a server. This verifies browser behavior and speech requests, not iPhone audibility, live account transfer, street-tile availability or operational route accuracy. A separate synthetic full-packet export/import using production modules preserved both PDF bytes and scan history without copying approvals.

Follow-up at 16:20 UTC explicitly waited for the map canvas before advancing to the SH31 merge. A prior network-intercepted run timed out loading Leaflet; a normal script-load probe succeeded in 979 ms, and the fresh normal-network map check loaded Leaflet with HTTP200 and rendered 4,789 nontransparent route pixels. Provider API calls remained blocked; ordinary public street tiles were allowed and speech remained intercepted. Earlier overview tile requests aborted when the view changed; complete street-tile coverage was not asserted. Row 35's selected merge matched the requested speech. No application patch was made for the intercepted-test timeout. Evidence: `outputs/permit-next-read-live-map-20261016.json` and `.png`.

One deployment-scoped ten-minute error/fatal query at 16:13 UTC returned zero records. This is not sustained monitoring; drains were not assessed. Pre-release Vercel usage showed about $19.50 remaining in the existing Pro allowance. Supabase remains on the owner-confirmed Free plan; no upgrade or new paid service. No credentials, email DNS, PR4 merge or historical 57 dist changes.

Production evidence: `outputs/permit-resume-voice-deployment-20261016.json`, `permit-resume-voice-live-assets-20261016.json`, `permit-resume-voice-live-build-20261016.txt`, `permit-resume-voice-live-browser-20261016.json`, `permit-resume-voice-live-errors-20261016.txt`, `permit-resume-packet-20261016.json` and live phone-layout screenshots. Temporary browser contexts and local test server closed. This receipt is a separate documentation commit; source above remains the deployed application.

## Owner phone check

Refresh the permit page. Stop a PDF scan after a completed page, close its dialog, and reopen the saved original: it should offer Continue from page N (or Retry for a failed page). After scanning, Save trip to account again to transfer that progress. In View scanned route or Read printed route, use Read first, then Next & read; confirm the displayed row and heard words match while parked. Check speaker/Bluetooth audibility and interruption behavior on the physical iPhone. These remain parked review controls, not driving GPS guidance.
