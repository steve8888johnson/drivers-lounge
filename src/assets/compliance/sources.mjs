import { STATE_DIRECTORY } from './states.mjs';
export const EDITION = '2026-09-25';
export const CATEGORIES = { standard: 'Standard freight', oversize: 'Oversize / overweight', hazmat: 'Hazmat', pilot: 'Pilot cars', general: 'Agencies & documents' };
const source = (id, label, url, kind = 'regulation', note = '') => ({ id, label, url, kind, note, indexedOn: EDITION });
const motor = 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-';
const hazmat = 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-';
const sources = [
  source('fmcsa', 'FMCSA regulation and interpretation index', 'https://www.fmcsa.dot.gov/regulations/search', 'directory'),
  source('phmsa', 'PHMSA regulations and interpretations', 'https://www.phmsa.dot.gov/regulations', 'directory'),
  source('fhwa-permits', 'FHWA state OS/OW permit directory', 'https://ops.fhwa.dot.gov/freight/sw/permit_report/index.htm', 'directory', 'State contact directory; follow through to current state provisions.'),
  source('size', 'FHWA federal size regulations', 'https://ops.fhwa.dot.gov/freight/publications/size_regs_final_rpt/index.htm', 'guidance'),
  source('bridge', 'FHWA bridge formula weights', 'https://ops.fhwa.dot.gov/freight/publications/brdg_frm_wghts/index.htm', 'guidance'),
  source('658', '23 CFR Part 658 — truck size, weight and network', 'https://www.ecfr.gov/current/title-23/chapter-I/subchapter-G/part-658'),
  source('registry', 'FMCSA National Hazardous Materials Route Registry', 'https://www.fmcsa.dot.gov/regulations/hazardous-materials/national-hazardous-materials-route-registry-state', 'directory', 'Absence of an entry is not route clearance. Check current state, tribal and local restrictions.'),
  source('cameo', 'NOAA/EPA CAMEO Chemicals', 'https://cameochemicals.noaa.gov/about', 'reference', 'Chemical planning/response reference; not a routing authority or shipping classification service.'),
  source('erg', 'PHMSA Emergency Response Guidebook', 'https://www.phmsa.dot.gov/training/hazmat/erg/emergency-response-guidebook-erg', 'reference', 'Initial incident-response reference. This library does not reproduce response instructions.'),
  source('mutcd', 'FHWA Manual on Uniform Traffic Control Devices', 'https://mutcd.fhwa.dot.gov/', 'standard', 'Use the current applicable edition and state supplement; a pilot-car certificate alone does not grant traffic-control authority.'),
  source('40', '49 CFR Part 40 — testing procedures', 'https://www.ecfr.gov/current/title-49/subtitle-A/part-40'),
  source('107', '49 CFR Part 107 — hazmat program procedures', 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-A/part-107'),
  source('tsa', 'TSA hazardous materials endorsement', 'https://www.tsa.gov/for-industry/hazmat-endorsement', 'guidance'),
  source('irp', 'International Registration Plan', 'https://www.irponline.org/', 'program', 'Official program resource; base-jurisdiction procedures apply. Automated access was unavailable when indexed; contact your base jurisdiction if the site cannot be opened.'),
  source('ifta', 'International Fuel Tax Association', 'https://www.iftach.org/', 'program', 'Official program resource; verify base-jurisdiction filing rules.'),
  source('ucr', 'Unified Carrier Registration', 'https://www.ucr.gov/', 'program'),
  source('oh-provisions', 'Ohio OS-1A special hauling provisions', 'https://haulingpermits.transportation.ohio.gov/OS1A.pdf', 'state provisions', 'Published form carries a revision date. Compare it with the provisions issued with the actual permit.'),
  source('oh-notices', 'Ohio hauling permit announcements', 'https://haulingpermits.transportation.ohio.gov/Login.aspx', 'state notices'),
  source('il-provisions', 'Illinois OPER 993 permit provisions', 'https://idot.illinois.gov/content/dam/soi/en/web/idot/documents/idot-forms/oper/oper-993.pdf', 'state provisions'),
  source('il-rules', 'Illinois Administrative Code, Title 92 Part 554', 'https://www.ilga.gov/commission/jcar/admincode/092/09200554sections.html', 'state regulation', 'Automated access was unavailable when indexed. The Illinois permit-program link also provides rules and provisions; verify the current text there if this link fails.'),
  source('in-provisions', 'Indiana M-204 general permit provisions', 'https://www.in.gov/dor/motor-carrier-services/files/M-204.pdf', 'state provisions'),
  source('in-forms', 'Indiana motor carrier forms and special provisions', 'https://www.in.gov/dor/tax-forms/other-forms/motor-carrier-forms-and-applications/', 'state directory'),
  source('ny-pilot', 'New York MV-65 escort certification', 'https://dmv.ny.gov/forms/mv65.pdf', 'state program'),
  source('wa-pilot', 'Washington pilot / escort requirements', 'https://wsdot.wa.gov/travel/commercial-vehicles/commercial-vehicle-permits/pilot-escort-vehicle', 'state program'),
  source('ut-pilot', 'Utah pilot / escort program', 'https://connect.udot.utah.gov/business/motor-carriers/size-weight-permitting/pilot-escort-requirements-training-and-certifications/', 'state program'),
  source('va-pilot', 'Virginia escort driver certification and reciprocity', 'https://www.dmv.virginia.gov/licenses-ids/training/escrt', 'state program'),
  source('nc-pilot', 'North Carolina escort certification instructions', 'https://connect.ncdot.gov/business/trucking/Documents/General%20Information%20and%20Instructions.pdf', 'state program')
];
for (const [part, title] of [[365,'Operating authority'],[366,'Process agents'],[367,'State registration'],[373,'Receipts and bills'],[376,'Equipment leasing'],[380,'Special training / ELDT'],[382,'Drug and alcohol testing'],[383,'Commercial driver licensing'],[385,'Safety fitness / hazmat safety permits'],[387,'Financial responsibility'],[390,'Applicability and definitions'],[391,'Driver qualifications'],[392,'Driving commercial vehicles'],[393,'Equipment and cargo securement'],[395,'Hours of service'],[396,'Inspection and maintenance'],[397,'Hazmat driving, parking and routing']]) sources.push(source(String(part), `49 CFR Part ${part} — ${title}`, motor + part));
for (const [part,title] of [[171,'General requirements and definitions'],[172,'Hazmat table and hazard communication'],[173,'Classification and packaging'],[177,'Highway carriage'],[178,'Packaging specifications'],[180,'Packaging maintenance and requalification']]) sources.push(source(String(part), `49 CFR Part ${part} — ${title}`, hazmat + part));
for (const [id,part,section,label] of [
  ['hmt',172,'172.101','Hazardous Materials Table'],['shipping',172,'172.202','Shipping description'],['marking',172,'172.301','Package marking'],['labels',172,'172.400','Labels'],['placards',172,'172.504','Placarding'],['emergency',172,'172.602','Emergency response information'],['contact',172,'172.604','Emergency telephone'],['training',172,'172.704','Hazmat training'],['security',172,'172.800','Security plans'],['segregation',177,'177.848','Segregation'],['loading',177,'177.834','Loading and unloading'],['residue',173,'173.29','Empty packagings'],['radioactive',173,'173.403','Radioactive definitions'],['limited',173,'173.150','Class 3 exceptions'],['explosives',173,'173.50','Explosives classes'],['gas',173,'173.115','Gas classes'],['flammable',173,'173.120','Flammable liquids'],['solid',173,'173.124','Class 4 materials'],['oxidizer',173,'173.127','Oxidizers'],['peroxide',173,'173.128','Organic peroxides'],['toxic',173,'173.132','Toxic materials'],['infectious',173,'173.134','Infectious substances'],['corrosive',173,'173.136','Corrosive materials'],['class9',173,'173.140','Class 9 materials']
]) sources.push(source(id, `49 CFR ${section} — ${label}`, `${hazmat}${part}/section-${section}`));
for (let n=1;n<=6;n++) sources.push(source(`pilot${n}`, `FHWA pilot / escort training — module ${n}`, `https://ops.fhwa.dot.gov/publications/fhwahop16050/m${n}.htm`, 'guidance', '2017 training guidance; current jurisdiction rules and permit conditions govern.'));
for (const s of STATE_DIRECTORY) {
  sources.push(source(`state-${s.code}`, `${s.name} — official permits and provisions`, s.permit, 'state directory', 'FHWA directory with updated agency links. Confirm current legal limits, road jurisdiction and permit conditions with the issuing office.'+(s.code==='CO'?' Automated access was unavailable when indexed; use the FHWA contact directory if this site cannot be opened.':'')));
  sources.push(source(`hazmat-${s.code}`, `${s.name} — FMCSA hazmat route registry`, s.hazmat, 'state route directory', 'Registry publication may predate this index. Check current state/tribal/local restrictions and exceptions.'));
}
export const SOURCES = Object.fromEntries(sources.map(s=>[s.id,s]));
