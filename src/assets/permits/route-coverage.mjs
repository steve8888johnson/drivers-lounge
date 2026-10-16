// References check transcription coverage, never a road's legality or permit authenticity.
// Preserve original line numbers, including blanks; never infer an omitted turn.
export function routeLineCoverage(permit) {
  const lines = typeof permit?.routeText === 'string' ? permit.routeText.split('\n') : [];
  const references = new Map(), invalidManeuvers = [];
  for (const [index, step] of (Array.isArray(permit?.steps) ? permit.steps : []).entries()) {
    const line = step?.routeLine;
    if (!Number.isInteger(line) || line < 1 || line > lines.length || !lines[line - 1].trim()) {
      invalidManeuvers.push(index + 1);
      continue;
    }
    if (!references.has(line)) references.set(line, []);
    references.get(line).push(index + 1);
  }
  const rows = lines.flatMap((text, index) => text.trim() ? [{ line: index + 1, text, maneuvers: references.get(index + 1) || [] }] : []);
  const missing = rows.filter(row => !row.maneuvers.length).map(row => row.line);
  return { rows, missing, invalidManeuvers, covered: rows.length - missing.length, complete: rows.length > 0 && !missing.length && !invalidManeuvers.length };
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function coverageMarkup(permits) {
  return permits.map(permit => {
    const coverage = routeLineCoverage(permit);
    const summary = coverage.rows.length ? `${coverage.covered} of ${coverage.rows.length} saved route lines referenced` : 'No issued route text saved';
    return `<details class="coverage-state" ${coverage.missing.length ? 'open' : ''}><summary>${esc(permit.state || 'State needed')} · ${esc(permit.number || 'Permit needed')} — ${summary}</summary><p>References do not prove that instructions, coordinates or roads match the permit. Compare every line with every original page.</p>${coverage.invalidManeuvers.length ? '<p class="coverage-missing">Some maneuvers cite a blank or invalid source line. Correct them before review.</p>' : ''}<ol class="coverage-lines" tabindex="0" aria-label="Saved route lines and maneuver references">${coverage.rows.map(row => `<li value="${row.line}" class="${row.maneuvers.length ? '' : 'coverage-missing'}"><span class="coverage-source">${esc(row.text)}</span><strong>${row.maneuvers.length ? `Referenced by maneuver${row.maneuvers.length > 1 ? 's' : ''} ${row.maneuvers.join(', ')}` : 'Missing maneuver reference — review required'}</strong></li>`).join('')}</ol></details>`;
  }).join('') || '<p>Add the issued state routes to compare their instructions.</p>';
}

export function maneuverChoices(master) {
  if (!master?.ready || master.geometryChecked !== true) return [];
  return master.permits.flatMap(permit => permit.steps.map(step => ({ state: permit.state, text: step.text, line: step.routeLine })));
}
