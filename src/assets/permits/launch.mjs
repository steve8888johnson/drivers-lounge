// Local device links never start GPS, confirm a permit or change crew roles.
export function walletLaunch(trips,hash='',lastId=''){
  const p=new URLSearchParams(String(hash).replace(/^#/,'')),requested=p.get('trip'),create=p.get('new')==='1';
  const selected=requested?trips.find(t=>t.id===requested):trips.find(t=>t.id===lastId)||trips[0];
  return {trip:create?null:selected||trips[0]||null,tab:['load','review','hazmat','route','wallet','crew'].includes(p.get('tab'))?p.get('tab'):'load',missing:Boolean(requested&&!selected&&!create)};
}
