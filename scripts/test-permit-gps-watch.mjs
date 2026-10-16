import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuidanceWatch } from '../src/assets/permits/gps-watch.mjs';

const time=Date.parse('2026-10-14T18:00:00Z');
const position=(stamp=time,accuracy=5)=>({timestamp:stamp,coords:{latitude:40,longitude:-100,accuracy}});
function harness(options={}) {
  let wall=time, mono=0, current=true, seq=0;
  const pending=new Map(), callbacks=[], cleared=[], fixes=[], holds=[];
  const geo={watchPosition(success,error,settings){callbacks.push({success,error,settings});if(options.immediateError)error({code:1});if(options.throwStart)throw Error('synthetic');return callbacks.length-1;},clearWatch(id){cleared.push(id);}};
  const watch=createGuidanceWatch({geolocation:geo,now:()=>wall,monotonic:()=>mono,isCurrent:()=>current,onFix:fix=>{fixes.push(fix);return options.accept!==false;},onHold:message=>holds.push(message),setTimer:fn=>{pending.set(++seq,fn);return seq;},clearTimer:id=>pending.delete(id)});
  return{watch,callbacks,cleared,fixes,holds,pending,tick(ms){wall+=ms;mono+=ms;},wall(ms){wall+=ms;},poll(){for(const fn of [...pending.values()])fn();},invalidate(){current=false;}};
}
test('GPS failure ends the watch and a later successful callback cannot resume it',()=>{
  const h=harness();assert(h.watch.start());const c=h.callbacks[0];c.success(position());assert.equal(h.fixes.length,1);
  c.error({code:2});assert(!h.watch.active);assert.equal(h.holds.length,1);assert.deepEqual(h.cleared,[0]);assert.equal(h.pending.size,0);
  h.tick(1000);c.success(position(time+1000));c.error({code:2});assert.equal(h.fixes.length,1);assert.equal(h.holds.length,1);
  assert(h.watch.start());c.success(position(time+1000));assert.equal(h.fixes.length,1);
  h.callbacks[1].success(position(time+1000));assert.equal(h.fixes.length,2);assert.equal(h.callbacks[1].settings.maximumAge,0);
});
test('silence before the first fix and after accepted fixes ends guidance at the freshness deadline',()=>{
  for(const hasFix of [false,true]){const h=harness();h.watch.start();if(hasFix)h.callbacks[0].success(position());h.tick(15000);h.poll();assert(!h.watch.active);assert.equal(h.holds.length,1);assert.equal(h.pending.size,0);h.callbacks[0].success(position(time+15000));assert.equal(h.fixes.length,hasFix?1:0);}
});
test('a fresh callback after a suspended timer cannot conceal lost GPS continuity',()=>{
  const h=harness();h.watch.start();h.callbacks[0].success(position());h.tick(16000);h.callbacks[0].success(position(time+16000));
  assert(!h.watch.active);assert.equal(h.fixes.length,1);assert.match(h.holds[0],/continuity/);
});
test('stale, inaccurate, future, invalid and out-of-order samples stop without forwarding',()=>{
  for(const bad of [position(time-15000),position(time,51),position(time+6000),null,{timestamp:time,coords:{latitude:91,longitude:0,accuracy:5}}]) {const h=harness();h.watch.start();h.callbacks[0].success(bad);assert.equal(h.fixes.length,0);assert(!h.watch.active);assert.equal(h.holds.length,1);}
  const h=harness();h.watch.start();h.callbacks[0].success(position());h.tick(100);h.callbacks[0].success(position());assert.equal(h.fixes.length,1);assert(!h.watch.active);
});
test('a changed session, zero watch ID, manual stop and late callbacks clear safely',()=>{
  const h=harness();h.watch.start();h.invalidate();h.callbacks[0].success(position());assert.equal(h.fixes.length,0);assert.deepEqual(h.cleared,[0]);assert(!h.watch.active);
  const next=harness();next.watch.start();next.watch.stop();next.callbacks[0].success(position());assert.equal(next.fixes.length,0);assert.equal(next.pending.size,0);
});
test('synchronous permission failure and thrown watch startup never leave an active watch or timer',()=>{
  const denied=harness({immediateError:true});assert(!denied.watch.start());assert.deepEqual(denied.cleared,[0]);assert.equal(denied.pending.size,0);assert.equal(denied.holds.length,1);
  const thrown=harness({throwStart:true});assert(!thrown.watch.start());assert.equal(thrown.pending.size,0);assert.equal(thrown.holds.length,1);
});
test('a rejected route fix ends the watcher without automatically retrying',()=>{
  const h=harness({accept:false});h.watch.start();h.callbacks[0].success(position());assert(!h.watch.active);assert.equal(h.pending.size,0);h.callbacks[0].success(position(time+1000));assert.equal(h.fixes.length,1);
});
test('clock rollback cannot hide a long real-time GPS gap',()=>{
  const h=harness();h.watch.start();h.callbacks[0].success(position());h.tick(16000);h.wall(-16000);h.poll();assert(!h.watch.active);assert.equal(h.holds.length,1);
});
test('regular fresh fixes keep the watch active without an early timeout',()=>{
  const h=harness();h.watch.start();
  for(let seconds=1;seconds<=30;seconds++){h.tick(1000);h.callbacks[0].success(position(time+seconds*1000));h.poll();assert(h.watch.active);}
  assert.equal(h.fixes.length,30);assert.equal(h.holds.length,0);
});
test('a throwing trip check fails closed both at startup and during a running session',()=>{
  for(const atStart of [true,false]) {
    let fail=atStart, callback, cleared=0;const holds=[];
    const watch=createGuidanceWatch({geolocation:{watchPosition(fn){callback=fn;return 0;},clearWatch(){cleared++;}},isCurrent:()=>{if(fail)throw Error('synthetic');return true;},onFix:()=>assert.fail('must not forward'),onHold:m=>holds.push(m),setTimer:()=>1,clearTimer:()=>{}});
    assert.equal(watch.start(),!atStart);fail=true;if(callback)callback(position());
    assert(!watch.active);assert.equal(holds.length,1);assert.equal(cleared,atStart?0:1);
  }
});
