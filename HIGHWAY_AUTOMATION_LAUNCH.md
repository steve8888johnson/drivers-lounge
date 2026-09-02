# Highway Automation MVP RC1 — Launch Handoff

## Current release candidate
Branch: `highway-automation-mvp`
Stack: Next.js 15 + Supabase + Stripe + Vercel

## Code-complete MVP surfaces
- Driver, shipper and admin authentication/roles
- Shipper paid load posting gate
- Driver load board and load requests
- Shipper driver request review and assignment
- Realtime load chat
- Driver load status progression
- Secure load/account document uploads and signed access
- POD workflow
- Notifications
- Profiles
- Plan and posting-credit center
- Advertising inventory, popup/inline units, click/impression tracking
- Advertiser checkout and campaign dashboard
- Admin user/document approvals
- Support tickets + admin queue
- Load disputes + admin queue
- Password recovery
- Account deletion requests + admin queue
- Terms and privacy pages
- Health endpoint

## Supabase isolation
All Highway Automation application data is stored in `ha_*` tables so it does not collide with Drivers Lounge tables in the shared Supabase project.
Private files use the `ha-documents` bucket.

## Before production
1. Create a dedicated Vercel project for Highway Automation. Do NOT promote this branch inside the Drivers Lounge project.
2. Import GitHub repo `steve8888johnson/drivers-lounge` and use branch `highway-automation-mvp` as the Highway Automation production branch, or migrate this branch to a dedicated repo later.
3. Add production environment values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
4. Register Stripe webhook endpoint: `https://<production-domain>/api/stripe/webhook`.
5. Create the first Highway Automation account, verify its email, then designate the intended owner account as `admin` in `ha_profiles`.
6. Run an end-to-end test:
   - shipper buys one $9.95 posting
   - webhook grants one posting credit
   - shipper posts a test load
   - driver requests it
   - shipper assigns driver
   - chat is created
   - driver advances load status
   - driver uploads POD
   - admin verifies document
7. Test advertiser purchase and confirm paid campaign activates and records impressions/clicks.
8. Attach production domain and update Supabase Auth redirect URLs for signup/password recovery.
9. Review Terms/Privacy with transportation/privacy counsel before broad commercial rollout.

## Health checks
- `/api/health`
- `/api/stripe/health`

## Important safety rule
Never promote the Highway Automation branch as production inside the current Drivers Lounge Vercel project. Highway Automation needs its own Vercel project/production alias.
