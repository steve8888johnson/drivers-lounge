import {prepareCloudTrip,validateCloudRow,privatePath,digest,uuid} from './cloud-packet.mjs';

export const WALLET_BUCKET='permit-wallet';
export function walletTransport(client) {
  const table='dl_permit_wallets',fields='id,owner_id,schema_version,name,version,updated_at,archived,snapshot,manifest';
  async function run(query){const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);try{const {data,error}=await query.abortSignal(c.signal);if(error)throw error;return data;}finally{clearTimeout(timer);}}
  async function bounded(action){let timer;try{return await Promise.race([action(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Transfer timed out. Your device copy is safe. Check the account before retrying.')),60000);})]);}finally{clearTimeout(timer);}}
  const bucket=()=>client.storage.from(WALLET_BUCKET);
  return {
    list:owner=>run(client.from(table).select('id,owner_id,name,version,updated_at,archived,ready').eq('owner_id',owner).order('updated_at',{ascending:false}).limit(21)),
    read:(owner,id)=>run(client.from(table).select(fields).eq('owner_id',owner).eq('id',id).maybeSingle()),
    create:(owner,id)=>run(client.from(table).insert({id,owner_id:owner}).select(fields).single()),
    commit:(owner,id,version,values)=>run(client.from(table).update({...values,version:crypto.randomUUID()}).eq('owner_id',owner).eq('id',id).eq('version',version).select(fields).maybeSingle()),
    async put(path,blob){const {error}=await bounded(()=>bucket().upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:'0'}));if(error&&String(error.statusCode)!=='409')throw error;},
    async get(path){const {data,error}=await bounded(()=>bucket().download(path));if(error)throw error;return data;},
    async eraseFiles(owner,id){
      // Archived trips cannot be reopened; failed cleanup can be retried.
      for(let pass=0;pass<5;pass++){
        const {data,error}=await bounded(()=>bucket().list(`${owner}/${id}`,{limit:100}));if(error)throw error;if(!data.length)return;
        const {error:removeError}=await bounded(()=>bucket().remove(data.map(file=>`${owner}/${id}/${file.name}`)));if(removeError)throw removeError;
      }throw Error('More files remain. Retry account removal to finish cleanup.');
    },
    remove:(owner,id,version)=>run(client.from(table).delete().eq('owner_id',owner).eq('id',id).eq('version',version).eq('archived',true).select('id').maybeSingle())
  };
}
export function createWalletSync({transport,getDocument,onState=()=>{}}){
  let owner=null,epoch=0,busy=false;
  const state=(status,extra={})=>onState({status,owner,busy,...extra});
  function begin(){if(!owner||busy)throw Error('Sign in and wait for the current transfer.');const user=owner,turn=epoch;busy=true;const guard=()=>{if(owner!==user||epoch!==turn)throw Error('Account changed. No transfer result was applied to this device.');};return {user,guard,finish:()=>{if(epoch===turn){busy=false;}}};}
  return {
    get owner(){return owner;},get busy(){return busy;},
    setOwner(id){epoch++;owner=uuid(id)?id:null;busy=false;state(owner?'ready':'signed-out');},
    async list(){const op=begin();state('listing');try{const rows=await transport.list(op.user);op.guard();return rows;}finally{op.finish();}},
    async save(trip){
      const op=begin();state('preparing');
      try{
        if(trip.accountSync&&trip.accountSync.owner!==op.user)throw Error('This device copy belongs to another account. Sign in to that account.');
        const prepared=await prepareCloudTrip(trip,getDocument,op.guard);op.guard();
        const id=trip.accountSync?.tripId||trip.id;let row=await transport.read(op.user,id);op.guard();
        if(row?.archived)throw Error('This account copy is being removed. Finish removal before saving again.');
        if(row?.snapshot&&row.version!==trip.accountSync?.version)throw Error('Another device changed this account trip. Open the latest account copy first. Your device copy is unchanged.');
        if(!row){if(trip.accountSync)throw Error('The account copy was removed. Export this device copy before starting a new account trip.');row=await transport.create(op.user,id);op.guard();}
        const manifest=[],uploaded=new Set();
        for(const [index,file] of prepared.files.entries()){
          const path=privatePath(op.user,id,file.sha256,file.type);op.guard();state('uploading',{done:index,total:prepared.files.length});
          if(!uploaded.has(path)){await transport.put(path,file.blob);op.guard();uploaded.add(path);}
          const {blob,scanSummary,...entry}=file;manifest.push({...entry,path});
        }
        op.guard();state('publishing');const saved=await transport.commit(op.user,id,row.version,{snapshot:prepared.snapshot,manifest,name:prepared.snapshot.name});op.guard();
        if(!saved)throw Error('Another device saved first. Your device copy is safe; open the latest account trip before retrying.');
        validateCloudRow(saved,op.user);
        return {owner:op.user,tripId:id,version:saved.version,savedAt:saved.updated_at};
      }finally{op.finish();}
    },
    async download(id){
      const op=begin();state('downloading');
      try{
        const row=await transport.read(op.user,id);op.guard();const {snapshot,manifest}=validateCloudRow(row,op.user),files=[],cache=new Map();
        for(const [index,m] of manifest.entries()){
          state('downloading',{done:index,total:manifest.length});let blob=cache.get(m.path);
          if(!blob){blob=await transport.get(m.path);op.guard();if(!blob||blob.size!==m.size||await digest(blob)!==m.sha256)throw Error(`Original ${m.name} failed its integrity check. Existing device copies were not changed.`);op.guard();cache.set(m.path,blob);}
          files.push({...m,blob:new Blob([blob],{type:m.type})});
        }
        op.guard();return {snapshot,files,accountSync:{owner:op.user,tripId:id,version:row.version,savedAt:row.updated_at}};
      }finally{op.finish();}
    },
    async remove(id,version){const op=begin();state('removing');try{
      let row=await transport.read(op.user,id);op.guard();if(!row||row.version!==version)throw Error('Account trip changed. Refresh before removing it.');
      if(!row.archived){row=await transport.commit(op.user,id,version,{archived:true});op.guard();if(!row)throw Error('Account trip changed. Refresh before removing it.');}
      await transport.eraseFiles(op.user,id);op.guard();if(!await transport.remove(op.user,id,row.version))throw Error('Account changed during removal. Refresh and retry.');op.guard();
    }finally{op.finish();}}
  };
}
