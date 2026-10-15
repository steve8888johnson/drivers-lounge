# Permit ramp movement comparison — October15,2026

Adds optional ordered movement candidates to the existing private-file comparison viewer. Pieces reference original feature/path/segment positions, preserve source vertices and multipart boundaries, clip at interior branches, and never bridge gaps. Invalid indices, missing/repeated features, zero extents, excessive sizes and >10m joins reject the import. Successful imports always remain unapproved with traffic direction unverified.

Map candidates have numbered starts/end, preserve gray alternatives and never feed GPS or speech. Printed speech expands known highway/frontage/compass abbreviations without altering source rows or branch letters. TxDOT inventory-direction semantics were checked against official dictionaries.

360tests,172JS+4inline syntax,57pages/833references and static contracts pass. Isolated build passes. Actual private localhost QA exercised8candidates at6junctions/17rows, with correct source headings, visible map paths, no console warnings/errors, desktop speech completion and stop on row change.390px view fits342px dialog;66px reading control. PhysicaliPhone audibility/Bluetooth/background behavior unverified.

The FortWorth candidate now excludes the unused northward branch. LakeWorth has a substantive length/road-type mismatch; Hillsboro exit and MountCalm approach choice remain unresolved. Private originals and comparison remain outside source/deployment. Owner real trip unchanged. accounts/guidance gates unchanged; no provider calls, fees, credential/DNS changes or PR4merge.57historicaldist changes preserved. Exact deployment receipt follows verification.

# Texas ramp comparison live — October 15, 19:43 UTC

Production source **4e564c3bd4a02dae40a28cfab8b4687e8fc3fa29**, deployment **dpl_51MsKnbaV854uukE7LxEpPRxgVUG**, READY with driverslounge.app alias. Remote build passed 360 tests, 172 JavaScript files plus four inline scripts, 57 pages / 833 local references and existing static contracts. Eight checked public assets match source. Permit/account pages HTTP200; accountsEnabled=true, readOnlyBeta=true, permitGuidanceEnabled=false; camera/geolocation policy unchanged.

New viewer accepts optional candidate movements referencing original source segments, clips precisely at interior branches, shows numbered starts/end without drawing connecting gaps, and preserves alternatives. Invalid/missing/repeated references and disconnected chains fail closed. Every candidate remains unapproved with allowed traffic direction unverified. Printed voice expands recognized road/compass/frontage abbreviations while preserving displayed source and branch letters; it never reads candidate geometry as driving instructions.

Private comparison now has eight distinct movement candidates across six junction areas and17 printed rows, within existing36row/23window coverage. Fort Worth approach/southward split measures0.394/0.454mi, compared with printed0.4/0.5mi; the unused northward portion is excluded. Vernon and Canadian have close length/order candidates. Mount Calm retains two possible approaches; Hillsboro exit remains uncertain; Lake Worth's1.165mi five-piece chain does not match printed0.2/0.1/0.2mi ramp/frontage sequence. Fresh all-road Perryton query finds no separate ramp. None is promoted to approved driving geometry.

Official TxDOT dictionary page4 confirms DES_DRCT is inventory reference direction, not allowed traffic flow. The2023specifications page4 identifies DIR_TRAV as cardinal direction despite its older name. Both original documents and extracted pages saved privately with query receipts. A2025sign-removal plan search was not treated as current installed-sign evidence; inaccessible plan was not repeatedly retried.

Actual localhost browser QA checked all8candidates with the original Texas PDF: correct source row, map paths and enabled reading; no warn/error logs. Desktop speech finished and row change stopped it.390×844 view fits342px dialog/client/scroll width,66.4px speech control. Screenshot texas-movement-mobile-qa-20261015.png shows the private local practice view, not physical iPhone proof. Physical Safari audibility, Bluetooth/background behavior and GPS still unverified.

Live browser shows new controls and preserves the owner's actual Draper–Brunswick draft, one empty state and Needs confirmation. No trip data changed. Live warning/error log list empty; immediate deployment-scoped10minute error/fatal query returned no groups, not sustained monitoring. Viewport reset, local test tab closed and QA server stopped.

Updated private phone ZIP **Texas-parked-test-20261015.zip** contains only the unchanged Texas PDF, comparison JSON and parked-test instructions. Use a separate practice load; files remain device-local and are not synced by account truck setup. Full permits, measured load/axles, permitted road direction/ramp/entrance, current restrictions and physical parked testing remain required.

No routing-provider calls, purchases, new charges, credential/DNS changes, PR4 merge or operational guidance activation.57 historicaldist modifications preserved. Source pushed; release receipt kept separately. Evidence: texas-movement-live-check-20261015.json,texas-movement-tests-20261015.txt,texas-movement-browser-check-20261015.json,texas-movement-mobile-qa-20261015.png; private movement-comparison-findings.json and original query files.
# Three-ramp review published — October 15, 2026, 20:14 UTC

