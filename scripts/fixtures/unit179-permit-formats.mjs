// Sanitized acceptance fixtures based on a real four-state permit packet.
// Permit numbers, VINs, plates, addresses and contact/account details are synthetic.
// The private original PDFs remain outside the repository. Preserve state formatting,
// authorized roads, border handoffs, dimensions and safety restrictions for parser QA.

export const unit179PermitTexts=Object.freeze({
 UT:`UTAH DEPARTMENT OF TRANSPORTATION
Ports of Entry
COMBINED TRANSPORTATION No. UT-SAMPLE-179
AND TAX COMMISSION PERMIT
NON-DIVISIBLE OVERWEIGHT/OVERSIZE COMBINATION PERMIT
USDOT Number: 0000000 Duration: Single Trip Starts: 10/19/2026
Company: SAMPLE CARRIER Expires: 10/23/2026
Unit: 179 VIN: REDACTED
SIZE: Width 8' 6" Length 75' Height 13' 6"
WEIGHT:
Axle Group 1 # of Axles 1 Weight 12,400 Dist to Next Grp 17' 9"
Axle Group 2 # of Axles 2 Weight 30,000 Dist to Next Grp 31' 1"
Axle Group 3 # of Axles 3 Weight 43,602 Dist to Next Grp 0'
Total Gross: 86,002
LOAD: BATTERY
From: 2052 E GRAND AVE, ERDA, UT 84074 To: US-491 CO BORDER
Utah Miles: 400
ROUTING:
E GRAND AVE ; SHEEP LN ; UT138 - 179 ; EXIT 3B ; I-80 ; I-15 ; EXIT 257B ; US-6/89 ; US-191 ; I-70 ;
EXIT-182 ; US-191 ; US-491 E .
**ATTENTION** This route has not been reviewed by the UDOT adjudication team, the permittee is responsible to check current UDOT restrictions prior to movement.
RESTRICTIONS:
All permitted loads are required to enter all OPEN Ports of Entry in Utah.
Loads exceeding 14'6" height, 12' width, 105' length, or more than 10' front or rear overhang are restricted to daylight hours.
One certified pilot/escort is required for loads exceeding 12' wide or 105' length on Secondary Highways.
TAX COMMISSION PERMITS EXPIRE UPON LEAVING THE STATE`,
 CO:`COLORADO DEPARTMENT OF TRANSPORTATION
Single Trip Transport Permit # CO-SAMPLE-179
Valid From: 10/19/2026 To: 10/24/2026
Issued to: SAMPLE CARRIER
Load: 1 battery
Vehicle Year/Make: 2025 KW Unit No #: 179
Overall Dimensions - Length: LEGAL Width: LEGAL Height: LEGAL Overhang Front: 0' 0" Rear: 0' 0"
Gross Weight: 86,002 Total Axles: 6
Axle: 1 2 3 4 5 6
Weight: 12400 15000 15000 14534 14534 14534
Spacing: 17' 9" 4' 6" 31' 1" 6' 2" 6' 2"
From: US 491 UT Line
To: US 491 NM Line
Via: ==>US 491;UT;Dove Creek<==US-491==>US 491;NM;Towaoc<==
Special Restrictions
Absolutely no convoying. Maintain half (1/2) mile distance between any oversized loads.
This permit is not authorization to cross load posted structures.
Travel PROHIBITED when hazardous conditions exist including SNOW, ICE, MUD, ROCKS, WINDS and REDUCED VISIBILITY.
NO oversize movement is allowed where the chain law is in effect.
ROUTING AND SPECIAL INSTRUCTIONS
Origin: US 491 UT Line
Miles Route To Distance Est. Time
0.00 Origin: US 491 UT Line 0.00 00:00
69.40 US-491 Arrive at destination. 69.40 01:17
0.00 Destination: US 491 NM Line 0.00 01:17
Final Destination: US 491 NM Line 01:17
NOTE: No refunds for non-use of permit.`,
 NM:`STATE OF NEW MEXICO
Department of Transportation
Ports of Entry
Permit Number: NM-SAMPLE-179
Single Trip Overweight Load Permit
Permittee: SAMPLE CARRIER
Date Issued: 10/19/2026 02:45 PM
Date Effective: 10/19/2026
Date Expires: 10/23/2026
Load Description: 1 battery
Overall Width: 8' 6" Overall Height: 13' 6" Overall Length: 75' Trailer Length: 53'
FOH: 0' 0" ROH: 0' 0" GVW: 86,002 Total Axles: 6
Vehicle Type: TT Unit Number: 179
Axle: 1 2 3 4 5 6
Distances: 17' 9" 4' 6" 31' 1" 6' 2" 6' 2"
Weights: 12400 15000 15000 14534 14534 14534
Origin: US-491;CO;Shiprock
Destination: I-40;TX;Glenrio
Route Summary: ==>US-491;CO;Shiprock<==US-491, US-64, US-64 TRUCK BYPASS Ramp, US-64 TRUCK BYPASS, NM-371 Ramp, NM-371, I-40 Ramp, I-40==>I-40;TX;Glenrio<==
Restrictions
No travel on National holidays or during inclement weather.
Inclement weather includes wind speeds that reach 25 mph or more.
Permittee shall not exceed a maximum speed of sixty-five (65) miles per hour.
Permittee is required to stop at all designated Ports of Entry and/or Roadside Inspection Stations when open.
City of Albuquerque: movement prohibited 7:00 AM to 9:00 AM and 4:00 PM to 7:00 PM Monday through Friday.
State Curfew Albuquerque: no travel 7 AM to 9 AM and 4 PM to 6 PM Monday through Friday.
ROUTING AND SPECIAL INSTRUCTIONS
Origin: US-491;CO;Shiprock
15.41 US-491 Turn left onto US-64 15.41 00:16
26.35 US-64 Bear right onto US-64 TRUCK BYPASS Ramp [WEST MURRAY DRIVE Ramp] 41.75 00:43
0.08 US-64 TRUCK BYPASS Ramp Continue straight on US-64 TRUCK BYPASS [WEST MURRAY DRIVE] 41.84 00:43
0.85 US-64 TRUCK BYPASS Merge onto NM-371 Ramp 42.69 00:44
0.05 NM-371 Ramp Merge onto NM-371 [BISTI HIGHWAY] 42.73 00:44
106.69 NM-371 Turn left onto I-40 Ramp 149.43 02:44
0.51 I-40 Ramp Continue straight on I-40 149.94 02:44
317.45 I-40 Arrive at destination. 467.39 07:31
Destination: I-40;TX;Glenrio
Final Destination: I-40;TX;Glenrio 07:31`,
 TX:`Texas Department of Motor Vehicles
Texas Oversize/Overweight Single-Trip Permit
Name: SAMPLE CARRIER Permit Number: TX-SAMPLE-179
Issued On: 10/19/2026 Time: 03:53 PM
Effective: 10/19/2026
Expiration: 10/23/2026
Load Description: 1 battery Gross Weight: 86002
Max. Width: 8' 6" Max Height: 13' 6" Max. Length: 75' ROH: LEGAL FOH: LEGAL
Axle: 1 2 3 4 5 6
Distances: 18' 5' 32' 6' 6'
Weights: 12400 15000 15000 14534 14534 14534
Route Description: Origin: IH0040 NM Line
Destination: IH0020 LA Line
General Conditions:
Travel is prohibited on a load-restricted bridge when exceeding the posted capacity.
Permittee must adhere to the described route and contact TxDMV for an amended route if the road cannot be safely navigated.
This permit does not authorize travel on non-state maintained roadways without required local approvals.
Travel is not authorized on toll roads unless the permit route explicitly includes a toll road or written permission is obtained.
Loads not exceeding 10 feet wide, 14 feet high, 100 feet in length, with legal front and rear overhang, may travel at nighttime on the Interstate Highway System with no escorts required.
Permit is valid for single trip only.
Origin: IH0040 NM Line
0.20 IH40 e Head e on IH40 0.20 00:00
61.50 IH40 e Take Exit 62A toward HELIUM RD/HOPE RD 61.70 00:56
0.20 IH40 Ramp se Merge onto IH40SFR e [IHHIGHWAY-40-ACCESS-ROADSFR] 61.90 00:00
1.20 IH40SFR e Turn right onto SL335 s [HELIUM ROAD] 63.10 00:02
7.40 SL335 se Take IH27 Ramp se 70.50 00:08
0.20 IH27 Ramp s Continue straight on IH27 s [US60], [US87], [CANYON EXPRESSWAY] 70.90 00:00
63.40 IH27 s Take Exit 53 toward I-27 BUS LOOP/PLAINVIEW 134.30 00:58
3.30 BI27U s Turn left onto US70 e [WEST 5TH STREET] 138.20 00:04
28.30 US70 se Merge onto US62 e [US70] 166.60 00:29
110.00 US70 e Turn right onto US70WFR se [US287WFR] 292.90 01:52
10.00 US70 e Continue straight on US287 se 303.20 00:11
39.00 US287 e Merge onto IH44 se [US277], [US281], [US287], [CENTRAL FREEWAY] 342.20 00:40
31.40 US287 se Continue straight on US81 se [US287] 393.80 00:32
25.80 US380 e Take IH35 Ramp se 445.70 00:27
26.30 IH35E se Take Exit 440B toward I-635 E 473.90 00:24
21.20 IH635 se Take Exit 5 toward GROSS RD 496.30 00:20
15.30 US80 e Continue straight on SS557 se [SPUR 557] 513.00 00:16
4.60 SS557 se Merge onto IH20 e [RONALD REAGAN MEMORIAL HIGHWAY] 517.50 00:05
135.80 IH20 e Arrive at destination. 653.30 02:03
[Loaded Route Destination: IH0020 LA Line]
Final Destination: IH0020 LA Line`
});

export const unit179InlineNewMexicoQR=`Permit No: NM-SAMPLE-179\r\nStart Date: 10/19/2026\r\nEnd Date: 10/23/2026\r\nPermit Type: Single Trip OW Load\r\nCompany Name: SAMPLE CARRIER\r\nUSDOT #: 0000000\r\nVIN #: REDACTED\r\nPlate No: REDACTED\r\nTruck Make: KW\r\nTruck Year: 2025`;

export const unit179QrReferences=Object.freeze({
 UT:'https://utcview.com/Permit/index?VIN=&Plate=&permit_number=1234567890&State=&iftaOnly=No',
 CO:'https://coopr.codot.gov/Mobile/Lookup.aspx?PermitID=1234567',
 TX:'http://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=12345678&QRUSER=1'
});
