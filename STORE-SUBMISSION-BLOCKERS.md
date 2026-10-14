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
