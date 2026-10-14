(function(root){
 'use strict';
 const fields={standard:['truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle','trailer-type'],permit:['heightFt','widthFt','lengthFt','weightLb','axles']};
 let owner=null;
 const accountValues=new Map();
 const accountStore={getItem:key=>accountValues.get(key)||null,setItem:(key,value)=>accountValues.set(key,value),removeItem:key=>accountValues.delete(key)};
 const key=kind=>'dl-saved-setup-v1-'+kind;
 const store=storage=>owner?accountStore:storage;
 function clean(kind,value){
  if(!fields[kind]||!value||typeof value!=='object'||Array.isArray(value))return null;
  const result={};
  for(const field of fields[kind]){const v=value[field];if(typeof v!=='string'||v.length>80)return null;result[field]=v.trim();}
  return result;
 }
 function read(storage,kind,requireReady){try{const record=JSON.parse(store(storage)?.getItem(key(kind))||'null');return record?.version===1&&(!requireReady||record.ready===true)?clean(kind,record.values):null;}catch{return null;}}
 function save(storage,kind,values,ready){const value=clean(kind,values);if(!value)return false;try{const target=store(storage);if(!target)return false;target.setItem(key(kind),JSON.stringify({version:1,ready,values:value}));return true;}catch{return false;}}
 // Convenience values only. No route, load approval, permit, cargo or scale ticket.
 root.DLTruckSetupMemory={
  clean,
  setOwner(id){if(owner!==(id||null)){accountValues.clear();owner=id||null;}},
  accountActive:()=>!!owner,
  read:(storage,kind)=>read(storage,kind,true),
  draft:(storage,kind)=>read(storage,kind,false),
  save:(storage,kind,values)=>save(storage,kind,values,true),
  saveDraft:(storage,kind,values)=>save(storage,kind,values,false),
  forget(storage,kind){try{store(storage)?.removeItem(key(kind));}catch{/* Session still invalidates when storage is unavailable. */}}
 };
})(typeof window==='undefined'?globalThis:window);
