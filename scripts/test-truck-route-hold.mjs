import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/assets/navigation-v5.js','utf8');
test('unvalidated routing rejects without calling a route service',async()=>{
 let requests=0;
 const body=source.slice(source.indexOf('async function routing('),source.indexOf('const ft='));
 const context=vm.createContext({requestJson(){requests++;return {routes:[{}]}}});
 vm.runInContext(body,context);
 await assert.rejects(context.routing({lat:1,lng:2},{lat:3,lng:4}),/unavailable/);
 assert.equal(requests,0);
});
test('Enter-key calculation cannot geocode, expose directions or draw a route',async()=>{
 let stopped=0,hidden=0,message='';
 const body=source.slice(source.indexOf('async function calc('),source.indexOf('const toRad='));
 const context=vm.createContext({activeRoute:{old:true},showTruckReadiness(){},stopInAppNavigation(){stopped++},syncGeneralNavigation(){hidden++},toast(m){message=m}});
 vm.runInContext(body,context);
 await context.calc();
 assert.equal(context.activeRoute,null);assert.equal(stopped,1);assert.equal(hidden,1);assert.match(message,/No car-route fallback/);
});
