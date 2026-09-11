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

## Additional repairs and verified configuration

- Supabase Site URL was `http://localhost:3000` with no redirects. Saved production `https://drivers-lounge.vercel.app` and four exact recovery/confirmation URLs for production and the stable RC2 alias; verified after reload.
- Custom SMTP is disabled. Default email templates remain in use; email confirmation is enabled, anonymous sign-in is disabled, and password minimum is now eight characters. Email links expire after 3600 seconds. Leaked-password protection requires Pro; no billing was changed.
- Mission Control, safety, fleet, dispatch, service and pilot-car pages no longer show fictitious operational values or sample businesses.
- Driver Passport is private and persisted, résumé is printable, and documents upload to the private owner-scoped vault with short-lived signed viewing links.
- Added real employer job publishing/closing, shipper business registration, freight drafts and verified publishing, service-business registration, public opt-in pilot-car profiles, directory feeds and truthful empty states.
- Fixed load schema/status mismatch and road-report category filters. Navigation records route estimates and vehicle notes, fixes location timing/recentering, and states clearly that vehicle dimensions do not affect general routing.
- Added a device-only dispatch notebook with export and a calculator including deadhead and user-entered trip expenses. No accounting, ELD, telemetry or automatic messaging is implied.
- Protected document, pilot, business and sponsorship verification fields; made petition signatures private; bounded new public image uploads. Business identity edits require reverification.
- Stripe behavior tests now cover signature/timestamp validation, mode/amount/currency checks, trusted redirects, retry keys, partial refunds and retryable database failure. Billing event deduplication and state updates are atomic; late failures cannot undo paid/refunded states. Commercial checkout defaults closed until `COMMERCIAL_PAYMENTS_ENABLED=true` is deliberately configured after integration testing.
- Saved offers currently save in-app; email/SMS fulfillment has no worker and is explicitly unavailable. Unsafe merchant URL schemes are not rendered.
- New migrations were tested transactionally before application: `20260911022156_rc2_driver_workspaces`, `20260911022747_rc2_billing_event_integrity`, `20260911023513_rc2_public_profile_safety`.
- Fourteen authentication/payment behavior tests pass. Added rolled-back workspace, payment-event and public-profile SQL tests. Existing user count remains one.

## Open launch gates

- Configure a production SMTP provider with a verified sender, host, port, username and password. Provider credentials are not connected. Default Supabase email is restricted to project team members: https://supabase.com/docs/guides/auth/auth-smtp . Do not put secrets into chat or commits.
- Vercel environment targets still require dashboard access; public config and health endpoints confirm only presence, not all secret values or validity.
- Confirm real email recovery and sign-in in the browser. The existing user's password has not been changed.
- Verify advertiser sandbox checkout and webhook lifecycle, including duplicate/out-of-order events, before enabling production commercial payments.
- Managed PostGIS table `public.spatial_ref_sys` has RLS disabled and grants owned by `supabase_admin`; postgres cannot revoke them. Its three `st_estimatedextent` overloads also remain callable. Requires owner-level remediation or API schema isolation. No extension was moved or dropped.
- Leaked-password protection is disabled and requires Pro. No purchase or plan change is authorized.
- Continue browser journeys on the latest preview and verify production after release. The browser viewport control has not applied phone dimensions; physical-device/mobile visual testing remains unverified.
- Complete actual signup, recovery, document upload and other authenticated browser journeys with an authorized test account. Transactional database tests do not replace these journeys.
- Certified commercial truck routing, live parking capacity, fuel-price aggregation, ELD/HOS, fleet telemetry, automatic applications and email/SMS offer delivery require additional integrations. Current UI exposes existing working tools and labels these limits.
- Verify production after release. Native app-store packaging, developer accounts and physical-device review remain separate from a web/PWA launch.

Drivers Lounge branding remains red/white/blue and “Built by drivers for drivers.” Driver services, including navigation and marketplace posting, remain free. Revenue features are for commercial partners.
