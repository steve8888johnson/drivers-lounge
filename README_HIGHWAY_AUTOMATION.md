# Highway Automation MVP

Standalone Next.js + Supabase MVP built on the `highway-automation-mvp` branch.

## Included now
- Highway Automation branded landing page
- Supabase email/password signup and login
- Driver / shipper / admin role model
- Shipper load posting
- Driver-facing load board
- Role-based dashboard
- Admin KPI shell
- Database tables for profiles, loads, requests, chats, messages, documents and notifications
- RLS policies and private document storage bucket

## Connect to Supabase
1. In Supabase SQL Editor run `supabase/schema.sql` once.
2. In Vercel add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Redeploy the branch.

## Admin
After creating your user, set its profile role to admin in Supabase Table Editor for initial bootstrap.

## Next build pass
- Driver Request Load button and request review/assignment
- Live chat UI
- Document uploader UI
- Admin approval UI
- Notification triggers
- Profile forms
- Production security review
