# Permit route and street-map comparison — October 15, 2026

## Behavior

Review → Compare permit route with map opens a read-only inspection of one state's saved candidate maneuvers, even before the entire permit packet is present. Each selection shows the exact saved permit line, road/lane text, endpoints, supplied-point diagnostics and gaps to adjacent instructions. It never changes source data, geometry confirmation, permit reviews or authorization. A QR reference without supported route geometry cannot produce a map.

Route → Walk through the reviewed route → Compare this turn with map opens the selected maneuver. Moving within the comparison updates the parked walkthrough's selected maneuver too; closing it and requesting speech therefore reads the same turn. Opening/changing the map cancels earlier speech. Operational guidance remains disabled.

Show street map explicitly requests OpenStreetMap street context. Supplied segments are amber, with A/B endpoints and nearby adjacent endpoints. No connector is invented over omitted segments or between instructions. Invalid coordinates reject the selected maneuver; sparse/dateline segments are omitted. Existing importer point-spacing limits are reused as diagnostics, not evidence of road alignment. A/B are instruction endpoints, not arrival approval. This is visual comparison, not automatic map matching, clearance data, route calculation or legal authorization.

Street context loads only after a click, uses browser HTTP caching and visible attribution, and has no offline/prefetch feature. Tile requests send viewed map areas, IP and the site's origin to OpenStreetMap; permit documents, text, trip identifiers and credentials are not sent. The page retains no-referrer for other requests. Map initialization failures, slow/failed tiles and subsequent zoom/pan loading remain explicit. Changing to unusable geometry removes the previous map; late events cannot overwrite that status. Closing/backgrounding stops the map; returning does not automatically resume it.

## Parked iPhone check

1. Import each actual issued permit on the iPhone or transfer the exported trip there; account truck-setup sync does not transfer permit documents.
2. Scan each PDF/QR and review every original page. A reference link alone is not a digital route. Do not guess coordinates or mark a guessed route confirmed.
3. For available imported geometry, open the state's comparison. Compare every instruction with the original road, direction, junction, ramp, road level and entry/exit. Inspect missing-line and connection warnings. Record discrepancies rather than drawing shortcuts.
4. Once the full packet and review prerequisites are satisfied, use the parked walkthrough: select a turn, compare it, close the map, then read the maneuver and exact permit line aloud. They must all refer to the same instruction. Verify Stop, Next and app backgrounding interrupt speech on the physical phone.
5. Test weak/no connectivity while parked. Unavailable maps must leave text/originals usable, without indicating verified road coverage. Do not use this beta for driving instructions.

## Evidence and limits

332 tests pass, including 13 map comparison/failure tests. 165 JavaScript files and four inline scripts parse; 57 pages/833 local references and existing static contracts pass. Isolated production-style build contains no QA fixture. Synthetic local browser testing verified lazy tile loading, source/selection updates, map-to-walkthrough maneuver handoff, close cleanup, zoom, 390px layout without horizontal overflow, at least48px primary controls, 44px map zoom controls and visible attribution. App warning/error log list was empty. A final loading-status refinement has targeted and full-suite coverage. Screenshot: parent outputs/permit-map-mobile-qa-20261015.png; it is synthetic geometry, not an issued route.

No physical iPhone test, audible voice verification, road/lane matching, complete real permit packet or current loaded dimensions/axles has been established in this pass. All synthetic data stayed on localhost; Steve's actual Draper–Brunswick trip remains unchanged. No provider route requests, charges, credentials/DNS changes, PR4 merge or operational activation. Account sign-in/setup scope remains unchanged. Historical57 dist edits preserved.

## Map dependency

Unmodified Leaflet1.9.4 is bundled locally with its BSD2 license and npm SHA512 provenance. Official reference: https://leafletjs.com/reference.html

OpenStreetMap standard tiles follow https://operations.osmfoundation.org/policies/tiles/ (checked October15,2026): exact tile endpoint, visible attribution, origin referrer, normal caching, bounded interactive requests, no bulk/offline download. This is a best-effort public service, with no availability guarantee, no truck-specific restriction coverage and no claim that viewing it grants a commercial routing-data license. Before scaling map traffic, reassess service suitability and terms.

Release candidate; record the exact verified production receipt separately.

## Verified production receipt

Live October15 at17:12UTC. Source cb786ca713c94b023a1afb4f3adf2967b55f6285; deployment dpl_7RNXjAkYYkVDd6t3pZBZVLpwkdDu READY and driverslounge.app alias. Remote332tests pass,165JS+4inline syntax,57pages/833references; seven live assets match source. Permit/account HTTP200. accountsEnabled=true/readOnlyBeta=true/permitGuidanceEnabled=false preserved. Real-trip comparison correctly shows no supported geometry and disables street tiles; one empty state placeholder and held guidance remain unchanged. App warning/error list empty; immediate scoped10minute runtime query found no error/fatal logs, not sustained monitoring. Local server stopped/tab closed/viewport reset. No paid service, provider routing, credential/DNS change or real-trip edit.
