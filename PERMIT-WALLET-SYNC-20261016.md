# Permit and route account sync — October 16, 2026

## Status

**Backend and website controls are live; real owner-to-iPhone transfer still needs confirmation.** After both chat connectors remained unavailable, Steve explicitly authorized official local-tool browser sign-ins and completed Supabase and Vercel authentication. He reconfirmed the existing Supabase organization still shows Free. Only migration `20261016135203_private_permit_wallet_sync.sql` was applied, using a staging directory populated from actual remote migration history and a dry run proving exactly one pending change. No plan upgrade or purchase.

Live rollback tests pass for table owner access, cross-owner/anonymous denial, stale writes, archive requirements and empty-wallet removal. Actual Storage API upload/download preserved a small public test image's SHA-256; unsigned reads failed and API removal was verified. This privileged CLI transport test does not establish an authenticated driver's browser upload. Zero test wallets and originals remain. Post-migration advisors have the same nine pre-existing notices and no new ones. See `PERMIT-WALLET-BACKEND-20261016.md`.

The initial sync release at https://driverslounge.app/permitted-loads was verified at source `1da87ad362f018a6f9d8f74878398b3492088486`, deployment `dpl_2jXkoAKCXmSFZfv76aHLjQH9h7NL`. Ten public asset hashes matched Git; remote 431 tests and build checks passed. A real SDK missing-session response exposed misleading error copy; it now shows the normal sign-in state while other authentication failures still disable transfers. See `PERMIT-WALLET-LIVE-20261016.md`. Current production also includes resumable scan history in account packets and Next & read controls at source `e5cd5a56a6b2a2386bc8eef3d733104664c9031a`; see `PERMIT-RESUME-VOICE-20261016.md` for that release and its 438-test verification. The printed-PDF/issuer-table matching and selected-row map handoff release is documented in `PERMIT-PRINTED-MAP-20261016.md`. Approach/merge road-contact comparisons are documented in `PERMIT-RAMP-ROAD-CONTACT-20261016.md`. Latest production is source `593af18ebd05b89bc7aeeddf744ce42730cf240f`, adding source-bound ramp traversal-order comparison; see `PERMIT-RAMP-ORDER-20261016.md` for 455-test and live verification. Sync behavior is unchanged.

Vercel already uses Pro; its checked allowance had $19.51 of $20 monthly included credit remaining before these releases. No paid service or upgrade was added. User-approved CLI logins were the only credential-related change; no secrets entered source or reports. DNS, account/payment settings, PR4 and operational guidance remain unchanged. Do not describe all hosting as free or the actual iPhone transfer as proven.

## User flow

1. Scan/import permits and save the plotted route on one device.
2. Sign in and choose **Save trip to account**. The app checks every original, uploads immutable private files and publishes a complete snapshot only after all uploads succeed.
3. On another device, sign in to the same account and choose **Open account trip**. It refreshes the account list, downloads and hashes every original, then atomically creates a device copy. No rescanning or new route calculation.
4. Save again after edits. Conflicting versions stop; opening a newer account version preserves the older device copy. Device deletion and account deletion are separate, explicit actions.

Transfer copies text, QR references, issuer geometry, load details and originals. It never grants permit/geometry approval, recreates turns or shares with crew. A completed-move hold survives transfer. Phone Safari and physical audio/camera tests remain owner checks.

## Privacy, storage and failure behavior

