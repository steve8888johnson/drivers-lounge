# Map and location failure review — 2026-10-14

HIGH / contained locally: the prior UI called any returned browser coordinate “precise GPS” or “Wi-Fi” without checking reported accuracy or timestamp. A stale dot could remain usable as an origin. A tile loading completion event could leave missing map tiles with no warning.

The planning UI now validates numeric coordinate bounds, timestamp and reported uncertainty. Readings at least 60 seconds old, future-dated, malformed or worse than 100 m are rejected. These are conservative product limits for planning, not legal standards or road/entrance certification. A valid reading gets an uncertainty circle and expires; both endpoint aliases and the marker are cleared on expiry. Returning from a suspended page and recentering recheck expiry. A denied permission never triggers a network fallback. Network-derived coordinates only show an approximate area and never become an origin. User edits during a location request cannot be overwritten by its late result.

The browser does not expose the sensor source. We say “Device location,” never infer GPS/Wi-Fi. [MDN explains accuracy](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy) as estimated uncertainty in metres; it does not prove the vehicle is on a particular road.

Persistent, accessible messages distinguish loading, incomplete tiles, offline and restored connection. An error stays visible even when Leaflet later reports loading completed. User-controlled retry must complete without errors to clear it. A 15-second loading timeout stops an indefinite success-looking map. Network geolocation uses the existing bounded request timeout. No automatic retry loop or guidance activation.

Regression tests exercise malformed/old/coarse positions, uncertainty display, stale marker removal, permission denial, approximate fallback, late input edits, tile error followed by load, offline/online and retry. Physical-device and moving-vehicle behavior still requires dedicated field testing; no operational navigation is enabled.

Release evidence: full146 tests pass; local desktop and390px browser verifies deliberate tile failure plus failed retry retains warning. Production303ec3c / dpl_6veu2opasqhYYz84LXXySqzmiurS READY, built and live checked06:33UTC. The corrected UI is live. No real location permission requested or location captured in verification. Parent outputs hold map-failure-desktop-20261014.png, map-failure-mobile-20261014.png and map-safety-live-20261014.png. Synthetic truck values cleared from production browser after checking.
