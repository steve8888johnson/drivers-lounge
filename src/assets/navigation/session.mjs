// Deterministic parked rehearsal. This is deliberately not a GPS guidance engine.
export const SAMPLE_ROUTE = Object.freeze({
  id: 'parked-example-v1', mode: 'simulation', lengthMeters: 1000, durationSeconds: 120,
  points: [[220, 900], [220, 540], [700, 540], [700, 140]],
  turns: [
    { offset: 290, seconds: 35, maneuver: 'right', road: 'Connector Road', text: 'Turn right onto Connector Road.' },
    { offset: 677, seconds: 81, maneuver: 'left', road: 'Delivery Lane', text: 'Turn left onto Delivery Lane.' },
    { offset: 1000, seconds: 120, maneuver: 'arrive', road: 'Sample destination', text: 'You have reached the sample destination.' }
  ]
});

export function formatDistance(meters, spoken = false) {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 8) return spoken ? 'at the turn' : 'At turn';
  if (meters < 160) return `${Math.max(25, Math.round(meters * 3.28084 / 25) * 25)} ${spoken ? 'feet' : 'ft'}`;
  const miles = meters / 1609.344;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} ${spoken ? 'miles' : 'mi'}`;
}

export function createPreviewSession(route = SAMPLE_ROUTE) {
  if (route?.mode !== 'simulation' || !Number.isFinite(route.lengthMeters) || route.lengthMeters <= 0 || !Number.isFinite(route.durationSeconds) || route.durationSeconds <= 0 || !Array.isArray(route.turns) || route.turns.length < 1) throw Error('A sample route is required.');
  let previous = -1, time = -1;
  for (const turn of route.turns) {
    if (!Number.isFinite(turn.offset) || turn.offset <= previous || turn.offset > route.lengthMeters || !Number.isFinite(turn.seconds) || turn.seconds <= time || turn.seconds > route.durationSeconds || !['left', 'right', 'arrive'].includes(turn.maneuver) || typeof turn.text !== 'string' || !turn.text.trim() || typeof turn.road !== 'string' || !turn.road.trim()) throw Error('Invalid sample instruction.');
    previous = turn.offset; time = turn.seconds;
  }
  if (previous !== route.lengthMeters || time !== route.durationSeconds || route.turns.at(-1).maneuver !== 'arrive') throw Error('Sample arrival is missing.');
  // Copy input so changes elsewhere cannot change a running rehearsal.
  const data = structuredClone(route);
  data.turns.forEach(Object.freeze);
  let seconds = 0, running = false;
  function snapshot() {
    const arrived = seconds >= data.durationSeconds;
    let index = data.turns.findIndex(turn => turn.seconds > seconds);
    if (index < 0) index = data.turns.length - 1;
    const from = index ? data.turns[index - 1] : { seconds: 0, offset: 0 }, turn = data.turns[index];
    const distance = from.offset + (turn.offset - from.offset) * Math.min(1, (seconds - from.seconds) / (turn.seconds - from.seconds));
    return { running, arrived, seconds, index, turn, next: data.turns[index + 1] || null, distance,
      untilTurn: Math.max(0, turn.offset - distance), remainingMeters: data.lengthMeters - distance,
      remainingSeconds: data.durationSeconds - seconds, fraction: distance / data.lengthMeters,
      guidanceAllowed: false, mode: 'simulation' };
  }
  return {
    snapshot,
    play() { if (seconds >= data.durationSeconds) seconds = 0; running = true; return snapshot(); },
    pause() { running = false; return snapshot(); },
    advance(deltaSeconds) {
      // A suspended page / long frame must never jump over multiple instructions.
      if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0 || deltaSeconds > 1) { running = false; return snapshot(); }
      if (running) seconds = Math.min(data.durationSeconds, seconds + deltaSeconds);
      if (seconds >= data.durationSeconds) running = false;
      return snapshot();
    },
    next() { seconds = Math.min(data.durationSeconds, snapshot().turn.seconds); running = false; return snapshot(); },
    reset() { seconds = 0; running = false; return snapshot(); }
  };
}

export function samplePosition(fraction, points = SAMPLE_ROUTE.points) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let remaining = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = remaining / lengths[i], a = points[i], b = points[i + 1];
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[0] - a[0], a[1] - b[1]) * 180 / Math.PI };
    }
    remaining -= lengths[i];
  }
}

export function sampleAnnouncement(view) {
  if (view.arrived) return { key: 'arrived', text: 'Preview complete. You have reached the sample destination.' };
  const phase = view.untilTurn < 35 ? 'near' : 'approach';
  const prefix = phase === 'near' ? 'Coming up' : `In ${formatDistance(view.untilTurn, true)}`;
  const instruction = view.turn.maneuver === 'arrive' ? 'continue to the sample destination.' : view.turn.text.charAt(0).toLowerCase() + view.turn.text.slice(1);
  return { key: `${view.index}:${phase}`, text: `Sample route. ${prefix}, ${instruction}` };
}
