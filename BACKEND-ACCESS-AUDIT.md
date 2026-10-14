# Backend access audit — October 13, 2026

Project opwaikfrnpvovnaslvfz. Owner signed into the connected Supabase dashboard. SQL now responds and dashboard changed from Unhealthy to Healthy. This supersedes the earlier hibernation/access blocker; sign-in is not proof of what restored service.

## Verified

- All inspected public application tables have RLS enabled. PostGIS spatial_ref_sys is the extension-managed exception; no extension changes made.
- Profile column grants prohibit authenticated updates to role, verified, id and auth_user_id. Signup trigger restricts requested roles and defaults a requested admin role to driver.
- Driver document storage bucket is private, limited to PDF/JPEG/PNG/WebP and 10 MiB; storage ownership policies restrict paths to the authenticated user. Column grants prohibit changing metadata storage_path and sharing_scope.
- Application aggregate views carrier_review_scores and advertiser_campaign_metrics use security_invoker=true.
- Read-only authenticated probe with a synthetic identity: zero profiles, vehicles, documents, deletion requests and private files visible; is_admin=false. This alone would not establish populated two-user isolation.
- Anonymous probe: zero profiles, documents and private files visible; vehicle table SELECT denied. No privileges granted to make the test pass.
- Existing scripts/test-rls.sql executed against the live schema in one rollback-only transaction: own-profile edit, cross-user profile isolation, denied admin escalation, own passport creation, denied cross-user passport, denied billing forgery and review verification, private-room secrecy, published equipment listing visibility, valid and invalid support submissions all passed. Test fixtures used example.invalid addresses, no credentials, and no email was sent. Follow-up query confirmed zero fixture auth users remain.

## Blockers and limits

- Auth Site URL remains https://drivers-lounge.vercel.app; four existing callbacks point to old production/preview hosts. Exact callbacks https://driverslounge.app/account?flow=recovery and https://driverslounge.app/account?confirmed=1 are prepared in the dashboard but NOT saved, pending authentication-destination approval. Proposed default Site URL: https://driverslounge.app. No wildcard proposed.
- Custom SMTP is disabled. Supabase default SMTP only sends to project-team addresses and is not a public-production email service: https://supabase.com/docs/guides/auth/auth-smtp . Existing Google Workspace mailbox setup does not establish this application sender configuration. Provider/credentials/domain verification and real confirmation/reset delivery still needed.
- No end-to-end real-user signup, confirmation, recovery, account deletion processing or native callback test yet. Account deletion request creation is not proof of completed deletion.
- Advisor still flags extension function exposure and disabled leaked-password protection; deny-all legacy tables are not automatically defects. Broad TRUNCATE/REFERENCES/TRIGGER grants warrant separate least-privilege review; no claim of an exposed HTTP exploit established.
- Legacy Highway tables/auth trigger are present. Do not enable the separate freight service on this database.
- Website remains read-only; navigation and payments remain held. No persistent database data/schema changes, credentials, DNS changes, fees or store submissions in this audit.

Next: approved callback update; production email sender; isolated preview with account-only scope; real signup/recovery/deletion and two-device tests before enabling public accounts. Native build/signing/device tests and Apple enrollment remain separate gates.
