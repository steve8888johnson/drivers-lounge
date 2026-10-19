const standard={
 preset:'standard-semi',heightFt:13,heightIn:6,widthFt:8,widthIn:6,overallLengthFt:72,trailerLengthFt:53,
 grossWeightLb:80000,currentWeightLb:80000,axleCount:5,trailerAxleCount:2,trailerCount:1,
 singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0,hazmatCategories:[],tunnelCategory:'',avoidTolls:false,routePreference:'fast',permittedLoad:false
};
const hotshot={...standard,preset:'hotshot',overallLengthFt:65,trailerLengthFt:40,grossWeightLb:40000,currentWeightLb:30000,tandemAxleGroupLb:20000};
const straight={...standard,preset:'straight-truck',heightFt:13,heightIn:0,overallLengthFt:40,trailerLengthFt:0,grossWeightLb:54000,currentWeightLb:45000,axleCount:3,trailerAxleCount:0,trailerCount:0};
const hazmat={...standard,hazmatCategories:['flammable'],tunnelCategory:'D'};
const legalDoubles={...standard,overallLengthFt:92,trailerLengthFt:28.5,trailerCount:2,trailerAxleCount:4,axleCount:7,currentWeightLb:80000,grossWeightLb:80000,tandemAxleGroupLb:34000};
const overheight={...standard,heightFt:14,heightIn:0};
const overweightDoubles={...legalDoubles,currentWeightLb:105000,grossWeightLb:105000,tandemAxleGroupLb:40000};

const critical=(id,origin,destination,profile,forbiddenRoads,sourceIds)=>({id,tier:'critical',origin,destination,profile,forbiddenRoads,sourceIds,expectRoute:true,expectGuidance:true,expectProfileBlocked:false});
const corridor=(id,origin,destination,profile=standard)=>({id,tier:'corridor',origin,destination,profile,forbiddenRoads:[],sourceIds:[],expectRoute:true,expectGuidance:true,expectProfileBlocked:false});
const profileGate=(id,origin,destination,profile,expectedError)=>({id,tier:'profile-gate',origin,destination,profile,forbiddenRoads:[],sourceIds:[],expectRoute:false,expectGuidance:false,expectProfileBlocked:true,expectedError});

export const routingBenchmarkCases=Object.freeze([
 critical('dc-to-baltimore-commercial','1600 Pennsylvania Ave NW, Washington, DC 20500','401 Light St, Baltimore, MD 21202',standard,['Baltimore-Washington Parkway'],['baltimoreWashington']),
 critical('alexandria-to-bethesda-commercial','301 King St, Alexandria, VA 22314','7700 Old Georgetown Rd, Bethesda, MD 20814',standard,['George Washington Memorial Parkway','Clara Barton Parkway','Spout Run Parkway'],['nationalCapital']),
 critical('cambridge-to-logan-commercial','77 Massachusetts Ave, Cambridge, MA 02139','1 Harborside Dr, Boston, MA 02128',standard,['Storrow Drive','Soldiers Field Road','Memorial Drive'],['boston']),
 critical('newark-to-jfk-commercial','1 Hotel Rd, Newark, NJ 07114','148-18 134th St, Jamaica, NY 11430',standard,['Belt Parkway','Cross Island Parkway','Jackie Robinson Parkway'],['nyc']),
 critical('bronx-to-maspeth-commercial','600 Food Center Dr, Bronx, NY 10474','55-15 Grand Ave, Maspeth, NY 11378',standard,['Bronx River Parkway','Grand Central Parkway','Jackie Robinson Parkway'],['nyc']),
 critical('baltimore-hazmat-harbor','2400 Broening Hwy, Baltimore, MD 21224','1000 E Fort Ave, Baltimore, MD 21230',hazmat,['Fort McHenry Tunnel','Baltimore Harbor Tunnel','Harbor Tunnel Thruway'],['baltimore']),
 critical('pa-turnpike-hazmat','2001 Paxton St, Harrisburg, PA 17111','1000 Liberty Ave, Pittsburgh, PA 15222',hazmat,['Allegheny Mountain Tunnel','Tuscarora Mountain Tunnel','Kittatinny Mountain Tunnel','Blue Mountain Tunnel'],['paTurnpike']),
 critical('nyc-manhattan-to-brooklyn','625 W 57th St, New York, NY 10019','850 3rd Ave, Brooklyn, NY 11232',standard,['FDR Drive','Harlem River Drive','Belt Parkway'],['nyc']),
 critical('boston-seaport-to-cambridge','1 Black Falcon Ave, Boston, MA 02210','100 Cambridgeside Pl, Cambridge, MA 02141',standard,['Storrow Drive','Memorial Drive'],['boston']),
 critical('national-capital-legal-doubles','1101 King St, Alexandria, VA 22314','5701 Marinelli Rd, Rockville, MD 20852',legalDoubles,['George Washington Memorial Parkway','Clara Barton Parkway','Spout Run Parkway'],['nationalCapital']),
 corridor('cheyenne-to-denver','611 E Carlson St, Cheyenne, WY 82009','4701 Peoria St, Denver, CO 80239'),
 corridor('dallas-to-houston','650 S Griffin St, Dallas, TX 75202','1001 Avenida De Las Americas, Houston, TX 77010'),
 corridor('los-angeles-to-oakland','1111 S Figueroa St, Los Angeles, CA 90015','7000 Coliseum Way, Oakland, CA 94621'),
 corridor('chicago-to-ohare','233 S Wacker Dr, Chicago, IL 60606','10000 W O Hare Ave, Chicago, IL 60666'),
 corridor('atlanta-to-savannah','285 Andrew Young International Blvd NW, Atlanta, GA 30313','1 International Dr, Savannah, GA 31421'),
 corridor('seattle-to-portland','800 Occidental Ave S, Seattle, WA 98134','1001 N Schmeer Rd, Portland, OR 97217'),
 corridor('miami-to-jacksonville','1015 N America Way, Miami, FL 33132','9810 August Dr, Jacksonville, FL 32226'),
 corridor('phoenix-to-las-vegas','401 E Jefferson St, Phoenix, AZ 85004','3950 S Las Vegas Blvd, Las Vegas, NV 89119'),
 corridor('detroit-to-cleveland','2810 W Fort St, Detroit, MI 48216','5001 NASA Blvd, Cleveland, OH 44135'),
 corridor('hotshot-midland-to-odessa','200 N Loraine St, Midland, TX 79701','500 N Grant Ave, Odessa, TX 79761',hotshot),
 corridor('straight-truck-philadelphia','2955 Market St, Philadelphia, PA 19104','1 Citizens Bank Way, Philadelphia, PA 19148',straight),
 profileGate('overheight-standard-route-gate','1701 Wynkoop St, Denver, CO 80202','8500 Pena Blvd, Denver, CO 80249',overheight,'standard-route safety baseline'),
 profileGate('overweight-doubles-standard-route-gate','1101 King St, Alexandria, VA 22314','5701 Marinelli Rd, Rockville, MD 20852',overweightDoubles,'standard-route safety baseline')
]);

export const benchmarkProfiles=Object.freeze({standard,hotshot,straight,hazmat,legalDoubles,overheight,overweightDoubles});
