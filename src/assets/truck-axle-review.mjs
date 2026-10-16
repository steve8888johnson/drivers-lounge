// Narrow diagnostic baseline, not route clearance or a statement of all applicable law.
// Sources reviewed 2026-10-14: 23 CFR 658.5, 658.17; FHWA-HOP-19-028 (2019).
export const AXLE_SOURCES = Object.freeze([
  'https://www.ecfr.gov/current/title-23/chapter-I/subchapter-G/part-658/section-658.5',
  'https://www.ecfr.gov/current/title-23/chapter-I/subchapter-G/part-658/section-658.17',
  'https://ops.fhwa.dot.gov/FREIGHT/publications/brdg_frm_wghts/index.htm'
]);
const positiveInteger = value => Number.isSafeInteger(value) && value > 0 && value <= 1000000;
const hundredths = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 2400) return null;
  const scaled = Math.round(value * 100);
  return Math.abs(value * 100 - scaled) < 0.0000001 ? scaled : null;
};
export function poundsToKilogramsUp(pounds) {
  if (!positiveInteger(pounds)) throw Error('Invalid measured pounds.');
  // Exact lb/kg ratio; round load up, never down to evade a restriction.
  return Math.ceil(pounds * 45359237 / 100000000);
}
export function inchesToCentimetersUp(inches) {
  const units = hundredths(inches);
  if (units === null || units === 0) throw Error('Invalid measured inches.');
  return Math.ceil(units * 254 / 10000);
}

export function reviewFederalAxleWeights(input) {
  const issues = [], groups = [];
  const add = (code, message, firstAxle = null, lastAxle = null) => issues.push({code, message, firstAxle, lastAxle});
  const result = () => ({status: issues.length ? 'HOLD' : 'REVIEW_REQUIRED', guidanceAllowed: false,
    issues, groups, sources: AXLE_SOURCES,
    remainingChecks: ['state and local rules and exceptions', 'posted bridge and road limits', 'manufacturer and tire ratings', 'current measurements and load configuration', 'route-specific authority and field verification']});
  if (!input || input.scope !== 'federal-interstate-baseline' || input.confirmed !== true
      || input.exceptionClaimed !== false || !['tractor-semitrailer', 'single-unit', 'truck-trailer'].includes(input.configuration)) {
    add('AXLE_SCOPE_UNSUPPORTED', 'Confirm an ordinary freight configuration. Permits, allowances and special exceptions need separate review.');
  }
  if (typeof input?.revision !== 'string' || !input.revision.trim() || input.revision.length > 100)
    add('AXLE_REVISION_MISSING', 'Record the current loaded configuration revision.');
  const axles = input?.axles;
  if (!Array.isArray(axles) || axles.length < 2 || axles.length > 20) {
    add('AXLES_MISSING', 'Provide 2 to 20 measured load-bearing axles, in front-to-rear order.'); return result();
  }
  if (!positiveInteger(input?.loadedWeightLb)) add('LOADED_WEIGHT_INVALID', 'Provide the measured total loaded weight in whole pounds.');
  let total = 0, previous = -1, invalid = false;
  const positions = [];
  for (let index = 0; index < axles.length; index++) {
    const axle = axles[index], position = hundredths(axle?.positionIn);
    if (position === null || (index === 0 && position !== 0) || position <= previous || !positiveInteger(axle?.weightLb) || axle?.measured !== true) {
      add('AXLE_MEASUREMENT_INVALID', 'Measure each axle weight and position from the first axle. Do not divide a group weight or sort ambiguous axles.', index + 1, index + 1); invalid = true;
    }
    positions.push(position); previous = position;
    if (positiveInteger(axle?.weightLb)) total += axle.weightLb;
  }
  if (invalid) return result();
  if (total !== input.loadedWeightLb) add('AXLE_TOTAL_MISMATCH', 'Individual axle weights must equal the measured loaded total. No tolerance or missing weight is inferred.');
  if (total > 80000) add('BASELINE_GROSS_EXCEEDED', 'Measured total exceeds the ordinary 80,000 lb federal baseline; separate authority is required.');
  for (let first = 0; first < axles.length; first++) {
    let weight = 0;
    for (let last = first; last < axles.length; last++) {
      weight += axles[last].weightLb;
      const count = last - first + 1, span = positions[last] - positions[first];
      let limit, rule;
      if (span <= 4000) { limit = 20000; rule = 'single-axle-window'; }
      else if (span <= 9600) { limit = 34000; rule = 'tandem-axle-window'; }
      else {
        // W/500 = L*N/(N-1)+12*N+36. All arithmetic before rounding is integer.
        const denominator = 1200 * (count - 1);
        const numerator = span * count + (12 * count + 36) * denominator;
        const floor = Math.floor(numerator / denominator), remainder = numerator % denominator;
        // Exact half-way ties round down conservatively; never add enforcement tolerance.
        limit = 500 * (floor + (2 * remainder > denominator ? 1 : 0)); rule = 'bridge-formula';
        const pairA = count === 4 ? positions[first + 1] - positions[first] : 0;
        const pairB = count === 4 ? positions[last] - positions[last - 1] : 0;
        if (count === 4 && span >= 43200 && pairA > 4000 && pairA <= 9600 && pairB > 4000 && pairB <= 9600) {
          if (limit < 68000) { limit = 68000; rule = 'two-tandem-36ft-exception'; }
        }
        limit = Math.min(limit, 80000);
      }
      groups.push({firstAxle:first + 1,lastAxle:last + 1,axleCount:count,spanIn:span / 100,weightLb:weight,baselineLimitLb:limit,rule,exceedsBaseline:weight > limit});
      if (weight > limit) add('AXLE_GROUP_BASELINE_EXCEEDED', `Axles ${first + 1}–${last + 1}: ${weight.toLocaleString('en-US')} lb exceeds this baseline check of ${limit.toLocaleString('en-US')} lb.`, first + 1, last + 1);
    }
  }
  return result();
}

