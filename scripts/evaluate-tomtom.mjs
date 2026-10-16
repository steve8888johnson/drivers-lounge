import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {requestTomTomCandidate} from '../server/tomtom-routing.mjs';
import {vehicleFixture,equipmentFixture} from './fixtures/truck-axles.mjs';

const projectId='prj_WABuJ8HC4AVK1h2FC4Y8LyrblDPW';
const starts=Date.parse('2026-10-14T15:00:00Z'), expires=Date.parse('2026-10-14T18:00:00Z');
const summary=(reason,extra={})=>({evaluation:'synthetic-standard-truck-connection-only',status:'HOLD',guidanceAllowed:false,requests:0,httpStatus:null,reasons:[reason],...extra});

// Build-only, short-lived evaluation. No HTTP endpoint, public report or owner
// trip input. A process can perform at most one request, including on failure.
export function createTomTomEvaluation({env=process.env,clock=Date.now,fetchImpl=fetch}={}) {
 let used=false;
 return async function run({freeAccountVerified=false,oneRequestApproved=false}={}) {
  if(used)return summary('EVALUATION_ALREADY_USED');
  used=true;
  if(env.VERCEL_ENV!=='preview'||env.VERCEL_PROJECT_ID!==projectId)return summary('PREVIEW_PROJECT_REQUIRED');
  const now=clock();
  if(!Number.isFinite(now)||now<starts||now>=expires)return summary('EVALUATION_WINDOW_CLOSED');
  if(freeAccountVerified!==true||oneRequestApproved!==true)return summary('EXPLICIT_FREE_EVALUATION_REQUIRED');
  if(typeof env.TOMTOM_API_KEY!=='string'||!env.TOMTOM_API_KEY.trim())return summary('PROVIDER_NOT_CONFIGURED');
  // The dashboard's key ID is metadata, not the credential. Do not send a known
  // ID mistake to the provider or print any supplied value.
  if(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(env.TOMTOM_API_KEY.trim()))return summary('KEY_ID_INSTEAD_OF_SECRET');
  const vehicle=vehicleFixture();
  vehicle.axleMeasurement.measuredAt=new Date(now-60000).toISOString();
  vehicle.equipment=equipmentFixture(vehicle.axleMeasurement);
  const departure=new Date(Math.ceil(now/60000)*60000+3600000).toISOString();
  // Public city-center coordinates, arbitrary synthetic benchmark. These are
  // not Steve's pickup, delivery, GPS location or an authorized truck entrance.
  const input={vehicle,origin:{lat:34.0522,lng:-118.2437},destination:{lat:32.7157,lng:-117.1611},departure};
  let requests=0,httpStatus=null;
  const result=await requestTomTomCandidate(input,{
   enabled:true,freePlanVerified:true,apiKey:env.TOMTOM_API_KEY,clock,
   fetchImpl:async(url,options)=>{
    if(requests!==0)throw Error('Request limit');
    requests++;
    const response=await fetchImpl(url,options);httpStatus=response.status;return response;
   }
  });
  // Only fixed diagnostic codes leave the build. No response geometry, route
  // directions, request URL, headers, provider messages, key or environment dump.
  return summary('REVIEW_REQUIRED',{requests,httpStatus,structurePassed:result.structurePassed===true,reasons:result.reasons.map(item=>item.code)});
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let result;
 try{
  const flags=process.argv.slice(2);
  result=await createTomTomEvaluation()({freeAccountVerified:flags.length===2&&flags.includes('--free-account-verified'),oneRequestApproved:flags.length===2&&flags.includes('--one-request')});
 }catch{result=summary('EVALUATION_FAILED');}
 console.log('TOMTOM_EVALUATION_RESULT '+JSON.stringify(result));
 if(result.httpStatus!==200||result.requests!==1)process.exitCode=1;
 else{
  await mkdir('evaluation-output',{recursive:true});
  await writeFile('evaluation-output/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Private integration test</title><p>Connection test completed. Results are in the private project build log. This is not a navigation service.</p></html>');
 }
}
