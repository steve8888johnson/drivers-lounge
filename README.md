# Drivers Lounge Public Beta

A free, advertiser-supported commercial-driver platform built with Next.js and Supabase.

## Included beta modules

Accounts, Driver Dashboard, Driver Passport, resume/employment history, document tracking, My Truck, carrier intelligence, broker reviews, shipper intelligence, repair-shop reviews, jobs, pilot-car jobs, driver rooms, petitions, feedback, road tools, scale reports, parking, fuel, services marketplace, truck-routing profile foundation, advertising and moderation foundation.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and provide the existing Supabase public URL and anon/publishable key.

## Deploy

Push the repository with GitHub Desktop. Vercel will redeploy automatically from `main`.

## Important beta boundaries

Commercial turn-by-turn routing, live FMCSA synchronization, live fuel/traffic/weather feeds and licensed facility directories require provider integrations. The current product includes the user interface and database foundation for these services and does not claim that sample/crowdsourced data is guaranteed.