export function prepareMeasuredAxleParameters(input) {
  const review = reviewFederalAxleWeights(input);
  if (review.status === 'HOLD') throw Error('Loaded axle measurements require review.');
  // First provider scope supports explicitly identified single/tandem sets only.
  // More complex sets stay held even when the federal diagnostic can calculate them.
  if (!Array.isArray(input.providerGroups) || !input.providerGroups.length || input.axles.length > 6)
    throw Error('Supported axle-group configuration required.');
  const maximums = {}, canonicalGroups = []; let next = 0;
  for (const group of input.providerGroups) {
    const count = group?.type === 'single' ? 1 : group?.type === 'tandem' ? 2 : 0;
    if (!count || !Array.isArray(group.axles) || group.axles.length !== count || group.axles.some((index, offset) => index !== next + offset || index >= input.axles.length))
      throw Error('Axle groups must partition the measured axles in order.');
    const span = input.axles[next + count - 1].positionIn - input.axles[next].positionIn;
    if (count === 2 && !(span > 40 && span <= 96)) throw Error('Tandem spacing is not supported.');
    const pounds = group.axles.reduce((sum, index) => sum + input.axles[index].weightLb, 0);
    maximums[group.type] = Math.max(maximums[group.type] || 0, poundsToKilogramsUp(pounds));
    canonicalGroups.push({type:group.type,axles:[...group.axles]}); next += count;
  }
  if (next !== input.axles.length) throw Error('Unmapped measured axle.');
  // Do not let a caller split a close set into smaller groups to reduce reported load.
  for (let index = 1; index < input.axles.length; index++) {
    if (input.axles[index].positionIn - input.axles[index - 1].positionIn <= 96
        && !canonicalGroups.some(group => group.axles.includes(index) && group.axles.includes(index - 1)))
      throw Error('Close axle set needs a separately supported configuration.');
  }
  return {
    currentWeightKg:poundsToKilogramsUp(input.loadedWeightLb),
    weightPerAxleGroup:Object.entries(maximums).sort().map(([type, weight]) => `${type}:${weight}`).join(','),
    // Local-only trip binding includes spacing/weights absent from the provider query.
    binding:JSON.stringify({scope:input.scope,configuration:input.configuration,revision:input.revision,loadedWeightLb:input.loadedWeightLb,
      axles:input.axles.map(axle => [hundredths(axle.positionIn), axle.weightLb]),groups:canonicalGroups})
  };
}
