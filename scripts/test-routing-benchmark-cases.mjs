import test from'node:test';
import assert from'node:assert/strict';
import{routingBenchmarkCases}from'./routing-benchmark-cases.mjs';
import{validateTruckProfile}from'../src/assets/routing/core.mjs';

const ids=new Set();
test('routing benchmark has unique exact-address cases and valid truck profiles',()=>{
 assert.ok(routingBenchmarkCases.length>=20);
 for(const item of routingBenchmarkCases){
  assert.match(item.id,/^[a-z0-9-]+$/);assert.equal(ids.has(item.id),false,`duplicate ${item.id}`);ids.add(item.id);
  assert.ok(item.origin.includes(','),`${item.id} origin must be an exact-address candidate`);
  assert.ok(item.destination.includes(','),`${item.id} destination must be an exact-address candidate`);
  assert.equal(validateTruckProfile(item.profile).ready,true,`${item.id} invalid profile`);
  assert.equal(item.profile.permittedLoad,false,`${item.id} cannot benchmark issued-permit routing as ordinary truck routing`);
 }
});

test('critical benchmark covers known parkway, tunnel, hazmat and tall-vehicle risks',()=>{
 const critical=routingBenchmarkCases.filter(item=>item.tier==='critical');
 assert.ok(critical.length>=10);
 const roads=critical.flatMap(item=>item.forbiddenRoads).join(' | ').toLowerCase();
 for(const expected of['belt parkway','storrow drive','george washington memorial parkway','baltimore-washington parkway','allegheny mountain tunnel'])assert.ok(roads.includes(expected),`missing ${expected}`);
 assert.ok(critical.some(item=>item.profile.hazmatCategories.length));
 assert.ok(critical.some(item=>item.profile.heightFt>=14));
 assert.ok(critical.some(item=>item.profile.trailerCount>1));
});

test('benchmark includes broad national corridor diversity',()=>{
 const text=routingBenchmarkCases.map(item=>`${item.origin} ${item.destination}`).join(' ');
 for(const state of['TX','CA','IL','WA','FL','AZ','MI','GA','CO'])assert.match(text,new RegExp(`\\b${state}\\b`));
});
