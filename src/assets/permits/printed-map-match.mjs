import { sanitizeIssuerMap } from './issuer-map.mjs';

const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const decimal = value => typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;

// Bind the entire extracted table, not a nearby road name or a matching subset.
// This proves textual agreement only. It never creates maneuver coordinates.
export function comparePrintedIssuerRoute(review, permit) {
  const fail = (status, message, differences = []) => ({ matched: false, status, message, differences });
  if (!review) return fail('unavailable', 'Read the printed PDF route first.');
  if (review.state !== 'TX') return fail('unavailable', 'A scanned map connection is currently available for supported Texas QR maps. This printed route has no map connection.');
  if (!Array.isArray(review.issues) || review.issues.length || !Array.isArray(review.rows) || !review.rows.length || review.rows.length > 1000 || !Number.isInteger(review.pageCount) || review.pageCount < 1 || review.pageCount > 40) return fail('mismatch', 'Printed route extraction needs review. No map row was selected.');
  if (!permit?.issuerMap) return fail('unavailable', 'Load this permit’s Texas QR map first. Printed route words alone do not supply map coordinates.');
  let source;
  try { source = sanitizeIssuerMap(permit.issuerMap, permit); }
  catch { return fail('mismatch', 'The saved map no longer matches this permit. Reload its QR map before comparing.'); }
  if (!source.rows) return fail('unavailable', 'Load this Texas QR map again to get its structured instructions.');
  if (!review.permitNumber || review.permitNumber !== source.permitNumber) return fail('mismatch', 'The printed permit number is missing, ambiguous or different from the saved map. No map row was selected.');
  if (review.rows.length !== source.rows.length) return fail('mismatch', `The PDF has ${review.rows.length} rows; the saved issuer map has ${source.rows.length}. The full route must agree before connecting rows.`);
  const differences = [];
  const add = (index, field, printed, issuer) => differences.push({ row: index + 1, field, printed, issuer });
  for (let i = 0; i < source.rows.length; i++) {
    const row = review.rows[i], issuer = source.rows[i];
    if (!row || row.row !== i + 1 || !Number.isInteger(row.page) || row.page < 1 || row.page > review.pageCount || (i && row.page < review.rows[i-1].page)) return fail('mismatch', 'Printed row order or page information is incomplete. No map row was selected.');
    for (const field of ['road', 'instruction']) if (text(row[field]) !== text(issuer[field])) add(i, field, row[field], issuer[field]);
    // Texas uses 0 in the structured response for its printed "< 0.1" cell.
    const milesMatch = issuer.miles === 0 ? /^<\s*0\.1$/.test(text(row.miles)) : decimal(row.miles) === issuer.miles;
    if (!milesMatch) add(i, 'segment miles', row.miles, issuer.miles === 0 ? '< 0.1' : String(issuer.miles));
    if (decimal(row.cumulative) !== issuer.cumulativeMiles) add(i, 'cumulative miles', row.cumulative, String(issuer.cumulativeMiles));
  }
  if (differences.length) return fail('mismatch', `${differences.length} printed/map field difference${differences.length === 1 ? '' : 's'}. No rows are connected until the whole table agrees.`, differences);
  return { matched: true, status: 'matched', rowCount: source.rows.length, differences: [], message: `All ${source.rows.length} printed roads, instructions and mileage values agree with the saved issuer table and permit number. This is a text match, not a verified turn location or current route approval.` };
}
