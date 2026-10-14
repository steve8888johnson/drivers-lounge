# Parked iPhone Safari test — October 14, 2026

Open https://driverslounge.app/permit-phone-check in Safari on the actual iPhone while parked. This is a device rehearsal, not a navigation release. Operational guidance stays disabled. No example belongs to the owner's Draper–Brunswick load.

## Physical phone check

1. Use the phone speaker first. Set media volume, tap **Play sound check**, and confirm the complete sentence is audible. Select an available on-device English voice and speed. Check the speaker confirmation only after actually hearing it.
2. Repeat through the truck's Bluetooth output if that will be used. Confirm the beginning and end are not clipped. Browser start/end events cannot prove audibility or the selected physical output.
3. Play the approach, near-turn, state-boundary hold, GPS-loss and changed-permit examples. Compare displayed and spoken wording. Stop midway; change examples and confirm no previous prompt continues. Every example identifies itself as a parked test.
4. Optionally allow location and run the short GPS reception check. It ends after three fresh samples or 20 seconds. The saved record has accuracy estimates and timestamps, not coordinates. A reported accuracy within 50 m does not establish carriageway, ramp, lane or lawful routing.
5. While an example is playing, switch apps or lock/unlock the phone. Old speech should stop and must not resume by itself. Repeat with an incoming call when convenient. Report any late or resumed instruction as a failure. Test **Try keep-screen-on** separately; battery/system decisions can deny or release it. A request grant is not proof of physical screen behavior.
6. Use **Save phone-check record** and keep the JSON through Safari's download controls. Results live only for the current page visit unless saved. The record separates browser observations from the user's hearing/interruption confirmations and cannot unlock navigation.
7. After the page has loaded online, reopen it offline and repeat sound playback. The static shell is cached, but actual offline voice availability must be tested on the iPhone. No offline road maps or live restriction feeds are implied. Restore connectivity afterward.

Changing voice/speed clears hearing confirmations. No remote speech voice is selected. If Safari offers no on-device English voice, playback reports unavailable instead of sending permit text to a remote voice. If audio is blocked or stalls, it stops and requires a deliberate retry. Do not test these controls while driving.

## Tomorrow's issued permits

The load's measured loaded width, height, length, weight and axle information are still missing. Approximately one foot over normal width is an estimate, not a measurement. Keep every original state permit and condition page, not just the QR image. No state chain or detour has been invented.

The permit wallet belongs to the browser/device. Export the trip packet including originals from the current device, then import it on the iPhone. Imports require fresh review. Check each state, permit number, vehicle/load match, dates, copied route, border continuity, conditions, escorts and destination access. A QR URL or matching source line alone is not verified road geometry. Unsupported QR formats need inspection or a supported adapter.

When the source and geometry checks allow **Ready for parked review**, the Route tab's walkthrough can read each supplied maneuver aloud. Previous/Next, edits, leaving Route, hiding the page and Stop voice cancel old speech. The actual instructions remain separate from test examples. Passing this rehearsal does not enable driving guidance or certify permit compliance.

## Evidence and open gates

Local automated tests exercise speech priority, cancellation, stale callbacks, missing/remote voices, start/completion timeouts, manual retry, preference validation, GPS sample freshness/privacy, permission failure, and delayed/released screen requests. Desktop browser checks exercise playback events, stop behavior, synthetic reviewed permit speech and record download. A 390 px responsive viewport checks layout and 48 px controls only; it is not Safari or an iPhone.

Still unverified: actual iPhone Safari audio, speaker/Bluetooth routing, physical screen-lock/call behavior, GPS reception, offline playback, real permits, road/direction/entrance association and representative field behavior. The application remains a parked review tool while these gates are open.

## Primary API references

- [Speech synthesis queue](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak): explicitly cancel obsolete speech rather than allowing a queue to accumulate.
- [Speech error events](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/error_event): report failures and require manual retry.
- [On-device voice indicator](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService): permit speech selects only voices reporting local service.
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API): foreground/secure-context requirements and possible system release; no background-guidance promise.


## GPS refinement rehearsal — October 14, version 2026-10-14.2

In Test situation, try GPS returned after interruption and GPS position jumped. Confirm you hear that guidance stays off until a deliberate restart after safely checking position and the permit. These are prerecorded text examples using device speech, not simulated movement or an active navigation test. Do not test while driving. The optional GPS reception check remains separate.

In a reviewed permit walkthrough, use Full route and Selected turn. A and B are endpoints of the selected supplied instruction; they do not establish arrival, road association or movement authority. Next/Previous changes the highlighted instruction. Missing reviews keep selection unavailable. Map and voice review remain preparatory while operational guidance is disabled.
