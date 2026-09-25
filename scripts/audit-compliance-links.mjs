import { readFile, writeFile } from 'node:fs/promises';
import { SOURCES } from '../src/assets/compliance/sources.mjs';
// Read-only link audit; never part of the offline unit-test suite. An HTTP 200
// is reachability evidence, not verification of rule applicability or currency.
const destination = process.argv[2];
if (!destination) throw Error('Supply a local JSON output path for the public-link audit.');
let previous=[];
if(process.argv[3]==='--retry')try{previous=JSON.parse(await readFile(destination,'utf8'));}catch{}
const results=previous.filter(r=>SOURCES[r.id]?.url===r.url&&r.status>=200&&r.status<400);
const pending=Object.values(SOURCES).filter(s=>!results.some(r=>r.id===s.id));
async function worker() {
  while (pending.length) {
    const source = pending.shift();
    try {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'DriversLoungeReferenceLinkCheck/1.0' } });
      const body = await response.text();
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      results.push({ id: source.id, status: response.status, url: source.url, finalURL: response.url, title, checkedAt: new Date().toISOString() });
    } catch (e) { results.push({ id: source.id, url: source.url, error: e.message, checkedAt: new Date().toISOString() }); }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
// Some authorities return an access-request HTML page with HTTP 200.
// Keep that distinct from retrieval of the requested reference.
for(const r of results)r.accessLimited=/unblock\.federalregister\.gov/i.test(r.finalURL||'')||/request access|access denied|just a moment/i.test(r.title||'')||[401,403,429].includes(r.status);
await writeFile(destination, JSON.stringify(results.sort((a,b)=>a.id.localeCompare(b.id)), null, 2));
console.log(JSON.stringify({ checked: results.length, retrievedResponse: results.filter(r=>r.status>=200&&r.status<400&&!r.accessLimited).length, accessLimited:results.filter(r=>r.accessLimited).length, errors:results.filter(r=>!r.status||r.status>=400&&!r.accessLimited).map(r=>({id:r.id,status:r.status,error:r.error})) }));
