# Private permit sync backend — October 16, 2026

## Scope and status

Backend applied to the existing Drivers Lounge Supabase project. Website code remains local pending Vercel approval and exact-source deployment. The owner approved official CLI browser authentication and confirmed organization Free in its billing page. No upgrade, purchase, routing activation, PR4 merge or email DNS change.

Migration `20261016135203_private_permit_wallet_sync.sql` is recorded remotely. An isolated directory fetched the existing remote migration history, received only this reviewed new file, and the dry run listed exactly that file. The real push skipped Vault, roles and seeds. Historical local migrations were not replayed.

## Verified evidence

- Healthy intended project and organization. Before the change: 24,390,803 database bytes and zero Storage objects. All pre-existing object policies were bucket-scoped; none granted access to the new bucket.
- New bucket is private, permits only PDF/JPEG/PNG/WebP and limits each object to 15 MiB. Four wallet row policies and three added Storage policies are present. All three new functions use invoker rights and a fixed empty search path.
- Live transaction tests confirmed the owner's own table operations, rejected owner reassignment/cross-owner creation, hid rows from another identity, rejected anonymous reads, held stale writes and required archive before row removal. Every fixture rolled back; no auth users or emails created.
- The public browser key's actual REST request to the wallet table was denied with HTTP401 / SQL42501. Existing account/planning/guidance flags remain true/true/false respectively.
- Actual privileged CLI Storage upload and download of a small public map icon matched SHA-256. Public and unsigned private requests both failed. Removal used the Storage API, and a follow-up query found zero wallet rows and zero originals. This tests storage transport, not a signed-in driver's browser permissions.
- Security advisors reported nine pre-existing findings before and after, with no new findings. Existing findings concern public PostGIS objects/functions and disabled leaked-password protection; they were not silently changed. Relevant guidance: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No claim of a clean whole-project audit.

## Test limitations and recovery

An initial rollback fixture attempted direct deletion of synthetic Storage metadata; Supabase's protection rejected it. The transaction rolled back, and the test was narrowed to wallet-table behavior. Actual object deletion was then tested correctly through the Storage API. No deletion guard was disabled. Local PGlite storage-policy tests remain separate evidence from the actual hosted service.

Concurrent CLI database checks invalidated one temporary CLI database login. Sequential rerun succeeded. Run subsequent Supabase database CLI commands sequentially; do not ask the owner to replace passwords for this tooling issue.

Existing local evidence remains 431 automated tests, complete build/static checks and real application UI in isolated mock-backed browser contexts. Real owner save/open, two actual devices and Safari audio/camera behavior still require verification. A successful migration does not mean phone sync is proven. Preserve local originals and export backups during the first test.

Evidence is under workspace outputs: permit-wallet-post-migration-20261016.json, permit-wallet-live-isolation-20261016.json, permit-wallet-advisors-before-20261016.json, permit-wallet-advisors-after-20261016.json, permit-wallet-storage-roundtrip-20261016.json, permit-wallet-public-check-20261016.json and permit-wallet-cleanup-20261016.json. Private permits are not part of this receipt or deployment.