Live at https://driverslounge.app/permitted-loads. Production source **82384ebd6e9dc543d3856c0c376a94020b99e5a2**, deployment **dpl_4cwmxRLzqTvLWSik8F1HcWfxpiTL**, READY with driverslounge.app alias. Remote build completed in34 seconds:363 tests passed, zero failures;172 JavaScript files plus4 inline scripts parsed;57 pages/833 references checked. Eight live asset hashes match source; permit/account pages return200. accountsEnabled=true,readOnlyBeta=true,permitGuidanceEnabled=false. Immediate deployment-scoped10-minute error/fatal query returned no groups; this is not sustained monitoring.

## Evidence and remaining decisions

- Hillsboro: TxDOT's signed February21,2025 sign plan, PDF43/60/68, identifies sign147 as368A and sign144 as368B. Their positions are respectively6.1m from ramp508456 and6.0m from ramp508453. This supports the nearer ramp's historical exit identity and conflicts with substituting the earlier ramp. Current installation/closures are unverified;0.226/0.374mi geometry still differs from printed0.4/0.3mi; the SH22 left turn remains unverified.
- Lake Worth: Tarrant County record58818 labels the loop an I-820 WB exit to SH199 EB. Corresponding TxDOT loop468405 has mean vertex proximity1.3m, max8.1m to that record; county source order/FT code oppose the former entry hypothesis. The old loop chain is now an explicit conflict. County frontage/entrance records128552/58572 share an exact endpoint and measure0.076/0.168mi, but do not establish the first printed0.2mi ramp. The app offers only the0.122mi TxDOT entrance segment10581 as a partial comparison, not a full junction route. The8.20m loop/frontage near miss is not bridged.
- SH171/SH31 near Hubbard: short-slip and full-connector candidates measure0.334/0.314mi, both rounding to0.3mi. Assuming the printed southeast approach, first30m deflections are about19/80 degrees. This supports investigating the short slip, not an allowed turn. Independent current one-way/lane evidence remains absent. Printed cumulative increment differs from segment mileage by0.1mi; rounded numbers are not precise road boundaries.

The2025 sign plan is a construction design, not an as-built clearance certificate. County update dates are April2026, not current field observations. Fort Worth's bounded street layer was also inspected; some relevant city record dates are2015/2020/2024, and it does not cover the full loop. The SH199/I820 current project page says construction could start as early2033; old proposed concepts were not used as current geometry.

## Product behavior

Source-linked comparison checks distinguish support, conflict and unknowns. Conflicting geometry uses dashed red and an explicit DO NOT USE label; it is never the default selected movement. The private comparison uses format v2, so older viewers reject it instead of ignoring new conflict status. v1 support remains. Ordered pieces now require joins within1m, with an8m regression. Even coincident source geometry cannot grant approval or verified direction.

Actual local browser testing used the unchanged original Texas PDF and final v2 comparison:36 rows,9 distinct movement options,27 source checks across9 rows. Hillsboro conflict rendered2 red paths; Lake Worth conflict5. SH31 speech reported playing; moving to the next row stopped it.390px responsive view had342px dialog/client/scroll width and66.4px reading controls. No warning/error logs. Screenshot is desktop responsive QA, not physical Safari/Bluetooth/background/GPS evidence. The final v2 file was reimported after a fresh reload.

The live owner's Draper–Brunswick draft remains unchanged with its empty state placeholder and Needs your confirmation. No friend's permit was inserted into that trip or deployed publicly. Private phone ZIP refreshed with only unchanged Texas PDF, v2 comparison JSON and current step-by-step parked guide; ZIP integrity and PDF SHA checked. Permits/comparisons remain device-local and do not ride along with account truck-setup sync.

## Saved evidence

- outputs/three-ramp-live-check-20261015.json
- outputs/three-ramp-browser-check-20261015.json
- outputs/three-ramp-tests-20261015.txt and three-ramp-focused-tests-20261015.txt
- outputs/three-ramp-iphone-layout-20261015.png
- outputs/Texas-parked-test-20261015.zip
- outputs/friend-permits-20261014/three-ramp-check-findings.json
- outputs/friend-permits-20261014/hillsboro-sign-plan-2025.pdf and rendered PDF43/63 pages
- outputs/friend-permits-20261014/tc911-layer.json,tc911-lake-worth-streets.json,cfw-streets-layer.json,cfw-lake-worth-streets.json
- outputs/add-texas-movements-20261015.mjs then add-three-ramp-checks-20261015.mjs reproduce the current packet after the base comparison builder. The second step is required to restore v2 and checks.

Primary references:
- https://ftp.txdot.gov/plans/State-Let-Construction/2025/05%20May/05%20Contract%20Plans/McLennan%200909-22-221.pdf
- https://mapit.tarrantcounty.com/arcgis/rest/services/Dynamic/TC911_Streets/MapServer/0
- https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/OpenData_Infrastructure/MapServer/16
- https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0
- https://www.txdot.gov/projects/projects-studies/fort-worth/sh199-i820.html

No provider calls, purchases, charges, credentials/DNS changes, account/guidance activation or PR4 merge. Existing57 tracked dist changes preserved. Source commit pushed to GitHub; this receipt is saved separately. Local test tab closed, viewport reset and QA server stopped after verification.
