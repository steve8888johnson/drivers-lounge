import {encodePoints} from './truck-geometry.mjs';
// Synthetic contract fixtures. No real road, entrance, source evidence or truck trip.
export const roadRef = (segment, suffix = '+0..1') => `hrn:here:data::olp-here:rib-2:3217::377570872:here:cm:segment:${segment}#${suffix}`;
export function roadBindingFixture() {
  const points = [{lat:32,lng:-102},{lat:32.001,lng:-102},{lat:32.002,lng:-102}];
  const source = () => ({status:'supported',sourceRecordId:'SYNTHETIC-RECORD',authority:'SYNTHETIC TEST ONLY',sourceUrl:'https://example.gov/synthetic',observedAt:'2026-10-13T11:00:00Z',validFrom:'2026-10-13T00:00:00Z',validUntil:'2026-10-14T00:00:00Z'});
  const section = {id:'s1',type:'vehicle',transport:{mode:'truck'},polyline:encodePoints(points),summary:{length:222},
    departure:{time:'2026-10-13T13:00:00Z',place:{location:points[0]}},arrival:{time:'2026-10-13T13:01:00Z',place:{location:points[2]}},
    refReplacements:{'0':'hrn:here:data::olp-here:rib-2:3217:','1':'here:cm:segment'},
    spans:[{offset:0,segmentRef:'$0:377570872:$1:101#+0..1'},{offset:1,segmentRef:'$0:377570872:$1:102#+0..1'}]};
  const route = {id:'r1',sections:[section]};
  const request = {fingerprint:'synthetic-truck-trip-v1',trip:{origin:points[0],destination:points[2]},departure:'2026-10-13T13:00:00.000Z',transportMode:'truck',scope:'standard-nonhazmat',createdAt:Date.parse('2026-10-13T12:00:00Z'),expiresAt:Date.parse('2026-10-13T12:00:10Z')};
  const current = {fingerprint:request.fingerprint,now:request.createdAt};
  const evidence = {requestFingerprint:request.fingerprint,routeId:route.id,complete:true,sectionBindings:[{id:section.id,polyline:section.polyline}],
    roads:[{...source(),occurrence:0,sectionId:'s1',offset:0,segmentRef:roadRef(101),startNode:'node-A',endNode:'node-B'},
      {...source(),occurrence:1,sectionId:'s1',offset:1,segmentRef:roadRef(102),startNode:'node-B',endNode:'node-C'}],
    transitions:[{...source(),fromOccurrence:0,toOccurrence:1,allowed:true}],
    origin:{...source(),entranceId:'SYNTHETIC-EXIT',method:'truck-exit',segmentRef:roadRef(101),requestedLocation:points[0],matchedLocation:points[0]},
    destination:{...source(),entranceId:'SYNTHETIC-ENTRANCE',method:'truck-entrance',segmentRef:roadRef(102),requestedLocation:points[2],matchedLocation:points[2]}};
  return {route,request,current,evidence};
}
