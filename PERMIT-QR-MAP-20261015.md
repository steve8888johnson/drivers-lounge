# QR scan to map — October 15, 2026

Scope follows Steve's correction: focus on scanning and plotting issued-route data, without more analysis of the particular Kansas/Texas trips.

## Behavior

- Direct **Scan permit QR** entry from Navigation and the permit workspace. Opens the existing load's scanner; no loaded dimensions are required merely to preview coordinates.
- Camera, photo/PDF file picker, and pasted QR contents. Choosing a PDF in the scanner starts the existing local page scanner automatically. Originals, page-scan summaries, duplicates and capacity limits remain preserved; failed/partial scans stay visible for retry.
- Distinct cards for route coordinates, route text, issuer/provider links, and identification-only codes. Raw payloads are collapsed. Import failures appear next to their action. External QR links require a deliberate click, retain their exact scheme and never bypass authentication.
- Supported route import still uses the existing validated formats and allowlisted public provider adapters. After reviewing the proposed changes, **Save & plot route** opens a full-state street-map preview. Saved previews reopen from the Route tab. Text-only codes do not claim to plot.
- The overview preserves supplied coordinates and maneuver boundaries. Invalid, sparse and dateline-crossing segments remain undrawn; gaps never become guessed roads. At most 1,000 instructions / 100,000 supplied points. Every import clears confirmations, and operational guidance stays disabled.
- Camera decoding reuses the already-decoded frame instead of decoding the same capture a second time.

## Verification

- 373 tests pass, including new tests for full-route gaps, invalid/excessive geometry, no approval mutation, map mode switching, QR classification/link safety and bounded QR retention. Existing import, wrong-permit, partial/aborted PDF scan and provider-failure regressions pass.
- Syntax: 173 JS files plus four inline scripts. Links: 57 pages / 833 local references. Existing billing, database and store static contracts pass. Isolated build succeeds; historical 57 tracked dist edits remain untouched.
- Actual browser test with synthetic QR image and PDF: both decoded, retained the original, displayed the import review and opened the supplied two-instruction map. PDF ran automatically, retained one QR, and reported one checked page with no failure. Reopened saved previews survived reload. An ID-only Texas-shaped QR offered its exact issuer link and zero import/plot buttons.
- 390×844 responsive check: dialog client and scroll width both 342px; 300px map begins around y376; large controls fit. Tiles loaded; no browser warning/error logs. Test data are conspicuously synthetic, not issued road authorizations. Physical iPhone camera, Safari audio/GPS and real permit provider coverage are not established by this test.
- An older localhost origin retained an older script during initial QA; a fresh no-store local test origin was used. Production asset hashes and live controls must be checked after deployment.

## Limits

Not every permit QR contains coordinates or a supported public route. Identification, HTML-only, login-protected and unsupported formats remain explicit. No text-to-road inference, route optimization, detour, road clearance claim, commercial routing call or guidance activation. These are local device wallet previews, not cross-device permit sync. No credentials, DNS, fees, account gating or PR4 merge changes. Owner trip and private permit files remain untouched. Exact live receipt follows deployment verification.
