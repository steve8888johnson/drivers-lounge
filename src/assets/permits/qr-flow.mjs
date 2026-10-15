import { classifyQR } from './import.mjs';

export function retainScannedQR(existing, codes) {
  const references = [...existing], unique = [...new Set(codes.map(code => code.raw))];
  if (unique.some(raw => typeof raw !== 'string' || !raw.trim() || raw.length > 50000)) throw Error('Unsupported QR contents. Keep the original.');
  let retained = 0;
  for (const raw of unique) {
    if (references.includes(raw)) { retained++; continue; }
    if (references.length < 20) { references.push(raw); retained++; }
  }
  return { references, retained, omitted: unique.length - retained };
}

// Scanning, loading route data and permitting travel are separate operations.
// Merely classifying a QR never starts a network request or changes the wallet.
export function qrAction(raw) {
  const result = classifyQR(raw);
  if (result.kind === 'encoded-route') return { ...result,
    title: result.permit.steps.length ? 'Route coordinates found' : 'Route text found · no coordinates',
    action: result.permit.steps.length ? 'Review & plot route' : 'Review route text',
    message: result.permit.steps.length ? `${result.permit.steps.length} supplied instructions. Review the import, then plot it without re-entering truck dimensions.` : 'This code contains text but no map coordinates. You can save the text; it cannot draw a route yet.' };
  if (result.kind === 'public-provider') return { ...result, title: 'Issued-route link found', action: 'Load route & preview' };
  if (result.kind === 'public-url') return { ...result, title: 'Website link found', action: 'Try loading route data', external: result.url,
    message: 'Open the link if it is the expected issuer or provider. Supported route data can be loaded here; a webpage alone is not a plotted route.' };
  // Known Texas link is identification only; expose the exact URL only on a
  // deliberate click. Do not fetch it or silently upgrade its scheme.
  if (result.kind === 'permit-info') return { ...result, title: 'QR read · permit reference only',
    external: /^https?:\/\//.test(result.raw) ? result.raw : null,
    message: 'This code has permit details, not route coordinates. Open the issuer link when available, then save the complete permit PDF or obtain its route export.' };
  return { ...result, title: 'QR read · route format not supported', message: result.message };
}
