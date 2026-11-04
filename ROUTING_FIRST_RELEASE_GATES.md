# Drivers Lounge Routing-First Release Gates

Drivers Lounge must not market navigation as "truck legal," "premier," or "production ready" merely because the interface works or a route provider returns a result. Routing is safety-critical. Release claims require evidence.

## Current product boundary

- Standard commercial-truck routing uses the saved vehicle profile and a licensed server-side routing provider.
- Oversize/overweight permitted loads never use automatic route optimization. The issued permit route remains controlling and is handled by the permitted-load workflow.
- A route containing a critical provider notice cannot start guidance.
- Route deviation freezes guidance. The app does not silently invent a detour.
- Provider credentials stay server-side.
- Offline mode may preserve the app shell and reviewed permit packets, but it does not pretend to perform a new live restriction check.
- Advertising must not interrupt active navigation or obscure safety warnings.

## Provider-readiness and benchmark commands

Use the canonical server-only environment variables `TRUCK_ROUTING_HERE_API_KEY` and `TRUCK_ROUTING_TOMTOM_API_KEY`. The legacy aliases `HERE_API_KEY` and `TOMTOM_API_KEY` remain readable during migration, but conflicting alias values, placeholder values, malformed values, or the same credential reused for both providers disable preview guidance and fail the release gate. No readiness response, benchmark report, or log may contain a credential value. Leading or trailing whitespace is normalized exactly as the route adapter does and is reported only as a non-secret warning; surrounding quotes or internal whitespace remain invalid.

- `npm run check:routing-providers` validates configuration without making a provider request. A one-provider preview remains explicitly `single_provider_unverified`.
- `DL_RELEASE=1 npm run check:routing-providers` is the release gate and requires two distinct valid providers with no active routing kill switch.
- `ROUTING_BENCHMARK_LIVE=true npm run benchmark:routing` runs the safety benchmark through `/api/truck-route-consensus` semantics and requires aligned independent providers by default.
- `ROUTING_BENCHMARK_LIVE=true ROUTING_BENCHMARK_MODE=single-provider npm run benchmark:routing` is permitted only for provider diagnostics. Its results are not release evidence.
- `ROUTING_BENCHMARK_LIVE=true ROUTING_BENCHMARK_ENDPOINT=https://beta.driverslounge.app ROUTING_BENCHMARK_MODE=single-provider npm run benchmark:routing:deployed` runs the same cases against a deployed Drivers Lounge endpoint without copying provider credentials into the runner. Omit `ROUTING_BENCHMARK_MODE=single-provider` after two-provider release readiness is established.
- Save the JSON benchmark output, provider/version identifiers, timestamp, app revision, and all failed cases with the release record.

The runtime health endpoint `/api/truck-route-health` reports provider state, policy blockers, preview eligibility and release eligibility without returning credentials or credential-derived hashes. Production policy continues to block guidance unless independent cross-checking is configured.

## Required proof before public routing claims

### Engine and data

- [ ] Two distinct licensed commercial-routing providers configured in preview and production for independent fail-closed verification.
- [ ] Provider contract and data-use terms reviewed, including map-display and offline limitations.
- [ ] Height, width, total length, trailer length, gross/current weight, axle groups, trailer count, hazmat categories, tunnel category, toll preference and departure time verified against provider units.
- [ ] Clear provider/version identification recorded with every calculated route.

### Controlled route tests

- [ ] Known low-clearance route is rejected or safely avoided with an appropriate profile.
- [ ] Known weight-restricted bridge or road is rejected or safely avoided.
- [ ] Long-combination and trailer-length constraints are tested.
- [ ] Hazmat/tunnel restrictions are tested using known legal and prohibited cases.
- [ ] Toll avoidance and route-preference behavior are verified without weakening restrictions.
- [ ] Ambiguous geocoding results require parked confirmation.
- [ ] Temporary closure/restriction behavior is tested and limitations are disclosed.

### Device and field tests

- [ ] iPhone physical-device test.
- [ ] Android physical-device test.
- [ ] Weak GPS, stale GPS, denied permission and no-network tests.
- [ ] Background/foreground and screen-lock recovery tests.
- [ ] Voice guidance tested over Bluetooth and normal speaker output.
- [ ] Route deviation tested on a safe controlled drive.
- [ ] At least 25 real commercial routes compared against official restrictions and an established professional truck-routing product.
- [ ] At least 10 routes independently reviewed by experienced drivers before any broad claim of reliability.

### Permitted loads

- [ ] Original permit remains available from the active trip.
- [ ] Each state route is independently confirmed against the issued permit.
- [ ] Border gaps, overlaps and conflicting instructions block departure.
- [ ] Permit effective dates, local time zones, movement windows and load dimensions are validated.
- [ ] Multi-state route stitching never changes issued geometry to create a shorter route.
- [ ] Pilot-car roles receive the same controlling geometry with role-specific alerts only.

### Operational safety

- [ ] Routing-provider outage produces a clear fail-closed state.
- [ ] Map-tile outage does not hide text instructions or permit documents.
- [ ] Support escalation path exists for incorrect-route reports.
- [ ] Route audit data can identify profile, provider, request time and returned notices without storing unnecessary continuous-location history.
- [ ] Rollback procedure is tested before production promotion.

## Monetization rule

Routing quality comes first. Job boards, legal-service advertising, bookkeeping advertising and other sponsored pages may fund the product. Pop-up advertising must never appear during active guidance, cover a maneuver, delay a warning or compete with a safety-critical control. A future $14.99 monthly plan may remove non-safety advertising only after subscription, refund and entitlement behavior is fully tested.

## Release language

Until every applicable gate above is proven, use language such as:

> Commercial-truck route planning candidate. Review the full route while parked. Posted signs, official restrictions and issued permits control.

Do not use language implying guaranteed legality, guaranteed clearance or guaranteed compliance.
