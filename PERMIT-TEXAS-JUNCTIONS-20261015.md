# Texas junction comparison and parked controls

October 15, 2026 candidate. Supersedes the earlier five-row comparison scope, not its source history.

The private example comparison now binds all 36 Texas printed rows to 23 junction study windows. These are not 36 approved turns or a continuous driving route. Private PDFs, road files and route-specific notes are not included in source or deployment.

Research found why a roughly48m apparent connector gap occurred: TxDOT stores some grade-separated connectors under numeric RTE_NM values despite highway classification fields. Broader bounded queries find the missing original line. Another interchange branch meets the interior of a connector; endpoint-only matching misses that split. Original feature records remain separate; geometry proximity is never promoted to allowed direction, road level, clearance or permit approval. Some ramp identity/extent and frontage transitions remain unresolved.

Public UI improvements: a map already opened by the user follows printed-row changes, cancels old speech and waits for an explicit new speech request. Missing evidence clears the map. Stop/background cancels pending map creation and disables automatic reopening until another explicit map request. Nearby Previous/Next printed-turn controls and Show whole junction reduce phone scrolling; comparison counts explicitly describe junction windows, not a complete approved route.

354 tests pass, including row/map following, no automatic speech, pending-map cancellation, whole-junction bounds and turn boundaries.171JS plus4inline scripts and57pages/833references pass. Actual private localhost QA traversed all36rows without a wrong heading, missing map or disabled reading.390×844 mobile-width view fits at342px dialog/client/scroll width with66px speech control in the final layout. Physical iPhone audibility/Bluetooth/GPS and exact issued-route approval remain unverified.

No account/backend, credential/DNS, fee, provider-route, operational guidance or PR4 changes.57 historicaldist edits preserved. Exact production receipt follows after verification.
