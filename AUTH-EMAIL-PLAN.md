# Authentication email plan — October 13, 2026

Current: Resend Free and sending domain verified; custom SMTP saved but recovery test failed with SMTP535 invalid credentials. Restricted replacement key prepared for owner handoff. No successful delivery or public account activation. The research/proposed configuration below is historical; latest evidence is recorded at the end.

## Recommendation

Resend Free for a controlled initial beta: 3,000 transactional messages/month, maximum 100/day, up to three verified domains. These are messages, not users; confirmation resends and password resets consume quota. A broad public launch needs a volume estimate and protection against signup abuse. Free capacity is not a delivery guarantee.

Alternative: Brevo Free offers 300/day, with mandatory Brevo branding. Over-limit transactional messages enter a retry queue (up to 1,000); additional messages are not delivered. Queued authentication links can arrive too late. Resend also has a hard daily budget, so the recommendation is based on its documented Supabase integration and fit for a small app beta, not a claim of superior delivery reliability.

## Proposed configuration

- Resend Free account owned by Atlas Digital Works LLC; owner-controlled login. No paid upgrade or overage add-on.
- Dedicated sending subdomain auth.driverslounge.app, proposed sender Drivers Lounge <no-reply@auth.driverslounge.app>. Not yet provisioned.
- Verify only the exact provider-generated DNS records after checking existing records. Preserve existing Google Workspace MX/SPF/DKIM and other email records. Do not invent verification values or enable inbound mail.
- Supabase SMTP host smtp.resend.com, port 465, username resend. A provider credential must be stored only in Supabase's protected SMTP configuration. Never place it in frontend config, screenshots, source control or chat. Owner handles credential creation/entry if done through the browser.
- Disable click/open tracking for authentication email; retain email confirmation. Review account/provider production approval and sending limits before activation.
- Test actual signup, confirmation, resend, password reset, expired/used links and quota/network failure with authorized test recipients. Verify From identity, DNS authentication and delivery to Gmail/Outlook. Do not open public accounts merely because a test send succeeds.
- Keep signup email separate from marketing. Website read-only gate remains until account and privacy/deletion workflows pass.

## Official sources checked

- https://resend.com/docs/knowledge-base/account-quotas-and-limits — current free quotas and domain limits.
- https://resend.com/pricing — free plan and upgrade/overage behavior.
- https://resend.com/docs/send-with-supabase-smtp — integration requirements/settings.
- https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan — daily quota, branding and queue behavior.
- https://supabase.com/docs/guides/auth/auth-smtp — default sender unsuitable for public production; separate authentication sending domain guidance.

## Setup started
Owner authorized Resend Free setup and functioning signup/recovery with no charges. Signup opened with steve@atlasdigital.dev, marketing unchecked; password entry and signup terms left to owner. Awaiting dashboard handoff. Vercel confirmed authoritative for both domains. Driverslounge.app has only five existing web/CAA records; auth subdomain has no explicit email records. Atlasdigital.dev Google MX/SPF/DKIM/DMARC verified and recorded in outputs/RESEND-DNS-BEFORE.json. No DNS mutation yet; provider-generated verification values unavailable until account creation. Production account activation remains held.


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
