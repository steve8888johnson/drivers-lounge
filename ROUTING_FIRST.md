# Drivers Lounge — Routing First

## Product decision

Drivers Lounge is temporarily freezing expansion work outside navigation. The near-term product is a professional commercial-vehicle routing and permitted-load guidance system with an excellent parked-planning and in-cab user experience.

The current public-road preview is not a truck-legal routing engine. It uses general road geometry and must never be presented as commercial restriction-aware guidance. The permitted-load module follows reviewed issued routes and remains separate from automatic standard-truck routing.

## One navigation product, three modes

1. **Standard truck** — route produced by a licensed commercial routing provider using the complete saved truck profile.
2. **Permitted load** — exact issued permit routes, stitched state by state. The permits and official restrictions control. No automatic optimization or unapproved detour.
3. **Pilot car** — joins the permitted trip and follows the same reviewed route with lead/chase instructions.

## Non-negotiable safety rules

- No live guidance from a passenger-car/general OSRM route.
- No automatic reroute for an oversize/overweight permitted trip.
- An off-route event invalidates confidence; the driver is told to stop safely and resolve the route.
- Route calculations must include height, width, total length, trailer length/count, current/gross weight, axle count, axle-group weights and hazmat category when applicable.
- Missing, stale, contradictory or unsupported profile data blocks guidance.
- A commercial route is still advisory. Posted signs, law enforcement, permits and official restrictions control.
- Promotional pop-ups are never shown during active guidance or while motion is detected. Safety alerts cannot be disabled by subscription.

## Routing engine strategy

The app uses a server-side provider adapter so credentials never reach the browser. The first adapter targets HERE Routing API v8 truck mode because it supports custom dimensions, weight, axle-group weight, trailers, hazmat restrictions and turn-by-turn actions. The adapter is not a certification layer.

Before calling the system "truck legal," the same test routes must be compared against a second professional truck-routing source, official restrictions and physical-driver review. Trimble/PC*Miler is the preferred independent benchmark candidate.

## UX target

The driver should complete four obvious steps:

1. Enter origin and destination.
2. Confirm the truck/load profile.
3. Review route, restrictions and unresolved warnings while parked.
4. Start guidance.

The active-driving screen should show only the next maneuver, distance, current road, speed, ETA, route status and safety warnings. Job boards, bookkeeping, legal services and other revenue pages stay outside the driving screen.

## Revenue model

- Driver routing tools remain available without a service paywall.
- Sponsored placements may appear on parked planning screens and non-navigation pages.
- A **$14.99/month Ad-Free plan** removes promotional pop-ups and display placements.
- The plan does not remove safety alerts, permit notices, legal disclosures or operational messages.
- Ads must never cover route controls, warnings or permit information.

## Release gates

A production claim of professional truck routing requires all of the following:

- Licensed routing provider credentials and contract/usage review.
- Server-side profile-to-provider integration tests.
- Route-response normalization and malformed-response tests.
- At least 100 benchmark routes covering low clearances, weight-restricted bridges, length restrictions, hazmat/tunnel restrictions, toll preference and urban delivery access.
- Cross-check against a second professional routing product and official sources.
- Physical-phone testing for GPS accuracy, voice, screen lock, offline behavior and reconnects.
- Documented false-positive/false-negative handling.
- Clear safe-failure behavior when provider, GPS, map tiles or network are unavailable.

Until these gates pass, UI language must say **commercial restriction-aware route candidate**, not certified, guaranteed or truck-legal.
