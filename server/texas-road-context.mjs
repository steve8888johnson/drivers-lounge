import { TXDOT_ROADWAYS } from '../src/assets/permits/issuer-span-check.mjs';
import { validateContextRequest, readRoadContext } from '../src/assets/permits/junction-evidence.mjs';
export async function loadRoadContext(raw,fetcher=fetch) {
  const q=validateContextRequest(raw),params=new URLSearchParams({f:'json',where:`RTE_PRFX = '${q.prefix}' AND RTE_NBR = '${q.number}'`,geometryType:'esriGeometryEnvelope',geometry:q.bounds.join(','),inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'OBJECTID,RTE_NM,RTE_PRFX,RTE_NBR,RDBD_TYPE,EXT_DATE',returnGeometry:'true',resultRecordCount:'80'});
  const r=await fetcher(TXDOT_ROADWAYS+'/query?'+params,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
  if(!r.ok||!/application\/json/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw Error('Road inventory unavailable. The saved permit map is unchanged.');}
  const reader=r.body.getReader(),chunks=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;if((size+=part.value.byteLength)>2000000)throw Error('Road inventory exceeds comparison limit.');chunks.push(part.value);}}finally{await reader.cancel();}
  return readRoadContext(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await new Blob(chunks).arrayBuffer())),q);
}
