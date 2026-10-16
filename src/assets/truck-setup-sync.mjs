// Account data stays in memory. No offline upload queue or last-write-wins merge.
export function setupTransport(client) {
  const table = 'dl_truck_setups';
  const fields = 'owner_id,kind,schema_version,values,version,updated_at';
  async function run(query) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try { const {data,error} = await query.abortSignal(controller.signal); if (error) throw error; return data; }
    finally { clearTimeout(timer); }
  }
  return {
    read: (owner,kind) => run(client.from(table).select(fields).eq('owner_id',owner).eq('kind',kind).maybeSingle()),
    write: (owner,kind,values,version) => run((version
      ? client.from(table).update({values,version:crypto.randomUUID()}).eq('owner_id',owner).eq('kind',kind).eq('version',version)
      : client.from(table).insert({owner_id:owner,kind,values})).select(fields).maybeSingle()),
    remove: (owner,kind,version) => run(client.from(table).delete().eq('owner_id',owner).eq('kind',kind).eq('version',version).select(fields).maybeSingle())
  };
}
export function createSetupSync({transport,kind,clean,onState=()=>{}}) {
  let owner=null, epoch=0, record=null, loaded=false, busy=false, status='signed-out';
  const snapshot=()=>({owner,record:record?structuredClone(record):null,loaded,busy,status});
  const emit=next=>{status=next;onState(snapshot());};
  function valid(row) {
    if(!row)return null;
    const values=clean(kind,row.values);
    if(row.owner_id!==owner||row.kind!==kind||row.schema_version!==1||!values||! /^[a-f0-9-]{36}$/i.test(row.version))throw Error('Invalid account setup');
    return {...row,values};
  }
  async function load() {
    if(!owner||busy)return;
    const turn=++epoch;busy=true;emit('loading');
    try { const next=await transport.read(owner,kind);if(turn!==epoch)return;record=valid(next);loaded=true;busy=false;emit(record?'ready':'empty'); }
    catch {if(turn!==epoch)return;loaded=false;busy=false;emit('error');}
  }
  async function change(values,remove=false) {
    if(!owner||!loaded||busy)return false;
    const filtered=remove?null:clean(kind,values);if(!remove&&!filtered)throw Error('Complete a valid truck setup first.');
    if(remove&&!record)return false;
    const turn=++epoch,version=record?.version;busy=true;emit(remove?'removing':'saving');
    try {
      let next;
      try {next=await (remove?transport.remove(owner,kind,version):transport.write(owner,kind,filtered,version));}
      catch(error){if(error.code!=='23505')throw error;next=null;}
      if(turn!==epoch)return false;
      if(!next){
        const latest=await transport.read(owner,kind);if(turn!==epoch)return false;
        record=valid(latest);loaded=true;busy=false;emit('conflict');return false;
      }
      record=remove?null:valid(next);busy=false;emit(remove?'deleted':'saved');return true;
    }catch {if(turn!==epoch)return false;loaded=false;busy=false;emit('error');return false;}
  }
  return {get:snapshot,load,save:values=>change(values),remove:()=>change(null,true),
    async setUser(id){epoch++;owner=id||null;record=null;loaded=false;busy=false;if(owner)await load();else emit('signed-out');},
    invalidate(){epoch++;owner=null;record=null;loaded=false;busy=false;emit('signed-out');}
  };
}
