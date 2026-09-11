# Drivers Lounge launch audit

Verified September 10–11, 2026. This is an in-progress engineering audit, not a launch certification.

## Existing infrastructure

- Repository: `steve8888johnson/drivers-lounge`; production `main` at `e4d0fd6`.
- Existing RC2 branch: `rc2-store-ready`, starting at `657cfe4`; draft PR #1.
- Vercel project `prj_WABuJ8HC4AVK1h2FC4Y8LyrblDPW`, team `team_rY6gYxkRa7RyKX4dS8It0PXh`.
- Production: https://drivers-lounge.vercel.app ; RC2: https://drivers-lounge-git-rc2-store-ready-steves-projects-c46af6ff.vercel.app
- Supabase `opwaikfrnpvovnaslvfz`, existing free organization. It was paused; resumed successfully. One existing confirmed user remains.
- Original migrations through signup hardening 022 are present. Preserve duplicate historical migration names and the separate `ha_*` application.
- Production served RC1 with blank browser backend configuration and API placeholders. RC2 had public configuration and reported Stripe/server keys present.

## Repairs in this changeset

- Complete password recovery and confirmation resend, accurate failures and progress, same-origin return navigation.
- Preserve recovery intent before Supabase consumes the callback URL. Never report a failed email request as successful.
- Pin the already-served Supabase JS release (2.116.0) across existing pages.
- One service worker; no account/callback/API caching; network-first assets; explicit offline fallback. Keep legacy worker URL for upgrades.
- Restore hidden element semantics and mobile Account access; readable phone form fields.
- Reconcile onboarding with the real profile/passport schema; prevent client edits to roles, billing, and review verification.
- Fix marketplace publishing status and replace the sample marketplace with database listings, filtering, device saves, seller descriptions/contact details, and owner status controls.
- Submit anonymous support requests without requesting a forbidden return representation.
- Protect private community rooms, remove permissive duplicate support policy, and correct multiplied advertiser metrics.

## Validation

- Existing JavaScript, internal-link, schema-contract, store metadata, and Stripe structural checks pass.
- `node --test scripts/test-auth.mjs`: six behavior tests pass.
- `scripts/test-rls.sql`: passed against the live database inside a rolled-back transaction. Tests profile editing, blocked admin escalation, passport ownership, marketplace publishing, blocked billing/verification forgery, private rooms, and anonymous support validation. No test users or records remain.
- Full static build passes with the existing public Supabase configuration. Generated `dist` is not the source of truth; Vercel rebuilds `src`.
- Browser localhost navigation is blocked by this environment. Use the Vercel preview for browser verification.

## Open launch gates

- Dashboard sign-in requested for Vercel environment targets and Supabase Site URL, redirect allowlist, email templates and custom SMTP. Connectors do not expose these settings. Do not put secrets into chat or commits.
- Confirm real email recovery and sign-in in the browser. The existing user's password has not been changed.
- Verify advertiser sandbox checkout and webhook lifecycle, including duplicate/out-of-order events, before enabling production commercial payments.
- Managed PostGIS table `public.spatial_ref_sys` has RLS disabled and grants owned by `supabase_admin`; postgres cannot revoke them. Its three `st_estimatedextent` overloads also remain callable. Requires owner-level remediation or API schema isolation. No extension was moved or dropped.
- Leaked-password protection is disabled; investigate plan/config availability without changing billing.
- Continue full route, feature, mobile, content-truthfulness, and authenticated-user journey audits. Jobs, load contacts, driver documents, partner directories and other older pages need functional review.
- Verify production after release. Native app-store packaging, developer accounts and physical-device review remain separate from a web/PWA launch.

Drivers Lounge branding remains red/white/blue and “Built by drivers for drivers.” Driver services, including navigation and marketplace posting, remain free. Revenue features are for commercial partners.
