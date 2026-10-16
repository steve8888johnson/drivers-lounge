import { TXDOT_ROADWAYS, sparseSpanQueries, matchInventorySpan } from '../src/assets/permits/issuer-span-check.mjs';
// At most two bounded, read-only public inventory queries. No permit IDs, text,
// cookies or API keys are forwarded. Optional evidence cannot block QR import.
export async function addTexasSpanEvidence(permit,fetcher=fetch) {
  const map=permit.issuerMap,queries=sparseSpanQueries(map.paths[0],map.rows);if(!queries.length)return permit;
  const evidence=[],signal=AbortSignal.timeout(5000);let incomplete=false;
  for(const query of queries)try {
    if(signal.aborted){incomplete=true;break;}
    const lat=query.original.map(p=>p[0]),lon=query.original.map(p=>p[1]);
    const params=new URLSearchParams({f:'json',where:`RTE_NM LIKE '${query.family}-%' AND RDBD_TYPE IN ('Single Roadbed','Left Roadbed','Right Roadbed')`,geometryType:'esriGeometryEnvelope',geometry:[Math.min(...lon)-.002,Math.min(...lat)-.002,Math.max(...lon)+.002,Math.max(...lat)+.002].join(','),inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'OBJECTID,RTE_NM,RDBD_TYPE,EXT_DATE',returnGeometry:'true',resultRecordCount:'80'});
    const response=await fetcher(TXDOT_ROADWAYS+'/query?'+params,{redirect:'error',credentials:'omit',signal,headers:{Accept:'application/json'}});
    if(!response.ok||!/json/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Inventory unavailable');}
    const reader=response.body.getReader(),chunks=[];let bytes=0;
    try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>2000000)throw Error('Inventory too large');chunks.push(part.value);}}finally{await reader.cancel();}
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await new Blob(chunks).arrayBuffer()));
    const match=matchInventorySpan(query,data,new Date().toISOString());if(match)evidence.push(match);else incomplete=true;
  }catch{incomplete=true;}
  return {...permit,issuerMap:{...map,format:'txpros-issuer-map/v3',spanEvidence:evidence,spanCheckNote:incomplete?'Some sparse spans could not be uniquely compared with detailed TxDOT geometry.':'Available inventory comparisons check drawing agreement only, not clearance or permission.'}};
}
