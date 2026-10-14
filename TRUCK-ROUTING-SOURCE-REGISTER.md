# Routing source review — 2026-10-14

This extends the existing 50-state + DC compliance directory in `src/assets/compliance/sources.mjs`. `ROUTING_JURISDICTIONS` references the existing state records and records UNKNOWN for each restriction category. No website listing establishes segment coverage, current validity, licensing, or a drivable route.

| Source | Verified in this review | What it cannot establish |
| --- | --- | --- |
| [TxDMV district restrictions](https://www.txdmv.gov/motor-carriers/permit-restrictions) | Index of 25 TxDOT district permit restrictions; permittees must check current restrictions. | Standard-truck legal access or completeness on local roads. Individual district files were not ingested. |
| [TxDMV local contacts](https://www.txdmv.gov/motor-carriers/oversize-overweight-permits/permit-contacts-for-city-county-and-txdot-offices) | Agency explicitly identifies an incomplete list and responsibility to contact local jurisdictions. | An absent county cannot mean unrestricted travel. This is permit-movement context. |
| [Georgia bridge entry point](https://www.dot.ga.gov/GDOT/Pages/PostedBridges.aspx) | Search-index copy describes vehicle-specific postings; direct page request rejected. | Not a fresh bridge inventory. References to a 2020 emergency order cannot authorize present exceptions. Do not retry the unavailable page repeatedly. |
| [GDOT service schema](https://enterprisegis.dot.ga.gov/hosting/rest/services/RestrictedBridges/MapServer/1) | Metadata for “Open Bridges” includes coded states for a new bridge not open to traffic and other restrictions; 2,000 record cap, no pagination support. | Layer name cannot mean permission. No feature records downloaded; no complete inventory, load-limit join, freshness, directed road matching or reuse approval verified. Do not use the search-discovered QA service. |
| [NYC truck rules](https://www.nyc.gov/html/dot/html/motorist/truckrouting.shtml) | Through/local network depends on trip origin/destination; off-network destination access has conditions. | New York statewide access or permission to ignore weight/clearance/closure controls. No inferred “last mile” exception. |

All five metadata records explicitly carry `roadDataConnected:false`, `coverage:'unknown'`, `reusePermission:'not-established'`, and `guidanceAllowed:false`. The review date is when the web reference was inspected, NOT when road restrictions became effective or were last measured. Metadata is local reference content, not accepted route evidence. No nationwide coverage claim.

Next adapter work must establish licensing/usage limits, directed road segment identity, jurisdiction and vehicle applicability, source authenticity, complete retrieval (including capped pages), effective/expiry timestamps and conflicts. Unknown, stale, partial or contradictory records must continue to hold guidance. Road signs and authorities govern; a passed federal axle screen cannot override local restrictions.
