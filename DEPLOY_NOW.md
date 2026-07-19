# Drivers Lounge — Deploy Now

## 1. Supabase
1. Create a new Supabase project.
2. Open SQL Editor > New query.
3. Paste and run `supabase/SETUP_ALL.sql`.
4. Open Authentication > Providers and enable Email.
5. Open Project Settings > API and copy:
   - Project URL
   - Publishable/anon key

## 2. Vercel
1. Create a new Vercel project and import this folder/repository.
2. Add these environment variables for Production, Preview, and Development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy.

Do not add `SUPABASE_SERVICE_ROLE_KEY` unless a server-only feature is later implemented. Never expose it as a `NEXT_PUBLIC_` variable.

## 3. Finish Supabase authentication URLs
After Vercel gives you the production URL:
1. Supabase > Authentication > URL Configuration.
2. Set Site URL to `https://YOUR-VERCEL-DOMAIN`.
3. Add Redirect URLs:
   - `https://YOUR-VERCEL-DOMAIN/**`
   - `http://localhost:3000/**`

## 4. Test
1. Open `/account`.
2. Create an account.
3. Confirm the verification email.
4. Sign in.
5. Save Driver Passport and My Truck information.
6. Sign out and back in to confirm cross-device persistence.

## Current public-beta limitations
- Directory/map records are seed/prototype data until production datasets are imported.
- Full truck-legal turn-by-turn routing is not active yet.
- Document metadata saves, but binary document upload UI is not yet enabled.
- Moderation and advertiser approval workflows require further development before broad public promotion.
