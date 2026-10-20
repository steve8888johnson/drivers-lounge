// Minimal, sanitized HTML fixtures matching the allowlisted public permit lookup
// structures. Names, contacts, account numbers, VINs, plates and payments are
// intentionally absent so tests prove the adapter returns route data only.

export const coloradoOfficialHTML=`<!doctype html><html><body>
<span id="PermitNumberLarge">26SW0000001</span>
<span id="spanStartDate">10/19/2026</span><span id="spanEndDate">10/24/2026</span>
<td id="ldWidth">8 ft. 6 in.</td><td id="ldHeight">13 ft. 6 in.</td><td id="ldLength">75 ft.</td><td id="ldWeight">86002</td>
<table id="tblAxles"><tr><td>Axle:</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr></table>
<tbody id="DD">
<tr><td>0</td><td></td><td>Origin: US 491 UT Line</td><td>0</td><td>00:00</td></tr>
<tr><td>69.4</td><td>US-491</td><td>Arrive at destination.</td><td>69.4</td><td>1:17</td></tr>
<tr><td>0</td><td></td><td>Destination: US 491 NM Line</td><td>0</td><td>00:00</td></tr>
</tbody>
<tbody id="PermitConditions">
<tr><td>Absolutely no convoying. Maintain one-half mile distance between oversized loads.</td></tr>
<tr><td>This permit is not authorization to cross load-posted structures.</td></tr>
</tbody>
<div id="private-contact">PRIVATE CONTACT MUST NOT SURVIVE</div><div id="VIN">PRIVATE-VIN-MUST-NOT-SURVIVE</div>
</body></html>`;

export const texasOfficialHTML=`<!doctype html><html><body>
<span id="PermitNumberLarge">Permit Number: 261019000001</span>
<span id="spanStartDate">10/19/2026</span><span id="spanEndDate">10/23/2026</span>
<td id="ldWidth">8 ft. 6 in.</td><td id="ldHeight">13 ft. 6 in.</td><td id="ldLength">75 ft.</td><td id="ldWeight">86002</td>
<table id="tblAxles"><tr><td>Axle:</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr></table>
<tbody id="tbodyDrivingDirections">
<tr><td></td><td></td><td>[Loaded Route Origin: IH0040 NM Line ]</td><td></td><td></td></tr>
<tr><td>0.2</td><td>IH40 e</td><td>Head e on IH40</td><td>0.2</td><td>00:00</td></tr>
<tr><td>61.5</td><td>IH40 e</td><td>Take Exit 62A toward HELIUM RD/HOPE RD</td><td>61.7</td><td>00:56</td></tr>
<tr><td>0.2</td><td>IH40 Ramp se</td><td>Merge onto IH40SFR e [IHHIGHWAY-40-ACCESS-ROADSFR]</td><td>61.9</td><td>00:00</td></tr>
<tr><td>1.2</td><td>IH40SFR e</td><td>Turn right onto SL335 s [HELIUM ROAD]</td><td>63.1</td><td>00:02</td></tr>
<tr><td>15.3</td><td>US80 e</td><td>Continue straight on SS557 se [SPUR 557]</td><td>513</td><td>00:16</td></tr>
<tr><td>4.6</td><td>SS557 se</td><td>Merge onto IH20 e [RONALD REAGAN MEMORIAL HIGHWAY]</td><td>517.5</td><td>00:05</td></tr>
<tr><td>135.8</td><td>IH20 e</td><td>Arrive at destination.</td><td>653.3</td><td>02:03</td></tr>
<tr><td></td><td></td><td>[Loaded Route Destination: IH0020 LA Line ]</td><td></td><td></td></tr>
</tbody>
<tbody id="PermitConditions"><tr><td>Permittee must adhere to the described route.</td></tr></tbody>
<div id="ContactPhone">PRIVATE-PHONE-MUST-NOT-SURVIVE</div><div id="VehicleList">PRIVATE-VIN-MUST-NOT-SURVIVE</div><div id="PaymentList">PRIVATE-PAYMENT-MUST-NOT-SURVIVE</div>
</body></html>`;
