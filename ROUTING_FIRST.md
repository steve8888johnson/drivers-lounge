# Drivers Lounge — Routing First

## Product decision

Drivers Lounge is freezing expansion work outside navigation until the routing system is dependable enough to deserve the product's attention and trust. The near-term product is a professional commercial-vehicle routing and permitted-load guidance system with an excellent parked-planning and in-cab user experience.

A green build, provider response, attractive map, or successful test route is not proof that a route is lawful. Until the release gates below pass, product language must say **commercial restriction-aware route candidate**, not certified, guaranteed, perfect, or truck-legal.

## One navigation product, three modes

1. **Standard truck** — route produced by a licensed commercial routing provider using the complete saved truck profile.
2. **Permitted load** — exact issued permit routes, stitched state by state. The permits and official restrictions control. No automatic optimization or unapproved detour.
3. **Pilot car** — joins the permitted trip and follows the same reviewed route with lead/chase instructions.

## Non-negotiable safety rules

- No live guidance from a passenger-car/general OSRM route.
- No automatic reroute for an oversize/overweight permitted trip.
- An off-route event invalidates confidence; the driver is told to stop safely and resolve the route.
- Route calculations must include height, width, total length, trailer length/count, current/gross weight, axle count, axle-group weights and hazmat category when applicable.
- Standard routing fails closed above the conservative 13 ft 6 in, 8 ft 6 in, 80,000 lb, 20,000 lb single-axle and 34,000 lb tandem baselines. Those movements go to the issued-permit workflow rather than pretending a provider route replaces a permit.
- Origin and destination must resolve to an exact address, verified facility/POI, GPS coordinate or confirmed map point before guidance. City, state, road-only and other broad matches may be shown for parked planning but block guidance.
- Any provider or independent-audit critical notice locks the review checkbox and Start Guidance control. The lock cannot be dismissed by subscription or user acknowledgment.
- Missing, stale, contradictory or unsupported profile data blocks guidance.
- A commercial route is still advisory. Posted signs, law enforcement, permits and official restrictions control.
- Promotional pop-ups are never shown during active guidance or while motion is detected. Safety alerts cannot be disabled by subscription.

## Routing engine strategy

The app uses server-side provider adapters so credentials never reach the browser. TomTom Routing API v1 is currently configured for the isolated preview. HERE Routing API v8 is implemented as the preferred primary adapter but is not yet configured in the current preview. The adapter layer supports provider fallback without silently weakening the saved truck profile.

The provider receives the standard-truck profile and the app independently audits returned named roads against a growing official restriction library. Current explicit fail-closed checks include New York City parkways, Boston river roads, Baltimore harbor tunnel restrictions, National Park Service parkways in the Washington region, the Baltimore-Washington Parkway, and structured hazmat review requirements for Pennsylvania Turnpike tunnels. This library is intentionally incomplete; absence of a match is not proof of legality.

Before calling the system "truck legal," the same test routes must be compared against a second professional truck-routing source, official restrictions and physical-driver review. Trimble/PC*Miler remains the preferred independent benchmark candidate.

## Current routing UX

The driver completes four obvious steps:

1. Enter an exact origin and destination using protected commercial-location search or precise GPS.
2. Confirm the truck/load profile.
3. Review resolved stops, provider notices, independent audit warnings and the route while parked.
4. Start guidance only when every blocking condition is clear.

The active-driving screen is being limited to the next maneuver, distance, current road, current speed, provider-supplied speed-limit context, provider lane context, ETA, route status and safety warnings. Provider speed and lane data are aids only; posted signs, truck-specific limits and road markings control.

## Permitted-load separation

Checking **oversize, overweight or issued-permit controlled** changes the main action to **Open permitted-load routing**. It does not call the ordinary truck-routing endpoint. The permitted module imports and preserves issued routes, requires every state and border connection, blocks missing or contradictory permits, stores originals in the permit wallet, and never invents a detour.

## Revenue model

- Driver routing tools remain available without a routing paywall.
- Sponsored placements may appear on parked planning screens and non-navigation pages such as job boards, trucking legal services, bookkeeping, permits and driver resources.
- A **$14.99/month Ad-Free plan** removes promotional pop-ups and display placements.
- The plan does not remove safety alerts, permit notices, legal disclosures, provider limitations or operational messages.
- Ads must never cover route controls, warnings, permit information or active guidance.
- Advertising and subscription expansion stay secondary until routing quality is proven.

## Automated QA now in the branch

The routing-first build includes tests for:

- complete profile normalization and provider unit conversion;
- conservative standard-route size and weight gates;
- HERE and TomTom request construction and response normalization;
- provider fallback and credential isolation;
- exact-stop versus broad-location guidance blocking;
- protected commercial address/facility search;
- critical-notice UI interlocks;
- permit-mode handoff;
- official road and tunnel restriction audits;
- route geometry, turn instructions, speed-limit sections and lane-guidance sections;
- offline shell boundaries that exclude provider responses and private data;
- a versioned routing benchmark catalog covering high-risk urban restrictions, hazmat/tunnel cases, multi-trailer combinations and national freight corridors.

The live benchmark runner is deliberately opt-in because it consumes paid/provider requests. It records results to JSON, never prints provider keys, and treats overheight/overweight profiles as successful local safety-gate tests rather than sending them to ordinary routing.

## Release gates

A production claim of professional truck routing requires all of the following:

- Licensed routing-provider credentials and contract/usage review.
- At least two independent professional truck-routing sources or an equivalent validated cross-check process.
- Server-side profile-to-provider integration tests.
- Route-response normalization and malformed-response tests.
- At least 100 live benchmark routes covering low clearances, weight-restricted bridges, length restrictions, hazmat/tunnel restrictions, toll preference, urban delivery access, frontage roads and difficult first/last-mile approaches.
- Official-source review for every high-risk benchmark failure or disagreement.
- Physical-phone and physical-road testing for GPS accuracy, voice timing, lane context, screen lock, background behavior, offline behavior and reconnects.
- Native/background-navigation strategy; browser foreground guidance alone is not sufficient for a premier navigation product.
- Documented false-positive/false-negative handling and a route-incident review process.
- Clear safe-failure behavior when provider, GPS, map tiles, official data or network are unavailable.
- No unresolved critical defects in the route-review interlock, permit handoff or deviation freeze.

## Known current limits

- One live professional provider is configured; second-provider comparison remains open.
- Live bridge/clearance, temporary closure, construction, weather, jurisdictional curfew and authoritative nationwide hazmat feeds are not yet complete.
- Provider route data cannot certify private-yard access, dock approach, exact gate selection or every municipal restriction.
- Offline route calculation and offline map tiles are not yet available; only the planning/permit shells and saved permit evidence are cached.
- Browser GPS and speech are foreground features. Native background operation and real-device road testing remain release gates.

Until those gates pass, Drivers Lounge remains a development candidate with fail-closed safety behavior—not a finished truck-legal navigation product.
