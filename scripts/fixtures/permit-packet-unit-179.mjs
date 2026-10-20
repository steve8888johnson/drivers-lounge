// Sanitized structural fixture derived from a real four-state permit packet.
// Personal names, carrier contacts, VINs, plates and original permit numbers are intentionally excluded.

export const utahPermitText=`
[PERMIT PDF PAGE 1]
UTAH DEPARTMENT OF TRANSPORTATION
Ports of Entry
COMBINED TRANSPORTATION AND TAX COMMISSION PERMIT No. 9000000001
NON-DIVISIBLE OVERWEIGHT/OVERSIZE COMBINATION PERMIT
Duration: Single Trip Starts: 10/19/2026 Expires: 10/23/2026
Unit: TEST
SIZE: Width Length Height
8' 6" 75' 13' 6"
WEIGHT:
Total Gross: 86,002
Total Axles: 6
LOAD: BATTERY From: 2052 E GRAND AVE, ERDA, UT 84074 To: US-491 CO BORDER
Utah Miles: 400
ROUTING:
E GRAND AVE ; SHEEP LN ; UT138 - 179 ; EXIT 3B ; I-80 ; I-15 ; EXIT 257B ; US-6/89 ; US-191 ; I-70 ; EXIT-182 ; US-191 ; US-491 E .
**ATTENTION** This route has not been reviewed by the UDOT adjudication team; current restrictions must be checked before movement.
RESTRICTIONS:
All permitted loads are required to enter all OPEN Ports of Entry in Utah.
Loads exceeding stated dimensional thresholds are restricted to daylight or escort conditions.
`;

export const coloradoPermitText=`
[PERMIT PDF PAGE 1]
COLORADO DEPARTMENT OF TRANSPORTATION
Single Trip Transport Permit # 26SW0000001
Valid From: 10/19/2026 To: 10/24/2026
Load: 1 battery
Overall Dimensions - Length: LEGAL Width: LEGAL Height: LEGAL
Gross Weight: 86,002 Total Axles: 6
From: US 491 UT Line
To: US 491 NM Line
Via: ==>US 491;UT;Dove Creek<==US-491==>US 491;NM;Towaoc<==
Special Restrictions
Absolutely no convoying. Maintain half mile distance between oversized loads.
This permit is not authorization to cross load-posted structures.
Travel prohibited when hazardous conditions exist, including snow, ice, mud, rocks, winds and reduced visibility.
[PERMIT PDF PAGE 2]
ROUTING AND SPECIAL INSTRUCTIONS
Origin: US 491 UT Line
Miles Route To Distance Est. Time
0.00 Origin: US 491 UT Line 0.00 00:00
69.40 US-491 Arrive at destination. 69.40 01:17
0.00 Destination: US 491 NM Line 0.00 01:17
Final Destination: US 491 NM Line 01:17
NOTE: No refunds for non-use of permit.
`;

export const newMexicoPermitText=`
[PERMIT PDF PAGE 1]
STATE OF NEW MEXICO
Department of Transportation
Ports of Entry
Permit Number: NM26000001
Single Trip Overweight Load Permit
Date Effective: 10/19/2026
Date Expires: 10/23/2026
Load Description: 1 battery
Overall Width: 8' 6" Overall Height: 13' 6" Overall Length: 75' Trailer Length: 53'
GVW: 86,002 Total Axles: 6
Origin: US-491;CO;Shiprock
Destination: I-40;TX;Glenrio
Route Summary: ==>US-491;CO;Shiprock<==US-491, US-64, US-64 TRUCK BYPASS Ramp, US-64 TRUCK BYPASS, NM-371 Ramp, NM-371, I-40 Ramp, I-40==>I-40;TX;Glenrio<==
Restrictions
No travel on national holidays or during inclement weather. Wind speeds reaching 25 mph or more require movement to cease.
Permittee shall not exceed 65 miles per hour and must stop at designated Ports of Entry or Roadside Inspection Stations when open.
City of Farmington: Front Escort Required.
City of Grants: Front Escort Required.
City of Albuquerque: Movement prohibited during stated weekday morning and afternoon curfews.
[PERMIT PDF PAGE 3]
ROUTING AND SPECIAL INSTRUCTIONS
Origin: US-491;CO;Shiprock
Miles Route To Distance Est. Time
15.41 US-491 Turn left onto US-64 15.41 00:16
26.35 US-64 Bear right onto US-64 TRUCK BYPASS Ramp 41.75 00:43
0.08 US-64 TRUCK BYPASS Ramp Continue straight on US-64 TRUCK BYPASS 41.84 00:43
0.85 US-64 TRUCK BYPASS Merge onto NM-371 Ramp 42.69 00:44
0.05 NM-371 Ramp Merge onto NM-371 42.73 00:44
106.69 NM-371 Turn left onto I-40 Ramp 149.43 02:44
0.51 I-40 Ramp Continue straight on I-40 149.94 02:44
317.45 I-40 Arrive at destination. 467.39 07:31
Destination: I-40;TX;Glenrio 07:31
Final Destination: I-40;TX;Glenrio 07:31
`;

export const texasPermitText=`
[PERMIT PDF PAGE 1]
Texas Department of Motor Vehicles
Texas Oversize/Overweight Single-Trip Permit
Permit Number: 261019000001
Effective: 10/19/2026
Expiration: 10/23/2026
Load Description: 1 battery Gross Weight: 86002
Max. Width: 8' 6" Max Height: 13' 6" Max. Length: 75'
Route Description: Origin: IH0040 NM Line
Destination: IH0020 LA Line
General Conditions:
Permittee must adhere to the described route and contact TxDMV for an amended route if the listed roadways cannot be safely navigated.
Travel is not authorized on toll roads unless the permit route explicitly includes one or written permission is obtained.
Overweight-only loads may travel at nighttime with no escorts.
[PERMIT PDF PAGE 3]
Origin: IH0040 NM Line
Miles Route To Distance Est. Time
0.20 IH40 e Head east on IH40 0.20 00:00
61.50 IH40 e Take Exit 62A toward HELIUM RD/HOPE RD 61.70 00:56
0.20 IH40 Ramp se Merge onto IH40SFR east 61.90 00:00
1.20 IH40SFR e Turn right onto SL335 south 63.10 00:02
7.40 SL335 se Take IH27 Ramp southeast 70.50 00:08
63.40 IH27 s Take Exit 53 toward I-27 BUS LOOP/PLAINVIEW 134.30 00:58
110.00 US70 e Turn right onto US70WFR southeast 292.90 01:52
39.00 US287 e Merge onto IH44 southeast 342.20 00:40
31.40 US287 se Continue straight on US81 southeast 393.80 00:32
26.30 IH35E se Take Exit 440B toward I-635 E 473.90 00:24
[PERMIT PDF PAGE 4]
1.10 IH635 Connector se Continue straight on IH635 east 475.00 00:02
21.20 IH635 se Take Exit 5 toward GROSS RD 496.30 00:20
15.30 US80 e Continue straight on SS557 southeast 513.00 00:16
4.60 SS557 se Merge onto IH20 east 517.50 00:05
135.80 IH20 e Arrive at destination. 653.30 02:03
[Loaded Route Destination: IH0020 LA Line]
Final Destination: IH0020 LA Line
`;

export const unit179PermitPacketTexts=[utahPermitText,coloradoPermitText,newMexicoPermitText,texasPermitText];
