# Permit intake reliability — October 16, 2026

Selecting several permit originals previously interleaved saving and QR scanning. A stopped PDF scan could skip later originals while the completion message claimed the whole selection had been saved. Some single-PDF upload controls saved without scanning, and saved photos had no retry action.

The intake now saves every original first, continues after individual storage failures, and reports the actual saved count and any failed filenames. A single photo or PDF scans automatically after saving. Multiple files remain grouped under one state permit and expose explicit per-original scan buttons. Saved photos can be rescanned without uploading or duplicating them. Photo cancellation stops the worker and discards late results; changing/hiding the page also cancels the scan. The next-state action opens the scanner.

This changes intake only. QR recognition is distinct from route import and approval. Reference-only codes do not create a map; issued geometry remains an unverified parked overview. No operational guidance, account gates, provider credentials, payments or email DNS changes.

## Verification

- Isolated full build: 414 tests, 186 JavaScript files plus four inline scripts, 57 pages and 833 internal references passed; static payment/backend/store contracts passed. These are local/static checks, not App Store readiness or live account proof.
- After the final reference-only status copy fix, the 24 intake tests, syntax check and isolated build passed again.
- Browser at 390 × 844: supplied Texas PDF saved and automatically scanned. Stopping after two pages retained the original and one decoded QR, correctly reported the two remaining pages, and offered the route import.
- Texas issuer import produced 2,818 original coordinates and 36 printed rows, saved and plotted for parked rehearsal. Existing sparse-span comparison remained separate. Voice start requested on SH31 row 34 and stopped; physical iPhone audibility is not proven.
- Kansas photo decoded as reference-only, saved-photo retry produced no duplicate original or QR, and adding two more pages saved both under that permit. Stopping a saved-photo scan kept all three originals; reload retained all three and the reference-only QR.
- Photo dialog client/scroll widths both 357 px; map dialog both 342 px; no horizontal overflow at the tested size. Browser warning/error log empty.
- Private permits, identifiers and route data remain outside the repository. The owner's actual trip and historical tracked dist changes are preserved.

## Phone test

Open https://driverslounge.app/permitted-loads?scan=1 while parked. Use Choose photo or PDF for one issued state permit at a time; use + Scan next state permit for the next state. For multiple pages/files, all originals save first, then use the scan button beside an original. For an issuer route supported by the importer, review the changes and choose Save & plot route. A reference-only code needs the issuer's actual route data. Keep every original route/condition page.

Permit originals and trip data remain on this device until explicitly saved to the account. Permit-wallet account sync was subsequently released; use Save trip to account, then Open account trip on the other signed-in device. Truck-setup sync is separate. Keep the PDFs in iPhone Files, and export the trip with originals for backup. Camera permission, physical camera quality, iPhone speech/Bluetooth and interruptions still require the owner's parked test. PDF scanning can be slow; a stopped scan retains earlier decoded references and explicitly lists unscanned pages. See PERMIT-RESUME-VOICE-20261016.md for the subsequent scan-history and speech improvements.

Deployment receipt is recorded separately after live verification.
