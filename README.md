# Drivers Lounge Production Beta v2

A dependency-free static production build designed for reliable Vercel deployment.

## Why this build is different

- No Next.js dependency install
- No package-lock.json
- No npm package-resolution failures
- Node 22-compatible build script using only the Node standard library
- Clean branded homepage and 25+ working routes
- Responsive desktop/mobile layouts
- Interactive tab filters, reporting buttons and route-planner demo

## Deploy

Replace the contents of your local `Documents\GitHub\drivers-lounge` repository with this folder, commit, and push. Vercel reads `vercel.json`, skips dependency installation, runs `node build.mjs`, and serves `dist`.

Recommended commit: `Deploy stable Drivers Lounge beta v2`

## Important

Road, fuel, weather, parking and carrier records in this beta are demonstration data until licensed APIs and verified driver submissions are connected.
