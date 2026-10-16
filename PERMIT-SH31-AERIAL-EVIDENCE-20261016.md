# SH31 source mismatch investigation — October 16, 2026 UTC

The strongest comparison candidate remains the short SH171 slip into the southwest SH31 connector and its merge onto SH31. New dated aerial evidence supports that physical chain. The issuer overview is materially different from the visible pavement: it cuts inside the ramp curve. This narrows the physical-road question but does not establish why the issuer supplied that geometry, attach exact coordinates to its instructions, or verify current traffic conditions.

## New evidence

- The official TxGIO NAIP query returned one primary tile, `naip-2022-nccir-60cm_3196102_20220708`, flight July 8, 2022. The original exported raster was preserved with its returned WGS84 extent, dimensions, query, timestamp and SHA-256. No visual shifts, snapping, or registration tweaks were applied. The original raster and vector sources are separate layers.
- On the dated image, TxDOT short connector 509355 and the relevant portion of connector 509173 visually follow the paved slip and ramp. This is an interpretation of historical imagery, not a current survey. Both the entry and merge were inspected separately at larger scale.
- Their original shared vertex is identical. The ordered chain measures 537.827 m. Sampling at intervals no greater than 20 m gives a maximum one-way candidate-to-issuer distance of 44.649 m. The discrepancy was not caused solely by including an unused approach: it remains on the selected short-slip chain.
- The earlier July 2024 plan supports the historical slip and westbound merge. Together with the October 2026 inventory, the imagery makes the candidate better supported. It does not make the inventory reference-direction field a traffic-direction authority.
- The issuer page renders its returned latitude/longitude list directly; the inspected callback applies no road matching. Its instruction rows contain route text, sequence, time and distances, with no per-instruction coordinates. The overview and table are separate source representations.

Sources: [TxGIO / USDA 2022 NAIP](https://imagery.geographic.texas.gov/server/rest/services/NAIP/NAIP22_NCCIR_60cm/ImageServer), [TxDOT Roadways](https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0), [signed July 2024 plan](https://ftp.txdot.gov/plans/State-Let-Construction/2024/09%20September/09%20Contract%20Plans/Hill%200162-13-002.pdf). The six-inch Texas Imagery Service has separate licensing and was not used. No paid services or new accounts were used.

## Result and limits

Candidate entry and merge locations are original inventory endpoints. Their geometric contacts support a comparison chain, not lane-level maneuver triggers. The dated image cannot verify current signs, work zones, bridge clearance, load clearance or permission. The exact-cue problem remains open. Do not increase the 15 m comparison threshold, move the issuer line, or interpret the 2022 image as current clearance evidence.

The next useful evidence is current authoritative maneuver geometry or a documented current movement review that ties each literal instruction to the actual road. Repeating the same inventory query or adding another approximate marker will not resolve that gap. Parked rehearsal can continue with the literal ramp/merge wording; automatic speech and operational guidance remain held.

## Deliverables and validation

Private workspace outputs, outside the deployed repository:

- `outputs/SH31-SOURCE-COMPARISON.html`: self-contained source comparison, with independent layer toggles and entry/merge close-ups. Uses the original raster at its returned extent; no remote calls unless the user opens a source link.
- `outputs/sh31-aerial-audit-20261015.json`: input hashes, raster extent/date, source references, source endpoint coordinates and sampled-distance calculation.
- `outputs/friend-permits-20261014/texas-road-comparison-aerial.json`: a new copy of the existing PDF-bound comparison, adding historical imagery support and the missing-cue-coordinate limitation to printed rows 34/35. The previous comparison remains intact.
- `outputs/sh31-aerial-packet-validation.json`: actual PDF hash and all 36 printed row identities validated through the application's importer; all road geometry and movement references unchanged; approval and traffic-direction flags remain false. Wrong-PDF binding rejected. Spoken rows still read the literal SH31 ramp and merge instructions.
- Whole-ramp, entry and merge browser screenshots in `outputs/sh31-aerial-*-20261015.png`.

The overlay's extent-to-pixel corner mapping and shared source vertex were asserted. Browser review confirmed the layer controls and close-up views. This was local research and private comparison preparation, not a production release or a physical iPhone test. No application source change or new deployment was required. Previous live source remains `0494fe9a1f4605347aceb614273f16e868e85df0`; operational guidance remains disabled. Original permit, owner load, credentials, email DNS and the 57 historical tracked dist edits remain unchanged.
