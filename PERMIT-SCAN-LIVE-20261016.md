# Permit scanner release — October 16, 2026

- Production: https://driverslounge.app/permitted-loads?scan=1
- Status: READY; production aliases assigned without alias error.
- Source: b8900abeb315855976bd379e5ed66e962b02d94e
- Deployment: dpl_5GuaJPBMUn6AjM1yMN7LYfYjEkz6
- Build: static multi-page frontend with Node functions; 16 seconds reported by Vercel.

Remote build passed all 414 tests, 186 JavaScript plus four inline syntax checks, static contracts and 57 pages / 833 internal references. Five changed public assets match their exact Git blobs. Permit, navigation and account pages return HTTP200. The permit page retains camera=(self); other tested pages retain camera=(). Existing accountsEnabled=true, readOnlyBeta=true and permitGuidanceEnabled=false are unchanged.

Live browser upload in a separate PRACTICE ONLY trip saved the supplied Texas QR photo, decoded its exact reference and exposed Scan saved photo. This practice trip already had the HTTPS form of the same issuer link; the scanned HTTP original remains a separate preserved reference. No owner load was edited. Local browser checks and limitations are in PERMIT-SCAN-INTAKE-20261016.md. Private inputs were not committed or deployed.

The newly scanned live reference was loaded, reviewed and saved: 2,818 coordinates and 36 printed rows remained present. SH31 row 34 speech reported playing then finished; voice was stopped before handoff. This is browser-event evidence, not physical audibility. The live desktop browser had no warnings/errors. Local phone-width evidence is separate: the viewport override affected the isolated QA tab, not the pre-existing live tab. Saved live screenshot: outputs/permit-scan-ready-live-preview-20261016.jpg. Temporary QA tab closed, viewport reset and QA server stopped; live practice map remains open.

An immediate deployment-scoped ten-minute error/fatal runtime query returned no groups; this is not sustained monitoring. Physical iPhone camera, Files picker, audibility/Bluetooth and interruptions remain the user's parked test. Permit trips and originals stay local to the device; account truck-setup sync does not sync permit files. Guidance remains disabled.

Evidence outside the repository: outputs/permit-scan-ready-tests-20261016.txt, permit-scan-ready-final-intake-tests-20261016.txt, permit-scan-ready-browser-20261016.json, permit-scan-ready-live-20261016.json and permit-scan-ready-live-browser-20261016.json. Source is pushed on the existing release branch. No PR4 merge, purchases, paid routing requests, credential, account-gate or email-DNS changes. Historical 57 tracked dist changes remain preserved.
