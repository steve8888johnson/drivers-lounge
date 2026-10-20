const CLEAN_STATE=value=>String(value||'').trim().toUpperCase();

export const DEFAULT_PERMIT_TIME_ZONES=Object.freeze({
 AL:'America/Chicago',AK:'America/Anchorage',AZ:'America/Phoenix',AR:'America/Chicago',CA:'America/Los_Angeles',CO:'America/Denver',CT:'America/New_York',DC:'America/New_York',DE:'America/New_York',FL:'America/New_York',GA:'America/New_York',HI:'Pacific/Honolulu',IA:'America/Chicago',ID:'America/Denver',IL:'America/Chicago',IN:'America/Indiana/Indianapolis',KS:'America/Chicago',KY:'America/New_York',LA:'America/Chicago',MA:'America/New_York',MD:'America/New_York',ME:'America/New_York',MI:'America/Detroit',MN:'America/Chicago',MO:'America/Chicago',MS:'America/Chicago',MT:'America/Denver',NC:'America/New_York',ND:'America/Chicago',NE:'America/Chicago',NH:'America/New_York',NJ:'America/New_York',NM:'America/Denver',NV:'America/Los_Angeles',NY:'America/New_York',OH:'America/New_York',OK:'America/Chicago',OR:'America/Los_Angeles',PA:'America/New_York',RI:'America/New_York',SC:'America/New_York',SD:'America/Chicago',TN:'America/Chicago',TX:'America/Chicago',UT:'America/Denver',VA:'America/New_York',VT:'America/New_York',WA:'America/Los_Angeles',WI:'America/Chicago',WV:'America/New_York',WY:'America/Denver'
});

// These states contain more than one civil time zone. The default is only a review aid;
// the original permit and the actual route location must be checked before confirmation.
export const SPLIT_TIME_ZONE_STATES=Object.freeze(new Set(['FL','ID','IN','KS','KY','MI','NE','ND','OR','SD','TN','TX']));

export function permitTimeZoneForState(state){return DEFAULT_PERMIT_TIME_ZONES[CLEAN_STATE(state)]||'';}
export function permitTimeZoneNeedsReview(state){return SPLIT_TIME_ZONE_STATES.has(CLEAN_STATE(state));}

const prefixRoad=(prefix,number)=>`${prefix}-${String(Number(number))}`;

export function canonicalPermitRoad(value){
 const source=String(value||'').toUpperCase().replace(/\u2013|\u2014/g,'-').replace(/\s+/g,' ').trim();
 if(!source)return'';
 const patterns=[
  [/(?:^|\b)(?:INTERSTATE(?:\s+HIGHWAY)?|IH|I)[\s-]*0*(\d{1,3})(?:\b|$)/,'I'],
  [/(?:^|\b)(?:U\.?S\.?(?:\s+(?:HIGHWAY|HWY|ROUTE))?|US)[\s-]*0*(\d{1,4})(?:\b|$)/,'US'],
  [/(?:^|\b)(?:STATE\s+(?:HIGHWAY|ROUTE)|SH)[\s-]*0*(\d{1,4})(?:\b|$)/,'SH'],
  [/(?:^|\b)(?:STATE\s+ROAD|SR)[\s-]*0*(\d{1,4})(?:\b|$)/,'SR']
 ];
 for(const[pattern,prefix]of patterns){const match=source.match(pattern);if(match)return prefixRoad(prefix,match[1]);}
 const stateRoute=source.match(/(?:^|\b)(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)[\s-]*0*(\d{1,4})(?:\b|$)/);
 if(stateRoute)return prefixRoad(stateRoute[1],stateRoute[2]);
 return source.replace(/[^A-Z0-9]/g,'').replace(/^0+/, '');
}

export function canonicalRoadKey(value){return canonicalPermitRoad(value).replace(/[^A-Z0-9]/g,'');}

export function inferBorderState(label,ownState=''){
 const source=String(label||'').toUpperCase(),own=CLEAN_STATE(ownState);
 const candidates=[];
 for(const match of source.matchAll(/(?:^|[;,:\s])([A-Z]{2})(?=(?:[;,:\s]|$))/g))candidates.push(match[1]);
 const line=source.match(/\b([A-Z]{2})\s+(?:STATE\s+)?(?:LINE|BORDER)\b/);if(line)candidates.unshift(line[1]);
 return candidates.find(state=>DEFAULT_PERMIT_TIME_ZONES[state]&&state!==own)||'';
}

export function inferBorderEdge(label,ownState=''){
 const normalizedLabel=String(label||'').replace(/\s+/g,' ').trim(),state=inferBorderState(normalizedLabel,ownState);
 return{label:normalizedLabel,state,road:state?canonicalPermitRoad(normalizedLabel):''};
}

export function permitTimeZoneConfidence(state){return permitTimeZoneNeedsReview(state)?{score:.45,source:'Default state time zone; route crosses or may cross a split-zone state. Confirm from the original permit and route.'}:{score:.7,source:'Default issuing-state time zone; confirm against the original permit.'};}
