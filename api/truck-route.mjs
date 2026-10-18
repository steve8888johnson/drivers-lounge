import{normalizeHereRoute,toHereVehicleParams,validateTruckProfile}from'../src/assets/routing/core.mjs';
import{normalizeTomTomRoute,toTomTomVehicleParams}from'../src/assets/routing/tomtom.mjs';

const send=(res,status,body)=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};
const validCoordinate=value=>Number.isFinite(Number(value))&&Math.abs(Number(value))<=180;
const envKey=name=>String(process.env[name]||'').trim();
const environmentProvider=()=>{
 const here=envKey('TRUCK_ROUTING_HERE_API_KEY')||envKey('HERE_API_KEY');if(here)return{id:'here',key:here,label:'HERE Routing API v8'};
 const tomtom=envKey('TRUCK_ROUTING_TOMTOM_API_KEY')||envKey('TOMTOM_API_KEY');if(tomtom)return{id:'tomtom',key:tomtom,label:'TomTom Routing API v1'};
 return null;
};
const providerFromOptions=({provider,apiKey}={})=>{
 if(apiKey!==undefined){const key=String(apiKey||'').trim();if(!key)return null;return{id:provider==='tomtom'?'tomtom':'here',key,label:provider==='tomtom'?'TomTom Routing API v1':'HERE Routing API v8'};}
 if(provider){const id=provider==='tomtom'?'tomtom':'here',key=id==='tomtom'?(envKey('TRUCK_ROUTING_TOMTOM_API_KEY')||envKey('TOMTOM_API_KEY')):(envKey('TRUCK_ROUTING_HERE_API_KEY')||envKey('HERE_API_KEY'));return key?{id,key,label:id==='tomtom'?'TomTom Routing API v1':'HERE Routing API v8'}:null;}
 return environmentProvider();
};

async function readJsonBody(req,limit=16384){
 let body=req.body;
 if(body&&typeof body==='object')return body;
 let raw=typeof body==='string'?body:'';
 if(!raw){for await(const chunk of req){raw+=chunk;if(raw.length>limit)throw Error('Request too large.')}}
 if(raw.length>limit)throw Error('Request too large.');
 return JSON.parse(raw||'{}');
}

async function resolveHereStop(query,provider,fetcher){
 const url=new URL('https://geocode.search.hereapi.com/v1/geocode');
 url.searchParams.set('q',query);url.searchParams.set('limit','1');url.searchParams.set('lang','en-US');url.searchParams.set('in','countryCode:USA');url.searchParams.set('apiKey',provider.key);
 const response=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json','X-Request-ID':crypto.randomUUID()}});
 if(!response.ok)throw Error(response.status===429?'The commercial location service is busy. Wait and try again.':'The commercial location service could not resolve that stop.');
 const payload=await response.json(),item=payload?.items?.[0],position=item?.access?.[0]||item?.position;
 if(!position||!validCoordinate(position.lat)||!validCoordinate(position.lng))throw Error(`Could not locate ${query}. Add a full address, city and state, or set the map pin.`);
 const confidence=Number(item?.scoring?.queryScore??item?.scoring?.fieldScore?.city??1);
 return{lat:Number(position.lat),lng:Number(position.lng),label:String(item.title||item.address?.label||query).slice(0,220),resultType:String(item.resultType||'address'),confidence:Number.isFinite(confidence)?confidence:1,id:String(item.id||'')};
}

