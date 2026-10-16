# Texas sparse-span comparison and turn alignment — October 15, 2026

The issuer's long dashed span is now inspectable against detailed public TxDOT roadway geometry. The original line remains unchanged and dashed. A purple comparison is displayed only while inspecting the span; selecting or reading an issued row removes it. This is parked review, not clearance or operational navigation.

## Evidence and practical outcome

The example's 5,906.537 m US-83 span agrees with TxDOT feature 5189, US0083-KG, dated October 1, 2026. The clipped inventory shape has 18 points and measures 5,906.663 m. Maximum bidirectional sampled offset is 5.448 m; original endpoint offsets are 3.104 m and 2.695 m. Samples are spaced at most 50 m, including detailed vertices. A fresh bounded official query reproduced the cached finding. This supports sparse drawing of a straight road, not a demonstrated missing road. No new permitted connector was discovered or added.

The issuer's 36 directions still contain no maneuver coordinates. Comparison of existing ramp candidates against its actual polyline produced these research findings:

| Candidate | Maximum sampled offset | Implication |
| --- | ---: | --- |
| Canadian connector | 10.1 m | Close shape/order candidate |
| Vernon frontage and entrance | 13.3 m | Close shape/order candidate |
| Lake Worth county approach/entrance pair | 6.7 m | Close shape; printed first ramp/frontage identity unresolved |
| Earlier Lake Worth long loop | 141.4 m, with backward order | Rejected alternative remains conflicting |
| Fort Worth south branch | 10.8 m | Close shape/order candidate |
| Hillsboro 368A candidate | 9.3 m | Stronger geometric agreement than 368B |
| Hillsboro 368B alternative | 58.0 m | Conflicting alternative remains rejected |
| SH31 short-slip and longer approach candidates | 44.7 m | Still unresolved; no exact turn pin |

These are geometric comparisons, not verified lane direction, current signs, clearance or instruction anchors. Close geometry cannot establish an exact turn merely because cumulative rounded mileage is nearby. Speech continues reading the issuer's source wording; the map's row area remains explicitly approximate.

## Implementation boundaries

- Generic Texas importer optionally checks at most two 5–10 km sparse spans, excluding spans within one mile of an issued instruction boundary and road names identifying ramps/frontage/connectors.
- Fixed official host and layer; bounded map envelope and matching road family; 80-feature/40,000-point/2 MB limits; a shared five-second optional timeout; no redirects, credentials, cookies, private permit identifiers or text sent to inventory.
- Requires exactly one compatible roadbed/path. Endpoint and sampled bidirectional offsets must be within 15 m, detail spacing at most 1 km, length difference at most 1%, and no backward movement beyond 2 m. Disagreement, ambiguous roadbeds, truncation or network failure retains the original issuer map without comparison.
- Saved v3 evidence binds to the original edge and is revalidated on read. V1/v2 maps remain readable. Imported or edited evidence cannot create guidance steps or approvals.
- Purple detail, source date and measured offsets appear only in sparse-span inspection. Row selection, speech, another map and missing evidence clear the previous comparison. Source points, all 36 rows, QR and original documents are preserved.
- Neither inventory nor issuer overview is a current closure/clearance feed. No routing-provider use, fees, credentials, DNS or account changes; permit guidance remains disabled.

## Validation

394 automated tests passed, including ambiguous roadbeds, bowed/parallel/reversed shapes, forged evidence, altered original spans, query privacy/limits, optional-service failure and UI comparison/speech lifecycle. Syntax: 180 JavaScript files plus four inline scripts. Links: 57 pages / 833 references. Existing static contracts and isolated build passed. These checks do not certify truck-route legality or store readiness.

Actual local browser imported the example through the issuer endpoint, saved 2,818 original coordinates / 36 directions and displayed the 18-point comparison. At 390×844 the dialog client/scroll width was 342 px. Row20 speech reported playing the issued ramp instruction; changing to row21 cancelled it and displayed the frontage wording. Physical iPhone audibility, Bluetooth and background behavior remain owner tests.

Private raw permits, identifiers, coordinates, sample analysis and screenshots remain in workspace outputs, outside repository/deployment. Owner's actual load is separate. Deployment receipt follows verification.

## Public sources

- [TxDOT roadway inventory](https://www.txdot.gov/data-maps/roadway-inventory.html)
- [Official TxDOT Roadways layer](https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0)
- [TxPROS user guide](https://www.txdmv.gov/sites/default/files/body-files/txpros-user_guide.pdf)

Private evidence: `texas-span-live-data-check-20261015.json`, `issuer-road-alignment-findings.json`, `texas-span-final-tests-20261015.txt`.
