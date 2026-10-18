const AUDIT_VERSION='2026-10-18.1';
const NYC_BOUNDS={south:40.48,west:-74.30,north:40.95,east:-73.65};
const BOSTON_BOUNDS={south:42.24,west:-71.24,north:42.45,east:-70.95};
const BALTIMORE_BOUNDS={south:39.14,west:-76.82,north:39.42,east:-76.42};

const SOURCES=Object.freeze({
  nyc:{agency:'New York City Department of Transportation',title:'Parkway Truck Restrictions',url:'https://www.nyc.gov/html/dot/html/motorist/parkway-restrictions.shtml',verified:'2026-10-18'},
  boston:{agency:'Massachusetts Department of Conservation and Recreation',title:'Storrowing public-awareness guidance',url:'https://www.mass.gov/news/dcr-launches-annual-storrowing-public-awareness-campaign-ahead-of-move-in-day-in-greater-boston',verified:'2026-10-18'},
  baltimore:{agency:'Maryland Transportation Authority',title:'Harbor Crossings hazardous-material and vehicle restrictions',url:'https://mdta.maryland.gov/HarborCrossings',verified:'2026-10-18'}
});

const finite=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback};
const positive=(value,fallback=0)=>Math.max(0,finite(value,fallback));
const fold=value=>String(value||'').toLowerCase().replace(/&/g,' and ').replace(/[.'’`-]/g,' ').replace(/\s+/g,' ').trim();
const contains=(value,needles)=>needles.some(needle=>value.includes(needle));
const pointInBounds=(point,bounds)=>Array.isArray(point)&&point.length>=2&&finite(point[0],999)>=bounds.south&&finite(point[0],-999)<=bounds.north&&finite(point[1],999)>=bounds.west&&finite(point[1],-999)<=bounds.east;
const routeEnters=(route,bounds)=>Array.isArray(route?.geometry)&&route.geometry.some(point=>pointInBounds(point,bounds));
const criticalNotice=(code,title,sourceId,road)=>({code,title,severity:'critical',blocking:true,sourceId,road});
const warningNotice=(code,title,sourceId='')=>({code,title,severity:'warning',blocking:false,sourceId});

const NYC_ABSOLUTE=[
  'belt parkway','f d r drive','fdr drive','franklin d roosevelt drive','henry hudson parkway','cross island parkway',
  'jackie robinson parkway','bronx river parkway','hutchinson river parkway','mosholu parkway','pelham parkway',
  'ocean parkway','korean war veterans parkway','korean war veterans memorial parkway','harlem river drive'
];
const BOSTON_RIVER_ROADS=['storrow drive','storrow dr','soldiers field road','soldiers field rd','memorial drive','memorial dr'];
const BALTIMORE_TUNNELS=['fort mchenry tunnel','baltimore harbor tunnel','harbor tunnel thruway'];
const I895=['i 895','interstate 895'];

function namedRoadCoverage(route){
  const steps=Array.isArray(route?.steps)?route.steps:[];
  const routeDistance=positive(route?.distanceMeters);
  let total=0,named=0,namedSteps=0;
  for(const step of steps){
    const length=positive(step?.lengthMeters);total+=length;
    if(fold(step?.road)){named+=length;namedSteps++;}
  }
  const denominator=routeDistance||total;
  if(denominator>0&&total>0)return Math.max(0,Math.min(1,named/denominator));
  return steps.length?namedSteps/steps.length:0;
}

function uniqueMatches(matches){
  const seen=new Set();return matches.filter(match=>{const key=`${match.code}|${match.road}`;if(seen.has(key))return false;seen.add(key);return true;});
}

export function auditCommercialRoute(route,profile={}){
  const inNYC=routeEnters(route,NYC_BOUNDS),inBoston=routeEnters(route,BOSTON_BOUNDS),inBaltimore=routeEnters(route,BALTIMORE_BOUNDS);
  const relevantSources=[];if(inNYC)relevantSources.push('nyc');if(inBoston)relevantSources.push('boston');if(inBaltimore)relevantSources.push('baltimore');
  const matches=[];
  for(const step of route?.steps||[]){
    const roadRaw=String(step?.road||'').trim(),road=fold(roadRaw);if(!road)continue;
    if(inNYC&&contains(road,NYC_ABSOLUTE))matches.push(criticalNotice('officialCommercialRoadProhibition',`Independent audit matched a New York City roadway that prohibits commercial vehicles: ${roadRaw}.`,'nyc',roadRaw));
    if(inNYC&&road.includes('grand central parkway'))matches.push(criticalNotice('officialCommercialRoadProhibition',`Grand Central Parkway has a narrow single-unit exception that this route candidate cannot prove. Guidance is blocked pending manual segment verification: ${roadRaw}.`,'nyc',roadRaw));
    if(inBoston&&contains(road,BOSTON_RIVER_ROADS))matches.push(criticalNotice('officialLowClearanceTruckProhibition',`Independent audit matched a Boston river road restricted to cars because of low clearances: ${roadRaw}.`,'boston',roadRaw));
    if(inBaltimore&&contains(road,BALTIMORE_TUNNELS)&&Array.isArray(profile?.hazmatCategories)&&profile.hazmatCategories.length)matches.push(criticalNotice('officialHazmatTunnelProhibition',`Independent audit matched a Baltimore harbor tunnel while hazardous materials are selected: ${roadRaw}.`,'baltimore',roadRaw));
    const i895Restricted=positive(profile?.widthInches)>96||positive(profile?.heightInches)>162||positive(profile?.trailerCount)>1||Boolean(profile?.hazmatCategories?.length);
    if(inBaltimore&&i895Restricted&&(contains(road,BALTIMORE_TUNNELS)||contains(road,I895)))matches.push(criticalNotice('officialBaltimoreTunnelVehicleRestriction',`Independent audit cannot clear this vehicle for the I-895 Baltimore Harbor Tunnel corridor: ${roadRaw}.`,'baltimore',roadRaw));
  }
  const unique=uniqueMatches(matches),coverage=namedRoadCoverage(route),notices=[...unique];
  if(relevantSources.length&&coverage<0.5)notices.push(criticalNotice('independentAuditCoverageInsufficient',`Only ${Math.round(coverage*100)}% of the route distance had named-road guidance inside a high-risk audit region. The independent road check is incomplete, so guidance is blocked.`,'',''));
  else if(relevantSources.length&&coverage<0.8)notices.push(warningNotice('independentAuditCoverageLimited',`Independent official-road audit coverage is limited to approximately ${Math.round(coverage*100)}% of route distance. Review every unnamed segment while parked.`));
  const critical=notices.filter(item=>item.severity==='critical');
  return{
    version:AUDIT_VERSION,
    checkedAt:new Date().toISOString(),
    status:critical.length?'blocked':relevantSources.length&&coverage<0.8?'review':'clear',
    namedRoadCoveragePct:Math.round(coverage*100),
    regions:{newYorkCity:inNYC,boston:inBoston,baltimore:inBaltimore},
    sources:relevantSources.map(id=>({id,...SOURCES[id]})),
    matchedRules:unique,
    notices,
    criticalNotices:critical
  };
}

export function applyCommercialRouteAudit(route,profile={}){
  const audit=auditCommercialRoute(route,profile),notices=[...(route?.notices||[]),...audit.notices];
  const criticalNotices=notices.filter(item=>item.severity==='critical'||item.blocking===true);
  return{
    ...route,
    notices,
    criticalNotices,
    independentAudit:audit,
    guidanceEligible:Boolean(route?.guidanceEligible)&&criticalNotices.length===0
  };
}

export const officialRestrictionSources=SOURCES;
