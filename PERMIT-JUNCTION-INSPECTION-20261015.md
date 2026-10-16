# Texas instruction and road-shape inspection

The parked issuer-map rehearsal now offers **Compare nearby official roads** for the selected instruction. It queries the named Texas road in the existing approximate viewing area, then lets the user inspect original TxDOT records against the unchanged issuer line. No record is selected automatically. Selecting a record zooms to that shape; Show whole junction restores context. Voice controls sit beside the instruction and read only issued wording, not the inventory label or a guessed turn.

## SH31 finding

A fresh query of the official TxDOT layer returned 11 SH31 records in the row34 area. The full grade-separated connector (509173) differs from the issuer line by up to44.649m at sampled points; the short slip (509355) differs by19.124m. The issuer line bends southwest in the same general corridor, but lies northwest of substantial portions of the detailed connector. This does not establish whether the discrepancy comes from generalization, outdated alignment or another source issue. It does not justify snapping the route to inventory.

The earlier July2024 plan supports the historical short slip toward westbound SH31. Its direction evidence remains separate from this geometric disagreement. The current importer exposes a route overview and36 instruction rows, but no instruction coordinates. Exact turn/merge positions remain unresolved. The map still labels approximate mileage context and never manufactures GPS maneuvers. SH31's printed entry and merge instructions can be rehearsed while comparing the discrepancy.

Official source: https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0 (inventory dated10-01-2026). Historical plan: https://ftp.txdot.gov/plans/State-Let-Construction/2024/09%20September/09%20Contract%20Plans/Hill%200162-13-002.pdf . A web re-open of the plan returned502; the previously saved original was preserved and not repeatedly fetched.

## Request and safety boundaries

- One explicit same-origin POST with a bounded Texas map box and allowlisted road prefix/number. No permit identifier, document, account data, live GPS, cookie or API key is forwarded to TxDOT.
- Fixed public HTTPS endpoint, no redirects,8-second upstream/10-second client timeout,2KB request,2MB upstream response,80features/30,000points,6.5km maximum diagonal. No automatic retries or background polling.
- Original inventory segments are displayed only in the viewing area; multipart paths remain separate. Invalid/truncated/repeated/wrong-road records or an intersecting edge longer than1km reject the comparison rather than showing a misleading partial success.
- Shape distances run from sampled inventory points (at most20m spacing) to original issuer edges; this is a one-direction geometric diagnostic, not a turn/route/clearance certification. Close shape remains turn-unverified. Comparison-capacity failure remains unresolved.
- Changing rows/maps, hiding or closing the page aborts the request, clears evidence and discards late responses. Speech stays bound to the selected issued row. Failures leave saved text, map and original documents intact.
- Road context is temporary and must be requested again after changing rows/reloading. No account/database migration, stored route rewrite or guidance activation.

## Checks

402 full-suite tests passed before the final voice-wrapper visibility fix;20 targeted map tests passed after that fix.183JavaScript+4inline syntax,57pages/833references, existing static contracts and isolated build passed. Regression coverage includes injection/wide-area requests, same-origin restrictions, bounded responses, sparse/ambiguous data, coordinate offsets, no-approval behavior, row changes, hiding and late-response disposal. Actual browser verification and exact live receipt are recorded separately after completion.

The fresh actual-source findings and an original-coordinate diagnostic plot are private workspace artifacts: outputs/sh31-context-findings-20261015.json; friend-permits-20261014/sh31-fresh-context.json; sh31-issuer-inventory-plot.png. No private permit identifiers or coordinates are shipped in source. Historical57dist edits, owner real trip, emailDNS, credentials and payment/account gates remain unchanged. No charges, paid routing requests or PR4merge.
