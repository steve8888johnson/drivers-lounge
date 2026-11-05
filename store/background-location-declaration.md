# Drivers Lounge background-location declaration — release 2.0.2

## Google Play permission declaration

**Core feature requiring background location**

User-started commercial-truck guidance. Drivers Lounge uses precise location to update route progress, present maneuver guidance, detect unreliable GPS and freeze guidance after a route deviation while the screen is locked or another app is open.

**Prominent disclosure shown in the app**

> Drivers Lounge collects precise location data to provide live truck guidance, route progress and deviation warnings even when the screen is locked or another app is open. Location use starts only after you tap Start guidance and ends when you tap Stop guidance. It is not used for advertising or analytics. Android shows a persistent navigation notification; iOS shows the system location indicator.

**User control and visibility**

- Background use starts only after the user reviews a route and taps **Start guidance**.
- Android displays a persistent navigation notification while guidance is active.
- iOS displays the system location indicator while guidance is active.
- **Stop guidance** ends the native GPS watch, speech and background-location indicator.
- Permission denial blocks background guidance rather than hiding location use.
- Location is not used for advertising, ad targeting or analytics.
- Continuous coordinates are not placed in the local field-evidence packet and are not automatically uploaded as location history.

## Google Play declaration-video script

Record an unedited physical Android-device video showing:

1. Open Drivers Lounge and navigate to **Navigation**.
2. Show the prominent disclosure before requesting location permission.
3. Enter a non-sensitive test route and vehicle profile while parked.
4. Complete the parked route review and tap **Start guidance**.
5. Accept precise location and notification permissions.
6. Show the persistent Android navigation notification.
7. Lock the screen, unlock it, and show that the reviewed guidance state remains visible.
8. Open another app briefly, return to Drivers Lounge, and show that guidance is still active.
9. Tap **Stop guidance** and show that the persistent notification/location activity ends.
10. Open **Native Field Diagnostics** and show the privacy-minimized evidence gate without exposing private route data.

Do not record while the driver is operating a moving vehicle. Any controlled moving test must be operated and observed by a passenger.

## Apple review explanation

Background location supports real-time navigation instructions and route-deviation safety while user-started guidance is active. The app declares the location background mode and provides both When In Use and Always/When In Use purpose text. The app visibly explains background use, shows the system indicator, and stops location updates when the user taps **Stop guidance**. It does not use background location for advertising or analytics.
