import {measuredAxlesFixture} from './truck-axles.mjs';
export const formProfile=()=>({'vehicle-preset':'custom','truck-height-ft':'13','truck-height-in':'6','truck-width-ft':'8','truck-width-in':'6','truck-length':'72','trailer-length':'53','truck-weight':'78000','truck-axles':'5','kingpin-rear-axle':'40','trailer-type':'semi-53',oversize:false,hazmat:false});
export const formDraft=()=>({kind:'individual',configuration:'tractor-semitrailer',loadReference:'synthetic-load-1',localTime:'2026-10-13T04:00',offset:'-06:00',confirmed:true,
 axles:measuredAxlesFixture().axles.map(x=>({positionIn:String(x.positionIn),weightLb:String(x.weightLb)}))});
