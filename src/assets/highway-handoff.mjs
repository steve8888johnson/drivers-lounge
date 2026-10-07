export function handoffURL(raw) {
 try {const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port)return null;return u.href;}catch{return null;}
}
if(typeof document!=='undefined'){const url=handoffURL(window.DRIVERS_LOUNGE_CONFIG?.highwayAutomationUrl);if(url){const link=document.getElementById('highway-link');link.href=url;link.hidden=false;document.getElementById('handoff-status').textContent='Learn about Highway Automation and its upcoming shipper/carrier trial. Public freight transactions are not open yet.';}}
