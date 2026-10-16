# Route geometry screening — October 13, 2026

Implemented locally; not deployed and not an operational routing connection. Every result still has guidanceAllowed=false. Geometry quality cannot establish truck legality, correct road direction, the correct carriageway, or a permitted destination entrance.

## Defect and correction
Previously the offline provider reviewer accepted any nonempty polyline string as geometry. It now decodes HERE Flexible Polyline version1 and rejects malformed/truncated/noncanonical encodings, unsupported precision/dimensions, out-of-range coordinates, degenerate shapes, discontinuous/reversed sections, endpoint mismatches, implausible jumps and inconsistent declared lengths. No repair, reversal, section reordering or line across a gap is attempted. The server binds geometry review to a snapshot of the validated outgoing endpoints. Changing vehicle/trip while awaiting a response invalidates that response. Malformed UTF-8 now rejects instead of becoming replacement characters.

The readiness diagnostic also rejects impossible calendar dates and ambiguous time values, including unknown negative-zero timezone offsets; it no longer relies on Date.parse normalization. Evidence/geometry bounds prevent unlimited candidate processing.

## Engineering limits (not legal standards)
Only2D polylines, decimal precision5–7, up to200,000 encoded characters per section and500,000 total;50,000 points total,1,000 sections. Require vehicle section type and matching departure/arrival metadata. Flag section joins/metadata gaps above5m, requested endpoint separation above25m, successive point jumps above20km, and declared section distance discrepancies above max(50m,2%). These conservative screening thresholds can reject otherwise legitimate data and require provider/field evaluation. Passing them never grants a green light; even points on opposite sides of a divided road could be closer than these tolerances.

Remaining: road graph matching, directed topology, jurisdiction transitions, destination truck entrance, provider provenance, coverage and current state/local restrictions; full axle/configuration model; live data and real phone tests. Three-dimensional data, ferries and other unsupported cases stay held until implemented and reviewed. No road conditions can be inferred from tile imagery.

## Evidence
128 automated tests passed, including13 new cases: official published decoder vector, signed precision7 values, malformed/bounded geometry, endpoint/direction/section checks, no geometry disclosure, invalid UTF-8, and malformed dates/offsets. Syntax106 files +4 inline scripts and server module passed;56 pages/806 local references passed. No live provider traffic or customer locations sent; synthetic fixtures are not drivable routes. No production build/deploy or account/navigation activation in this pass.

Official references inspected October13:
- https://github.com/heremaps/flexible-polyline — format and published sample; decoder independently implemented with stricter supported subset.
- https://docs.here.com/routing/docs/routing-v8-route-geometry — per-section geometry encoding.
- https://docs.here.com/routing/docs/routing-v8-waypoints-overview — snapped and original locations can differ; matching an endpoint is not destination access proof.
- https://docs.here.com/routing/docs/routing-v8-truck-routing — returned routes can carry restriction violations; all provider notices still hold here.
