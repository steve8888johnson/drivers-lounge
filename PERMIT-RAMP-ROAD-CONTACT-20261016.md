# Permit ramp approach and merge comparison

The explicit **Compare nearby official roads** action can now include the literal approach road as well as the merge road in one bounded TxDOT inventory lookup. Previously a SH31-only query omitted SH171, so the app could inspect the connector but not compare its first end with the printed approach road. Road selectors now label each record with its own road identity.

For an explicitly selected joined ramp candidate, **Approach and merge comparison** checks whether its original ends lie within one metre of the exact named main-road drawings. Only plain, unqualified road wording is supported; branch, frontage, business and lane qualifiers are not discarded. Both ends must be inside the query area. Records must have known matching road identities, main-route suffixes and the same inventory date. Different parts or records remain distinct and ambiguous when more than one qualifies. The candidate is regenerated from the original connector records before comparison, rejecting changed paths and cross-road joins.

This is drawing proximity, not surveyed accuracy, road level, allowed traffic direction, permit validity or a maneuver coordinate. The one-metre threshold is only a computational comparison tolerance. Nothing is snapped, corrected, approved or inserted into the issuer route. No GPS cue or automatic speech is created. Manual speech retains the literal issued instruction and the unverified-endpoint warning.

## Observed evidence

One fresh public lookup included SH171 and SH31 and returned 12 records. The existing short-slip / connector candidate meets the named SH171 approach and SH31 merge drawings. The candidate still differs from the issuer overview by up to 44.649 metres, displayed as 45 metres. That disagreement remains visible and unresolved; it is not a reason to move the original line. The original 2,818 issuer points and 36 directions remain unchanged. TxDOT's designated direction field is not treated as allowed traffic direction.

Source: [TxDOT Roadways service metadata](https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Roadways/FeatureServer/0?f=pjson). Actual permit documents, IDs, precise coordinates, screenshots and response fixtures stay outside Git and deployment.

## Bounds, privacy and cost

The existing server function still permits only the fixed public TxDOT host, a viewing area with a maximum 6.5 km diagonal, 80 records, 30,000 source points, a 2 MB response and an eight-second timeout. The optional second road has the same strict prefix/number validation; arbitrary filters, URLs and duplicate-road expansion are rejected. One explicit request, no pagination, polling, automatic retries, provider credentials, permit IDs, documents, account details or live GPS position. No additional route provider, paid service or upgrade.

Existing Vercel project/team and GitHub linkage were reconfirmed before release; Node 22.x. Existing Pro credit shows $19.47 of $20 remaining. Supabase stays on its previously owner-confirmed Free plan; no database, DNS, credential, account or payment change. Operational guidance stays disabled. Historical 57 tracked dist changes remain untouched; the build runs in an isolated folder.

## Local verification

- 449 tests pass, including strict two-road request validation, exact query binding, preserved feature identities, missing and differently dated records, qualified road names, changed/reversed candidates, cross-road connectors, ambiguous roadbeds and multipart contacts.
- 195 JavaScript files plus four inline scripts parse; 57 pages / 833 links, static contracts and isolated build pass.
- A fresh 390px browser uses the actual private saved Texas map and fresh saved official response. No candidate or speech is selected automatically. SH171 and SH31 contacts display alongside the unchanged 45 m discrepancy. Entry/merge switching retains the same comparison with only one request; manually reading the merge uses its exact wording and warning. Next clears old evidence. Original geometry stays unchanged and no maneuver steps are created. Dialog client/scroll widths both 356px; no page errors.
- Browser speech is mocked. Physical iPhone speaker/Bluetooth/background behavior, current road conditions and actual owner account transfer remain unverified. This is parked rehearsal, not usable driving navigation.

Private evidence: `outputs/ramp-road-contact-build-20261016.txt`, `ramp-road-contact-browser-20261016.json`, `ramp-road-contact-phone-20261016.png`, `sh31-two-road-context-20261016.json`, `sh31-two-road-findings-20261016.json`. Temporary browser and local server closed.

## Parked iPhone check

Refresh Drivers Lounge, open the saved Texas scanned route and select the SH31 ramp row. Tap **Compare nearby official roads**, explicitly choose a ramp record and joined candidate, then inspect **Approach and merge comparison**. **Ramp entry** and **Merge** switch the two printed rows without starting speech. Tap **Read turn aloud** to compare the heard words with the original permit. A nearby line is not proof of an authorized movement; the 45 m disagreement remains a hold on exact GPS-triggered turns.

Production verification will be recorded after deployment; this section is local evidence only.

## Production verification — October 16, 2026, 19:49 UTC

- URL: https://driverslounge.app/permitted-loads
- Source: c90ad0ae653302bd28b4f1767a65dc849cd3290d
- READY production deployment: dpl_FDUVK17xWSsFnZyGQf5Z2icteZ3j
- Deployment URL: https://drivers-lounge-ld6vplpxi-steves-projects-c46af6ff.vercel.app

The exact Git source, existing project and driverslounge.app assignment are verified. Remote Node22 build passed 449 tests,195 JS+4 inline syntax checks,57 pages/833 links and static contracts; build reported17seconds. Five changed public JavaScript/service-worker hashes match Git exactly. New HTML controls and privacy copy are present; permit/account/navigation return200. Flags remain accountsEnabled=true,readOnlyBeta=true,permitGuidanceEnabled=false.

A fresh production-asset browser at390px used the actual private saved Texas map and one real public road-context request. It returned the SH171/SH31 drawing contacts while retaining45m disagreement. No default candidate or automatic speech. Pair switching retained the comparison without another request; manual merge speech matched the literal SH31 wording and unverified-endpoint warning. Next cleared evidence. Original issuer geometry was byte-equivalent as JSON and no maneuver steps were created. Dialog/client scroll widths356px, no page errors. Normal public assets/tiles were allowed, speech mocked and other provider APIs blocked. This does not prove physical iPhone audio, all street tiles, current road permission or owner account transfer.

A bounded deployment-scoped ten-minute error/fatal query returned zero records at19:49UTC; not sustained monitoring. Temporary browser/server closed. Historical57dist edits preserved. Source pushed to the release branch; PR4 remains unmerged. No new paid service, upgrade, provider charge, database, credential or DNS change. Existing Pro credit was $19.47 before release; no claim that the existing hosting subscription itself is free. This receipt is a separate documentation commit, with the application source above deployed.

Private evidence: ramp-road-contact-live-deployment-detail-20261016.json, ramp-road-contact-live-build-20261016.txt, ramp-road-contact-live-assets-20261016.json, ramp-road-contact-live-browser-20261016.json, ramp-road-contact-live-phone-20261016.png, ramp-road-contact-live-errors-20261016.txt under outputs/. Private original data and images remain outside Git/deployment and the owner's actual trip/account.
