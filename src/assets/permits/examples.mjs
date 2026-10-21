import { blankTrip } from './core.mjs';
import { parsePermitText } from './import.mjs';

// Transcribed from the supplied photos. Never substitute these samples for permits.
export const illinoisText = `Illinois OS/OW Permit
Permit: R38740590
Effective Date: 09/22/2026 through 09/27/2026
VALID FOR 1 SINGLE-TRIP MOVE
Authorized Route:
1. Border Start: Indiana - I-94
2. [state] Go on I-80 I-94 (0.9 miles)
3. [state] At fork keep left on US-6 toward I-294-TOLL N / I-80 W / WISCONSIN / IOWA / TORRENCE AVE (1.7 miles)
4. [toll] Go on I-80 (5.0 miles)
5. [state] At exit 5 keep right on I-80 W toward IOWA (155.8 miles)
6. Border End: Iowa - I-80
Total Distance: 163.3 miles
State Mileage: 158.4 miles`;
export const ohioText = `DEPARTMENT OF TRANSPORTATION
STATE OF OHIO
Audible Route Guidance
Origin: I-80 PA Line
Visible route rows: I-80 WEST; I-80 WEST; I-76; I-76 Ramp; KENMORE EXPRESSWAY; I-76 WEST.
PHOTO IS CROPPED: complete instructions, permit number, dates, destination and restriction pages are not visible.`;
export function exampleTrip() {
  const trip = blankTrip(); trip.name = 'Ohio → Illinois · photo reference'; trip.departure = '2026-09-24';
  const ohio = parsePermitText(ohioText), illinois = parsePermitText(illinoisText);
  ohio.restrictions = 'Incomplete photograph. Obtain every route and restriction page. Indiana connecting permit is missing.';
  illinois.restrictions = 'Restriction and vehicle pages are not supplied. Printed total miles (158), route distance (163.3) and state mileage (158.4) differ; retain the printed values and verify. Do not infer travel windows or escort requirements.';
  trip.permits = [ohio, illinois]; return trip;
}
