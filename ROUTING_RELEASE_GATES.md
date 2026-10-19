# Drivers Lounge routing-first release gates

Updated October 5, 2026.

This branch is focused on one product: a high-quality commercial-truck routing and guidance experience. It is not a production release certification.

## Product boundary

Drivers Lounge should first become excellent at:

- Standard commercial-truck route calculation using the complete entered vehicle/load profile.
- Clear parked route review before guidance.
- Mobile-first turn-by-turn guidance with voice prompts and route-deviation protection.
- Separate issued-permit guidance for oversize/overweight moves, where the issued permit remains controlling.
- Safe failure when provider data, GPS, permit evidence, or connectivity is inadequate.

Job boards, legal services, bookkeeping, carrier tools, community, marketplace, and other revenue surfaces remain secondary until routing has passed the gates below.

## Monetization boundary

- Driver routing remains usable without a paid subscription.
- Advertising belongs on parked/planning and destination/service pages, not over active maneuvers or safety warnings.
- No pop-up may obstruct active guidance, a permit warning, a route-deviation alert, or an emergency action.
- A future $14.99/month subscription may remove eligible advertising, but subscription billing is not a routing release gate.
- Do not promise “ad-free” until all ad delivery paths honor the entitlement consistently.

## Hard release gates

1. **Licensed commercial provider is connected and contractually suitable.** The app must not claim truck-legal routing from ordinary car routing or public OpenStreetMap geometry alone.
2. **Vehicle profile reaches the provider.** Height, width, length, gross/current weight, axle count, trailer dimensions, axle-group data, hazmat/tunnel categories, toll choice, and route preference must be validated and transmitted where supported.
3. **Fail closed.** Missing credentials, malformed profiles, low-confidence geocoding, critical provider notices, stale route candidates, and unsupported permitted loads must block guidance.
4. **No automatic detour for permitted moves.** Issued permit routes use the permit workflow. A deviation freezes guidance and tells the crew to stop safely rather than inventing a route.
5. **Real-device validation.** Test current-location acquisition, foreground/background behavior, screen lock, voice, wake lock, GPS loss, inaccurate GPS, weak cellular coverage, and route recovery on supported iPhone and Android devices.
6. **Road validation.** Run controlled road tests with a standard legal tractor-trailer profile and compare route, ramps, restrictions, maneuvers, lane instructions, arrival estimates, and deviation behavior against a professional truck-navigation reference and posted controls.
7. **Restriction validation.** Use a documented test matrix covering low clearances, weight-limited roads, truck prohibitions, length restrictions, hazmat/tunnel restrictions, toll avoidance, seasonal/temporary conditions, and border/state transitions. Record both expected blocks and known provider limitations.
8. **Offline behavior is truthful.** The app shell and reviewed permit packets may remain available, but new commercial route calculation, live restrictions, traffic, and ordinary map tiles must not be represented as available offline unless they actually are.
9. **Safety UI wins over monetization.** Active guidance must have no modal ads, no audio ads, no interstitials, and no sponsored content that resembles a maneuver or official warning.
10. **Claims match evidence.** Until these gates pass, use “commercial route candidate” and “restriction-aware routing.” Do not use “certified,” “guaranteed legal,” or equivalent claims.

## Current engineering status

- Routing-first branch is isolated from production.
- Commercial provider adapters exist for HERE Routing API v8 and TomTom Routing API v1, with server-side credentials and failover support.
- Ordinary permitted loads are blocked from automatic commercial routing and sent to the issued-permit workflow.
- Route candidates require a parked review confirmation before live guidance.
- Critical provider notices, stale candidates, invalid truck profiles, and route deviations fail closed.
- Automated tests cover profile normalization, provider request construction, route response normalization, critical notices, provider absence, and permitted-load separation.
- Preview Supabase public configuration is scoped to this branch; production was not changed.

## Not yet proven

- No claim is made that every U.S. commercial restriction is represented by either provider.
- No physical-road test or two-device pilot-car test is represented as complete by this document.
- No provider SLA, commercial license, cost model, or production quota has been approved here.
- No native background-navigation behavior is proven by the PWA implementation.
- No active-navigation advertising is permitted in the routing-first design.
