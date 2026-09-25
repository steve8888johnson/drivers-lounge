// Reference index, not a route-approval or compliance-decision engine.
const federal = {
standard: `
applicability|Applicability, definitions and exemptions|49 CFR Part 390|Start with the operation and vehicle definitions. Interstate status, cargo and exceptions determine which requirements apply. State intrastate rules need a separate check.|390
authority|Carrier authority, process agents and registration|49 CFR Parts 365, 366, 367|Check the carrier's operating authority, process-agent designation and applicable registration obligations before accepting the movement.|365,366,367,ucr
insurance|Financial responsibility|49 CFR Part 387|Required financial responsibility depends on the carrier, operation and cargo. A permit's insurance requirements may be additional.|387
qualifications|Driver qualifications and medical certification|49 CFR Part 391|Review qualification, medical, recordkeeping and exception provisions for the driver and operation.|391
licensing|CDL, endorsements and restrictions|49 CFR Part 383|Match the driver credential to the vehicle and cargo. Tank, hazardous-material, combination and air-brake issues require their own checks.|383,tsa
training|Entry-level driver training and testing programs|49 CFR Parts 380, 382; Part 40|Training applicability, drug/alcohol program obligations and testing procedures are separate requirements with specific exceptions.|380,382,40
driving|Safe operation and driver responsibilities|49 CFR Part 392|Index for vehicle condition, cargo checks, weather, railroad crossings, distracted driving and other operating duties.|392
equipment|Vehicle equipment and emergency devices|49 CFR Part 393|Check brakes, tires, lights, coupling devices and emergency equipment. Vehicle equipment compliance does not establish route clearance.|393
securement|Cargo securement and commodity-specific rules|49 CFR Part 393, Subpart I|Apply general restraint requirements and the applicable commodity provisions. Tiedown count, arrangement and working-load calculations need the actual cargo details.|393
hos|Hours of service, ELDs and records|49 CFR Part 395|Determine applicable driving/on-duty limits, breaks, records and exceptions. A permit travel window does not extend the driver's legal hours.|395
maintenance|Inspection, repair and maintenance|49 CFR Part 396|Index for inspection reports, defect correction, periodic inspections and records. Resolve unsafe conditions before operation.|396
fitness|Safety fitness and out-of-service consequences|49 CFR Part 385|Safety fitness and operating prohibitions are separate from having a load permit or current registration.|385
leasing|Leased equipment and shipment records|49 CFR Parts 373, 376|Review applicable receipts, bills, lease terms and responsibility requirements for the transportation arrangement.|373,376
registration|IRP, IFTA and UCR|Registration and tax programs|Use official program resources and the base jurisdiction to check apportioned registration, fuel-tax and carrier-registration obligations and exceptions.|irp,ifta,ucr
network|Legal size, configuration and reasonable access|23 CFR Part 658|Federal dimension protections depend on vehicle configuration and the covered network. State height, local access and route restrictions remain separate checks.|658,size
weights|Gross, axle, bridge-formula and posted weights|23 CFR Part 658|Check every applicable weight constraint, including axle groups and spacing. A legal gross weight alone does not establish a legal combination.|658,bridge
`,
oversize: `
permits|OS/OW permits and nondivisible-load eligibility|23 CFR Part 658; state permit programs|States issue movement authorizations under their applicable rules. Determine eligibility and obtain every required road-authority approval before travel.|658,fhwa-permits
route|Issued route, amendments and road jurisdiction|State permit conditions|Preserve the issued route and its attachments. A navigation suggestion, road closure or missed turn does not authorize a replacement route.|oh-provisions,il-provisions,in-provisions
time|Travel windows, holidays and weather restrictions|State provisions and notices|Check each permit's dates, time zone, daylight definition, curfews, holidays and weather restrictions for the actual departure.|oh-notices,oh-provisions,il-provisions
survey|Route surveys, structures and utilities|Permit requirements; survey guidance|Check required surveys, bridge conditions, turning room and overhead coordination. A reviewed map or height pole does not certify clearance.|pilot3,bridge
`,
hazmat: `
hm-applicability|Hazmat applicability, definitions and special permits|49 CFR Parts 107, 171|Determine regulated functions, material status and applicable exceptions. A DOT special permit for hazardous materials is different from an OS/OW movement permit.|107,171
classification|Hazard classification, proper shipping name and packaging|49 CFR 172.101; Part 173|The responsible offeror must determine the correct classification, description, packaging and exceptions from the current requirements and shipment facts.|hmt,173
shipping|Shipping papers and accessibility|49 CFR 172.200–205; 177.817|Review the required description, additional information, certification where applicable, retention and in-vehicle accessibility requirements.|172,177
communication|Marks, labels and placards|49 CFR Part 172, Subparts D, E, F|These are distinct requirements. Quantity, hazard class, package and exceptions affect which apply; a placard decision is not a routing decision.|marking,labels,placards
response|Emergency information and emergency telephone|49 CFR 172.600–606|Check shipment-specific response information and the required emergency-contact arrangements. CAMEO and ERG are supporting references, not substitutes for required documents.|172,emergency,contact,erg,cameo
hm-training|Hazmat employee training and security awareness|49 CFR 172.700–704|Training must address the regulated functions performed, including applicable safety and security topics and required records.|training
security|Security plans and in-depth security training|49 CFR 172.800–822|Determine whether the cargo and quantities trigger a security plan and related training; do not assume all hazmat shipments have identical requirements.|172,security
handling|Highway loading, unloading and segregation|49 CFR Part 177|Review highway carriage, package handling, attendance and incompatible-material separation requirements for all materials on board.|177,loading,segregation
packages|Packaging specifications and requalification|49 CFR Parts 173, 178, 180|Packaging authorization, specifications and ongoing maintenance/requalification depend on the material and packaging type.|173,178,180
residue|Residue, empty packaging and limited-quantity exceptions|49 CFR 173.29; class-specific exceptions|An empty container or small shipment is not automatically unregulated. Apply the actual exception conditions before changing documents, marking or operations.|residue,173
hm-permit|FMCSA Hazardous Materials Safety Permit|49 CFR Part 385, Subpart E|Certain material/quantity combinations require a carrier safety permit and associated operating conditions. This is separate from an endorsement and PHMSA registration.|385,107
hm-driving|Hazmat driving, parking, attendance and smoking|49 CFR Part 397, Subpart A|Review material-specific driving and stopping restrictions, attendance and other operating duties along with Part 392.|397,392
hm-routing|Hazmat routes, tunnels and local restrictions|49 CFR Part 397, Subparts C and D|Use the route registry and current state, tribal, local and facility requirements. Check non-radioactive and radioactive routing provisions separately.|397,registry
hm-route-plan|Written route plans and highway-route-controlled quantities|49 CFR 397.67, 397.101; 173.403|Determine whether the shipment requires a written route plan, preferred routes or related instructions; requirements depend on material and quantity.|397,radioactive
hm-response-tools|CAMEO Chemicals and Emergency Response Guidebook|NOAA/EPA and PHMSA references|CAMEO supports chemical information and planning; ERG supports initial incident response. Neither approves a highway route or replaces the offeror's classification.|cameo,erg
`,
pilot: `
pilot-credentials|Escort certification, reciprocity and insurance|State programs and permit conditions|Confirm credentials, recognition of out-of-state training, insurance and renewal for every state. There is no universal credential implied by a trip invitation.|ny-pilot,wa-pilot,va-pilot,ut-pilot
pilot-equipment|Escort vehicle, signs, lights and safety equipment|Jurisdiction requirements; FHWA guidance|Verify the current vehicle/equipment checklist for each jurisdiction and permit. A kit compliant in one state may need additions in another.|pilot2,wa-pilot
pilot-plan|Lead, chase, high-pole and pre-move planning|Permit conditions; FHWA training guidance|Review roles, route survey, communications and safe-stop plans with the crew. Assignments and placement follow the permit and applicable rules.|pilot3,pilot4,pilot5
pilot-traffic|Flagging, traffic control and rolling closures|Applicable MUTCD edition and state requirements|Check authorization and training for traffic control. Pilot-car status alone does not authorize blocking traffic or moving utilities.|mutcd,pilot5
pilot-records|Post-move review and records|FHWA training guidance|Record route issues and movement results; retain documents required by the permit, employer and jurisdiction.|pilot6
`
};
export const RULES = Object.entries(federal).flatMap(([category, text]) => text.trim().split('\n').map(row => {
  const [id,title,citation,summary,refs] = row.split('|');
  return {id:`rule-${id}`,type:'rule',category,jurisdiction:'US',title,citation,summary,sources:refs.split(','),related:[]};
}));
const stateRules = `
OH|oversize|oh-conditions|Ohio — issued route and general provisions|OS-1A and current permit|Read the original permit with its general and special provisions. Confirm route, travel windows, road conditions and escort requirements against the issued documents.|oh-provisions,oh-notices
IL|oversize|il-conditions|Illinois — state permit scope and attachments|92 Ill. Adm. Code Part 554; OPER 993|Use the current Illinois rules and permit attachments. Check the authorized roads and any separate local approvals, movement restrictions and escort conditions.|il-rules,il-provisions,state-IL
IN|oversize|in-conditions|Indiana — general and special provisions|M-204 and M-204S|Review the current general provisions and applicable special provisions with the actual permit. Confirm required documents, escorts and route restrictions.|in-provisions,in-forms
NY|pilot|ny-certification|New York — escort driver certification|DMV MV-65|Use the New York application/instructions for eligibility, examination, credential and renewal requirements before escort work.|ny-pilot
WA|pilot|wa-certification|Washington — pilot/escort program|WAC 468-38-100 and WSDOT program|Review certification, recognized credentials, vehicle/equipment standards and operating requirements through the official program.|wa-pilot
UT|pilot|ut-certification|Utah — pilot/escort training and requirements|UDOT pilot/escort program|Check current training, certification and operating requirements, including the state's rules for the assigned escort task.|ut-pilot
VA|pilot|va-certification|Virginia — escort certification and reciprocity|DMV escort driver program|Confirm certification or recognition eligibility and applicable restrictions using the current program instructions.|va-pilot
NC|pilot|nc-certification|North Carolina — escort certification|NCDOT certification instructions|Check the official program's initial and renewal process, eligibility and credential conditions before accepting an escort assignment.|nc-pilot
OR|pilot|or-operations|Oregon — pilot placement, flaggers and route attachments|ODOT Over-Dimension Operations|Use applicable route maps and permit attachments to determine escort placement and flagging requirements. Review recognized flagger credentials and additional traffic-control authorization.|state-OR
ME|oversize|me-jurisdiction|Maine — overlimit and separate road authorities|BMV Overlimit Permits|Review BMV provisions and the authorities for turnpike and local roads. A state permit does not automatically settle every road authority's requirements.|state-ME
LA|oversize|la-program|Louisiana — truck permit rules and notices|DOTD Oversize and Overweight Truck Permits|Use the current regulations book and program notices for load eligibility, route approval, movement conditions and escort requirements.|state-LA
PA|oversize|pa-program|Pennsylvania — hauling permits and route review|PennDOT hauling permits|Use the permit program for current applications, conditions, route-review materials and urbanized-area restrictions.|state-PA
`;
for (const row of stateRules.trim().split('\n')) {
  const [jurisdiction,category,id,title,citation,summary,refs] = row.split('|');
  RULES.push({id:`rule-${id}`,type:'rule',category,jurisdiction,title,citation,summary,sources:refs.split(','),related:[]});
}
