import { GLOSSARY } from './glossary.mjs';
import { RULES } from './rules.mjs';
import { SOURCES, CATEGORIES } from './sources.mjs';
import { STATE_DIRECTORY } from './states.mjs';
export { SOURCES, CATEGORIES, STATE_DIRECTORY };
export const STATE_CHECKLISTS = {
  standard: 'Verify state intrastate safety rules, legal dimensions and weights, axle spacing, registration/fuel-tax requirements, truck routes and local or toll-road restrictions.',
  oversize: 'Verify permit eligibility, exact route and amendments, measurements/axle configuration, surveys, bridge conditions, curfews, holidays, weather and local approvals.',
  hazmat: 'Verify designated/prohibited roads, tunnels, parking, material and quantity exceptions, written route-plan requirements, and current state, tribal, local and facility restrictions.',
  pilot: 'Verify required number and placement of escorts, certification/reciprocity, insurance, equipment/signs/lights, high-pole requirements, flagger authority and police or utility coordination.'
};
export const STATE_ENTRIES = STATE_DIRECTORY.map(s => ({
  id:`state-${s.code.toLowerCase()}`,type:'state',category:'all',jurisdiction:s.code,title:`${s.name} — state reference desk`,
  aliases:[s.code,s.name,'DOT','standard','oversize','overweight','hazmat','pilot','escort','regulations'],
  summary:'Start with these official resources, then confirm the current rule, road jurisdiction and issued permit conditions. This desk is a directory and review checklist; it does not publish a complete state rulebook.',
  sources:[`state-${s.code}`,`hazmat-${s.code}`,'fhwa-permits','fmcsa'],related:RULES.filter(r=>r.jurisdiction===s.code).map(r=>r.id)
}));
export const ENTRIES = [...GLOSSARY,...RULES,...STATE_ENTRIES].sort((a,b)=>a.title.localeCompare(b.title));
export const BY_ID = new Map(ENTRIES.map(e=>[e.id,e]));
export const COUNTS = {terms:GLOSSARY.length,rules:RULES.length,states:STATE_ENTRIES.length,sources:Object.keys(SOURCES).length};
export const normalize = text => String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(\d)([a-z])/g,'$1 $2').replace(/([a-z])(\d)/g,'$1 $2').replace(/[^a-z0-9]+/g,' ').trim();
const searchText = e => [e.id.replace(/^(term|rule|state)-/,''),e.title,...(e.aliases||[]),e.citation||'',e.summary,CATEGORIES[e.category]||'',e.jurisdiction,STATE_DIRECTORY.find(s=>s.code===e.jurisdiction)?.name||'',...(e.sources||[]).map(id=>SOURCES[id]?.label||''),...(e.type==='state'?Object.values(STATE_CHECKLISTS):[])].join(' ');
const searchIndex = new Map(ENTRIES.map(e=>[e.id,normalize(searchText(e)).split(' ')]));
export function readFilters(search='') {
  const p = new URLSearchParams(search);
  return {q:(p.get('q')||'').slice(0,200),category:Object.hasOwn(CATEGORIES,p.get('category'))?p.get('category'):'all',
    state:STATE_DIRECTORY.some(s=>s.code===p.get('state'))||p.get('state')==='US'?p.get('state'):'all',
    type:['term','rule','state'].includes(p.get('type'))?p.get('type'):'all',letter:/^[A-Z]$/.test(p.get('letter')||'')?p.get('letter'):'',saved:p.get('saved')==='1'};
}
export function filterQuery(filters) {
  const p = new URLSearchParams();
  for(const key of ['q','category','state','type','letter']) if(filters[key]&&filters[key]!=='all')p.set(key,filters[key]);
  if(filters.saved)p.set('saved','1');
  return p.size?'?'+p.toString():'';
}
export function findEntries(filters={},saved=[]) {
  const tokens = normalize(filters.q).split(' ').filter(Boolean), savedSet=new Set(saved);
  const results=ENTRIES.filter(e=>{
    if(filters.category&&filters.category!=='all'&&e.category!==filters.category&&e.type!=='state')return false;
    if(filters.state&&filters.state!=='all'&&e.jurisdiction!==filters.state&&e.jurisdiction!=='US')return false;
    if(filters.state==='US'&&e.jurisdiction!=='US')return false;
    if(filters.type&&filters.type!=='all'&&e.type!==filters.type)return false;
    if(filters.saved&&!savedSet.has(e.id))return false;
    if(filters.letter&&!e.title.toUpperCase().startsWith(filters.letter))return false;
    const doc=searchIndex.get(e.id);
    return tokens.every(t=>doc.some(word=>word.startsWith(t)));
  });
  if(tokens.length){
    const query=normalize(filters.q), score=e=>{
      const title=normalize(e.title), aliases=(e.aliases||[]).map(normalize);
      return (title===query?1000:0)+(normalize(e.id.replace(/^(term|rule|state)-/,''))===query?500:0)+(aliases.includes(query)?400:0)+(title.startsWith(query)?200:0)+tokens.filter(t=>title.split(' ').some(word=>word.startsWith(t))).length*30;
    };
    results.sort((a,b)=>score(b)-score(a)||a.title.localeCompare(b.title));
  }
  return results;
}
export function cleanBookmarks(value) {return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&BY_ID.has(id)))]:[];}
export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sourceURL(id) {const u=new URL(SOURCES[id].url);if(u.protocol!=='https:')throw Error('Sources must use HTTPS');return u.href;}
