# Release gates and recovery

Status: development changes only. Navigation is not certified for operational use.

Implemented: ordinary OSRM routing remains planning-only; its driving and reroute entry points fail closed. Permit guidance holds for unreviewed masters, stale/inaccurate/out-of-order GPS and discontinuous fixes. An asynchronous preparation cannot restart guidance after stop/background/change. Both freight entry pages hand off to Highway Automation using an explicitly configured HTTPS destination. No documents or location are sent by that link.

Required proof before operational guidance: independently transcribe and compare actual issued multi-state permits; validate QR provenance and every state crossing, route overlap/conflict, travel window/timezone, bridge/height/axle/gross weight/hazmat restriction and pilot-car revision. Demonstrate stale/ambiguous/missing permits stay on hold. Test real phones with screen lock, poor GPS, weak signal, service-worker update, storage eviction, original-document export/restore and pilot loss/rejoin. No live official restriction feed is connected in this source. Test passing is not authority to move a load.

No separate freight posting is permitted in this app. Retained historical database tables must be reviewed and archived separately; this change does not migrate or delete production freight records. Legacy backend endpoints may still exist and need production-policy inspection.

Set HIGHWAY_AUTOMATION_URL only after the independent marketplace destination is verified. Missing/invalid configuration leaves a clear unavailable message.

Recovery: keep the before-audit Git tag and original checkout. Build from source with the correct environment; tracked historical dist output is not a release candidate. Stop guidance before any update, preserve exported trip originals, then verify local wallet reload. Prefer a forward fix; restoring previous car-driving code would restore a known unsafe path. No database changes are included here.
