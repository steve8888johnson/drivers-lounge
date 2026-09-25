export const TOOLS = [
  {id:'permits',title:'Permitted trips',detail:'Create or review the exact issued route and originals.',url:'/permitted-loads',group:'Trip',offline:true,terms:'oversize overweight OSOW QR scan hazmat navigation'},
  {id:'navigation',title:'Plan a route',detail:'Truck profile and route preview. Live truck routing is in development.',url:'/navigation',group:'Trip',terms:'directions map GPS truck'},
  {id:'rules',title:'Road rules & glossary',detail:'Look up terms, federal rules and state resources.',url:'/compliance',group:'Trip',offline:true,terms:'DOT regulations hazmat escort pilot'},
  {id:'wallet',title:'Permit wallet',detail:'Open issued originals for review or roadside inspection.',url:'/permitted-loads#tab=wallet',group:'Trip',offline:true,terms:'documents inspection PDF permit'},
  {id:'crew',title:'Pilot-car crew',detail:'Review the shared trip and lead/chase roles.',url:'/permitted-loads#tab=crew',group:'Trip',offline:true,terms:'escort convoy team join'},
  {id:'roads',title:'Road reports',detail:'Driver-submitted conditions; check freshness and official notices.',url:'/road-tools',group:'Road',terms:'weather parking fuel scale construction'},
  {id:'parking',title:'Parking',detail:'Explore parking resources and community reports.',url:'/parking',group:'Road',terms:'rest truck stop overnight'},
  {id:'fuel',title:'Fuel stops',detail:'Review fuel resources before departure.',url:'/fuel',group:'Road',terms:'diesel DEF gas'},
  {id:'loads',title:'Load board',detail:'Open the existing freight workflow.',url:'/loads',group:'Work',terms:'Highway Automation freight dispatch'},
  {id:'jobs',title:'Find driving jobs',detail:'Browse opportunities. Applications remain your choice.',url:'/jobs',group:'Work',terms:'recruiting career employment'},
  {id:'passport',title:'Driver Passport',detail:'Your private experience, credentials and résumé tools.',url:'/driver-hub',group:'Work',terms:'CDL medical TWIC expiration resume'},
  {id:'documents',title:'Document vault',detail:'Your signed-in document workspace.',url:'/documents',group:'Work',terms:'license medical insurance papers'},
  {id:'profit',title:'Trip costs',detail:'Estimate expenses in your financial workspace.',url:'/financial-center',group:'Work',terms:'profit budget expenses rate money'},
  {id:'offers',title:'Offers when you want them',detail:'Browse clearly labeled offers while parked.',url:'/offers',group:'Break',terms:'coupon discount deals food shower tires'},
  {id:'saved-offers',title:'Saved offers',detail:'Return to offers saved to your account.',url:'/saved-offers',group:'Break',terms:'coupon discount bookmark'},
  {id:'community',title:'Driver community',detail:'Connect with drivers and share experience.',url:'/community',group:'Break',terms:'chat friends support lounge'},
  {id:'support',title:'Get help',detail:'Account, app, privacy and data support.',url:'/support',group:'Help',terms:'contact problem assistance'},
  {id:'feedback',title:'Suggest an improvement',detail:'Tell us what would make your day easier.',url:'/feedback',group:'Help',terms:'idea bug feedback'}
];
export const ROLES={driver:'Truck driver',pilot:'Pilot-car driver',owner:'Owner-operator'};
const defaults={driver:['permits','navigation','rules','parking'],pilot:['crew','wallet','rules','roads'],owner:['loads','permits','profit','rules']};
export const CHECKLIST=[['documents','Permit originals and required trip documents accessible'],['route','Issued route, restrictions and today’s conditions reviewed'],['crew','Escort roles and communication plan checked, if applicable'],['stops','Lawful fuel, parking and rest stops considered'],['offline','Trip backup and offline wallet checked before weak-signal areas'],['hours','Driver hours, vehicle checks and cargo requirements reviewed']];
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateKey=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
export function preferences(value){
  const v=value&&typeof value==='object'?value:{},role=Object.hasOwn(ROLES,v.role)?v.role:'driver';
  return {role,largeText:v.largeText===true,favorites:Array.isArray(v.favorites)?[...new Set(v.favorites.filter(id=>TOOLS.some(t=>t.id===id)))].slice(0,6):defaults[role].slice()};
}
export const defaultFavorites=role=>defaults[Object.hasOwn(ROLES,role)?role:'driver'].slice();
export function findTools(query=''){
  const words=String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  return TOOLS.filter(t=>words.every(w=>`${t.title} ${t.detail} ${t.terms} ${t.group}`.toLowerCase().includes(w)));
}
export function dailyChecklist(value,today=dateKey()){
  return {day:today,done:value?.day===today&&Array.isArray(value.done)?[...new Set(value.done.filter(id=>CHECKLIST.some(([key])=>key===id)))]:[]};
}
export function tripSummaries(trips,lastId=''){
  return (Array.isArray(trips)?trips:[]).filter(t=>typeof t?.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id)&&(t.name||t.permits?.length||t.profile?.weightLb)).map(t=>({id:t.id,name:String(t.name||'Untitled permitted trip').slice(0,120),departure:String(t.departure||'').slice(0,10),states:[...new Set((Array.isArray(t.permits)?t.permits:[]).map(p=>p?.state).filter(s=>/^[A-Z]{2}$/.test(s)))],completed:Boolean(t.completedAt)})).sort((a,b)=>(b.id===lastId)-(a.id===lastId)||b.departure.localeCompare(a.departure)).slice(0,3);
}
