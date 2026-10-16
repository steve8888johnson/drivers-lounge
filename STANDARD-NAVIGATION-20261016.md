# Standard navigation first — October 16, 2026

Owner priority: standard truck turn-by-turn with a simple, readable experience. Permit development is deferred to the next build; existing documents, routes and sync are preserved.

## Implemented

Navigation has a prominent **Preview turn-by-turn** button. A fullscreen, explicitly labeled parked simulation offers a large maneuver/distance/road card, next-turn strip, moving arrow, route overview/follow view, remaining sample time/distance, play/pause, skip, restart, mute and repeat. The illustrated roads are fictional, not a route to an entered destination. It needs no location permission, account write or paid routing/voice request.

Voice begins only after a deliberate tap and uses an on-device English voice. Backgrounding, window blur, exit, pause and long animation gaps stop playback. Returning does not automatically resume. Reopening resets voice off. Missing voices and audio failures remain visible. Reduced-motion preference starts with the fixed overview. Buttons are at least 48 by 48 pixels; keyboard focus returns to the opener.

Server-only TomTom preparation supports opt-in plain-text instructions. A private parser checks ordered instruction offsets/times, binding to the declared geometry segment, departure/arrival, text bounds and supported maneuver types. It preserves provider wording, exit numbers, road numbers and arrival side. Unknown kinds, malformed/missing/duplicate instructions and wrong geometry produce a whole-list hold. Existing transport does not opt in, release instructions or open a public routing endpoint. Structural review always returns guidanceAllowed=false.

Provider contract checked October 16: [TomTom guidance instructions](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/guidance-instructions). Synthetic fixtures validate code behavior; no new live TomTom request was made.

## Verification

- Full isolated suite: 467 passed, 0 failed; 202 JavaScript files plus four inline scripts; 57 pages/834 local references; existing static contracts and build passed.
- Fresh Chromium browser at 390×844, 320×568, 1440×900 and 844×390: controls, arrival/replay, voice requests, background pause without automatic resume, focus/Escape, missing-voice failure and storage preservation passed. Latest landscape CSS was checked again after the full suite; map/card separation verified. No page errors or preview provider requests.
- Speech was mocked. Physical iPhone Safari, speaker/Bluetooth audibility, screen lock and low-power behavior are not proven.
- Evidence in parent outputs/navigation-preview-*. No permit originals used or modified in this pass. Existing 57 tracked dist edits preserved; builds use isolated staging.

## Release limits and remaining work

CRITICAL/open: live standard truck route generation, protected provider caller, aggregate free-quota controls, production credential authorization, authoritative restrictions/local access and destination entrance checks, GPS progress/ambiguity/rerouting, physical-device/field evidence. Current Preview-scoped TomTom credential is not production access. A smooth animation is not a navigation safety demonstration.

HIGH/contained in this release: false live-navigation impression, stale voice after exit/background and mutated sample route. Persistent simulation labels, independent copied sample data, lifecycle cancellation and tests contain these specific risks. No operational navigation or account/payment gate changed; no car-route fallback.

No purchase, upgrade, new paid service, credential/DNS/database change or PR4 merge. Existing Vercel Pro included usage balance checked at about $19.45 remaining before release; hosting is not represented as a free plan. New preview requires no provider fees.

Production receipt will be appended after exact-source deployment and live verification.