async function resolveTomTomStop(query,provider,fetcher){
 const url=new URL(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json`);
 url.searchParams.set('key',provider.key);url.searchParams.set('limit','1');url.searchParams.set('countrySet','US');url.searchParams.set('language','en-US');
 const response=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json','Tracking-ID':crypto.randomUUID()}});
 if(!response.ok)throw Error(response.status===429?'The commercial location service is busy. Wait and try again.':'The commercial location fallback could not resolve that stop.');
 const payload=await response.json(),item=payload?.results?.[0],position=item?.entryPoints?.[0]?.position||item?.position;
 if(!position||!validCoordinate(position.lat)||!validCoordinate(position.lon))throw Error(`Could not locate ${query}. Add a full address, city and state, or set the map pin.`);
 const confidence=Number(item?.matchConfidence?.score??1);
 return{lat:Number(position.lat),lng:Number(position.lon),label:String(item.address?.freeformAddress||query).slice(0,220),resultType:String(item.type||'address'),confidence:Number.isFinite(confidence)?confidence:1,id:String(item.id||'')};
}

export async function resolveTruckStop(stop,providerOrKey,fetcher=fetch){
 if(stop&&validCoordinate(stop.lat)&&validCoordinate(stop.lng)&&Math.abs(Number(stop.lat))<=90)return{lat:Number(stop.lat),lng:Number(stop.lng),label:String(stop.label||`${stop.lat}, ${stop.lng}`).slice(0,180),resultType:'coordinate',confidence:1};
 const query=String(stop?.address||stop?.label||stop||'').trim();
 if(query.length<3||query.length>300)throw Error('Enter a more specific origin and destination.');
 const provider=typeof providerOrKey==='string'?{id:'here',key:providerOrKey,label:'HERE Routing API v8'}:providerOrKey;
 if(!provider?.key)throw Error('Commercial truck routing is not configured yet.');
 return provider.id==='tomtom'?resolveTomTomStop(query,provider,fetcher):resolveHereStop(query,provider,fetcher);
}

export function buildHereRouteURL({origin,destination,profile,departureTime},apiKey){
 const validation=validateTruckProfile(profile);if(!validation.ready)throw Error(validation.errors[0]);
 const url=new URL('https://router.hereapi.com/v8/routes');
 const params={
  transportMode:'truck',routingMode:validation.profile.routePreference,origin:`${origin.lat},${origin.lng}`,destination:`${destination.lat},${destination.lng}`,
  return:'polyline,summary,travelSummary,turnByTurnActions,incidents,truckRoadTypes,potentialTimeDependentViolations,noThroughRestrictions,routeLabels',
  spans:'truckAttributes,streetAttributes,maxSpeed,segmentRef,length,countryCode,truckRoadTypes,incidents',
  units:'imperial',lang:'en-US',alternatives:'2',billingTag:'DLRT',apiKey
 };
 if(departureTime){const parsed=new Date(departureTime);if(!Number.isNaN(parsed.valueOf()))params.departureTime=parsed.toISOString();}
 for(const[key,value]of Object.entries(params))url.searchParams.set(key,String(value));
 for(const[key,value]of Object.entries(toHereVehicleParams(validation.profile)))url.searchParams.set(key,value);
 const avoid=['dirtRoad','uTurns'];if(validation.profile.avoidTolls)avoid.push('tollRoad');url.searchParams.set('avoid[features]',avoid.join(','));
 return url;
}

export function buildTomTomRouteURL({origin,destination,profile,departureTime},apiKey){
 const validation=validateTruckProfile(profile);if(!validation.ready)throw Error(validation.errors[0]);
 const vehicle=toTomTomVehicleParams(validation.profile);
 const url=new URL(`https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json`);
 const params={
  key:apiKey,
  travelMode:'truck',
  routeType:validation.profile.routePreference==='short'?'shortest':'fastest',
  traffic:'true',
  routeRepresentation:'polyline',
  instructionsType:'text',
  instructionAnnouncementPoints:'all',
  instructionRoadShieldReferences:'all',
  language:'en-US',
  maxAlternatives:'0',
  report:'effectiveSettings'
 };
 if(departureTime){const parsed=new Date(departureTime);if(!Number.isNaN(parsed.valueOf()))params.departAt=parsed.toISOString();}
 for(const[key,value]of Object.entries(params))url.searchParams.set(key,String(value));
 for(const[key,value]of Object.entries(vehicle.params))url.searchParams.set(key,value);
 for(const type of vehicle.loadTypes)url.searchParams.append('vehicleLoadType',type);
 url.searchParams.append('avoid','unpavedRoads');if(validation.profile.avoidTolls)url.searchParams.append('avoid','tollRoads');
 for(const type of['lanes','speedLimit','traffic'])url.searchParams.append('sectionType',type);
 return url;
}

async function requestJson(url,provider,fetcher){
 const headers={Accept:'application/json'};
 if(provider.id==='here')headers['X-Request-ID']=crypto.randomUUID();else headers['Tracking-ID']=crypto.randomUUID();
 const response=await fetcher(url,{signal:AbortSignal.timeout(25000),headers});
 let payload={};try{payload=await response.json()}catch{throw Object.assign(Error('The commercial routing provider returned an unreadable response.'),{statusCode:502})}
 if(!response.ok){
  const detail=payload?.title||payload?.cause||payload?.error_description||payload?.detailedError?.message||payload?.error?.description||payload?.message;
  throw Object.assign(Error(detail||'Commercial route calculation failed.'),{statusCode:response.status===429?429:502});
 }
 return payload;
}

export async function calculateTruckRoute(input,{fetcher=fetch,apiKey,provider}={}){
 const selected=providerFromOptions({provider,apiKey});if(!selected)throw Object.assign(Error('Commercial truck routing is not configured yet.'),{statusCode:503});
 const validation=validateTruckProfile(input?.profile);if(!validation.ready)throw Object.assign(Error(validation.errors[0]),{statusCode:422});
 const[origin,destination]=await Promise.all([resolveTruckStop(input?.origin,selected,fetcher),resolveTruckStop(input?.destination,selected,fetcher)]);
 if(origin.confidence<0.7||destination.confidence<0.7)throw Object.assign(Error('One stop matched with low confidence. Add a full street address or confirm the map pin before routing.'),{statusCode:422});
 if(selected.id==='tomtom'){
  const vehicle=toTomTomVehicleParams(validation.profile),url=buildTomTomRouteURL({origin,destination,profile:validation.profile,departureTime:input?.departureTime},selected.key);
  const route=normalizeTomTomRoute(await requestJson(url,selected,fetcher),validation.profile);
  return{route,origin,destination,profileWarnings:[...validation.warnings,...vehicle.warnings]};
 }
 const url=buildHereRouteURL({origin,destination,profile:validation.profile,departureTime:input?.departureTime},selected.key);
 const route=normalizeHereRoute(await requestJson(url,selected,fetcher),validation.profile);
 return{route,origin,destination,profileWarnings:validation.warnings};
}

export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST.'});}
 const originHeader=req.headers.origin,host=req.headers.host;let sameOrigin=false;
 try{sameOrigin=!originHeader||new URL(originHeader).host===host}catch{/* Reject malformed origin. */}
 if(!sameOrigin)return send(res,403,{error:'Same-origin request required.'});
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Send JSON.'});
 if(Number(req.headers['content-length']||0)>16384)return send(res,413,{error:'Request too large.'});
 try{return send(res,200,await calculateTruckRoute(await readJsonBody(req)))}
 catch(error){const message=error?.name==='TimeoutError'||error?.name==='AbortError'?'The commercial routing service timed out. No route was accepted.':String(error?.message||'Unable to calculate route.');return send(res,Number(error?.statusCode)||(/Unexpected token|JSON/.test(message)?400:422),{error:message});}
}
