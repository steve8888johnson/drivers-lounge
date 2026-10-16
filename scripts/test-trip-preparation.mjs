import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import 'fake-indexeddb/auto';
import { blankTrip, buildMaster } from '../src/assets/permits/core.mjs';
import { applyPlanningHandoff, preparationStatus } from '../src/assets/permits/preparation.mjs';
import { saveTrip, listTrips, exportPacket, importPacket, deleteTrip } from '../src/assets/permits/storage.mjs';
const context = {}; vm.runInNewContext(readFileSync('src/assets/trip-preparation.js','utf8'), context);
const model = context.DLTripPreparation;
const storage = () => { const values = new Map(); return { getItem: key => values.get(key), setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) }; };

test('trip review identifies missing or identical places without claiming a route', () => {
  assert.equal(model.review({origin:'  ',destination:''}).issues.length,2);
  assert.equal(model.review({origin:'Draper, Utah',destination:'draper, utah'}).issues.length,1);
  const result = model.review({origin:'Draper, Utah',destination:'Brunswick, Georgia'});
  assert.equal(result.issues.length,0); assert.equal(result.guidanceAllowed,false); assert.equal(result.service,'NOT_CONNECTED');
  assert.equal(model.normalize({origin:{malicious:true},destination:'x'.repeat(1000)}).origin,'');
  assert.equal(model.normalize({destination:'x'.repeat(1000)}).destination.length,300);
});
test('session persistence handles denied storage, malformed data, clearing and expired location labels', () => {
  const s = storage(); model.save(s,{origin:'Draper',destination:'Brunswick'});
  assert.equal(model.load(s).origin,'Draper'); assert.equal(model.load(s).destination,'Brunswick');
  model.save(s,{origin:'Current location',destination:'Brunswick'}); assert.equal(model.load(s).origin,'');
  model.clear(s); assert.equal(model.load(s).destination,'');
  for (const raw of ['{bad','null','[]','x'.repeat(4001)]) { s.setItem(model.key,raw); assert.equal(model.load(s).origin,''); }
  const denied = {getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}};
  assert.equal(model.save(denied,{}),false); assert.equal(model.load(denied).origin,''); assert.equal(model.clear(denied),false);
});
test('permit handoff does not invent dimensions, travel date, state chain or clearance', () => {
  const trip = applyPlanningHandoff(blankTrip(),{origin:'Draper, Utah',destination:'Brunswick, Georgia'});
  assert.equal(trip.name,'Draper, Utah → Brunswick, Georgia'); assert.equal(trip.departure,'');
  assert.equal(trip.profile.heightFt,''); assert.equal(trip.acknowledged,false); assert.equal(trip.permits.length,0);
  const status = preparationStatus(trip); assert.equal(status.guidanceAllowed,false);
  assert(status.pending.includes('actual loaded dimensions, weight and axle count'));
  const master = buildMaster(trip,{geometry:true}); assert.equal(master.ready,false); assert.equal(master.segments.length,0);
});
test('incomplete permit draft survives device save and export/import without gaining review', async () => {
  const trip = applyPlanningHandoff(blankTrip(),{origin:'Draper, Utah',destination:'Brunswick, Georgia'});
  await saveTrip(trip);
  const saved = (await listTrips()).find(value=>value.id===trip.id);
  assert.deepEqual(saved.planning,trip.planning); assert.equal(buildMaster(saved,{geometry:true}).ready,false);
  const packet = await exportPacket(saved), imported = await importPacket(packet);
  assert.deepEqual(imported.planning,trip.planning); assert.equal(imported.profile.widthFt,'');
  assert.equal(imported.acknowledged,false); assert.equal(buildMaster(imported,{geometry:true}).ready,false);
  await deleteTrip(trip); await deleteTrip(imported);
});
test('legacy packets without places remain importable and overlong places are bounded', async () => {
  const trip = blankTrip(); delete trip.planning;
  const legacy = await importPacket({schema:'dl-permit-packet/v1',trip,documents:[]});
  assert.deepEqual(legacy.planning,{origin:'',destination:''});
  trip.planning={origin:'A'.repeat(500),destination:{secret:'not text'}};
  const bounded = await importPacket({schema:'dl-permit-packet/v1',trip,documents:[]});
  assert.equal(bounded.planning.origin.length,300); assert.equal(bounded.planning.destination,'');
  await deleteTrip(legacy); await deleteTrip(bounded);
});
test('UI review and Enter consume the event without network work; changed text and truck invalidate review', () => {
  const elements = new Map(); const get = id => {
    if (!elements.has(id)) elements.set(id,{value:'',handlers:{},textContent:'',addEventListener(event,fn){this.handlers[event]=fn},focus(){this.focused=true}});
    return elements.get(id);
  };
  let confirmed=true,networkCalls=0;
  vm.runInNewContext(readFileSync('src/assets/trip-preparation-ui.js','utf8'),{
    window:{DLTripPreparation:model,DLTruckFirst:{isConfirmed:()=>confirmed}},
    document:{getElementById:get,querySelectorAll:()=>[]},sessionStorage:storage(),fetch(){networkCalls++;}
  });
  get('origin').value='<script>test</script>';get('destination').value='Brunswick';
  const event={key:'Enter',preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
  get('destination').handlers.keydown(event);
  assert.equal(event.prevented,true); assert.equal(event.stopped,true); assert.equal(networkCalls,0);
  assert.match(get('trip-review-summary').textContent,/<script>test<\/script>/); // textContent, never HTML.
  assert.match(get('route-status').textContent,/not connected/); assert.equal(get('route-evidence').open,true);
  get('origin').handlers.input(); assert.match(get('trip-review-summary').textContent,/Trip changed/);
  confirmed=false;get('calculate-route').handlers.click(event); assert.match(get('trip-review-summary').textContent,/Trip changed/);
  get('clear-trip-draft').handlers.click();assert.equal(get('origin').value,'');assert.equal(get('destination').value,'');
});
