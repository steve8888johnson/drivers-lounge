import{normalizeHereRoute,toHereVehicleParams,validateTruckProfile}from'../src/assets/routing/core.mjs';

const send=(res,status,body)=>{res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.statusCode=status;res.end(JSON.stringify(body));};
const validCoordinate=value=>Number.isFinite(Number(value))&&Math.abs(Number(value))<=180;
const requestKey=()=>String(process.env.TRUCK_ROUTING_HERE_API_KEY||process.env.HERE_API_KEY||'').trim();

async function readJsonBody(req,limit=16384){
 let body=req.body;
 if(body&&typeof body==='object')return body;
 let raw=typeof body==='string'?body:'';
 if(!raw){for await(const chunk of req){raw+=chunk;if(raw.length>limit)throw Error('Request too large.')}}
 if(raw.length>limit)throw Error('Request too large.');
 return JSON.parse(raw||'{}');
}

export async function resolveTruckStop(stop,apiKey,fetcher=fetch){
 if(stop&&validCoordinate(stop.lat)&&validCoordinate(stop.lng)&&Math.abs(Number(stop.lat))<=90){return{lat:Number(stop.lat),lng:Number(stop.lng),label:String(stop.label||`${stop.lat}, ${stop.lng}`).slice(0,180),resultType:'coordinate',confidence:1};}
 const query=String(stop?.address||stop?.label||stop||'').trim();
 if(query.length<3||query.length>300)throw Error('Enter a more specific origin and destination.');
 const url=new URL('https://geocode.search.hereapi.com/v1/geocode');
 url.searchParams.set('q',query);url.searchParams.set('limit','1');url.searchParams.set('lang','en-US');url.searchParams.set('apiKey',apiKey);
 const response=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(response.status===429?'The commercial location service is busy. Wait and try again.':'The commercial location service could not resolve that stop.');
 const payload=await response.json(),item=payload?.items?.[0],position=item?.access?.[0]||item?.position;
 if(!position||!validCoordinate(position.lat)||!validCoordinate(position.lng))throw Error(`Could not locate ${query}. Add a full address, city and state, or set the map pin.`);
 const confidence=Number(item?.scoring?.queryScore??item?.scoring?.fieldScore?.city??1);
 return{lat:Number(position.lat),lng:Number(position.lng),label:String(item.title||item.address?.label||query).slice(0,220),resultType:String(item.resultType||'address'),confidence:Number.isFinite(confidence)?confidence:1,id:String(item.id||'')};
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
 if(validation.profile.avoidTolls)url.searchParams.set('avoid[features]','tollRoad');
 return url;
}

export async function calculateTruckRoute(input,{fetcher=fetch,apiKey=requestKey()}={}){
 if(!apiKey)throw Object.assign(Error('Commercial truck routing is not configured yet.'),{statusCode:503});
 const validation=validateTruckProfile(input?.profile);if(!validation.ready)throw Object.assign(Error(validation.errors[0]),{statusCode:422});
 const[origin,destination]=await Promise.all([resolveTruckStop(input?.origin,apiKey,fetcher),resolveTruckStop(input?.destination,apiKey,fetcher)]);
 if(origin.confidence<0.7||destination.confidence<0.7)throw Object.assign(Error('One stop matched with low confidence. Add a full street address or confirm the map pin before routing.'),{statusCode:422});
 const url=buildHereRouteURL({origin,destination,profile:validation.profile,departureTime:input?.departureTime},apiKey);
 const response=await fetcher(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','X-Request-ID':crypto.randomUUID()}});
 let payload={};try{payload=await response.json()}catch{throw Object.assign(Error('The commercial routing provider returned an unreadable response.'),{statusCode:502})}
 if(!response.ok){const detail=payload?.title||payload?.cause||payload?.error_description;throw Object.assign(Error(detail||'Commercial route calculation failed.'),{statusCode:response.status===429?429:502});}
 const route=normalizeHereRoute(payload,validation.profile);
 return{route,origin,destination,profileWarnings:validation.warnings};
}

export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST.'});}
 const originHeader=req.headers.origin,host=req.headers.host;let sameOrigin=false;
 try{sameOrigin=!originHeader||new URL(originHeader).host===host}catch{/* Reject malformed origin. */}
 if(!sameOrigin)return send(res,403,{error:'Same-origin request required.'});
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Send JSON.'});
 if(Number(req.headers['content-length']||0)>16384)return send(res,413,{error:'Request too large.'});
 try{return send(res,200,await calculateTruckRoute(await readJsonBody(req)));}
 catch(error){const message=error?.name==='TimeoutError'||error?.name==='AbortError'?'The commercial routing service timed out. No route was accepted.':String(error?.message||'Unable to calculate route.');return send(res,Number(error?.statusCode)||(/Unexpected token|JSON/.test(message)?400:422),{error:message});}
}
