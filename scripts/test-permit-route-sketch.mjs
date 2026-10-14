import test from 'node:test';
import assert from 'node:assert/strict';
import { routeSketch } from '../src/assets/permits/route-sketch.mjs';

function fixture() {
  const steps=[{points:[[40,-100],[40,-99.99]]},{points:[[40,-99.95],[40,-99.8]]}];
  return {ready:true,geometryChecked:true,permits:[{id:'synthetic',state:'UT',steps}],segments:steps.map((step,stepIndex)=>({a:step.points[0],b:step.points[1],permitId:'synthetic',stepIndex,step}))};
}
test('overview and selected-turn views highlight exactly the selected supplied instruction',()=>{
  const m=fixture(), overview=routeSketch(m,0), focus=routeSketch(m,0,true), second=routeSketch(m,1,true);
  assert(overview.selectable);assert(!overview.focused);assert(focus.focused);
  assert.equal((focus.markup.match(/data-selected-maneuver/g)||[]).length,1);
  assert.notEqual(focus.markup,overview.markup);assert.notEqual(focus.markup,second.markup);
  assert.match(focus.caption,/maneuver 1 of 2/);assert.match(second.caption,/maneuver 2 of 2/);
  assert.match(focus.caption,/does not confirm arrival/);
});
test('unreviewed geometry and unsaved edits cannot focus or highlight a turn',()=>{
  for(const m of [{...fixture(),ready:false},{...fixture(),geometryChecked:false}]){const s=routeSketch(m,0,true);assert(!s.selectable);assert(!s.focused);assert(!s.markup.includes('data-selected-maneuver'));assert.match(s.caption,/needs review/);}
  assert(!routeSketch(fixture(),0,true,false).selectable);
});
test('a missing geometry gap remains disconnected, never a new connector line',()=>{
  const m=fixture();m.ready=false;
  const sketch=routeSketch(m);
  const lines=[...sketch.markup.matchAll(/<polyline[^>]*points="([^"]+)"/g)];
  assert.equal(lines.length,2);assert(lines.every(line=>line[1].split(' ').length===2));
  assert.notEqual(lines[0][1].split(' ')[1],lines[1][1].split(' ')[0]);
});
test('empty or invalid supplied segments never produce nonfinite map coordinates',()=>{
  for(const m of [null,{...fixture(),segments:[]},{...fixture(),segments:[{a:[NaN,0],b:[40,-100]}]}]) {const s=routeSketch(m,0,true);assert(!s.selectable);assert(!s.markup.includes('NaN'));assert.match(s.caption,/No GPS position/);}
});
test('permit text is escaped in the sketch title and selection is bounded',()=>{
  const m=fixture();m.permits[0].state='<script>alert(1)</script>';
  const s=routeSketch(m,999,true);assert(!s.markup.includes('<script>'));assert(s.markup.includes('&lt;script&gt;'));assert.match(s.caption,/maneuver 2 of 2/);
});
