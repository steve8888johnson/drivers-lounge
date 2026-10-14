# Load measurements and axle entry — October 14, 2026

Status: released at driverslounge.app/navigation in source4b8d06d, deploymentdpl_5PYCyFsQVjbpfTDWqAT4coNm9BVB READY. Remote build and live asset/config checks passed; see RELEASE-GATES.md. No driving guidance or provider connection is enabled.

The clean truck-first form now contains a collapsed advanced axle section. Drivers can enter individual measured whole-pound weights, center positions in inches from the front axle, configuration, internal load reference and weighing time with explicit UTC offset. These fields feed the existing ordinary federal Interstate baseline diagnostic, including every consecutive group. The result states its exclusions and appears under Why this route. Basic map planning does not require these advanced measurements; operational routing remains unavailable for everyone.

Grouped scale-ticket weights are retained only as optional tab-local notes. They cannot be divided or converted into individual measurements. Missing confirmation, malformed numbers, axle-count/weight mismatch, span beyond overall length, unsupported configuration, special loads, future/stale times and calendar rollover all hold the review. See TRUCK-AXLE-REVIEW.md for the baseline's legal scope and cited authorities.

## Review lifetime and binding
- The 24-hour maximum is an internal conservative review policy, NOT a legal reweigh interval or proof that a load remains unchanged. Driver confirmation still requires unchanged load, fuel, trailer, axle positions and vehicle setup. A real change requires new measurements immediately.
- Input/change events cancel the review even if a driver edits a value back. Snapshot checks also compare all raw advanced fields and truck fields, catching programmatic changes without an event. Results and confirmation clear together.
- Expiry timer, tab visibility return, page exit and subsequent review snapshots cannot reuse old acceptance. The load-change action also cancels truck confirmation. Nothing is saved to localStorage, accounts or a provider by the new module. Reload cleared load reference, notes, time and confirmation in the browser test.
- Server request preparation requires fresh load metadata and departure inside its window; after transport, it rechecks against the current server clock and input. Changed load reference/time/measurement/configuration invalidates late responses. This disabled module is not an HTTP endpoint. UI client time and user assertions are not trusted server provenance.

## Validation evidence
161 tests passed: 15 new tests cover explicit offsets, invalid dates, time boundaries, changed inputs, session isolation, grouped tickets, interior/individual overload, invalid form values, UI invalidation and transport expiry. Syntax:118 files plus4 inline scripts and server module.809 internal references pass. Existing billing, schema-contract and store-metadata checks pass as static checks only; no actual account, billing or app-store release claim follows.

Actual local browser: individual five-axle synthetic78000lb fixture displays15 comparisons; a one-pound mismatch holds; editing clears the result; grouped mode exposes notes only; routing readiness still holds. Phone viewport390px (375px content with scrollbar), no horizontal overflow; date/number controls fit. Reload discards load metadata. Screenshot in parent outputs/axle-review-mobile-20261014.png. Desktop form and compact collapsed entry verified. No real load data, location permission or route request used.

## Open risks / next work
- CRITICAL/open: commercial provider licensing/cost approval, trusted source adapters, complete current state/local road and destination-access coverage, directed road topology and field tests. Source directories are not coverage.
- HIGH/open: tire/load and manufacturer ratings, authoritative configuration details, ordinary federal exceptions/state variations, actual scale-ticket/vehicle-device tests. The UI does not claim legal-size status or clearance.
- HIGH/contained: stale or changed measurements now fail preliminary review and disabled transport preparation; there is still no server-authenticated measurement provenance.
- NOT connected: public UI has no providerGroups mapper or approved HTTP routing endpoint. Individual axle collection is a diagnostic; request transport stays separate and disabled. Do not infer missing provider grouping from labels or weights.
- Route evidence still must be valid through arrival; this measurement preflight only bounds the intended departure and requires immediate invalidation on load changes. It does not promise a24-hour safe route.

Next useful pass: evaluate manufacturer/tire-rating entry and explicit provider grouping, or strengthen source coverage/evidence adapters. Do not repeat successful tests or retry unchanged SMTP credentials.
