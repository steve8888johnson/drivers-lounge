const pad=value=>String(value).padStart(2,'0');

export function formatLocalDateTimeInput(value){
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.valueOf()))return'';
 return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function permittedModePresentation(enabled){
 return enabled?{
  buttonText:'Open permitted-load routing',
  buttonClass:'permit-action',
  heading:'Issued permit route required',
  chip:'Permit workflow',
  status:'This movement must use the issued-permit workflow. Open Permitted Loads, import every state permit, verify the complete authorized route, and resolve all border gaps before guidance.'
 }:{
  buttonText:'Build truck route',
  buttonClass:'',
  heading:'Complete the route and profile',
  chip:'Not ready',
  status:''
 };
}
