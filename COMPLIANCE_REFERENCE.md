# Road rules and glossary

The public `/compliance` page is linked from Premium Navigation, the permitted-trip header, Hazmat and Pilot cars. It is a reference library, not an input to route approval, permit confirmation, hazmat determinations or crew authorization.

## Edition and coverage

Index edition: September 25, 2026. There are 268 entries: 165 glossary terms, 52 rule/program entries, and 51 state desks (all 50 states plus D.C.), with 182 source references.

| Topic | Glossary terms | Rule/program entries |
| --- | ---: | ---: |
| Standard freight | 41 | 16 |
| Oversize / overweight | 30 | 10 |
| Hazmat | 47 | 15 |
| Pilot cars | 23 | 11 |
| Agencies and documents | 24 | 0 |

Federal coverage includes applicability, carrier authority/registration, qualifications, licensing, training/testing, financial responsibility, vehicle equipment, securement, hours of service, inspection, dimension/weight/network rules, hazmat classification/communication/packaging/highway carriage/routing, and escort training/traffic-control references. State detail entries cover Ohio, Illinois, Indiana, New York, Washington, Utah, Virginia, North Carolina, Oregon, Maine, Louisiana and Pennsylvania. Every state desk provides all four operational topic checklists and official permit/route-registry entry points.

This is a broad index, not an exhaustive transcription of every federal, state, tribal, local or toll-authority requirement. State desks do not claim to contain a complete state rulebook or verified numerical thresholds. Source applicability, effective dates, current notices and the actual issued permit must be checked. The edition date is not a law's effective date. Missing search results and absent route-registry entries never imply permission. The controlling-permit warning remains prominent.

## Source model and maintenance

- `src/assets/compliance/glossary.mjs`: original plain-language definitions, aliases, category, stable IDs, source IDs and related entries.
- `rules.mjs`: federal index and selected state program/provision summaries with citations. Guidance remains labeled as guidance in the linked sources.
- `states.mjs`: official agency entry points based on the FHWA directory, with replacements for moved state pages, and the existing FMCSA state registry URLs.
- `sources.mjs`: source label, URL, kind, index date and applicability/access notes. NOAA/EPA CAMEO and PHMSA ERG are reference tools, not route authorization.
- `core.mjs`: source graph, search normalization/relevance, jurisdiction/category/type/A–Z filtering, public bookmark validation and URL-safe filter serialization.
- `app.mjs` and `reference.css`: accessible controls, shared filter/entry links, local bookmarks, print-all-filtered-results, mobile layout and offline status.

Add entries using existing stable source IDs where possible; verify source kind and jurisdiction, avoid unsupported numeric limits, and preserve old entry IDs so bookmarks and shared links keep working. A selected state retains general/federal references and that state's material only; it never imports another state's detailed provision.

Read-only public-source audit:

```sh
node scripts/audit-compliance-links.mjs /path/to/audit.json
node scripts/audit-compliance-links.mjs /path/to/audit.json --retry
```

The retry option retains successful unchanged responses and checks changed or failed URLs. The audit records response status, final URL, title and timestamp. It recognizes access-request pages that return HTTP 200. Retrieval is not proof of current legal text. Do not bypass sign-in, access controls or automation restrictions.

September 25 audit: 182 sources; 129 returned a non-gated response, 52 were access-limited (including eCFR automation gates, IRP and Colorado), and the Illinois JCAR index could not be retrieved by the checker. The Illinois IDOT program remains available as an alternate source path. Official eCFR/Federal Motor Carrier and state pages were also researched through public web retrieval. These results must not be advertised as 182 fully verified current laws.

Primary starting points:

- [FMCSA regulation index](https://www.fmcsa.dot.gov/regulations/search)
- [PHMSA regulations](https://www.phmsa.dot.gov/regulations)
- [FHWA state permit directory](https://ops.fhwa.dot.gov/freight/sw/permit_report/index.htm)
- [FMCSA state hazmat route registry](https://www.fmcsa.dot.gov/regulations/hazardous-materials/national-hazardous-materials-route-registry-state)
- [FHWA pilot/escort training manual](https://ops.fhwa.dot.gov/publications/fhwahop16050/index.htm)
- [CAMEO Chemicals](https://cameochemicals.noaa.gov/about)
- [PHMSA ERG](https://www.phmsa.dot.gov/training/hazmat/erg/emergency-response-guidebook-erg)

## Offline and privacy

The public page, styles and complete reference modules are precached with the existing permit shell. Search-query and entry links reopen against the same public shell offline. The service worker verifies that every reference file is present before reporting readiness. Failed network updates do not hide an existing complete cache. Source websites/PDFs are not downloaded; those require internet. Browser storage clearing/eviction removes the offline copy.

Only validated public reference IDs are saved under `drivers-lounge-reference-bookmarks-v1`. Nothing in this library reads or transmits permit documents, QR payloads, cargo, GPS or crew data. Existing API/config/account cache exclusions remain intact.

## Validation

75 automated tests and the full local Node 22 build passed on September 25, including eight reference tests for source/entry integrity, state coverage, acronym/citation search, relevance ordering, jurisdiction isolation, combined filters, bookmark validation, escaping, reference-versus-authority classifications, offline dependencies, deep links and private-request cache exclusions. Existing navigation/wallet/hazmat/crew tests remain green.

Browser checks covered HOS search and bookmark persistence, high-pole relevance and shared-link reload, Illinois sources/checklists, New York-only escort program filtering with federal material, A–Z filtering, empty-result messaging, permit-page integration, and a 390×844 viewport with no horizontal document overflow. With the preview server stopped, the shared entry reloaded, the offline-ready message stayed accurate, an Ohio-filtered URL reopened, and saved entries remained available. The server was then restarted and the viewport override reset.

The print action expands all currently filtered results and sources before opening the browser print dialog; physical printing was not tested. The library does not change the existing physical-phone, live-data, hosted crew or production-release gates in `PERMITTED_NAVIGATION.md`.
