# SH31 endpoint evidence and paired parked rehearsal

## What the sources establish

The October 2026 TxDOT roadway inventory supports a specific comparison chain at SH171 / SH31: the short slip (509355) begins within 0.001 m of the SH171 inventory line, shares an identical recorded vertex with connector509173, and connector509173 ends within 0.001 m of SH31-LG (508284). The opposite roadbed is30.460 m from that final endpoint; the general centerline is14.333 m away. These are calculated planar distances, not surveying accuracy or legal traffic connections. July2024 plan PDF50/51 separately supports the historical slip and westbound merge direction.

This narrows the candidate geometry. It does not resolve the source mismatch: the issuer overview is0.637 m from the slip's start,19.124 m from its shared connector point and25.329 m from the connector's merge endpoint. The detailed connector differs by up to44.649 m at sampled points. No uniform correction is justified, no current lane/closure/clearance evidence was added, and the issuer does not supply instruction coordinates. The exact permitted entry/merge anchors remain unverified. The source line is never moved or snapped.

Sources: [TxDOT Roadways](https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0), last edit10-01-2026; [signed July2024 plan](https://ftp.txdot.gov/plans/State-Let-Construction/2024/09%20September/09%20Contract%20Plans/Hill%200162-13-002.pdf), preserved original from earlier work. Endpoint audit uses the preserved full inventory response retrieved10-15-2026. Fresh application lookup confirmed the SH31 contacts. No failed source was repeatedly retried.

## Parked phone workflow

Consecutive literal Take-road-Ramp / Merge-onto-road rows with the same road and compass direction now offer Ramp entry and Merge buttons above the map. They switch only between that exact pair. An explicit bounded comparison query covers both approximate areas; completed evidence is retained only when its query still matches exactly. A pending lookup is cancelled on a row switch. Normal Previous/Next/dropdown changes still clear context. Hidden/closed pages cancel and discard it. No automatic requests, road selection or speech.

Selecting a road record exposes its displayed endpoints for closer inspection. Endpoint markers are original inventory vertices, explicitly not confirmed turns. Long records may extend beyond the viewing area; displayed endpoints can be clipping boundaries. Listed contacts include every returned road line within1 m, with no inference about road level or travel direction. Multipart shapes do not get a misleading single endpoint pair. No connectors or maneuver coordinates are manufactured.

Manual voice reads only the selected issued text. Pair changes stop old speech and require a new Read tap. Selected controls have a dark, underlined state and48px minimum touch targets. The original permit, overview, sparse span, approvals and actual load are unchanged. Permit data remain device-local.

## Validation

405 tests pass, including wrong-road/direction/frontage pair rejection, stale identity, planar contacts with multiple candidates, multipart rejection, exact query binding, completed-vs-pending lifecycle, late response rejection, source preservation and no guidance creation.183JS+4inline syntax,57pages/833links, existing static contracts and isolated build pass. Browser QA with the actual saved36row Texas permit confirmed the paired SH31 query, selection retention, source endpoint marker, correct merge wording and cancellation. At390x844, dialog client/scroll width342px and both pair buttons48px high. This is responsive desktop testing; physical iPhone audio/Bluetooth/lifecycle proof remains pending.

No operational guidance, account/payment changes, paid provider requests, charges, credentials/emailDNS changes or PR4merge. Historical57tracked dist modifications preserved. Source files, not dist, are the release inputs. Exact production receipt follows verification.

Private evidence (outside source/deployment): outputs/audit-sh31-connections.mjs; outputs/sh31-connections-20261015.json; outputs/ramp-pair-tests-20261015.txt; actual permits and inventory in outputs/friend-permits-20261014.
