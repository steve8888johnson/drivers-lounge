# Road and ramp evidence review — October 15, 2026

The PDF rehearsal can now display a prepared local road comparison next to its exact printed turn. Select **Compare actual roads & ramps**, open a comparison JSON, select a record, and choose **Show road geometry**. **Read this turn with map** uses the same PDF row as the displayed heading. Amber identifies the selected inventory record; gray shows the other supplied records. This is an inspection map without street tiles, GPS or automatic road matching.

## Boundaries

- A comparison must match the PDF's SHA-256, state, row count and each included row's exact instruction, road, page and printed mileage. A changed PDF, changed source row, duplicate row/feature, malformed data or unsupported geometry rejects the entire comparison. The hash binds file versions; it does not authenticate an issuer or prove validity.
- Files stay in memory on this device. Reopen the comparison after closing/reloading the PDF reader. The current packet format is `dl-road-evidence/v1`; it is a separate inspection layer, never saved into permit geometry or confirmations. Account setup sync does not transfer these files.
- Maximum comparison size 4 MB, 1,000 rows, 80 features per row and 60,000 total points. Paths stay separate; invalid coordinates, dateline jumps or segments exceeding 5 km are rejected. No connector is drawn across missing evidence.
- The source URL is an inert plain HTTPS link, with no credentials/query/fragment. Imported source labels/dates are not independently authenticated. The viewer does not fetch an inventory or map service. Leaflet is already bundled locally.
- Row changes clear the old map; missing evidence stays explicit. Record changes stop speech. Page hide/close stops the map and speech; late file/library results cannot reopen it. Map failure retains the printed turn and permits an explicit retry. Road direction fields, crossing lines and close endpoints never create travel authorization.

## Verification

Story: saved PDF → local route extraction/hash → prepared comparison file validation → selected road geometry + same printed row → on-device speech. No API, secret or external service is involved in this flow.

351 tests pass, including 12 new road-evidence tests covering file/source binding, malformed/oversized evidence, sparse/multipart geometry, interior point-to-line proximity, reversed storage order, non-approval of crossing roads, map failure/retry, missing-row map cleanup, invalid replacement and late completion. 171 JavaScript files + four inline scripts parse; existing contracts and 57 pages / 833 references pass. Isolated build validates 17 critical assets and 57 pages; no private sample files are present.

Actual Texas PDF tested on localhost with a private five-row comparison for rows 30–32 and 34–35. The Kansas PDF correctly rejected that Texas comparison. Both original PDF tables still read cleanly. Browser verified record selection, original-turn consistency, speech cancellation and no-evidence map clearing. Browser reported finished speech for the actual SH31 ramp row. Physical iPhone speaker/Bluetooth, weak connectivity and GPS behavior remain unverified. The comparison data is research, not an approved route.

## Road research limits

Official TxDOT inventory, retrieved October 15 with feature extraction date October 1, was queried for two bounded junction areas. Two I-35 ramp records reach the same left roadbed/frontage lines; endpoint coincidence cannot choose the permitted exit. An SH31 connector touches the SH171 geometry but remains roughly 48 m from the inspected SH31 left roadbed. The inventory's branch extents also differ from printed ramp mileage. These are unresolved associations, not road closures or proof of a permitted connection. Private record IDs, actual permit rows and geometry remain in the local evidence folder, not this deployment.

Source: https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0

Owner's real trip, equipment setup, authorization gates and account configuration are unchanged. Operational guidance remains disabled. No provider routing requests, charges, credentials/DNS changes or PR4 merge. Historical 57 dist edits preserved. Production receipt is recorded separately after verification.
