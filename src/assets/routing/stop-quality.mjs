const fold=value=>String(value||'').toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
const PRECISE_TYPES=new Set(['coordinate','point address','pointaddress','house number','housenumber','address','poi','place','business','venue']);
const BROAD_TYPES=new Set(['geography','locality','municipality','city','county','state','country','postal code','postalcode','street','road','intersection','cross street','crossstreet','address range','addressrange']);

export function classifyResolvedStop(stop={}){
 const type=fold(stop.resultType),label=String(stop.label||'').trim();
 if(PRECISE_TYPES.has(type))return{precise:true,type:type||'unknown',label,reason:'precise access point'};
 if(BROAD_TYPES.has(type))return{precise:false,type:type||'unknown',label,reason:'broad or incomplete location match'};
 const hasStreetNumber=/^\s*\d+[a-z-]*\s+/i.test(label);
 return{precise:hasStreetNumber,type:type||'unknown',label,reason:hasStreetNumber?'numbered street address':'unverified location precision'};
}

const notice=(role,stop,classification)=>({
 code:`${role}StopNotPrecise`,
 title:`${role==='origin'?'Origin':'Destination'} resolved only to ${classification.type||'an imprecise location'}: ${classification.label||'unlabeled match'}. Enter a full street address, select a verified facility/POI, or use a confirmed GPS/map pin before live guidance.`,
 severity:'critical',
 blocking:true,
 stopRole:role,
 resultType:classification.type,
 confidence:Number(stop?.confidence??0)
});

export function auditResolvedStops(origin={},destination={}){
 const originClass=classifyResolvedStop(origin),destinationClass=classifyResolvedStop(destination),notices=[];
 if(!originClass.precise)notices.push(notice('origin',origin,originClass));
 if(!destinationClass.precise)notices.push(notice('destination',destination,destinationClass));
 return{
  status:notices.length?'blocked':'clear',
  origin:originClass,
  destination:destinationClass,
  notices,
  criticalNotices:notices
 };
}

export function applyResolvedStopAudit(result={}){
 const audit=auditResolvedStops(result.origin,result.destination),route=result.route||{},notices=[...(route.notices||[]),...audit.notices],criticalNotices=notices.filter(item=>item.severity==='critical'||item.blocking===true);
 return{
  ...result,
  stopAudit:audit,
  route:{
   ...route,
   notices,
   criticalNotices,
   guidanceEligible:Boolean(route.guidanceEligible)&&criticalNotices.length===0
  }
 };
}
