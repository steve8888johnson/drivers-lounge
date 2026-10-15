# Lake Worth and SH31 parked comparison

October 15, 2026. Candidate checked locally; exact production receipt follows verification.

The viewer supports per-record source attribution in comparison format v3. Selected county geometry displays county source dates; switching to TxDOT clears that attribution. Older v1/v2 files remain readable, but cannot carry the alternate-source field. Older viewers reject v3 rather than silently attributing county geometry to TxDOT. Imported labels/evidence cannot grant approval or enable guidance.

## Research result

**SH171 / SH31 near Hubbard:** TxDOT's signed July 1, 2024 plan for Hill 0162-13-002 provides independent historical direction evidence. PDF51 (printed sheet48, pavement marking layout19 of31) shows the right-hand slip from the southeast SH171 approach into Ramp WB2. Arrows in the faded background support travel toward the westbound entrance. PDF50 (printed sheet47) shows the westbound merge; PDF3 confirms corridor orientation. Source geometry509355 + clipped509173 is consistent with that plan and the permit's southwest movement. This is not current field, sign, closure or load-clearance verification. The full connector alternative is unsupported for this approach, but no no-right-turn prohibition has been invented.

**Lake Worth:** County records128552/58572 form an exact-endpoint pair of0.075926/0.168219mi. The first is named Jim Wright Fwy820NW, the second I-820WB ENTER SH199/JacksboroHwy. Both have ROAD_TYPE=RAMP and ONE_WAY=FT. Earlier notes calling the first a frontage road were an unconfirmed inference; the revised packet corrects this. Similar rounded mileage cannot establish the permit's0.2/0.1/0.2mi ramp/frontage/ramp sequence. The first ramp and segmentation remain missing. The county SH199 junction is74.48m from the nearby planar TxDOT crossing; no snapping, fabricated line or extension was used. The conflicting exit loop remains rejected. County dates are April1/16,2026, not current field observations.

The2019 Lake Worth project presentation supplies historical/proposed context only and did not resolve the missing ramp. Public ArcGIS discovery did not locate an independent HOTCOG road-direction dataset; absence is not evidence of unrestricted travel.

## Validation and boundaries

366 tests pass, including malformed source links, attribution switching, old-format rejection, missing geometry, wrong PDF binding and no-approval checks.172JS+4inline syntax, existing static contracts and57pages/833references pass; isolated build succeeds. Initial check dispatch used nonexistent package aliases and was corrected to the existing script files. An initial build used the wrong working directory and failed before building; the subsequent isolated build succeeded. Neither affected historic dist modifications.

Private localhost QA read the original Texas PDF's36rows, loaded v3, displayed the county pair and correct sources, switched to TxDOT attribution, and displayed SH31 plan evidence. Browser reported speech playing; Next stopped the preceding voice.390px viewport:342px client/scroll width,358.4px outer dialog,66.4px reading button. No warning/error logs. This is responsive desktop QA, not a physical iPhone/Bluetooth/background/GPS test.

Private originals/comparison stay outside the public deployment. Account truck sync does not transfer device-local permit files. Operational guidance remains disabled. No provider route calls, purchases, charges, credentials/DNS changes, account activation or PR4 merge. Existing57tracked dist modifications preserved.

Research source: https://ftp.txdot.gov/plans/State-Let-Construction/2024/09%20September/09%20Contract%20Plans/Hill%200162-13-002.pdf

County source: https://mapit.tarrantcounty.com/arcgis/rest/services/Dynamic/TC911_Streets/MapServer/0

Private research, findings, phone ZIP and screenshots are under workspace outputs. Rebuild the private comparison in order: build-full-texas-comparison-20261015.mjs, add-texas-movements-20261015.mjs, add-three-ramp-checks-20261015.mjs, then add-direction-evidence-20261015.mjs. The final step is required for v3 and new county/plan evidence.
