// Original plain-language explanations. Consult linked definitions for legal use.
const groups = {
general: `
dot|DOT / USDOT|Department of Transportation|U.S. transportation department; several agencies regulate different parts of a commercial move.|fmcsa,phmsa
fmcsa|FMCSA|Federal Motor Carrier Safety Administration|Federal agency overseeing motor carrier safety and related registration requirements.|fmcsa
fhwa|FHWA|Federal Highway Administration|Federal highway agency addressing truck size, weight, networks and roadway standards.|658,fhwa-permits
phmsa|PHMSA|Pipeline and Hazardous Materials Safety Administration|Agency responsible for federal hazardous-materials transportation regulations.|phmsa
cfr|CFR / eCFR|Code of Federal Regulations|Codified federal regulations; eCFR provides a continuously updated, authoritative but unofficial version.|fmcsa
usc|U.S.C.|United States Code statute|Federal statutes. Implementing regulations, agency guidance and a permit are different documents.|fmcsa
guidance|Guidance versus regulation|advisory manual best practice|Guidance explains practices or agency interpretations; determine the binding regulation and conditions separately.|fmcsa,pilot1
jurisdiction|Jurisdiction / road authority|state county city tribal toll turnpike|The government or authority responsible for a road or requirement. One state's permit may not cover local or toll facilities.|fhwa-permits,pilot3
interstate|Interstate commerce|state line commerce|Commerce involving movement between states or countries, including some intrastate legs of a continuing interstate shipment.|390
intrastate|Intrastate commerce|in-state|Commerce contained within one state under the applicable definition; state safety rules and some federal requirements may still apply.|390
carrier|Motor carrier|trucking company operator|The responsible transportation operator. Carrier obligations differ from a broker's or shipper's obligations.|390
shipper|Shipper / offeror|consignor|Person offering freight for transportation; hazardous-material offerors have classification, preparation and communication duties.|171
consignee|Consignee|receiver|The named recipient of the shipment; delivery access still needs route and property coordination.|373
bol|Bill of lading|BOL freight bill|Shipment receipt and transportation document. A general freight document is not automatically a compliant hazmat shipping paper.|373,shipping
usd-number|USDOT number|DOT number identification|Carrier identifier used for safety oversight and records; it is distinct from operating authority.|390
authority|Operating authority|MC number for-hire|Registration authority applicable to certain transportation operations; a USDOT number alone does not establish it.|365
process-agent|Process agent / BOC-3|blanket designation|Designation for service of legal process under the applicable motor carrier registration rules.|366
ucr|Unified Carrier Registration|UCR|Registration program for applicable interstate entities; separate from vehicle registration and OS/OW permits.|ucr
irp|International Registration Plan|IRP apportioned plate cab card|Vehicle registration apportionment program. Check base-jurisdiction eligibility, cab-card coverage and trip permits.|irp
ifta|International Fuel Tax Agreement|IFTA fuel permit|Fuel-tax reporting arrangement for qualified operations; separate from registration and size/weight permits.|ifta
insurance|Financial responsibility|insurance MCS-90|Applicable financial responsibility requirements depend on operation and commodity, including certain hazmat risks.|387
exemption|Exemption / waiver|exception variance|A specific legal allowance with scope, conditions and duration. Do not infer a blanket exemption from a job description.|390,fmcsa
special-permit|PHMSA special permit|DOT-SP exemption packaging|Hazmat authorization issued under Part 107; distinct from a state's oversize/overweight movement permit.|107
permit-wallet|Permit wallet|inspection originals QR|Drivers Lounge storage for original evidence and reviewed trip data. The saved index and QR are not replacement permit authority.|oh-provisions,in-provisions
` ,
standard: `
cmv|Commercial motor vehicle|CMV commercial truck|A regulated vehicle category; safety-rule and CDL definitions differ. Determine the definition for the rule being applied.|390,383
cdl|Commercial driver's license|CDL Class A B C|License classes, endorsements and restrictions authorize specified vehicle/cargo operations; verify the driver's actual credentials.|383
eldt|Entry-level driver training|ELDT training provider|Training requirements for covered first-time CDL classes, upgrades and endorsements.|380
h-endorsement|Hazardous materials endorsement|H endorsement HME TSA|CDL hazmat endorsement and associated security review; it is separate from hazmat employee training.|383,tsa,training
n-endorsement|Tank vehicle endorsement|N tanker X combined|License endorsement for covered tank vehicles; combined tank/hazmat authorization uses the applicable combined endorsement.|383
medical|Medical qualification|DOT physical medical certificate med card|Driver physical qualification and certification under applicable rules; verify current status and any restrictions.|391
dq-file|Driver qualification file|DQ file MVR|Carrier records documenting applicable driver qualifications and required reviews.|391
drug-testing|Drug and alcohol testing|Clearinghouse DOT testing|Applicable employer/driver testing and reporting duties; DOT collection and testing procedures are in Part 40.|382,40
hos|Hours of service|HOS driving clock|Limits and recordkeeping for driving, duty and rest, with defined exceptions; cargo permits do not reset these clocks.|395
eld|Electronic logging device|ELD electronic logs|Device used to record hours-of-service information when required; applicability and malfunction duties must be checked.|395
rods|Record of duty status|RODS logbook|Driver's duty-status record in the permitted form, subject to applicable exceptions and supporting-document rules.|395
short-haul|Short-haul exception|150 air mile time records|Conditional exception affecting records or other HOS provisions; qualifying conditions must be met for the specific provision.|395
adverse-driving|Adverse driving conditions|weather HOS exception|A defined HOS provision with limits; it does not waive unsafe-weather restrictions or permit curfews.|395,392
personal-conveyance|Personal conveyance|PC off duty|Off-duty vehicle use addressed in FMCSA guidance; it cannot be assumed merely because the trailer is empty.|fmcsa,395
pretrip|Pre-trip inspection|pretrip walkaround|Check vehicle condition and required equipment before operating; resolve defects affecting safe operation.|392,396
dvir|Driver vehicle inspection report|DVIR posttrip defects|Inspection/defect reporting requirements depend on operation and circumstances. Required repairs and certifications must be handled.|396
annual-inspection|Periodic inspection|annual DOT inspection|Required periodic vehicle inspection with specified standards and documentation; daily checks remain separate.|396
oos|Out of service|OOS roadside inspection|An order or condition prohibiting operation until applicable release/repair requirements are met.|396,385
cargo-securement|Cargo securement|load restraint tie down tiedown|Rules for containing, immobilizing and securing cargo, including commodity-specific provisions.|393
wll|Working load limit|WLL binder chain strap|Rated allowable working load of a securement component or system under applicable conditions.|393
aggregate-wll|Aggregate working load limit|combined tiedown capacity|Combined securement capacity calculated using applicable tiedown rules; not simply every component's rating added together.|393
blocking|Blocking and bracing|dunnage chocks cribbing|Physical restraints used to prevent cargo movement; suitability depends on cargo and securement requirements.|393
edge-protection|Edge protection|corner protector abrasion|Protection against tiedown cutting or abrasion where required; it does not increase a component's rating.|393
load-recheck|Cargo reinspection|securement recheck|Driver cargo/securement checks during a trip under applicable timing and exception provisions.|392
gvw|Gross vehicle weight|GVW actual weight|Actual loaded vehicle weight, distinct from a manufacturer's rating or a registered weight.|390,658
gvwr|Gross vehicle weight rating|GVWR manufacturer rating|Manufacturer's rated loaded vehicle weight; not a permit to exceed roadway, tire or axle limits.|390
gcwr|Gross combination weight rating|GCWR combination rating|Applicable rated weight for a combination; CDL and other rules use their own detailed definitions.|383,390
axle-weight|Axle weight|single axle load|Weight carried by an axle; gross compliance does not establish axle or bridge-formula compliance.|658
tandem|Tandem axle|tandem group|An axle grouping defined by spacing for the applicable weight rule; verify jurisdiction-specific treatment.|658
tridem|Tridem axle|triple axle group|Three-axle grouping; permitted weight depends on spacing, vehicle configuration and governing rules.|658,bridge
axle-spacing|Axle spacing|wheelbase bridge length|Distance between axles used in weight and bridge evaluations; report measured spacing accurately.|bridge
bridge-formula|Federal Bridge Formula|bridge formula B|Formula relating allowable group weight to axle count and spacing; posted limits and exceptions require separate review.|bridge,658
national-network|National Network|NN STAA network|Designated highway network relevant to federal commercial-vehicle dimension and access protections; not every public road.|658,size
reasonable-access|Reasonable access|terminal access STAA|Access provisions connecting covered network travel to specified facilities, subject to applicable limitations.|658,size
kingpin|Kingpin-to-rear-axle distance|KPRA rear axle setting|Trailer axle-position measurement used in some state length rules; the measurement point and limit vary.|size
registered-weight|Registered weight|licensed weight cab card weight|Weight declared or authorized for vehicle registration; it does not override roadway or manufacturer's limits.|irp,658
brake-system|Brake system / air brakes|ABS air brake restriction|Equipment condition and performance requirements; licensing restrictions also matter for the driver.|393,383
tires|Tire load and condition|tire rating inflation|Tire condition and applicable loading requirements must be checked with axle, vehicle and roadway limits.|393
emergency-equipment|Emergency equipment|triangles extinguisher warning devices|Required vehicle equipment depends on the operation; hazmat may add restrictions on devices and their use.|393,397
railroad-crossing|Railroad crossing|grade crossing railroad stop|Stopping, clearance and hazardous-material rules can apply; never enter without sufficient clearance and room to exit.|392,397
distraction|Distracted driving|texting handheld mobile phone|Commercial driver rules restrict texting and handheld-phone use; configure the trip while parked.|392
` ,
oversize: `
standard-load|Standard / legal-size load|legal load non-permit load|A load within applicable size and weight rules for its roads and configuration; other operating requirements still apply.|658,size
osow|Oversize / overweight|OSOW OS/OW ODW OD overdimensional wide load|A vehicle or load beyond an applicable dimension or weight limit, requiring evaluation for lawful movement authorization.|fhwa-permits
overwidth|Overwidth|wide load width|Loaded width above the applicable limit; measure the whole combination and relevant protrusions.|size,658
overheight|Overheight|tall load height|Loaded height above the applicable jurisdiction limit. There is no single federal vehicle-height limit for all roads.|size
overlength|Overlength|long load overall length|Length exceeding the limit for the particular configuration, route and jurisdiction; trailer and overall limits differ.|size
overweight|Overweight|heavy haul weight permit|Exceeding applicable gross, axle or group limits; being legal in dimensions does not settle weight compliance.|658,bridge
nondivisible|Nondivisible load|indivisible non-divisible|Permit classification involving separation, usefulness, value and dismantling criteria; the applicable legal definition controls.|658,fhwa-permits
divisible|Divisible load|reducible load commodity permit|A load capable of being divided; special state/federal allowances are required where overweight movement is permitted.|658
superload|Superload|super load extraordinary load|Jurisdiction-specific designation often requiring extra engineering or coordination; thresholds and processes differ.|fhwa-permits
single-trip|Single-trip permit|one-way trip permit|Authorization for the specified movement, route, vehicle/load and validity period; reuse is not assumed.|oh-provisions,il-provisions
annual-permit|Annual / multiple-trip permit|blanket permit continuing permit|Authorization subject to stated limits, roads, conditions and duration; it does not cover every load or route.|fhwa-permits
authorized-route|Authorized permit route|issued route permitted route|The roads and instructions authorized for the move; a navigation shortcut or suggested detour does not amend it.|oh-provisions,il-provisions
amendment|Permit amendment / revision|route change reissue|Issuer-approved change to an authorization. Keep the effective revised document and verify all crew copies.|oh-provisions,in-provisions
permit-window|Permit effective dates|validity expiration effective from|Dates during which the authorization may apply; daily curfews and other conditions can further restrict movement.|oh-provisions
curfew|Curfew / restricted travel hours|rush hour travel window|A jurisdiction or permit restriction on movement times, possibly varying by road, county, date and load size.|oh-provisions,il-provisions
daylight|Daylight movement|sunrise sunset daylight-only|A defined travel window in the governing provisions; do not substitute a universal sunrise/sunset offset.|oh-provisions,il-provisions
holiday|Holiday restriction|holiday weekend travel ban|Movement restrictions with dates and times set by the relevant authority; overweight-only exceptions may differ.|oh-notices,il-provisions
seasonal-weight|Seasonal weight restriction|frost law spring thaw|Temporary or seasonal load restrictions; verify current notices for every road authority on the trip.|658,fhwa-permits
posted-limit|Posted bridge / road limit|weight posting bridge posting|A location-specific restriction requiring compliance and route review even when a general permit exists.|in-provisions,oh-provisions
clearance|Vertical / lateral clearance|low bridge tunnel height width clearance|Space available along the actual path. A posted number or map estimate does not establish clearance for the move.|pilot3
route-survey|Route survey|route inspection pre-run|Review of the proposed path for obstacles, geometry and operational constraints, with required documentation and coordination.|pilot3
bridge-analysis|Bridge engineering analysis|structure review axle configuration|Evaluation of a specific configuration and load on structures; permission may include speed, lane or spacing conditions.|bridge,fhwa-permits
offtracking|Offtracking / swept path|turning envelope swing tail swing|Trailer and load paths differ from the tractor's path when turning; account for inside and outside clearance.|pilot5
overhang|Front / rear overhang|load projection protrusion|Load extending beyond the vehicle; measurement, marking and escort treatment vary with the governing rules.|size,pilot2
ground-clearance|Ground clearance / high centering|lowboy hump crossing breakover|Clearance beneath the combination; crest, rail crossing or grade changes can ground the equipment.|pilot3
toll-permit|Toll road / local permit|turnpike city county permit|Separate authority may be needed for roads not covered by the state permit.|pilot3,fhwa-permits
utility-coordination|Utility coordination|wires overhead lines bucket truck|Arrange authorized utility involvement for conflicts; a crew or height pole must not move or contact overhead lines.|pilot3,pilot4
convoy|Convoy / permitted-load spacing|load separation caravan|Multiple permitted vehicles traveling together may be restricted; follow the actual jurisdiction and permit spacing conditions.|oh-provisions,il-provisions
detour|Unplanned detour|closure reroute deviation|A road closure does not authorize a substitute route. Stop safely and obtain required authority for a change.|oh-provisions,in-provisions
wind-weather|Weather movement restriction|wind ice snow visibility|Permit and safety rules can restrict movement despite valid dates; verify current conditions and issuer instructions.|oh-provisions,392
` ,
hazmat: `
hazmat|Hazardous material|HM hazmat dangerous goods DG|Material regulated for transportation risk under the applicable definition; classification is a shipper responsibility.|171,173
un-na|UN / NA identification number|UN number NA number identification|Four-digit transportation identifier used with the proper shipping description; a number can cover multiple substances.|hmt,cameo
proper-name|Proper shipping name|PSN shipping description|Regulatory shipping name selected under the Hazardous Materials Table and applicable description rules.|hmt,shipping
technical-name|Technical name / n.o.s.|NOS not otherwise specified|Some descriptions require a technical name in addition to a generic proper shipping name.|hmt
hazard-class|Hazard class / division|primary class classification|Regulatory hazard grouping; divisions provide finer classification within certain classes.|173
subsidiary|Subsidiary hazard|secondary hazard subsidiary risk|An additional regulated hazard affecting communication, packaging and handling requirements.|hmt,labels
class1|Class 1 — explosives|1.1 1.2 1.3 1.4 1.5 1.6 compatibility group|Explosives divisions reflect different hazards; compatibility groups and routing requirements may also apply.|explosives,397
class2|Class 2 — gases|2.1 flammable gas 2.2 nonflammable gas 2.3 toxic gas|Gas divisions distinguish flammability and toxicity hazards under the classification rules.|gas
class3|Class 3 — flammable liquids|combustible liquid flash point|Classification depends on the prescribed properties and exceptions; combustible-liquid treatment is conditional.|flammable,limited
class4|Class 4 — flammable solids and related hazards|4.1 4.2 4.3 spontaneously combustible dangerous when wet|Divisions cover flammable solids, spontaneous combustion and dangerous water reactivity.|solid
class5|Class 5 — oxidizers and organic peroxides|5.1 5.2|Separate divisions govern oxidizing substances and organic peroxides.|oxidizer,peroxide
class6|Class 6 — toxic and infectious substances|6.1 6.2 poison|Toxic material and infectious substance definitions and handling requirements differ.|toxic,infectious
class7|Class 7 — radioactive materials|radioactive fissile|Radioactive classifications and package/control requirements depend on the material and shipment.|radioactive
class8|Class 8 — corrosive materials|corrosives acid alkali|Regulatory classification based on specified corrosive effects; classification is not inferred from a product nickname.|corrosive
class9|Class 9 — miscellaneous hazardous material|lithium battery marine pollutant|Category for specified transportation hazards outside the other classes; exceptions and marking rules require separate review.|class9,hmt
packing-group|Packing group|PG I II III|A relative degree-of-danger assignment where applicable; not all classes/materials receive a packing group.|173,hmt
bulk|Bulk packaging|bulk tank capacity|Packaging category defined by capacity and contents under the HMR; it is not simply the quantity loaded today.|171
nonbulk|Non-bulk packaging|drums boxes cylinders|Packaging below applicable bulk-definition thresholds, subject to its own specification and handling rules.|171,178
cargo-tank|Cargo tank|DOT tank truck specification tank|Bulk transportation packaging subject to applicable specification, inspection, test and loading requirements.|178,180,loading
ibc|Intermediate bulk container|IBC tote|A defined packaging type; its capacity, specification, compatibility and requalification requirements matter.|178,180
portable-tank|Portable tank|ISO tank tank container|A defined bulk packaging type with its own specification and use requirements; do not assume cargo-tank rules are identical.|171,178
placard|Placard|placarding Table 1 Table 2|Vehicle/container hazard communication determined by material, quantity, packaging and exceptions; not solely total load weight.|placards
label|Hazard label|package label diamond|Package hazard communication, distinct from larger vehicle/container placards.|labels
marking|Package / identification marking|UN markings orientation arrows|Required descriptive or identification markings; labels and placards serve separate purposes.|marking,172
limited-quantity|Limited quantity|LQ small quantity exceptions|Conditional relief for specified materials, packaging and quantities; it is not a universal hazmat exemption.|limited,172
shipping-paper|Hazmat shipping paper|basic description manifest|Document containing required hazard description and other information; highway accessibility rules also apply.|shipping,177
emergency-info|Emergency response information|ERI response instructions|Required shipment-related response information, available in the prescribed manner; keep the correct documents accessible.|emergency,177
emergency-phone|Emergency response telephone|24-hour contact emergency number|Required monitored telephone arrangements and associated details under the applicable rule; a random dispatch number is insufficient.|contact
sds|Safety Data Sheet|SDS MSDS|Chemical safety document; it is not automatically a substitute for a compliant shipping paper or required emergency information.|shipping,emergency,cameo
erg|Emergency Response Guidebook|ERG orange book guide number|Initial transportation-incident reference for responders; use the current official guide for response decisions.|erg
cameo|CAMEO Chemicals|NOAA EPA compatibility chemical database|Chemical datasheets and planning/response tools. CAMEO information does not authorize a road or determine the shipment classification.|cameo
piH|Poison / toxic inhalation hazard|PIH TIH inhalation hazard zone|An inhalation-hazard designation that can trigger additional communication, packaging, routing and security requirements.|toxic,gas,hmt
hrcq|Highway route-controlled quantity|HRCQ radioactive route plan|Defined radioactive quantity category with special highway routing and related requirements.|radioactive,397
nhmrr|National Hazardous Materials Route Registry|NHMRR hazmat route registry|FMCSA directory of reported routing designations; verify current applicability and local/tribal restrictions.|registry
designated-route|Designated / preferred hazmat route|NRHM restricted route radioactive preferred route|A route designation under applicable hazmat rules; radioactive and nonradioactive routing provisions differ.|397,registry
route-plan|Written hazmat route plan|explosives radioactive plan|Written routing document required for specified shipments; applicability depends on material and quantity.|397
hmsP|Hazardous Materials Safety Permit|HMSP FMCSA safety permit|FMCSA carrier safety authorization required for specified high-hazard shipments; separate from PHMSA registration.|385
hazmat-registration|PHMSA registration|hazmat registration certificate|Registration requirement for persons performing specified hazmat activities; verify current applicability and exceptions.|107
hazmat-training|Hazmat employee training|general awareness function-specific safety security recurrent|Training obligations depend on employee functions, with records, timing and recurrent requirements.|training
security-plan|Transportation security plan|in-depth security training|Plan and training requirements apply to specified hazardous-material operations; not every shipment uses the same rules.|security,training
segregation|Segregation / compatibility|mixed load compatibility table|Separation requirements for incompatible materials; use the applicable loading/segregation rules, not a chemical-name guess.|segregation
residue|Residue / empty uncleaned packaging|empty tank heel last contained|A packaging can remain regulated after unloading; applicable cleaning/purging, residue and exception rules control.|residue
attendance|Attendance / surveillance|hazmat attended vehicle parking|Specified hazardous loads have attendance, parking and surveillance requirements; verify material and location applicability.|397
safe-haven|Safe haven|explosives parking approved haven|A defined designated parking concept for certain explosive loads; ordinary truck parking is not automatically a safe haven.|397
incident-report|Hazmat incident reporting|NRC 5800.1 spill report|Certain incidents trigger immediate notification and/or a written report under Part 171; requirements depend on the event.|171
rq|Reportable quantity|RQ hazardous substance|Quantity concept affecting hazardous-substance regulation and communication; it is not a general placarding threshold.|171,hmt
marine-pollutant|Marine pollutant|environmentally hazardous substance|A regulated environmental designation with mode, packaging and exception provisions.|171,hmt
` ,
pilot: `
pevo|Pilot / escort vehicle operator|P/EVO PEVO EVO pilot car escort driver|Operator supporting permitted-load movement; credential and vehicle requirements are set by applicable jurisdictions.|pilot1,pilot2
lead|Lead escort|front pilot front car|Escort assigned ahead of the load to observe hazards and communicate relevant road conditions.|pilot5
chase|Chase / rear escort|rear pilot back car|Escort assigned behind the load to monitor clearance, traffic and the movement from the rear.|pilot5
high-pole|High-pole / height-pole escort|height stick pole car|Lead escort using a correctly set measuring pole for a specified load; follow surveyed route and utility safety procedures.|pilot2,pilot3
police-escort|Law-enforcement escort|police escort trooper escort|Officer support required or authorized for a move; it does not replace other permit conditions.|pilot5
escort-certification|Escort certification|pilot license training certificate|Credential required by certain jurisdictions. Verify training, validity, residency conditions and accepted credentials for each state.|pilot2,wa-pilot,va-pilot
reciprocity|Certification reciprocity|recognized out-of-state credential|A jurisdiction's acceptance of another credential under specified conditions; acceptance is not automatically nationwide or reciprocal.|wa-pilot,va-pilot
escort-equipment|Escort vehicle equipment|pilot kit signs lights flags extinguisher|Jurisdiction-specific equipment, vehicle and identification requirements; verify the current checklist before each move.|pilot2
oversize-sign|Oversize-load sign|wide load banner oversize banner|Warning sign subject to jurisdiction/permit rules for wording, dimensions, location and display.|pilot2
amber-light|Amber warning light|beacon strobe rotating flashing light|Warning-light specifications and visibility requirements vary; use only authorized equipment and operation.|pilot2
flags|Load and escort flags|red flag orange flag|Visibility markings with required size, color and placement determined by governing rules.|pilot2
hi-vis|High-visibility apparel|vest PPE reflective clothing|Visibility equipment appropriate to duties and applicable standards; it does not authorize traffic control.|pilot2,mutcd
flagging|Flagging / traffic control|STOP SLOW paddle flagger|Directing traffic requires applicable authorization, training and procedures; an escort assignment alone is not permission.|mutcd,pilot5
radio-check|Radio check / communication plan|CB two-way radio channel call signs|Crew agreement on working channels, terminology, backups and loss-of-contact action before moving.|pilot4
pre-move|Pre-move briefing|tailgate meeting pretrip meeting|Crew review of route, load, permits, hazards, roles, stopping places and communications.|pilot4
abort-plan|Stop / abort plan|loss of radio safe stopping emergency plan|Agreed response to unsafe conditions or lost communication; arrange lawful stopping and required coordination.|pilot4
escort-spacing|Escort spacing|lead distance chase distance|Separation governed by conditions and permit/jurisdiction requirements; there is no universal spacing number.|pilot5
intersection|Intersection and turn coordination|turn setup lane closure|Coordinate the authorized maneuver with needed personnel; do not improvise public-road closures.|pilot5,mutcd
rolling-block|Rolling roadblock / traffic break|rolling closure block traffic|Traffic-management operation requiring appropriate authority and planning, not a routine pilot-car privilege.|pilot5,mutcd
steerman|Steerman / tillerman|rear steer remote steer|Person controlling steerable transport equipment; determine task-specific training and role conflicts separately from escort credentials.|pilot5,ut-pilot
spotter|Spotter|backing guide ground guide|Person communicating close-clearance or backing observations; maintain agreed signals and safe positioning.|pilot5
route-deviation|Route deviation warning|off route wrong turn|An alert that the reviewed path may have been left; verify safely and obtain required route-change authority.|oh-provisions,pilot3
post-move|Post-move review|after-action report posttrip|Crew review of the movement, issues and records for follow-up; retain required trip evidence.|pilot6
`
};
export const GLOSSARY = Object.entries(groups).flatMap(([category,text]) => text.trim().split('\n').filter(Boolean).map(row => {
  const [id,title,aliases,summary,sources] = row.split('|');
  return { id: 'term-' + id.toLowerCase(), type: 'term', category, jurisdiction: 'US', title, aliases: aliases.split(' '), summary, sources: sources.split(','), related: [] };
}));
const related = { 'term-osow':['term-nondivisible','term-authorized-route','term-superload'], 'term-placard':['term-label','term-hazard-class','term-limited-quantity'], 'term-high-pole':['term-clearance','term-utility-coordination','term-route-survey'], 'term-hos':['term-eld','term-rods','term-curfew'], 'term-reciprocity':['term-escort-certification','term-pevo'], 'term-hrcq':['term-class7','term-route-plan'], 'term-gvw':['term-gvwr','term-axle-weight','term-bridge-formula'] };
for (const entry of GLOSSARY) entry.related = related[entry.id] || [];
