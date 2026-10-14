# TomTom evaluation connection — October 14, 2026

Status: account setup reached Freemium; server adapter implemented and tested locally. **No live TomTom routing request, public endpoint, deployment or operational navigation has been enabled.** The current production release remains cb3a647 / dpl_GCaNktsd5PRkiDkV8nF5GKb8HsBM.

## Account and cost evidence

The owner explicitly authorized TomTom only if free, completed signup verification and reported being in. In the actual dashboard, Account showed **Freemium**, API usage showed 0 requests and the automatically supplied My First API key had billing type **Evaluation**, including Routing API. No card, upgrade, credit purchase or paid top-up was performed by the agent. The owner handles passwords, agreements and secret entry.

Official sources checked October 14:

- [Pricing](https://docs.tomtom.com/pricing): advertises 20,000 free monthly Routing API requests and no initial credit card. This advertised allowance was not independently reconciled with an account-specific remaining-quota counter.
- [Platform FAQ](https://docs.tomtom.com/platform/documentation/status-and-support/faqs): exceeding free limits returns HTTP 429; commercial API use is permitted subject to terms. This does not establish Navigation SDK entitlement, complete restriction coverage or unrestricted storage/redistribution rights.
- [Calculate Route](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route): truck mode, commercial vehicle settings, dimensions in meters, weight and axle weight in kilograms, polyline points and effective settings. Restriction coverage is incomplete in some areas; default mode is car, so explicit truck mode is mandatory.
- [API-key setup](https://docs.tomtom.com/platform/documentation/my-tomtom/how-to-get-a-tomtom-api-key): account provides a default API key. The key ID is not the secret key.

Vercel owner handoff is prepared for project drivers-lounge, team steves-projects-c46af6ff: `TOMTOM_API_KEY`, type **Secret**, **Preview only**. Value remains blank at the last agent observation; owner save and live authentication have not been verified. Never use a public-prefixed variable, browser configuration, source file, clipboard dump, chat or log for the key. Preview secret is not available to production, and setting a secret alone does not activate this adapter.

## Implemented locally

`server/tomtom-candidate.mjs` reuses the existing measured vehicle/load/equipment validation before preparing a fixed TomTom endpoint. Standard non-hazmat only; confirmed actual dimensions and weight, fresh individual axle measurements and equipment ratings are required. Oversize/permitted loads are rejected by this evaluation path. Distinct numeric endpoints and explicit future UTC departure are required.

Request always specifies truck/commercial mode, actual dimensions/weight, measured axle count and rounded-up maximum individual axle weight. It avoids ferries and unpaved roads and requests one candidate, effective settings, full points and travel-mode sections. A maximum-axle parameter cannot encode all axle groups, spacing, trailer and jurisdiction-specific rules; this limitation remains a hold.

`server/tomtom-routing.mjs` is a private server building block, **not an HTTP endpoint**. Defaults disabled; a trusted caller must explicitly enable it and supply current free-plan evidence and a server key. Fixed host, redirect rejection, no retries, no alternative keys, no car fallback, timeout at most 10 seconds and streaming response limit at most 1 MiB. HTTP 429 produces a quota/rate-limit hold; 401/403 produce an access hold. Error details and keys are never returned.

The response must still match the current trip, vehicle, weighing and equipment review. It screens effective vehicle settings, truck-only section continuity, geometry bounds/endpoints/gaps/length and explicitly zoned calendar dates with consistent travel duration. A structurally plausible response **always remains HOLD**, without geometry or maneuvers in the returned result, because authoritative road restrictions, directed-road/entrance association, group/configuration coverage and field evidence are unverified. Synthetic success is not road-safety evidence.

## Validation and remaining gates

- 208 tests passed, including 12 new TomTom tests covering valid synthetic mapping and failure paths; no real API traffic. Saved output: parent workspace `outputs/tomtom-tests-20261014.txt`.
- Syntax check now covers server modules too: 131 files plus four inline scripts passed. Existing tracked dist files were not rebuilt or changed by this work.
- Before a live evaluation: owner secret save, exact free billing policy confirmed for the active key, protected server execution and abuse/aggregate quota controls, redacted logging, representative authorized fixtures and provider contract checks. Never enable from a client-supplied boolean.
- Before public route display or driving guidance: verified vehicle-to-road association, authoritative current restrictions and facility entrances, conflict/expiry policy, actual route comparisons, phone/GPS/offline failure testing and explicit release review. No nationwide legality claim.
- Draper, Utah to Brunswick, Georgia is an **overdimensional load with unknown dimensions and no uploaded permits**. It stays in its incomplete permit draft. TomTom cannot authorize a replacement route or infer intermediate states. Obtain measured dimensions/weights and all issued permits/QR/conditions pages first.

Risks: CRITICAL/open — road coverage, entrance and permit authority; HIGH/open — live provider authentication and behavior, server authentication/abuse controls, exact account quota and production licensing scope; HIGH/contained locally — car fallback, stale input reuse, unsupported loads, malformed provider output and credential exposure in returned diagnostics.
