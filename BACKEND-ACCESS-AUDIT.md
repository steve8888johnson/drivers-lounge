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

- Owner approved production callbacks. Saved and verified after dashboard reload: Site URL https://driverslounge.app; callbacks https://driverslounge.app/account?flow=recovery and https://driverslounge.app/account?confirmed=1. Four existing callbacks retained, six total. No wildcard added. Evidence: outputs/supabase-production-redirects-saved.png in the parent workspace.
- Custom SMTP is now enabled with Resend and a verified sending domain. The real recovery test failed with SMTP535 invalid credentials; a restricted replacement key is prepared for owner handoff. Actual confirmation/reset delivery remains blocked. See the latest evidence at the end and AUTH-EMAIL-PLAN.md.
- No end-to-end real-user signup, confirmation, recovery, account deletion processing or native callback test yet. Account deletion request creation is not proof of completed deletion.
- Advisor still flags extension function exposure and disabled leaked-password protection; deny-all legacy tables are not automatically defects. Broad TRUNCATE/REFERENCES/TRIGGER grants warrant separate least-privilege review; no claim of an exposed HTTP exploit established.
- Legacy Highway tables/auth trigger are present. Do not enable the separate freight service on this database.
- Website remains read-only; navigation and payments remain held. No persistent database data/schema changes, credentials, DNS changes, fees or store submissions in this audit.

Next: production email sender (see AUTH-EMAIL-PLAN.md); isolated preview with account-only scope; real signup/recovery/deletion and two-device tests before enabling public accounts. Native build/signing/device tests and Apple enrollment remain separate gates.

## Resend domain connected; SMTP credential handoff pending
Observed signed-in account is steve.8888.johnson@gmail.com (user chose this sign-in), team steve.8888.johnson. Usage dashboard verifies Transactional Free: 3,000/month,100/day,0 used; paid overage switches off/disabled. No card, upgrade or charges added.
Created auth.driverslounge.app (Resend domain f6b72ea7-1943-4004-b95f-af8e11f2f83a,us-east-1), receiving disabled. Added exactly three provider-generated DNS records through Vercel's individual record form: resend._domainkey.auth TXT (DKIM), rsend.auth CNAME rsend.forge.rmta.net, send.auth CNAME send.forge.rmta.net. All three resolve publicly; Resend shows verified and ready to send. Existing five Drivers Lounge records and all twelve Atlas Digital records compare unchanged against the saved baseline. No zone replacement, root MX changes or optional DMARC change.
Prepared but DID NOT create sending-only key named Drivers Lounge Supabase Auth scoped to auth.driverslounge.app. Prepared but DID NOT save Supabase SMTP: no-reply@auth.driverslounge.app, Drivers Lounge, smtp.resend.com,465,resend,60-second user interval. Password blank. Owner asked to create/copy key directly into Supabase Password and save, per browser credential handoff rule. No secret read/stored/logged; no email sent yet. Website remains read-only, so this is not functional signup/recovery completion.
Nine existing auth/read-only source tests passed. Actual email receipt, reset completion, abuse limits, public account enablement and native behavior remain unverified. Next turn inspect saved SMTP and run authorized delivery tests, then safely enable account UI only when associated gates pass.
Evidence in parent outputs: resend-free-plan.png,resend-domain-verified.png,resend-key-prepared.png,supabase-smtp-prepared.png,RESEND-DNS-BEFORE.json.
## SMTP saved, delivery blocked by invalid credential — October 13, 2026, 10:14pm MDT

Owner saved custom SMTP. An independent fresh dashboard tab confirmed enabled with sender no-reply@auth.driverslounge.app, name Drivers Lounge, host smtp.resend.com, port465, username resend and60-second minimum interval. Stored password is hidden; no secret inspected. The confirmation template uses {{ .ConfirmationURL }}.

One password-recovery test for the owner's existing confirmed account failed at2026-10-14T04:14:27Z. Supabase auth logs recorded HTTP500 and SMTP535 "Authentication credentials invalid"; Resend shows no sent emails and the existing domain-restricted key has0 uses. Do not retry unchanged credentials. Browser-redacted input values initially misled a comparison check; sender and username were confirmed correct, with no changes saved.

Prepared replacement "Drivers Lounge Supabase Auth v2", Sending access only, scoped to auth.driverslounge.app. Not created by agent. Owner must click Add, copy the complete key immediately (not the shortened detail-page token), enter it in Supabase Password and save. No key copied to chat/source/screenshots. Evidence: outputs/supabase-smtp-saved.png and outputs/resend-key-v2-prepared.png in the parent workspace.

Resend Free remains selected with paid overages off. Verified domain/DNS unchanged. Website remains read-only. Successful delivery, actual confirmation/reset callbacks, completed password reset, signup and account-deletion workflows remain unverified; SMTP saved is not functional completion.
