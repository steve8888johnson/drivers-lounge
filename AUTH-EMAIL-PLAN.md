# Authentication email plan — October 13, 2026

Research only. No provider account created, terms accepted, paid plan selected, credentials generated, DNS modified or messages sent.

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

