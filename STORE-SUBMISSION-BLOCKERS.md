# Store submission blockers — October 13, 2026

This audit supersedes any older document calling RC2 store-ready. Prior checklist scripts check source presence and wording, not native or production readiness.

Observed live:
- Apple Atlas Digital Works LLC remains Pending; enrollment575BFB732U processing. No payment or publishing workflow available from the account page.
- Google organization account8390685167061150509 ready; no apps. Prepared Drivers Lounge, free app, en-US, proposed package app.driverslounge.mobile (available). Did not accept policy/export declarations or Play App Signing Terms; app not created.
-56/56 public Drivers Lounge pages return200. Runtime remains readOnlyBeta=true, permitGuidanceEnabled=false and no connected browser backend. HTTP success is not functional QA.
- Supabase list reports ACTIVE_HEALTHY, but SQL inspection timed out and security advisor reports hibernated. Browser requires sign-in. No migrations or security changes performed.
- Android/iOS projects generated in mobile/,806 bundled references pass. No signed artifact, emulator/physical-device test or store upload.

Release scope must be truthful: driver planning/reference/local permit tools in beta. No live truck guidance, functioning community accounts, freight marketplace or payments may be advertised until verified. Highway Automation remains the separate freight marketplace.

Next gates:
1. Owner signs in to Supabase; inspect/recover existing project and reconcile deployed schema, auth configuration and RLS in a safe environment. Verify two-user isolation and deletion before account activation.
2. Install/authorize Android tools and licenses; sign/build/test AAB. Google declarations require owner review after actual build assessment.
3. Apple completes enrollment; owner pays fee if requested. Build/sign on authorized Mac or approved build service, then TestFlight/device QA.
4. Complete listing artwork, actual-build data safety/privacy labels, content rating, app access/reviewer notes and review submission. Publication tonight cannot be guaranteed.
5. Truck provider contract/access, coverage and safety tests before operational routing activation.

## Backend access recovered — October 13, 2026
Supabase SQL now responds and dashboard reports Healthy. Live rollback-only two-user tests passed for profiles, passports, admin/billing tampering, private rooms and support validation; zero fixture users remain. Auth callbacks still target old Vercel domains; exact driverslounge.app callbacks prepared but not saved pending approval. Custom SMTP disabled: public signup/confirmation/reset delivery remains blocked. No persistent schema/data changes or account activation. See work/drivers-lounge/BACKEND-ACCESS-AUDIT.md. This supersedes earlier hibernation/sign-in blocker.


## Production authentication links saved — October 13, 2026
Owner approved exact driverslounge.app callbacks and default Site URL. Saved both confirmation/recovery URLs and Site URL, verified persistence after reload; six total callbacks, old entries retained. Email research recommends Resend Free for controlled beta (3,000/month,100/day); Brevo Free alternative300/day with branding and over-limit queue. Provider account/credential/DNS and delivery tests still pending. No charges or DNS changes. See AUTH-EMAIL-PLAN.md and BACKEND-ACCESS-AUDIT.md in work/drivers-lounge.

## SMTP saved, delivery blocked by invalid credential — October 13, 2026, 10:14pm MDT

Owner saved custom SMTP. An independent fresh dashboard tab confirmed enabled with sender no-reply@auth.driverslounge.app, name Drivers Lounge, host smtp.resend.com, port465, username resend and60-second minimum interval. Stored password is hidden; no secret inspected. The confirmation template uses {{ .ConfirmationURL }}.

One password-recovery test for the owner's existing confirmed account failed at2026-10-14T04:14:27Z. Supabase auth logs recorded HTTP500 and SMTP535 "Authentication credentials invalid"; Resend shows no sent emails and the existing domain-restricted key has0 uses. Do not retry unchanged credentials. Browser-redacted input values initially misled a comparison check; sender and username were confirmed correct, with no changes saved.

Prepared replacement "Drivers Lounge Supabase Auth v2", Sending access only, scoped to auth.driverslounge.app. Not created by agent. Owner must click Add, copy the complete key immediately (not the shortened detail-page token), enter it in Supabase Password and save. No key copied to chat/source/screenshots. Evidence: outputs/supabase-smtp-saved.png and outputs/resend-key-v2-prepared.png in the parent workspace.

Resend Free remains selected with paid overages off. Verified domain/DNS unchanged. Website remains read-only. Successful delivery, actual confirmation/reset callbacks, completed password reset, signup and account-deletion workflows remain unverified; SMTP saved is not functional completion.
