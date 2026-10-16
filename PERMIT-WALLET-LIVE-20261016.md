# Private permit and route sync — live October 16, 2026

- Production: https://driverslounge.app/permitted-loads
- Exact source: `1da87ad362f018a6f9d8f74878398b3492088486`
- READY deployment: `dpl_2jXkoAKCXmSFZfv76aHLjQH9h7NL`
- Deployment URL: https://drivers-lounge-q4zqyk5ql-steves-projects-c46af6ff.vercel.app
- Target: production, existing `drivers-lounge` project / `steves-projects-c46af6ff` team.
- Framework: static multi-page website with Node functions; Node 22.x; standard build. Remote build 15 seconds.

## Behavior

The permit page now offers Save trip to account, Check account trips and Open account trip. Saving uploads private original documents and publishes the saved route snapshot only after every original succeeds. Opening on another device downloads and hashes the originals before atomically adding a local trip. Route points and literal issuer instructions transfer without another route calculation. Save explicitly again after edits; conflicts stop rather than silently replacing another device's changes.

Completed-move holds survive. Permit review approvals and crew invitations do not transfer. Operational guidance remains disabled. Local device files and older copies are preserved. Removal of an account copy is a separate explicit action; interrupted cleanup can be retried. Storage, privacy and deletion details are in `PERMIT-WALLET-SYNC-20261016.md`.

## Evidence and limits

The single new Supabase migration is applied and recorded. Live rollback tests cover owner access, cross-owner/anonymous denial, stale writes, archive requirements and removal. A privileged Storage API test round-tripped a public synthetic image with matching SHA-256, rejected unsigned reads and removed the fixture. Zero test rows/files remained. Nine legacy advisor findings were unchanged; no new findings. This is not a whole-project clean security audit or authenticated driver's upload proof.

Local and final remote builds pass 431 tests, 193 JavaScript plus four inline syntax checks, 57 pages / 833 links and static gates. One local build initially lacked environment configuration; it then passed with only the existing public website configuration, without retrieving secret values. Historical root `dist/` changes were untouched.

Mock-backed real-UI browser tests preserve the supplied Kansas and Texas PDFs byte-for-byte, all 2,818 saved Texas coordinates and 36 literal instructions. Interrupted transfers, stale device edits, account changes, removal retaining device copies and an offline reload were exercised. Added browser checks distinguish a real SDK `AuthSessionMissingError` from an authentication outage; both keep cloud actions disabled, with appropriate text.

Final live checks confirm ten public asset hashes match the exact Git source. Permit, navigation, account and privacy pages return 200. A fresh signed-out 390px browser displays the correct sign-in state, no horizontal overflow, four 48px buttons, no page errors and no failed requests. This is Chromium on a desktop, not physical Safari. Flags remain `accountsEnabled=true`, `readOnlyBeta=true`, `permitGuidanceEnabled=false`.

A separate fresh production browser waited for the service worker to activate, verified 75 shell entries including the new sync module, and reopened the permit page with the network offline. No account, configuration or API responses were in that shell cache. This proves the public offline shell; private offline originals were tested separately in the local mock-backed transfer test. Evidence: `outputs/permit-wallet-live-offline-shell-20261016.json`.

A deployment-scoped ten-minute error/fatal query returned zero records at 15:46 UTC. This is a bounded observation, not sustained monitoring; log drains were not assessed. The earlier deployment `dpl_HsocSCmGnPpMyejcn8ZWe2Zuhb8C` / `4e5beec` was superseded by the signed-out message fix.

## Cost and owner test

Supabase remains on the owner-confirmed Free plan. Vercel already has Pro; the pre-release check showed $0.49 used of its $20 monthly included credit. This release uses that existing allowance. No upgrade, purchase, paid routing request or new paid service. Shared limits still apply; there is no promise of unlimited storage or that the existing hosting subscription is free.

Real authenticated owner-to-phone transfer remains unverified:

1. On the computer, refresh the permit page, open the existing trip and select **Save trip to account**. Wait for the saved confirmation.
2. On the iPhone, sign in to the same account, refresh the permit page and select **Check account trips**. Select that trip and choose **Open account trip**.
3. Confirm the original PDFs/photos, state permits and saved map are present. Keep the local originals. Save again after later edits.

No tokens were extracted from a personal browser and no test credentials/users were created. Owner-approved CLI login was used normally. Email DNS, payment/account gates, PR4 and operational navigation are unchanged. The 57 historical tracked `dist/` edits remain preserved.

Evidence under workspace `outputs/`: `permit-wallet-final-deployment-20261016.json`, `permit-wallet-final-live-build-20261016.txt`, `permit-wallet-live-check-20261016.json`, `permit-wallet-live-phone-20261016.png`, `permit-wallet-final-live-errors-20261016.txt`, `permit-wallet-public-check-20261016.json`, `permit-cloud-browser-final-20261016.txt` and the backend evidence listed in `PERMIT-WALLET-BACKEND-20261016.md`. Private permits and precise route material were not committed or deployed.
