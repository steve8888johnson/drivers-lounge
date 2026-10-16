import { pointOK, meters } from './core.mjs';
import { sanitizeIssuerMap } from './issuer-map.mjs';

// Inspect supplied points only. No routing, snapping, geocoding or approval.
export function mapReview(permit, index = 0, { choices = true } = {}) {
  const steps = Array.isArray(permit?.steps) ? permit.steps : [];
  if (!steps.length || steps.length > 1000) return { available: false, reason: 'No supported maneuver geometry is saved. A QR reference alone does not contain a route.' };
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) return { available: false, reason: 'Choose a saved maneuver.' };
  const step = steps[index] || {}, lines = String(permit.routeText || '').split('\n');
  const source = Number.isInteger(step.routeLine) && step.routeLine > 0 ? lines[step.routeLine - 1] || '' : '';
  const points = step.points, issues = [], segments = [];
  const maxSpacing = permit.geometrySource?.format === 'promiles-public-json/v1' ? 5000 : 500;
  if (!source.trim()) issues.push('The saved permit line is missing or invalid. Resolve it before confirmation.');
  if (!String(step.text || '').trim()) issues.push('Maneuver instruction is missing.');
  if (!String(step.road || '').trim()) issues.push('Road name or number was not supplied. Compare the original road, direction and ramp.');
  const valid = Array.isArray(points) && points.length >= 2 && points.length <= 20000 && points.every(p => pointOK(p) && Math.abs(p[0]) <= 85.05112878);
  if (!valid) issues.push('Invalid or missing latitude/longitude points. This maneuver is not drawn.');
  else {
    let omitted = 0;
    for (let i = 1; i < points.length; i++) {
      const distance = meters(points[i - 1], points[i]);
      if (distance > maxSpacing || Math.abs(points[i][1] - points[i - 1][1]) > 180) omitted++;
      else if (distance >= .01) segments.push([points[i - 1].slice(), points[i].slice()]);
    }
    if (omitted) issues.push(`${omitted} sparse or unsupported segment(s) are not drawn. No road is invented across the gap.`);
    if (!segments.length) issues.push('No usable continuous geometry to draw.');
  }
  const start = valid ? points[0].slice() : null, end = valid ? points.at(-1).slice() : null;
  const adjacent = (other, point, side) => {
    const edge = side === 'previous' ? other?.points?.at(-1) : other?.points?.[0];
    if (!other) return null;
    if (!point || !pointOK(edge)) { issues.push(`${side === 'previous' ? 'Previous' : 'Next'} maneuver connection cannot be checked.`); return null; }
    const gap = meters(point, edge);
    if (gap > 25) issues.push(`${Math.round(gap)} m gap to ${side} maneuver. Correct the supplied geometry; do not join it with a guessed road.`);
    return { point: edge.slice(), gap, text: String(other.text || ''), road: String(other.road || '') };
  };
  const previous = adjacent(steps[index - 1], start, 'previous'), next = adjacent(steps[index + 1], end, 'next');
  return { available: true, index, total: steps.length, state: String(permit.state || 'State needed'), number: String(permit.number || ''),
    source, line: step.routeLine, text: String(step.text || ''), road: String(step.road || ''), lane: String(step.lane || ''),
    start, end, segments, previous, next, issues, pointCount: valid ? points.length : 0,
    choices: choices ? steps.map((s, i) => ({ index: i, label: `${i + 1}. ${String(s?.text || 'Instruction missing')}` })) : [] };
}

// Display imported geometry before review, without granting navigation readiness.
// Preserve every gap and maneuver boundary; never connect endpoints ourselves.
export function routeOverview(permit) {
  const steps = permit?.steps;
  const empty = reason => ({ available: false, paths: [], issues: [reason], total: 0, drawn: 0, pointCount: 0 });
  if (permit?.issuerMap) {
    let supplied; try { supplied = sanitizeIssuerMap(permit.issuerMap, permit); } catch (error) { return empty(error.message); }
    const paths = [], sparsePaths = [], issues = []; let path;
    for (const points of supplied.paths) {
      path = null;
      for (let i = 1; i < points.length; i++) {
        const a=points[i-1],b=points[i],distance=meters(a,b);
        if (distance > 5000) { sparsePaths.push([a,b]); issues.push(`${(distance/1609.344).toFixed(1)} mi between adjacent issuer points. The original span is dashed; the road shape between them is unknown.`); path=null; }
        else { if (path) path.push(b); else {path=[a,b];paths.push(path);} }
      }
    }
    return {available:paths.length+sparsePaths.length>0,paths,sparsePaths,issues,total:0,drawn:0,pointCount:supplied.paths[0].length,issuerOverview:true,sourceUrl:supplied.sourceUrl,retrievedAt:supplied.retrievedAt};
  }
  if (!Array.isArray(steps) || !steps.length || steps.length > 1000) return empty('This QR has no supported route coordinates to plot.');
  const count = steps.reduce((n, step) => n + (Array.isArray(step?.points) ? step.points.length : 0), 0);
  if (count > 100000) return empty('This route exceeds the map preview limit. Nothing was shortened or plotted.');
  const paths = [], issues = []; let drawn = 0;
  steps.forEach((step, index) => {
    const view = mapReview(permit, index, { choices: false });
    if (view.segments.length) drawn++;
    for (const issue of view.issues) issues.push(`Instruction ${index + 1}: ${issue}`);
    let path;
    for (const [a, b] of view.segments) {
      if (path && path.at(-1)[0] === a[0] && path.at(-1)[1] === a[1]) path.push(b);
      else { path = [a, b]; paths.push(path); }
    }
  });
  return { available: paths.length > 0, paths, issues, total: steps.length, drawn, pointCount: count };
}

export const coordinateText = point => pointOK(point) ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}` : 'Not supplied';
export const STREET_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const STREET_OPTIONS = Object.freeze({ maxZoom: 19, minZoom: 2, noWrap: true, keepBuffer: 0, updateWhenIdle: true, updateWhenZooming: false, detectRetina: false, referrerPolicy: 'origin', attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' });
