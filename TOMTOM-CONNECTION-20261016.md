# Protected TomTom connection — October 16, 2026

## Scope

Standard, non-hazmat truck evaluation only. Permit work is deferred. The public parked turn-by-turn preview remains a fictional rehearsal. No real driving guidance, real trip directions or provider map is enabled by this change.

`api/truck-route.mjs` delegates to a bounded server handler. It is disabled unless the trusted server explicitly enables it in **Preview on the existing Drivers Lounge project**. Production cannot activate it by setting the evaluation flag. Only that deployment's exact HTTPS origin is accepted. No CORS wildcard or client enablement flag.

The handler validates the measured truck/load/equipment and future trip before doing any network work, verifies the bearer session with Supabase Auth, rejects anonymous/unconfirmed or nearly expired sessions, then reserves a single attempt through a server-only database function. The function checks the actual `auth.sessions` row, its owner/expiry, user ban state, a private tester allowlist and current owner-confirmed Free/no-paid-billing evidence. This evidence expires within seven days. Default configuration is closed with no testers or evidence populated.

The migration uses the existing Supabase project and adds no paid service. A transaction advisory lock and private request ledger apply the same fixed caps across server instances: 1,000 attempts per UTC month, 100 per UTC day, 10 per account per day, with ten seconds between an account's requests. Duplicate request IDs cannot consume another provider call. Provider failure, timeout or quota rejection does not refund an attempt. Account deletion does not erase global counts. The ledger retains at most 90 days when new approved requests arrive; no coordinates, vehicle details, credentials or returned route are stored. This is an application cap, **not control over TomTom calls from other applications or a guarantee about a later account billing change**.

The RPC alone has narrow definer rights for checking `auth.sessions`; PUBLIC/anonymous/authenticated execution is revoked. The service role can call the RPC but cannot directly access the three private tables through their grants. Tables have RLS enabled and no public policies, intentionally denying access. No credential was read or changed.

The provider transport now supports explicit text-instruction evaluation. It checks the maneuver list against the returned route and provides only a count when all structural checks pass. The HTTP response projects fixed hold reasons and an optional count. No geometry, turn text, provider exception or key is forwarded. One request, no retry, no car fallback. Missing/stale/contradictory restriction and entrance evidence still holds operational guidance.

## Verification and release state

- All 482 local tests passed, including real local PostgreSQL role/limit/expiry behavior, hostile HTTP requests, session binding, disabled Production, duplicate/cooldown/cap enforcement, provider failures, request changes and instruction-to-route validation. The queued local budget test uses PGlite serialization; it does not prove multi-process contention behavior on hosted PostgreSQL.
- JavaScript syntax, static release contracts, 57 pages / 834 local references and isolated build passed. New API entry syntax was checked separately. Existing 57 tracked historical `dist/` edits remain untouched.
- Hosted database rollback test passed against the actual schema and an existing active session. It tested private controls, session ownership, duplicate/cooldown/shared cap and rolled back every fixture; no user created or email sent.
- Applied exactly migration `20261016212531_truck_route_budget.sql` using an isolated copy of fetched remote migration history. Dry run listed only this migration. Vault, seeds and roles were excluded.
- Post-apply: migration recorded; disabled control; no testers; zero attempts; anonymous/authenticated RPC access denied; service role permitted; default call holds. Security advisor errors/warnings unchanged. Three new informational `RLS Enabled No Policy` notices describe the intentionally inaccessible private tables; these are documented, not silently ignored or represented as a clean whole-project audit.
- Supabase Free was owner-confirmed earlier today. Vercel uses its existing Pro included allowance; it is not a Free hosting plan. No upgrade, new paid service or TomTom call was made in this work so far.

Hosted endpoint deployment/verification receipt follows below when complete. Local and database checks do not prove an authenticated browser-to-provider round trip. Physical iPhone/Safari audio, Bluetooth, GPS/offline/background failure behavior and operational road validation remain unproven.

## Next connection gates

1. Owner checks [TomTom dashboard](https://my.tomtom.com/) for current Freemium/Evaluation and no paid billing. The earlier October 14 evidence is historical. Current question is pending; do not send live provider requests before the answer.
2. Explicitly enroll the approved tester and record expiring free evidence; enable only the reviewed Preview connection. The existing TomTom Secret remains Preview-only. Do not retrieve, move or replace it through this work.
3. Make one bounded fresh standard-truck instruction evaluation, return redacted diagnostics, and compare actual provider behavior without weakening failed checks. Verify session protection, shared accounting and deletion/expiry behavior over HTTP.
4. Before any route display or driving release: actual truck measurements, licensing/display rights, restriction and entrance coverage, representative routes and real phone tests. Structural parsing success is not a truck-legality certificate.

Primary references checked October 16: [TomTom pricing](https://docs.tomtom.com/pricing), [account/free-limit FAQ](https://docs.tomtom.com/platform/documentation/status-and-support/faqs), [text instructions](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/guidance-instructions), [Supabase functions](https://supabase.com/docs/guides/database/functions), [verified Auth user](https://supabase.com/docs/reference/javascript/auth-getuser), [Vercel Node HTTP handlers](https://vercel.com/docs/functions/runtimes/node-js). Supabase changelog reviewed: upcoming CBC TLS removal and PostgreSQL 15.19/17.11 changes do not require changes to this Node 22 HTTPS / basic PostgreSQL implementation; no old TLS, ltree, legacy PGP decryption or custom operators introduced.

Private evidence is in workspace outputs: `truck-route-build-20261016.txt`, `truck-route-rollback-20261016.json`, `truck-route-postcheck-20261016.json`, `truck-route-migration-applied-20261016.json`, and before/after advisor reports. No original permits or private trip response are included in the release.
