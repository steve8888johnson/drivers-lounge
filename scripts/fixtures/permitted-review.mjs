import { blankTrip, blankPermit, confirmPermit, confirmGeometry } from '../../src/assets/permits/core.mjs';
import { blankMaterial, blankHazmatRoute, confirmCargo, confirmHazmatRoute } from '../../src/assets/permits/hazmat.mjs';
import { STATE_SOURCES } from '../../src/assets/permits/hazmat-sources.mjs';

// Deliberately synthetic coordinates/authority determinations. Never for driving.
export function reviewFixture(date = '2026-09-25') {
  const trip = blankTrip(); trip.name = 'SYNTHETIC QA ONLY - three-state hazmat review'; trip.departure = date; trip.acknowledged = true;
  Object.assign(trip.profile, { heightFt: '13', widthFt: '8', lengthFt: '70', weightLb: '75000', axles: '5' });
  Object.assign(trip.hazmat, { enabled: true, placarding: 'required', shippingPaperRef: 'SYNTHETIC QA ONLY', emergencyContact: 'TEST CONTACT - NOT FOR EMERGENCIES', materials: [{ ...blankMaterial(), unNumber: 'UN1203', shippingName: 'SYNTHETIC SHIPPING DESCRIPTION', division: '3', packingGroup: 'II', quantity: '1000', unit: 'gal', packaging: 'bulk', inhalation: 'no', hrcq: 'no' }] });
  for (const [i, state] of ['OH', 'IN', 'IL'].entries()) {
    const p = blankPermit(), start = -80 - i * .002, mid = start - .001, end = start - .002;
    Object.assign(p, { state, number: `SYNTHETIC-${state}`, validFrom: date, validTo: date, timeZone: 'America/Chicago', kind: 'hazmat-route-plan', complete: true,
      entry: { state: ['PA', 'OH', 'IN'][i], road: 'TEST ROAD', label: `SYNTHETIC ${state} entry` }, exit: { state: ['IN', 'IL', 'IA'][i], road: 'TEST ROAD', label: `SYNTHETIC ${state} exit` },
      routeText: `SYNTHETIC ${state} entry maneuver\nSYNTHETIC ${state} exit maneuver`, restrictions: 'SYNTHETIC QA ONLY. Not a permit or a road route.',
      documents: [{ id: `test-original-${state}`, name: 'SYNTHETIC QA logo - not a permit.png', type: 'image/png', size: 1 }],
      steps: [{ routeLine: 1, text: `SYNTHETIC ${state} entry maneuver`, road: 'TEST ROAD', lane: 'Synthetic lane instruction', points: [[41, start], [41, mid]] }, { routeLine: 2, text: `SYNTHETIC ${state} exit maneuver`, road: 'TEST ROAD', lane: '', points: [[41, mid], [41, end]] }],
      hazmatRoute: { ...blankHazmatRoute(), disposition: 'clear', checkedOn: date, validThrough: date, reviewer: 'SYNTHETIC QA REVIEWER', authorityURL: STATE_SOURCES[state].url, registryChecked: true, authoritiesChecked: true, notes: 'SYNTHETIC review for software tests. No determination about any actual road.', alerts: [{ routeLine: 2, text: `SYNTHETIC ${state} tunnel instruction`, sourceURL: STATE_SOURCES[state].url }] }
    });
    trip.permits.push(p); confirmPermit(p); confirmGeometry(p);
  }
  const now = Date.parse(date + 'T15:00:00Z'); confirmCargo(trip.hazmat, now);
  for (const p of trip.permits) confirmHazmatRoute(trip, p, now);
  return trip;
}