- New owner-only `dl_permit_wallets` table and private `permit-wallet` bucket. Server RLS, column grants, path checks, immutable objects and version guards, independent of existing crew tables.
- UUID owner/trip prefixes and content hashes identify originals. No public links, client secret keys, paid routing calls or new subscriptions.
- Application limits: 20 account trips, 45 MiB current originals/trip, 15 MiB/file, 200 references/trip, 4 MiB snapshot. Free-service allowance is shared across the project, not per driver. The owner reconfirmed the Supabase organization on Free before activation. No upgrade is authorized.
- Removed/replaced and interrupted-upload files remain under that trip until explicit account removal. This avoids breaking concurrent or last-complete snapshots; it also consumes storage. Removal archives the trip, deletes its Storage objects and finally deletes its row. Interrupted cleanup stays visible and retryable. Row deletion is blocked while originals remain.
- Account files already downloaded stay in IndexedDB. Account switching filters linked copies; explicit sign-out clears the last-account display preference. While offline, that local preference permits reopening the last account's downloaded copies without authorizing any cloud transfers. Local browser files are **not encrypted** and are not a secure boundary against someone controlling the device. Exported copies/guest imports are separate; use a trusted device.
- Fresh offline install caches all transitive permit modules. No Supabase/API/authentication responses or map tiles are added to the service-worker cache. No claim of complete offline street maps.
- Failed uploads leave the prior account snapshot intact. Failed downloads/hash checks or an IndexedDB transaction abort leave existing device copies untouched. Lost save acknowledgments may require opening the latest account version rather than automatic replacement. No automatic background merge, upload queue or polling.

## Evidence

Full automated suite and focused database/transfer tests pass; exact totals are in `outputs/permit-cloud-tests-20261016.txt`. PGlite exercises anonymous and cross-owner denials, owner reassignment, immutable object updates, 20-trip quota, stale writes, archive cleanup and account deletion after object cleanup. These are local PostgreSQL tests, not a live service audit.

Local browser QA uses the real UI and three isolated contexts with a mock account/Storage service. It transfers the supplied Texas PDF (111,688 bytes) and Kansas PDF (42,108 bytes); downloaded SHA-256 hashes match originals. Texas issuer 2,818 coordinates and 36 instruction rows match exactly. Tests cover phone edits/stale desktop conflicts, failed uploads, account switching, sign-out, fresh downloads, account removal preserving device files, and an actual network-offline reload using the real service worker. At 390px there is no horizontal overflow and all account action buttons are at least 48px high. No page errors. This is Chromium testing, not physical iPhone Safari or production Supabase evidence.

Evidence outside Git: `outputs/permit-cloud-browser-20261016.json`, `outputs/permit-cloud-phone-preview-20261016.png`, `outputs/permit-cloud-browser-qa.mjs`. Private permit documents, IDs and precise coordinates are not committed or deployed. An isolated build is in `outputs/permit-cloud-build-20261016`; 57 pre-existing tracked `dist/` edits were preserved.

## Release checklist and account deletion runbook

1. DONE: Official local CLI access, exact Supabase project `opwaikfrnpvovnaslvfz`, owner-confirmed Free plan, existing policies and Vercel `drivers-lounge` / `steves-projects-c46af6ff` verified. Chat connectors are still unavailable; do not repeatedly reconnect them.
2. DONE: Only `supabase/migrations/20261016135203_private_permit_wallet_sync.sql` applied and recorded. Created with Supabase CLI 2.121.0. Do not replay the full historical migration directory against production.
3. DONE for backend checks: grants/RLS/private bucket, security advisors, rollback isolation, anonymous denial and privileged Storage transport/removal. PENDING: authenticated owner browser upload/download and physical iPhone Safari. Do not extract browser tokens or create credentials.
4. DONE: Reviewed source pushed, exact production commit READY, public asset hashes and unchanged safety flags verified. Phone test: refresh both devices, save the existing trip to account on the computer, then check account trips and open it on the iPhone under the same account. Confirm original PDFs and route; save explicitly after later edits.
5. For an account deletion request: verify authority and any required retention, revoke/sign out sessions through the supported auth workflow, archive each account wallet, delete each bucket prefix through the **Storage API**, confirm empty prefixes, then remove wallet rows and auth user. Never delete Storage metadata with SQL as a substitute for deleting the actual object. Retry incomplete cleanup before completing the request; device/exported backups remain under the device owner's control.

No claim of live sync or completed deletion may be made until the corresponding operation is verified.
