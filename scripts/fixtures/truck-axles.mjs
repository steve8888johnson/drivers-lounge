export const measuredAxlesFixture = () => ({
 scope:'federal-interstate-baseline',configuration:'tractor-semitrailer',confirmed:true,exceptionClaimed:false,
 revision:'synthetic-axles-v1',loadedWeightLb:78000,
 measurementKind:'individual',loadReference:'synthetic-load-1',measuredAt:'2026-10-13T10:00:00.000Z',unchangedSinceWeighing:true,
 axles:[{positionIn:0,weightLb:12000,measured:true},{positionIn:192,weightLb:16500,measured:true},
 {positionIn:240,weightLb:16500,measured:true},{positionIn:624,weightLb:16500,measured:true},{positionIn:672,weightLb:16500,measured:true}],
 providerGroups:[{type:'single',axles:[0]},{type:'tandem',axles:[1,2]},{type:'tandem',axles:[3,4]}]
});
// Deliberately asymmetric synthetic tire loads. Never use as real scale readings.
export const equipmentFixture = (m=measuredAxlesFixture()) => ({revision:'synthetic-equipment-v1',measurementRevision:m.revision,
 loadReference:m.loadReference,measuredAt:m.measuredAt,inspectedAt:m.measuredAt,unchangedSinceInspection:true,
 loadedRating:{kind:'manufacturer-GCWR',appliesTo:'complete-current-configuration',weightLb:100000,sourceRef:'SYNTHETIC manufacturer certificate'},
 axles:m.axles.map((_,i)=>({axleIndex:i,gawrLb:i===0?13000:20000,sourceRef:'SYNTHETIC axle label',mounting:i===0?'single':'dual',
  tires:(i===0?['left','right']:['left-inner','left-outer','right-inner','right-outer']).map((position,j)=>({position,installedId:`synthetic-${i}-${j}`,ratingMounting:i===0?'single':'dual',sourceRef:'SYNTHETIC tire data',
   ratedLoadLb:i===0?6500:5500,capacityAtColdPressureLb:i===0?6500:5000,measuredLoadLb:i===0?[5800,6200][j]:[4000,4100,4200,4200][j],loadBasis:'individual-measurement',measuredAt:m.measuredAt,
   pressureBasis:'cold-measured',coldPsi:100,requiredColdPsiForLoad:95,maxColdPsi:120}))}))
});
export const vehicleFixture = () => {const axleMeasurement=measuredAxlesFixture();return {confirmed:true,oversize:false,hazmat:false,heightCm:412,widthCm:260,lengthCm:2195,
 currentWeightKg:35381,grossWeightKg:40000,axleMeasurement,equipment:equipmentFixture(axleMeasurement)};};
