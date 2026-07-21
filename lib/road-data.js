export const parkingLocations = [
  { id:'joliet-80', name:'Joliet Truck Plaza', city:'Joliet, IL', spaces:210, status:'Filling', available:54, confidence:86, updated:'9 min ago', amenities:['Showers','Food','Repair','Dog area'] },
  { id:'gary-94', name:'Gary Travel Center', city:'Gary, IN', spaces:148, status:'Almost full', available:18, confidence:78, updated:'14 min ago', amenities:['Showers','Laundry','CAT Scale'] },
  { id:'kenosha-94', name:'Kenosha Northbound Rest Area', city:'Kenosha, WI', spaces:72, status:'Plenty available', available:39, confidence:73, updated:'21 min ago', amenities:['Restrooms','Vending','Pet area'] }
];

export const fuelLocations = [
  { id:'fuel-1', name:"Love's Travel Stop", city:'Morris, IL', diesel:3.59, def:3.89, detour:0.4, effective:3.60, updated:'18 min ago' },
  { id:'fuel-2', name:'Pilot Travel Center', city:'Minooka, IL', diesel:3.55, def:3.95, detour:3.1, effective:3.61, updated:'26 min ago' },
  { id:'fuel-3', name:'TA Express', city:'Gary, IN', diesel:3.63, def:3.79, detour:0.8, effective:3.64, updated:'31 min ago' }
];

export const weatherAlerts = [
  { id:'w1', severity:'High', title:'High-wind corridor', route:'I-80 · Morris to Joliet', detail:'Crosswind exposure reported for high-profile and empty trailers.', expires:'2 hr' },
  { id:'w2', severity:'Moderate', title:'Heavy rain cells', route:'I-94 · Kenosha to Milwaukee', detail:'Reduced visibility and standing-water reports.', expires:'55 min' },
  { id:'w3', severity:'Advisory', title:'Heat advisory', route:'Chicago metro', detail:'Monitor tires, brakes and engine temperature during extended delays.', expires:'6 hr' }
];

export const roadEvents = [
  { id:'r1', type:'Construction', title:'Two right lanes closed', route:'I-80 EB near MM 126', delay:'18 min', confidence:91 },
  { id:'r2', type:'Crash', title:'Shoulder and right lane blocked', route:'I-55 NB near MM 263', delay:'12 min', confidence:84 },
  { id:'r3', type:'Restriction', title:'Temporary 12 ft width restriction', route:'US-30 near Joliet', delay:'Use alternate', confidence:95 }
];

export const truckStops = [
  { id:'ts1', name:"Love's #760", city:'Morris, IL', parking:210, diesel:true, def:true, cat:true, showers:true, food:['Subway','Hot deli'], dogPark:true, rv:false, rating:4.5 },
  { id:'ts2', name:'Pilot #236', city:'Minooka, IL', parking:154, diesel:true, def:true, cat:true, showers:true, food:['PJ Fresh','Wendy’s'], dogPark:false, rv:true, rating:4.2 },
  { id:'ts3', name:'TA Gary', city:'Gary, IN', parking:300, diesel:true, def:true, cat:true, showers:true, food:['Country Pride','Fast food'], dogPark:false, rv:false, rating:3.9 }
];

export const serviceLocations = [
  { id:'s1', name:'Blue Beacon Truck Wash', city:'Joliet, IL', kind:'Truck Wash', open:'24 hours', phone:'Listed in directory', services:['Tractor/trailer wash','Undercarriage','Rain-X'], rating:4.3 },
  { id:'s2', name:'Midwest Mobile Diesel', city:'Chicago Southland', kind:'Mobile Repair', open:'24-hour dispatch', phone:'Listed in directory', services:['No-start','Air leaks','Electrical','Brakes'], rating:4.6 },
  { id:'s3', name:'Interstate Tire & Trailer', city:'Gary, IN', kind:'Repair Shop', open:'6am–10pm', phone:'Listed in directory', services:['Tires','Trailer repair','DOT inspection'], rating:4.1 }
];
