export const PROGRAMS=[
  {id:'fleet',name:'Fleet team tools',payer:'Fleet or carrier',model:'Business subscription',description:'A proposed team workspace for dispatch coordination, document-expiry oversight and trip preparation. Individual driver access stays free.',benefits:['Central team administration','Driver-controlled document sharing','Preparation and exception reports'],stage:'Pilot interest'},
  {id:'service',name:'Service-provider introductions',payer:'Service provider',model:'Fee for an accepted, qualified introduction',description:'A proposed way for drivers to request help from a business they choose, with the provider paying an agreed referral fee.',benefits:['Driver-initiated requests only','Clear service area and availability','No auctioning emergency help or private trip data'],stage:'Pilot interest'},
  {id:'merchant',name:'Merchant offers & redemptions',payer:'Participating merchant',model:'Merchant-funded commission or campaign agreement',description:'A proposed program for useful driver savings on meals, showers, tires and other services, with clear terms and merchant-funded compensation.',benefits:['Visible offer terms and expiration','Driver chooses when to browse','No paid detours or mandatory offers'],stage:'Pilot interest'}
];
const field=(value,max,label)=>{const s=String(value??'').trim();if(s.length>max)throw Error(`${label} is too long.`);return s;};
export function buildInquiry(input){
  const program=PROGRAMS.find(p=>p.id===input.program);if(!program)throw Error('Choose a business program.');
  const business=field(input.business,120,'Business name'),name=field(input.name,100,'Contact name'),email=field(input.email,320,'Email'),regions=field(input.regions,160,'Service area'),notes=field(input.notes,2000,'Notes'),website=field(input.website,300,'Website');
  if(business.length<2||name.length<2)throw Error('Enter the business and contact names.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid business email.');
  if(website){let url;try{url=new URL(website);}catch{throw Error('Use a complete HTTPS website address.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a public HTTPS website without embedded credentials.');}
  const units=input.units===''||input.units==null?null:Number(input.units);if(units!==null&&(!Number.isSafeInteger(units)||units<1||units>100000))throw Error('Enter a whole number from 1 to 100,000 for business size.');
  if(input.consent!==true)throw Error('Confirm permission to reply about this request.');
  const message=[`Business program: ${program.name}`,`Stage: pilot inquiry; no purchase or enrollment`,`Business: ${business}`,`Contact: ${name}`,`Reply email: ${email}`,`Website: ${website||'Not supplied'}`,`Fleet vehicles / business locations: ${units??'Not supplied'}`,`Service area: ${regions||'Not supplied'}`,`Needs and notes: ${notes||'Not supplied'}`,'Contact permission: The sender requested a reply about this program.','Drivers remain free; no payment or driver-data access is authorized.'].join('\n');
  return {category:'advertising',email,subject:`[Business pilot] ${program.name} — ${business}`.slice(0,160),message};
}
export async function sendInquiry(backend,input){
  const ticket=buildInquiry(input);
  if(!backend?.configured)throw Error('Request not sent: business inquiries are temporarily unavailable. Download your request and try again later.');
  // Existing support intake/RLS supplies ownership and anonymous-insert rules.
  const user=await backend.user();
  await backend.submit('support_tickets',{...ticket,user_id:user?.id||null});
  return ticket;
}
