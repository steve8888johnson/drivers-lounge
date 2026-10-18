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

## Required proof before public routing claims

### Engine and data

- [ ] Licensed commercial-routing provider configured in preview and production.
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
