# Printed permit to scanned-map review

The printed-PDF review now offers **Show this row on scanned map** when the complete extracted Texas table agrees with the saved Texas issuer map. It checks an explicit, unambiguous printed permit number, state, row count/order, road and instruction wording, segment mileage and cumulative mileage. Only layout whitespace and equivalent decimal formatting are normalized. The issuer's zero-mile convention matches only a printed `< 0.1` cell. A changed direction, ramp, branch, lane, mileage or missing row blocks every handoff and shows the differing fields. Kansas remains available for printed speech without an invented map connection.

The new action opens the selected issuer row, stops earlier audio, and keeps the original PDF review underneath for return on closing the map. The source PDF page follows row changes and is included in manually requested speech. Map opening never starts audio; Next & read remains one explicit row per tap. Source geometry is untouched, with sparse spans and approximate-area labels retained. No maneuvers, approvals, QR requests or backend records are created by the comparison. Reopening recomputes it from the local original and saved map; no persistent verified-status flag is trusted.

This establishes agreement between two saved text sources, not exact maneuver coordinates, current road legality, complete conditions, valid permit dates or live navigation. User field validation and authoritative maneuver evidence remain outstanding. Camera photos still need a supported QR map or a readable PDF original for this full-table comparison; no new OCR or general nationwide map support is claimed.

## Local verification

- 443 tests pass, including five new regression cases for whole-table matching, identity conflicts, changed directions/roads/mileage, page/row failures and source-bound map/speech selection.
- 194 JavaScript files and four inline scripts parse; 57 pages / 833 internal references pass. Static payment, backend and store gates plus isolated build pass. Build uses a separate staging folder; the historical 57 tracked dist changes are preserved.
- The supplied Texas original extracts 36 rows matching the saved issuer table. Selecting printed row 34 (PDF page 4) opens that map row; Next & read selects row 35 and requests the exact SH31 merge wording with page attribution. Closing the map restores the printed review. No automatic audio starts on handoff.
- A deliberately changed direction in a throwaway saved-map fixture blocks the entire connection and shows PDF versus map text for row 35. The Kansas original keeps three printed rows and speech, with the map action disabled.
- Fresh 390px Chromium context: 356px dialog client/scroll widths, 48px voice controls, no page errors. Original map coordinates unchanged. Normal public map assets/tiles allowed; provider APIs blocked; speech intercepted. Physical iPhone audibility and full street-tile coverage are not proven.
- A browser test initially sampled a reopened PDF before extraction finished. The harness now waits for the visible dialog and completed extraction; the repeated test passes. No application workaround was needed.

Private evidence remains outside Git: `outputs/permit-printed-map-browser-20261016.json`, `permit-printed-map-build-20261016.txt`, phone/mismatch screenshots. Real PDFs, permit identifiers and coordinates were never committed or deployed. The tests used only temporary browser storage, not the owner's actual saved trip or account.

## Release scope

Verified existing target: drivers-lounge / steves-projects-c46af6ff, Node 22.x, GitHub steve8888johnson/drivers-lounge. Pre-release Vercel usage showed about $19.48 remaining in its existing Pro allowance. No new paid service, upgrade, routing-provider call, credential, email DNS, database or PR4 change. Supabase remains on the previously owner-confirmed Free plan. Operational guidance remains disabled. Production evidence will be appended after exact-source verification.

## Parked phone test

Refresh Drivers Lounge, open the saved Texas original with **Read printed route**, select a row and tap **Show this row on scanned map**. Use **Read turn aloud** or **Next & read** and compare the heard words with the displayed row. If the action is disabled, read its reason; do not substitute a different road to force a match. This is parked review, not driving guidance. Account transfer still requires Save trip to account / Open account trip; actual owner-to-phone transfer remains the owner's pending check.
