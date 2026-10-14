export const measuredAxlesFixture = () => ({
 scope:'federal-interstate-baseline',configuration:'tractor-semitrailer',confirmed:true,exceptionClaimed:false,
 revision:'synthetic-axles-v1',loadedWeightLb:78000,
 measurementKind:'individual',loadReference:'synthetic-load-1',measuredAt:'2026-10-13T10:00:00.000Z',unchangedSinceWeighing:true,
 axles:[{positionIn:0,weightLb:12000,measured:true},{positionIn:192,weightLb:16500,measured:true},
 {positionIn:240,weightLb:16500,measured:true},{positionIn:624,weightLb:16500,measured:true},{positionIn:672,weightLb:16500,measured:true}],
 providerGroups:[{type:'single',axles:[0]},{type:'tandem',axles:[1,2]},{type:'tandem',axles:[3,4]}]
});
export const vehicleFixture = () => ({confirmed:true,oversize:false,hazmat:false,heightCm:412,widthCm:260,lengthCm:2195,
 currentWeightKg:35381,grossWeightKg:40000,axleMeasurement:measuredAxlesFixture()});
